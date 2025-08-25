import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { formatCurrency } from '@/lib/utils/currency';

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET!;
const PAYPAL_BASE_URL = process.env.PAYPAL_SANDBOX_MODE === 'true' 
  ? 'https://api-m.sandbox.paypal.com' 
  : 'https://api-m.paypal.com';

interface CaptureRequest {
  orderID: string;
  customerData: {
    name: string;
    email: string;
    phone: string;
    company?: string;
    createAccount?: boolean;
    password?: string;
    userId?: string; // 🆕 AGREGADO para usuarios registrados
  };
  tickets: Array<{
    ticket_type_id: string;
    ticket_type_name: string;
    quantity: number;
    unit_price: number;
    currency: string;
    total_price: number;
  }>;
  eventId: string;
}

// Obtener access token de PayPal
async function getPayPalAccessToken(): Promise<string> {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  
  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${auth}`,
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.error('PayPal Auth Error:', data);
    throw new Error('Failed to get PayPal access token');
  }

  return data.access_token;
}

// Generar ID único para QR
function generateQRId(): string {
  return `qr_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

// 🆕 Función para detectar usuario existente por email (SIN crear cuenta)
async function findExistingUserByEmail(email: string): Promise<string | null> {
  try {
    console.log('🔍 Buscando usuario existente por email:', email);
    
    const { getAuth } = await import('firebase-admin/auth');
    const auth = getAuth();
    
    const firebaseUser = await auth.getUserByEmail(email);
    console.log('✅ Usuario existente encontrado:', firebaseUser.uid);
    
    return firebaseUser.uid;
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      console.log('🔍 Usuario no existe para email:', email);
      return null;
    }
    
    console.error('❌ Error buscando usuario existente:', error);
    return null;
  }
}

// Crear usuario en Firebase Auth Y Firestore
async function createUserAccount(customerData: CaptureRequest['customerData']) {
  console.log('🔄 createUserAccount called with:', {
    createAccount: customerData.createAccount,
    hasPassword: !!customerData.password,
    email: customerData.email
  });
  
  if (!customerData.createAccount || !customerData.password) {
    console.log('❌ Skipping account creation - not requested or no password');
    return { userId: null, firebaseUid: null, customToken: null };
  }

  try {
    console.log('🔄 Creating user account for:', customerData.email);
    
    // 1. Crear usuario en Firebase Auth
    const { getAuth } = await import('firebase-admin/auth');
    const auth = getAuth();
    
    let firebaseUser;
    try {
      // Verificar si el usuario ya existe
      console.log('🔍 Checking if user already exists...');
      firebaseUser = await auth.getUserByEmail(customerData.email);
      console.log('⚠️ User already exists in Firebase Auth:', firebaseUser.uid);
    } catch (error: any) {
      console.log('🔍 User lookup error:', error.code);
      if (error.code === 'auth/user-not-found') {
        // Usuario no existe, crearlo
        console.log('🆕 Creating new user in Firebase Auth');
        try {
          firebaseUser = await auth.createUser({
            email: customerData.email,
            password: customerData.password,
            displayName: customerData.name,
            emailVerified: true, // Pre-verificado por que hizo una compra
          });
          console.log('✅ Firebase Auth user created:', firebaseUser.uid);
        } catch (createError) {
          console.error('❌ Firebase Auth createUser failed:', createError);
          throw createError;
        }
      } else {
        console.error('❌ Firebase Auth getUserByEmail failed with unexpected error:', error);
        throw error;
      }
    }
    
    // 2. Crear/actualizar en Firestore
    console.log('📄 Creating/updating Firestore document...');
    const userRef = adminDb.collection('users').doc(firebaseUser.uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      console.log('🆕 Creating new Firestore user document');
      await userRef.set({
        email: customerData.email,
        name: customerData.name,
        phone: customerData.phone,
        company: customerData.company || '',
        roles: ['usuario'],
        created_at: FieldValue.serverTimestamp(),
        created_via: 'purchase'
      });
      console.log('✅ Firestore user document created');
    } else {
      console.log('🔄 Updating existing Firestore user document');
      // Actualizar datos si ya existe
      await userRef.update({
        name: customerData.name,
        phone: customerData.phone,
        company: customerData.company || '',
        updated_at: FieldValue.serverTimestamp(),
        last_purchase: FieldValue.serverTimestamp()
      });
      console.log('✅ Firestore user document updated');
    }
    
    // 3. Generar custom token para autologin
    console.log('🔑 Generating custom token...');
    const customToken = await auth.createCustomToken(firebaseUser.uid);
    console.log('✅ Custom token generated for autologin (length:', customToken.length, ')');

    return { 
      userId: firebaseUser.uid, 
      firebaseUid: firebaseUser.uid,
      customToken 
    };
  } catch (error) {
    console.error('❌ Error creating user account - DETAILED:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any)?.code,
      stack: error instanceof Error ? error.stack : undefined,
      customerEmail: customerData.email
    });
    return { userId: null, firebaseUid: null, customToken: null };
  }
}

