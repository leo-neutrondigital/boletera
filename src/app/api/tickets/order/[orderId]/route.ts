import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

interface TicketWithEvent {
  id: string;
  // Datos del ticket
  user_id?: string;
  customer_email: string;
  customer_name: string;
  customer_phone: string;
  customer_company?: string;
  event_id: string;
  ticket_type_id: string;
  ticket_type_name: string;
  
  // Estado
  status: 'purchased' | 'configured' | 'used';
  
  // Pago
  order_id: string;
  capture_id: string;
  purchase_date: any;
  amount_paid: number;
  currency: string;
  
  // QR y PDF
  qr_id: string;
  pdf_url?: string;
  
  // Asistente
  attendee_name?: string;
  attendee_email?: string;
  attendee_phone?: string;
  special_requirements?: string;
  
  // Días
  authorized_days: any[];
  used_days: any[];
  
  // Datos del evento (joined)
  event?: {
    id: string;
    name: string;
    start_date: any;
    end_date: any;
    location: string;
    description?: string;
  };
  
  // Timestamps
  created_at: any;
  updated_at: any;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params;

    console.log('🔍 Getting tickets for order:', orderId);

    // Validar que orderId existe y no es undefined
    if (!orderId || orderId === 'undefined') {
      console.error('❌ Invalid order ID:', orderId);
      return NextResponse.json({ 
        error: 'Order ID is required and cannot be undefined',
        received: orderId 
      }, { status: 400 });
    }

    // Validar que adminDb está disponible
    if (!adminDb) {
      console.error('❌ Firebase admin db not initialized');
      return NextResponse.json({ 
        error: 'Database connection not available' 
      }, { status: 500 });
    }

    console.log('🔍 Searching in Firestore for order_id:', orderId);

    // 🆕 CONSULTA SIMPLIFICADA SIN ORDERBY PRIMERO
    let ticketsSnapshot;
    
