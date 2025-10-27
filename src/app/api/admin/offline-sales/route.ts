import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { getAuthFromRequest, requireRoles } from '@/lib/auth/server-auth';
import type { PaymentMethod } from '@/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * API para gestionar ventas offline (manuales)
 * Solo accesible por administradores y gestores
 */

interface CreateOfflineSaleRequest {
  eventId: string;
  ticketTypeId: string;
  attendeeEmail: string;
  attendeeName: string;
  attendeePhone?: string;
  amount_paid: number;
  payment_method: PaymentMethod;
  payment_reference?: string;
  sale_date: Date | string;
  notes?: string;
  quantity: number;
  sendEmail?: boolean;
  autoLink?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación y permisos
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

    const body: CreateOfflineSaleRequest = await request.json();
    const { 
      eventId, 
      ticketTypeId, 
      attendeeEmail, 
      attendeeName, 
      attendeePhone,
      amount_paid,
      payment_method,
      payment_reference,
      sale_date,
      notes,
      quantity = 1,
      sendEmail = true,
      autoLink = true
    } = body;

    console.log('[Offline Sales] Creating offline sale:', {
      eventId,
      ticketTypeId,
      attendeeEmail,
      quantity,
      amount_paid,
      payment_method,
      createdBy: user.uid
    });

    // Validar datos requeridos
    if (!eventId || !ticketTypeId || !attendeeEmail || !attendeeName) {
      return NextResponse.json(
        { error: 'Missing required fields: eventId, ticketTypeId, attendeeEmail, attendeeName' },
        { status: 400 }
      );
    }

    // Validar monto > 0
    if (!amount_paid || amount_paid <= 0) {
      return NextResponse.json(
        { error: 'amount_paid must be greater than 0' },
        { status: 400 }
      );
    }

    // Validar payment_method
    const validPaymentMethods = ['cash', 'transfer', 'card', 'other'];
    if (!payment_method || !validPaymentMethods.includes(payment_method)) {
      return NextResponse.json(
        { error: 'Invalid payment_method. Must be one of: cash, transfer, card, other' },
        { status: 400 }
      );
    }

    // Validar cantidad
    if (quantity < 1 || quantity > 10) {
      return NextResponse.json(
        { error: 'Quantity must be between 1 and 10' },
        { status: 400 }
      );
    }