// Obtener datos del tipo de boleto
async function getTicketTypeData(ticketTypeId: string) {
  try {
    const ticketTypeDoc = await adminDb.collection('ticket_types').doc(ticketTypeId).get();
    if (!ticketTypeDoc.exists) {
      console.warn(`⚠️ Ticket type ${ticketTypeId} not found`);
      return null;
    }
    return ticketTypeDoc.data();
  } catch (error) {
    console.error('❌ Error getting ticket type data:', error);
    return null;
  }
}

// Calcular días autorizados según el tipo de acceso
function calculateAuthorizedDays(ticketTypeData: any, eventStartDate: Date, eventEndDate: Date): Date[] {
  if (!ticketTypeData) {
    // Por defecto, todos los días del evento
    const days: Date[] = [];
    const current = new Date(eventStartDate);
    while (current <= eventEndDate) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  }

  switch (ticketTypeData.access_type) {
    case 'all_days':
      // Todos los días del evento
      const allDays: Date[] = [];
      const current = new Date(eventStartDate);
      while (current <= eventEndDate) {
        allDays.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
      return allDays;

    case 'specific_days':
      // Días específicos definidos en el tipo de boleto
      if (ticketTypeData.available_days && Array.isArray(ticketTypeData.available_days)) {
        return ticketTypeData.available_days.map((day: any) => {
          if (day && day.toDate) {
            return day.toDate();
          }
          return new Date(day);
        });
      }
      return [];

    case 'any_single_day':
      // Cualquier día (se elige al momento del evento)
      // Por ahora devolvemos todos los días disponibles
      const singleDayOptions: Date[] = [];
      const currentDay = new Date(eventStartDate);
      while (currentDay <= eventEndDate) {
        singleDayOptions.push(new Date(currentDay));
        currentDay.setDate(currentDay.getDate() + 1);
      }
      return singleDayOptions;

    default:
      return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Capturing PayPal payment...');

    const body: CaptureRequest = await request.json();
    const { orderID, customerData, tickets, eventId } = body;

    console.log('📦 Capture data:', {
      orderID,
      customerEmail: customerData.email,
      ticketsCount: tickets.length,
      eventId,
      customerCreateAccount: customerData.createAccount,
      customerHasPassword: !!customerData.password,
      passwordLength: customerData.password?.length || 0,
      customerUserId: customerData.userId || 'guest', // 🆕 AGREGADO
      isRegisteredUser: !!customerData.userId
    });

    // Validaciones
    if (!orderID) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 });
    }

    if (!tickets || tickets.length === 0) {
      return NextResponse.json({ error: 'No tickets provided' }, { status: 400 });
    }

    // Obtener datos del evento
    const eventDoc = await adminDb.collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const eventData = eventDoc.data()!;
    const eventStartDate = eventData.start_date.toDate();
    const eventEndDate = eventData.end_date.toDate();

    // Obtener access token y capturar el pago
    const accessToken = await getPayPalAccessToken();

    console.log('🔄 Capturing payment with PayPal...');
    const captureResponse = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderID}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const captureResult = await captureResponse.json();

    if (!captureResponse.ok) {
      console.error('❌ PayPal Capture Error:', captureResult);
      return NextResponse.json(
        { error: 'Payment capture failed', details: captureResult },
        { status: 400 }
      );
    }

    console.log('✅ Payment captured successfully:', captureResult.id);

    // Verificar que el pago esté completado
    if (captureResult.status !== 'COMPLETED') {
      console.error('❌ Payment not completed:', captureResult.status);
      return NextResponse.json(
        { error: 'Payment not completed', status: captureResult.status },
        { status: 400 }
      );
    }

    // 🆕 DETECCIÓN AUTOMÁTICA DE EMAILS DUPLICADOS
    let userId: string | null = customerData.userId || null;
    let customToken = null;
    let accountCreationFailed = false;
    let emailExisted = false; // 🆕 Nueva bandera para indicar email duplicado
    
    // 1. 🔍 Primero verificar si el email ya existe (SIEMPRE, sin importar si quiere crear cuenta)
    if (!customerData.userId) { // Solo para usuarios no loggeados
      const existingUserId = await findExistingUserByEmail(customerData.email);
      
      if (existingUserId) {
        // 🆕 EMAIL DUPLICADO DETECTADO - Asociar automáticamente
        console.log('🔄 Email duplicado detectado - Asociando a cuenta existente:', existingUserId);
        userId = existingUserId;
        emailExisted = true;
        
        // Actualizar datos del usuario existente con la nueva información
        try {
          const userRef = adminDb.collection('users').doc(existingUserId);
          await userRef.update({
            name: customerData.name, // Actualizar nombre por si cambió
            phone: customerData.phone, // Actualizar teléfono
            company: customerData.company || null,
            updated_at: FieldValue.serverTimestamp(),
            last_purchase: FieldValue.serverTimestamp()
          });
          console.log('✅ Datos de usuario existente actualizados');
        } catch (updateError) {
          console.error('❌ Error actualizando usuario existente:', updateError);
          // No fallar la compra por esto
        }
      } else if (customerData.createAccount && customerData.password) {
        // 2. 🆆 EMAIL NUEVO - Crear cuenta si se solicitó
        console.log('🔄 Email nuevo - Creando cuenta para usuario invitado...');
        
        const simulateFailure = process.env.SIMULATE_ACCOUNT_CREATION_FAILURE === 'true';
        
        let userResult;
        if (simulateFailure) {
          // 🧪 SIMULAR FALLO PARA TESTING
          userResult = { userId: null, firebaseUid: null, customToken: null };
          console.log('🧪 TESTING: Simulating account creation failure (SIMULATE_ACCOUNT_CREATION_FAILURE=true)');
        } else {
          // ✅ CREAR CUENTA REAL
          console.log('✅ Creating real account (SIMULATE_ACCOUNT_CREATION_FAILURE=false or undefined)');
          userResult = await createUserAccount(customerData);
        }
        
        const { userId: newUserId, firebaseUid, customToken: token } = userResult;
        
        if (newUserId) {
          userId = newUserId;
          customToken = token;
          console.log('✅ New account created:', newUserId);
        } else {
          userId = null;
          console.log('⚠️ Account creation failed, continuing as guest');
          accountCreationFailed = true;
          
          // ENVIAR EMAIL DE RECUPERACIÓN para guests fallidos
          try {
            console.log('📧 Sending account recovery email...');
            const { EmailApiClient } = await import('@/lib/email/email-client');
            const { generateAccountRecoveryEmailHTML, generateAccountRecoveryEmailText } = await import('@/lib/email/account-recovery.template');
            
            const emailClient = new EmailApiClient();
            const totalAmount = tickets.reduce((sum, t) => sum + t.total_price, 0);
            const ticketsCount = tickets.reduce((sum, t) => sum + t.quantity, 0);
            
            const recoveryEmailData = {
              customer_name: customerData.name,
              customer_email: customerData.email,
              event: {
                name: eventData.name,
                start_date: eventStartDate,
                end_date: eventEndDate,
                location: eventData.location
              },
              order_id: orderID,
              payment_amount: totalAmount,
              currency: tickets[0]?.currency || 'MXN',
              tickets_count: ticketsCount,
              support_email: process.env.SUPPORT_EMAIL,
              app_url: process.env.NEXT_PUBLIC_APP_URL!
            };
            
            const htmlContent = generateAccountRecoveryEmailHTML(recoveryEmailData);
            const textContent = generateAccountRecoveryEmailText(recoveryEmailData);
            
            await emailClient.sendEmail({
              to: customerData.email,
              subject: `Acceso a tus boletos - ${eventData.name}`,
              html: htmlContent,
              text: textContent
            });
            
            console.log('✅ Account recovery email sent successfully');
          } catch (emailError) {
            console.error('❌ Failed to send recovery email:', emailError);
          }
        }
      } else {
        // 3. 👵 USUARIO INVITADO (no quiere crear cuenta)
        console.log('👵 Compra de invitado (no se solicitó crear cuenta)');
      }
    } else {
      // 4. 👤 USUARIO YA LOGGEADO
      console.log('👤 Usando usuario ya loggeado:', customerData.userId);
    }
    
    console.log('📍 Estado final de usuario:', {
      userId: userId,
      userIdType: typeof userId,
      hasCustomToken: !!customToken,
      accountCreationFailed,
      emailExisted, // 🆕 Nueva bandera
      isRegisteredUser: !!customerData.userId
    });

    // Crear tickets en la base de datos
    const createdTickets: string[] = [];
    const batch = adminDb.batch();

    for (const ticketInfo of tickets) {
      // Obtener datos del tipo de boleto para configurar accesos
      const ticketTypeData = await getTicketTypeData(ticketInfo.ticket_type_id);
      const authorizedDays = calculateAuthorizedDays(ticketTypeData, eventStartDate, eventEndDate);
      
      console.log(`🎫 Creating ${ticketInfo.quantity} tickets of type: ${ticketInfo.ticket_type_name}`);
      console.log(`📅 Authorized days: ${authorizedDays.length} days`);

      for (let i = 0; i < ticketInfo.quantity; i++) {
        const ticketRef = adminDb.collection('tickets').doc();
        const qrId = generateQRId();

        const ticketData = {
          // Referencias
          user_id: userId, // Ya es null o string, no undefined
          customer_email: customerData.email,
          customer_name: customerData.name,
          customer_phone: customerData.phone,
          customer_company: customerData.company || null,
          event_id: eventId,
          ticket_type_id: ticketInfo.ticket_type_id,
          ticket_type_name: ticketInfo.ticket_type_name,
          
          // 🏷️ CAMPOS PARA VINCULACIÓN DE HUÉRFANOS
          // Cuando user_id es null, estos campos permiten encontrar y vincular boletos
          orphan_recovery_data: !userId ? {
            customer_email: customerData.email.toLowerCase(),
            customer_name: customerData.name,
            customer_phone: customerData.phone,
            order_id: orderID,
            capture_id: captureResult.id,
            account_requested: customerData.createAccount || false,
            password_provided: !!customerData.password,
            failure_timestamp: FieldValue.serverTimestamp(),
            recovery_status: 'pending' // pending | recovered | expired
          } : null,
          
          // Estado del boleto
          status: 'purchased', // purchased -> configured -> used
          
          // Datos de pago
          order_id: orderID,
          capture_id: captureResult.id,
          purchase_date: FieldValue.serverTimestamp(),
          amount_paid: ticketInfo.unit_price,
          currency: ticketInfo.currency,
          
          // QR y PDF (PDF se genera después en configuración)
          qr_id: qrId,
          pdf_url: null,
          
          // Datos del asistente (se llenan después)
          attendee_name: null,
          attendee_email: null,
          attendee_phone: null,
          special_requirements: null,
          
          // Fechas de acceso
          authorized_days: authorizedDays,
          used_days: [], // Se van llenando cuando se usa el boleto
          
          // Metadata
          created_at: FieldValue.serverTimestamp(),
          updated_at: FieldValue.serverTimestamp(),
        };

        batch.set(ticketRef, ticketData);
        createdTickets.push(ticketRef.id);
        
        console.log(`📝 Ticket ${i + 1}/${ticketInfo.quantity} prepared: ${ticketRef.id}`);
      }
    }

    // Ejecutar batch para crear todos los tickets
    await batch.commit();
    console.log(`✅ Successfully created ${createdTickets.length} tickets in database`);

    // Actualizar contador de vendidos en los tipos de boletos
    const updatePromises = tickets.map(async (ticketInfo) => {
      const ticketTypeRef = adminDb.collection('ticket_types').doc(ticketInfo.ticket_type_id);
      return ticketTypeRef.update({
        sold_count: FieldValue.increment(ticketInfo.quantity),
        updated_at: FieldValue.serverTimestamp(),
      });
    });

    await Promise.all(updatePromises);
    console.log('✅ Updated sold counts for ticket types');

    // 📧 ENVIAR EMAIL DE CONFIRMACIÓN (DIFERENCIADO)
    try {
      console.log('📧 Enviando email de confirmación...'); 
      console.log('📍 Factores de decisión de email:', {
        accountCreationFailed,
        emailExisted, // 🆕 Nueva bandera
        userId: userId || 'guest',
        isRegisteredUser: !!customerData.userId,
        willSendDuplicateEmail: emailExisted
      });
      
      const { EmailApiClient } = await import('@/lib/email/email-client');
      const { formatEventDates } = await import('@/lib/utils/event-dates');
      const emailClient = new EmailApiClient();
      
      const totalAmount = tickets.reduce((sum, t) => sum + t.total_price, 0);
      const ticketsCount = tickets.reduce((sum, t) => sum + t.quantity, 0);
      
      let htmlContent, textContent, emailSubject;
      
      if (emailExisted) {
        // 🆕 EMAIL PARA CASOS DE EMAIL DUPLICADO
        console.log('📧 Enviando email para email duplicado');
        
        const { generatePurchaseDuplicateEmailHTML, generatePurchaseDuplicateEmailText } = await import('@/lib/email/purchase-duplicate-email.template');
        
        const duplicateEmailData = {
          customer_name: customerData.name,
          customer_email: customerData.email,
          event_name: eventData.name,
          event_date: formatEventDates(eventStartDate, eventEndDate),
          event_location: eventData.location,
          order_id: orderID,
          total_amount: formatCurrency(totalAmount, tickets[0]?.currency || 'MXN'),
          tickets_count: ticketsCount,
          app_url: process.env.NEXT_PUBLIC_APP_URL!
        };
        
        htmlContent = generatePurchaseDuplicateEmailHTML(duplicateEmailData);
        textContent = generatePurchaseDuplicateEmailText(duplicateEmailData);
        emailSubject = `¡Compra exitosa! Inicia sesión para ver tus boletos - ${eventData.name}`;
        
      } else {
        // ✅ EMAIL NORMAL DE CONFIRMACIÓN
        console.log('📧 Enviando email de confirmación normal');
        
        const { generatePurchaseConfirmationEmailHTML, generatePurchaseConfirmationEmailText } = await import('@/lib/email/purchase-confirmation.template');
        
        const confirmationData = {
          customer_name: customerData.name,
          customer_email: customerData.email,
          event_name: eventData.name,
          event_date: formatEventDates(eventStartDate, eventEndDate),
          event_location: eventData.location,
          order_id: orderID,
          total_amount: formatCurrency(totalAmount, tickets[0]?.currency || 'MXN'),
          tickets_count: ticketsCount,
          account_created: !!customToken && !accountCreationFailed,
          app_url: process.env.NEXT_PUBLIC_APP_URL!
        };
        
        htmlContent = generatePurchaseConfirmationEmailHTML(confirmationData);
        textContent = generatePurchaseConfirmationEmailText(confirmationData);
        emailSubject = accountCreationFailed 
          ? `Compra confirmada - ${eventData.name} (Revisar instrucciones)`
          : `Compra confirmada - ${eventData.name}`;
      }
      
      // Enviar email
      await emailClient.sendEmail({
        to: customerData.email,
        subject: emailSubject,
        html: htmlContent,
        text: textContent
      });
      
      console.log('✅ Email de confirmación enviado exitosamente');
    } catch (emailError) {
      console.error('❌ Error enviando email de confirmación:', emailError);
      // No fallar todo el proceso si falla el email
    }

    // Respuesta exitosa
    return NextResponse.json({
      success: true,
      paymentId: captureResult.id,
      orderId: orderID,
      status: 'COMPLETED',
      ticketsCreated: createdTickets.length,
      ticketIds: createdTickets,
      message: `Pago procesado y ${createdTickets.length} boletos creados exitosamente`,
      
      // 🆕 Datos de autenticación para autologin
      userAccount: customToken ? {
        created: true,
        firebaseUid: userId,
        customToken, // Para hacer autologin en el frontend
        email: customerData.email
      } : accountCreationFailed ? {
        created: false,
        failed: true,
        reason: 'Account creation failed, but tickets were created successfully',
        email: customerData.email,
        recovery: {
          canRecover: true,
          instructions: 'Check your email for recovery instructions'
        }
      } : emailExisted ? {
        // 🆕 NUEVO: Caso de email duplicado
        created: false,
        emailExisted: true,
        reason: 'Email already exists, tickets associated to existing account',
        email: customerData.email,
        loginRequired: true,
        instructions: 'Login to access your tickets'
      } : {
        created: false,
        reason: customerData.userId ? 'Using existing account' : 'Account creation not requested'
      },
      
      // URLs para redirección
      nextSteps: {
        configureTickets: `/my-tickets/${orderID}`,
        eventPage: `/events/${eventId}`
      },

      // Información adicional
      details: {
        customerEmail: customerData.email,
        eventName: eventData.name,
        totalAmount: tickets.reduce((sum, t) => sum + t.total_price, 0),
        currency: tickets[0]?.currency || 'MXN',
        purchaseTimestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Capture payment error:', error);
    
    // Log detallado para debugging
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      orderID: (error as any)?.orderID || 'N/A'
    });

    return NextResponse.json(
      { 
        error: 'Payment processing failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        orderID: (error as any)?.orderID || null
      },
      { status: 500 }
    );
  }
}