    try {
      // Primero intentar sin orderBy para evitar problemas de index
      ticketsSnapshot = await adminDb.collection('tickets')
        .where('order_id', '==', orderId)
        .get();
        
      console.log(`📋 Simple query executed. Found ${ticketsSnapshot.size} tickets`);
      
      // Si no encuentra nada, probar con diferentes campos
      if (ticketsSnapshot.empty) {
        console.log('⚠️ No tickets found with order_id, trying orderID field...');
        
        ticketsSnapshot = await adminDb.collection('tickets')
          .where('orderID', '==', orderId)
          .get();
          
        console.log(`📋 Alternative query executed. Found ${ticketsSnapshot.size} tickets`);
      }
      
    } catch (error) {
      console.error('❌ Query error:', error);
      
      // Fallback: obtener todos los tickets y filtrar manualmente
      console.log('🔄 Fallback: getting all tickets and filtering manually...');
      const allTicketsSnapshot = await adminDb.collection('tickets').get();
      console.log(`📋 Retrieved ${allTicketsSnapshot.size} total tickets for manual filtering`);
      
      const matchingDocs: any[] = [];
      allTicketsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.order_id === orderId || data.orderID === orderId) {
          matchingDocs.push(doc);
        }
      });
      
      // Crear un mock snapshot
      ticketsSnapshot = {
        size: matchingDocs.length,
        empty: matchingDocs.length === 0,
        forEach: (callback: (doc: any) => void) => {
          matchingDocs.forEach(callback);
        }
      } as any;
      
      console.log(`📋 Manual filtering found ${matchingDocs.length} tickets`);
    }

    if (ticketsSnapshot.empty) {
      console.log('❌ No tickets found for order:', orderId);
      
      // Debug: mostrar algunos tickets para comparar
      const sampleTickets = await adminDb.collection('tickets').limit(5).get();
      const sampleOrderIds: string[] = [];
      sampleTickets.forEach(doc => {
        const data = doc.data();
        sampleOrderIds.push(data.order_id || data.orderID || 'no-order-id');
      });
      
      console.log('📋 Sample order_ids in database:', sampleOrderIds);
      
      return NextResponse.json({ 
        error: 'No tickets found for this order',
        orderId,
        sampleOrderIds: process.env.NODE_ENV === 'development' ? sampleOrderIds : undefined,
        suggestion: 'Verify the order ID is correct or that the payment was completed successfully'
      }, { status: 404 });
    }

    console.log(`📋 Processing ${ticketsSnapshot.size} tickets`);

    // Convertir tickets a array
    const tickets: TicketWithEvent[] = [];
    const eventIds = new Set<string>();

    ticketsSnapshot.forEach((doc: any) => {
      const data = doc.data();
      console.log(`📝 Processing ticket ${doc.id}:`, {
        customer_email: data.customer_email,
        ticket_type_name: data.ticket_type_name,
        status: data.status,
        event_id: data.event_id,
        order_id: data.order_id || data.orderID
      });

      const ticket: TicketWithEvent = {
        id: doc.id,
        // Datos básicos
        user_id: data.user_id || undefined,
        customer_email: data.customer_email,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        customer_company: data.customer_company || undefined,
        event_id: data.event_id,
        ticket_type_id: data.ticket_type_id,
        ticket_type_name: data.ticket_type_name,
        
        // Estado
        status: data.status || 'purchased',
        
        // Pago
        order_id: data.order_id || data.orderID,
        capture_id: data.capture_id,
        purchase_date: data.purchase_date,
        amount_paid: data.amount_paid,
        currency: data.currency,
        
        // QR y PDF
        qr_id: data.qr_id,
        pdf_url: data.pdf_url || undefined,
        
        // Asistente
        attendee_name: data.attendee_name || undefined,
        attendee_email: data.attendee_email || undefined,
        attendee_phone: data.attendee_phone || undefined,
        special_requirements: data.special_requirements || undefined,
        
        // Días (convertir Timestamps a Dates)
        authorized_days: (data.authorized_days || []).map((day: any) => 
          day && day.toDate ? day.toDate() : new Date(day)
        ),
        used_days: (data.used_days || []).map((day: any) => 
          day && day.toDate ? day.toDate() : new Date(day)
        ),
        
        // Timestamps
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      tickets.push(ticket);
      if (data.event_id) {
        eventIds.add(data.event_id);
      }
    });

    console.log(`🎪 Found ${eventIds.size} unique events`);

    // Obtener información de los eventos
    const eventsData: Record<string, any> = {};
    
    for (const eventId of eventIds) {
      try {
        console.log(`🔍 Fetching event: ${eventId}`);
        const eventDoc = await adminDb.collection('events').doc(eventId).get();
        if (eventDoc.exists) {
          const eventData = eventDoc.data()!;
          eventsData[eventId] = {
            id: eventDoc.id,
            name: eventData.name,
            start_date: eventData.start_date,
            end_date: eventData.end_date,
            location: eventData.location,
            description: eventData.description,
            slug: eventData.slug,
          };
          console.log(`✅ Event loaded: ${eventData.name}`);
        } else {
          console.warn(`⚠️ Event ${eventId} not found`);
        }
      } catch (error) {
        console.error(`❌ Error fetching event ${eventId}:`, error);
      }
    }

    // Agregar datos del evento a cada ticket
    tickets.forEach(ticket => {
      if (ticket.event_id && eventsData[ticket.event_id]) {
        ticket.event = eventsData[ticket.event_id];
      }
    });

    // Calcular resumen
    const summary = {
      totalTickets: tickets.length,
      configuredTickets: tickets.filter(t => t.status === 'configured').length,
      usedTickets: tickets.filter(t => t.status === 'used').length,
      pendingTickets: tickets.filter(t => t.status === 'purchased').length,
      events: Array.from(eventIds).map(id => eventsData[id]).filter(Boolean),
      totalAmount: tickets.reduce((sum, t) => sum + (t.amount_paid || 0), 0),
      currency: tickets[0]?.currency || 'MXN'
    };

    console.log('📊 Order summary:', summary);

    return NextResponse.json({
      success: true,
      orderId,
      tickets,
      summary,
      message: `Found ${tickets.length} tickets`
    });

  } catch (error) {
    console.error('❌ Error getting tickets by order:', error);
    
    // Log detallado del error
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      orderId: (error as any)?.orderId || 'N/A'
    });

    return NextResponse.json(
      { 
        error: 'Failed to get tickets',
        details: error instanceof Error ? error.message : 'Unknown error',
        orderId: (error as any)?.orderId || null
      },
      { status: 500 }
    );
  }
}
