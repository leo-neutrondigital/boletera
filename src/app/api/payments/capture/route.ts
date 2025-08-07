import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

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

// Crear usuario si solicitó cuenta
async function createUserAccount(customerData: CaptureRequest['customerData']) {
  if (!customerData.createAccount || !customerData.password) {
    return null;
  }

  try {
    console.log('🔄 Creating user account for:', customerData.email);
    
    const userRef = adminDb.collection('users').doc();
    await userRef.set({
      email: customerData.email,
      name: customerData.name,
      phone: customerData.phone,
      company: customerData.company || '',
      roles: ['usuario'],
      created_at: FieldValue.serverTimestamp(),
      created_via: 'purchase'
    });

    return userRef.id;
  } catch (error) {
    console.error('❌ Error creating user account:', error);
    return null;
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
      eventId
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

    // Crear cuenta de usuario si se solicitó
    const userId = await createUserAccount(customerData);
    if (userId) {
      console.log('✅ User account created:', userId);
    }

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
          user_id: userId, // null si es guest
          customer_email: customerData.email,
          customer_name: customerData.name,
          customer_phone: customerData.phone,
          customer_company: customerData.company || null,
          event_id: eventId,
          ticket_type_id: ticketInfo.ticket_type_id,
          ticket_type_name: ticketInfo.ticket_type_name,
          
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

    // TODO: Enviar email de confirmación
    console.log('📧 TODO: Send confirmation email to:', customerData.email);

    // Respuesta exitosa
    return NextResponse.json({
      success: true,
      paymentId: captureResult.id,
      orderId: orderID,
      status: 'COMPLETED',
      ticketsCreated: createdTickets.length,
      ticketIds: createdTickets,
      message: `Pago procesado y ${createdTickets.length} boletos creados exitosamente`,
      
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
