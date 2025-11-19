import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { getAuthFromRequest, requireRoles } from '@/lib/auth/server-auth';
// 🆕 Ya no necesitamos TicketEmailService - usar flujo unificado

// ✅ Forzar modo dinámico para usar request.headers
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * 🎁 API para gestionar boletos de cortesía
 * Solo accesible por administradores
 */

interface CreateCourtesyRequest {
  eventId: string;
  ticketTypeId: string;
  attendeeEmail: string;
  attendeeName: string;
  attendeePhone?: string;
  courtesyType: string; // "Prensa", "Staff", "VIP", "Sponsor", etc.
  notes?: string;
  quantity: number;
  sendEmail?: boolean;
  autoLink?: boolean; // 🆕 Nuevo campo para controlar vinculación
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación y permisos de admin
    const user = await getAuthFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - No valid token' },
        { status: 401 }
      );
    }
    
    if (!requireRoles(user.roles, ['admin', 'gestor'])) {
      return NextResponse.json(
        { 
          error: 'Forbidden - Admin or Gestor access required',
          required: ['admin', 'gestor'],
          current: user.roles
        },
        { status: 403 }
      );
    }

    const body: CreateCourtesyRequest = await request.json();
    const { 
      eventId, 
      ticketTypeId, 
      attendeeEmail, 
      attendeeName, 
      attendeePhone,
      courtesyType,
      notes,
      quantity = 1,
      sendEmail = true,
      autoLink = true // 🆕 Por defecto sí vincular
    } = body;

    console.log('🎁 Creating courtesy tickets:', {
      eventId,
      ticketTypeId,
      attendeeEmail,
      quantity,
      courtesyType,
      createdBy: user.uid
    });

    // Validar datos requeridos
    if (!eventId || !ticketTypeId || !attendeeEmail || !attendeeName || !courtesyType) {
      return NextResponse.json(
        { error: 'Missing required fields: eventId, ticketTypeId, attendeeEmail, attendeeName, courtesyType' },
        { status: 400 }
      );
    }

    if (quantity < 1 || quantity > 25) {
      return NextResponse.json(
        { error: 'Quantity must be between 1 and 25' },
        { status: 400 }
      );
    }

    // Verificar que el evento exista
    const eventDoc = await adminDb.collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Verificar que el tipo de boleto exista
    const ticketTypeDoc = await adminDb.collection('ticket_types').doc(ticketTypeId).get();
    if (!ticketTypeDoc.exists) {
      return NextResponse.json(
        { error: 'Ticket type not found' },
        { status: 404 }
      );
    }


    const eventData = eventDoc.data();
    if (!eventData) {
      return NextResponse.json(
        { error: 'Event data not found' },
        { status: 404 }
      );
    }
    const ticketTypeData = ticketTypeDoc.data();
    if (!ticketTypeData) {
      return NextResponse.json(
        { error: 'Ticket type data not found' },
        { status: 404 }
      );
    }

    // 🆕 Status unificado - siempre 'purchased' para usar flujo normal
    const ticketStatus = 'purchased';
    
    // 🆕 Buscar si ya existe un usuario con este email (para autovinculación inmediata)
    let existingUserId = null;
    if (autoLink) {
      console.log('🔍 Searching for existing user with email:', attendeeEmail);
      
      const userQuery = await adminDb
        .collection('users')
        .where('email', '==', attendeeEmail.toLowerCase()) // 🆕 Email del SOLICITANTE
        .limit(1)
        .get();
      
      if (!userQuery.empty) {
        existingUserId = userQuery.docs[0].id;
        console.log('✅ Found existing user to link:', existingUserId);
      } else {
        console.log('ℹ️ No existing user found. Will link when user registers.');
      }
    }

    // Generar boletos de cortesía
    const batch = adminDb.batch();
    const createdTickets = [];
    
    // 🆕 Una sola orden para todos los boletos del lote
    const orderId = `courtesy_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    console.log(`📎 Creating courtesy order: ${orderId} with ${quantity} tickets`);

    for (let i = 0; i < quantity; i++) {
      const ticketRef = adminDb.collection('tickets').doc();
      const qrId = `courtesy_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      
      // Calcular días autorizados basado en el tipo de boleto
      let authorizedDays: Date[] = [];
      
  if (ticketTypeData && ticketTypeData.access_type === 'all_days') {
        // Generar todos los días entre start_date y end_date
        const startDate = eventData.start_date.toDate();
        const endDate = eventData.end_date.toDate();
        
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          authorizedDays.push(new Date(d));
        }
  } else if (ticketTypeData && ticketTypeData.access_type === 'specific_days' && ticketTypeData.available_days) {
  authorizedDays = ticketTypeData.available_days.map((day: any) => day.toDate());
  } else {
        // 'any_single_day' - usuario elegirá en el evento
        authorizedDays = [eventData.start_date.toDate()];
      }

      const ticketData = {
        // Información básica
        event_id: eventId,
        ticket_type_id: ticketTypeId,
        ticket_type_name: ticketTypeData?.name || '',

        // 🆕 Estado principal (ya no usar 'courtesy')
        status: ticketStatus, // 'generated' o 'purchased'
        is_courtesy: true, // Identificador de cortesía
        courtesy_type: courtesyType,
        courtesy_notes: notes || null,

        // 🆕 Información del asistente (VACÍO para que el usuario configure)
        attendee_name: '', // 🚫 VACÍO - usuario debe llenar
        attendee_email: '', // 🚫 VACÍO - usuario debe llenar
        attendee_phone: '', // 🚫 VACÍO - usuario debe llenar

        // 🆕 Información de compra/orden (datos del solicitante)
        customer_name: attendeeName, // Quien solicita la cortesía
        customer_email: attendeeEmail, // Email del solicitante
        customer_phone: attendeePhone || null, // Teléfono del solicitante
        amount_paid: 0, // Cortesía = gratis
        currency: ticketTypeData?.currency || 'MXN',

        // Información de usuario
        user_id: existingUserId, // 🆕 Vincular inmediatamente si usuario existe

        // 🆕 Datos para autovinculación (solo si autoLink está habilitado Y no encontramos usuario existente)
        ...(autoLink && !existingUserId && {
          orphan_recovery_data: {
            recovery_status: 'pending',
            created_via: 'admin_courtesy_linked',
            is_courtesy: true,
            auto_link_enabled: true,
            target_email: attendeeEmail.toLowerCase(), // 🆕 Email del SOLICITANTE para vincular
            created_at: FieldValue.serverTimestamp()
          }
        }),

        // Días y uso
        authorized_days: authorizedDays,
        used_days: [],

        // QR y PDF
        qr_id: qrId,
        pdf_url: null, // Se generará después

        // Metadatos
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
        created_by: user.uid,
        created_via: autoLink ? 
          (existingUserId ? 'admin_courtesy_linked_immediate' : 'admin_courtesy_linked') : 
          'admin_courtesy_standalone',

        // 🆕 Orden compartida para todo el lote
        order_id: orderId,
        purchase_date: FieldValue.serverTimestamp(),

        // Campos adicionales para compatibilidad
        special_requirements: notes || null,
      };

      batch.set(ticketRef, ticketData);
      
      createdTickets.push({
        id: ticketRef.id,
        ...ticketData,
        created_at: new Date(),
        purchase_date: new Date(),
        order_id: orderId // 🆕 Asegurar orden consistente
      });
    }

    // Ejecutar batch
    await batch.commit();

    console.log(`✅ Created ${quantity} courtesy tickets successfully`);
    
    // 🆕 YA NO auto-generar PDF - usar flujo unificado de my-tickets
    
    // Mensaje de vinculación
    let linkingMessage = '';
    if (autoLink) {
      if (existingUserId) {
        linkingMessage = ` - Vinculado automáticamente a usuario existente`;
      } else {
        linkingMessage = ` - Se vinculará cuando el usuario se registre con ${attendeeEmail}`;
      }
    } else {
      linkingMessage = ` - Cortesía independiente (configurar desde panel admin)`;
    }

    // TODO: Enviar email de cortesía si sendEmail es true (para cortesías vinculadas)
    if (sendEmail && ticketStatus === 'purchased') {
      console.log('📧 Email notification for linked courtesy not implemented yet');
    }

    return NextResponse.json({
      success: true,
      message: `${quantity} cortesía(s) creada(s) exitosamente${linkingMessage}`,
      order_id: orderId, // 🆕 Incluir ID de orden
      tickets: createdTickets,
      linking: {
        autoLinkEnabled: autoLink,
        immediatelyLinked: !!existingUserId,
        linkedUserId: existingUserId,
        willLinkOnRegistration: autoLink && !existingUserId
      },
      stats: {
        created: quantity,
        courtesyType,
        totalValue: 0, // Cortesías son gratis
        event: eventData?.name || '',
        ticketType: ticketTypeData?.name || '',
        orderId: orderId // 🆕 ID de orden en stats también
      }
    });

  } catch (error) {
    console.error('❌ Error creating courtesy tickets:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create courtesy tickets',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET: Listar todas las cortesías
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación y permisos de admin
    const user = await getAuthFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - No valid token' },
        { status: 401 }
      );
    }
    
    if (!requireRoles(user.roles, ['admin', 'gestor'])) {
      return NextResponse.json(
        { 
          error: 'Forbidden - Admin or Gestor access required',
          required: ['admin', 'gestor'],
          current: user.roles
        },
        { status: 403 }
      );
    }

    console.log('🔍 Loading courtesy tickets...');

    // 🆕 Buscar todos los boletos de cortesía (por is_courtesy, no por status)
    const courtesyTicketsSnapshot = await adminDb
      .collection('tickets')
      .where('is_courtesy', '==', true)
      .orderBy('created_at', 'desc')
      .limit(100)
      .get();

    const courtesyTickets = courtesyTicketsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Array<any>;

    // Ordenar manualmente por created_at si es necesario
    courtesyTickets.sort((a, b) => {
      const dateA = a.created_at?.toDate?.() || new Date(a.created_at);
      const dateB = b.created_at?.toDate?.() || new Date(b.created_at);
      return dateB.getTime() - dateA.getTime();
    });

    console.log(`✅ Found ${courtesyTickets.length} courtesy tickets`);

    // Estadísticas
    const stats = {
      total: courtesyTickets.length,
      byType: courtesyTickets.reduce((acc, ticket) => {
        const type = ticket.courtesy_type || 'Unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byStatus: courtesyTickets.reduce((acc, ticket) => {
        const status = ticket.status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      linked: courtesyTickets.filter(t => t.user_id !== null).length,
      unlinked: courtesyTickets.filter(t => t.user_id === null).length,
    };

    return NextResponse.json({
      success: true,
      tickets: courtesyTickets,
      stats,
      message: `Found ${courtesyTickets.length} courtesy tickets`
    });

  } catch (error) {
    console.error('❌ Error loading courtesy tickets:', error);
    return NextResponse.json(
      { 
        error: 'Failed to load courtesy tickets',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