    // Validar fecha de venta
    const saleDateObj = sale_date ? new Date(sale_date) : new Date();
    if (saleDateObj > new Date()) {
      return NextResponse.json(
        { error: 'sale_date cannot be in the future' },
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

    // Buscar usuario existente para autovinculación
    let existingUserId = null;
    if (autoLink) {
      console.log('[Offline Sales] Searching for existing user:', attendeeEmail);
      
      const userQuery = await adminDb
        .collection('users')
        .where('email', '==', attendeeEmail.toLowerCase())
        .limit(1)
        .get();
      
      if (!userQuery.empty) {
        existingUserId = userQuery.docs[0].id;
        console.log('[Offline Sales] Found existing user:', existingUserId);
      } else {
        console.log('[Offline Sales] No existing user found. Will link when user registers.');
      }
    }

    // Generar orden única para todos los boletos
    const orderId = `offline_sale_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    console.log(`[Offline Sales] Creating order: ${orderId} with ${quantity} tickets`);

    // Generar boletos
    const batch = adminDb.batch();
    const createdTickets = [];

    for (let i = 0; i < quantity; i++) {
      const ticketRef = adminDb.collection('tickets').doc();
      const qrId = `offline_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      
      // Calcular días autorizados basado en el tipo de boleto
      let authorizedDays: Date[] = [];
      
      if (ticketTypeData.access_type === 'all_days') {
        const startDate = eventData.start_date.toDate();
        const endDate = eventData.end_date.toDate();
        
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          authorizedDays.push(new Date(d));
        }
      } else if (ticketTypeData.access_type === 'specific_days' && ticketTypeData.available_days) {
        authorizedDays = ticketTypeData.available_days.map((day: any) => day.toDate());
      } else {
        // 'any_single_day'
        authorizedDays = [eventData.start_date.toDate()];
      }

      const ticketData = {
        // Información básica
        event_id: eventId,
        ticket_type_id: ticketTypeId,
        ticket_type_name: ticketTypeData.name || '',

        // Estado y tipo
        status: 'purchased', // Usar flujo normal de configuración
        is_courtesy: false,
        is_manual_sale: true, // Flag identificador de venta offline
        
        // Información de pago (venta offline)
        amount_paid: amount_paid,
        currency: ticketTypeData.currency || 'MXN',
        payment_method: payment_method,
        payment_reference: payment_reference || null,
        sale_date: FieldValue.serverTimestamp(), // Timestamp de la venta real
        manual_sale_notes: notes || null,

        // Información del cliente/asistente (VACÍO para configuración posterior)
        attendee_name: '',
        attendee_email: '',
        attendee_phone: '',

        // Información de compra/orden (datos del comprador)
        customer_name: attendeeName,
        customer_email: attendeeEmail,
        customer_phone: attendeePhone || null,

        // Usuario
        user_id: existingUserId,

        // Autovinculación si aplica
        ...(autoLink && !existingUserId && {
          orphan_recovery_data: {
            recovery_status: 'pending',
            created_via: 'admin_offline_sale_linked',
            is_courtesy: false,
            is_manual_sale: true,
            auto_link_enabled: true,
            target_email: attendeeEmail.toLowerCase(),
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
          (existingUserId ? 'admin_offline_sale_linked_immediate' : 'admin_offline_sale_linked') : 
          'admin_offline_sale_standalone',

        // Orden
        order_id: orderId,
        purchase_date: FieldValue.serverTimestamp(),

        // Campos adicionales
        special_requirements: notes || null,
      };

      batch.set(ticketRef, ticketData);
      
      createdTickets.push({
        id: ticketRef.id,
        ...ticketData,
        created_at: new Date(),
        purchase_date: new Date(),
        sale_date: saleDateObj,
        order_id: orderId
      });
    }

    // Ejecutar batch
    await batch.commit();

    console.log(`[Offline Sales] Created ${quantity} tickets successfully`);
    
    // Mensaje de vinculación
    let linkingMessage = '';
    if (autoLink) {
      if (existingUserId) {
        linkingMessage = ` - Linked automatically to existing user`;
      } else {
        linkingMessage = ` - Will link when user registers with ${attendeeEmail}`;
      }
    } else {
      linkingMessage = ` - Standalone sale (manual configuration required)`;
    }

    // TODO: Enviar email si sendEmail es true
    if (sendEmail) {
      console.log('[Offline Sales] Email notification not implemented yet');
    }

    return NextResponse.json({
      success: true,
      message: `${quantity} offline sale ticket(s) created successfully${linkingMessage}`,
      order_id: orderId,
      tickets: createdTickets,
      linking: {
        autoLinkEnabled: autoLink,
        immediatelyLinked: !!existingUserId,
        linkedUserId: existingUserId,
        willLinkOnRegistration: autoLink && !existingUserId
      },
      stats: {
        created: quantity,
        totalRevenue: amount_paid * quantity,
        paymentMethod: payment_method,
        event: eventData.name || '',
        ticketType: ticketTypeData.name || '',
        orderId: orderId,
        saleDate: saleDateObj.toISOString()
      }
    });

  } catch (error) {
    console.error('[Offline Sales] Error creating offline sale:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create offline sale',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Obtener ventas offline por evento
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    if (!requireRoles(user.roles, ['admin', 'gestor'])) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json(
        { error: 'eventId parameter is required' },
        { status: 400 }
      );
    }

    console.log('[Offline Sales] Loading offline sales for event:', eventId);

    // Obtener todos los tickets offline del evento
    // Índice compuesto requerido: event_id (asc), is_manual_sale (asc), created_at (desc)
    const ticketsQuery = await adminDb
      .collection('tickets')
      .where('event_id', '==', eventId)
      .where('is_manual_sale', '==', true)
      .orderBy('created_at', 'desc')
      .get();

    // Agrupar por order_id
    const ordersMap = new Map();

    ticketsQuery.docs.forEach(doc => {
      const ticketData = doc.data();
      const orderId = ticketData.order_id;

      if (!ordersMap.has(orderId)) {
        ordersMap.set(orderId, {
          order_id: orderId,
          event_id: ticketData.event_id,
          customer_name: ticketData.customer_name,
          customer_email: ticketData.customer_email,
          payment_method: ticketData.payment_method,
          payment_reference: ticketData.payment_reference,
          sale_date: ticketData.sale_date?.toDate() || ticketData.created_at?.toDate(),
          created_at: ticketData.created_at?.toDate(),
          created_by: ticketData.created_by,
          currency: ticketData.currency,
          tickets: [],
          total_tickets: 0,
          total_amount: 0
        });
      }

      const order = ordersMap.get(orderId);
      order.tickets.push({
        id: doc.id,
        ...ticketData,
        created_at: ticketData.created_at?.toDate(),
        purchase_date: ticketData.purchase_date?.toDate(),
        sale_date: ticketData.sale_date?.toDate()
      });
      order.total_tickets++;
      order.total_amount += ticketData.amount_paid || 0;
    });

    // Los datos ya vienen ordenados por created_at desc gracias al índice
    const orders = Array.from(ordersMap.values());

    // Calcular estadísticas
    const stats = {
      total_revenue: orders.reduce((sum, order) => sum + order.total_amount, 0),
      total_tickets: orders.reduce((sum, order) => sum + order.total_tickets, 0),
      total_orders: orders.length,
      by_payment_method: {
        cash: 0,
        transfer: 0,
        card: 0,
        other: 0
      } as Record<PaymentMethod, number>,
      currency: orders[0]?.currency || 'MXN'
    };

    // Sumar por método de pago
    orders.forEach(order => {
      if (order.payment_method && stats.by_payment_method[order.payment_method as PaymentMethod] !== undefined) {
        stats.by_payment_method[order.payment_method as PaymentMethod] += order.total_amount;
      }
    });

    console.log('[Offline Sales] Loaded offline sales:', {
      orders: orders.length,
      tickets: stats.total_tickets,
      revenue: stats.total_revenue
    });

    return NextResponse.json({
      success: true,
      orders,
      stats
    });

  } catch (error) {
    console.error('[Offline Sales] Error loading offline sales:', error);
    return NextResponse.json(
      { 
        error: 'Failed to load offline sales',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
