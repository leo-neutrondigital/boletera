import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getAuthFromRequest } from '@/lib/auth/server-auth';

// ✅ Forzar modo dinámico para usar request.headers
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface TicketSummary {
  id: string;
  order_id: string;
  event_id: string;
  ticket_type_name: string;
  status: 'purchased' | 'configured' | 'used';
  amount_paid: number;
  currency: string;
  purchase_date: any;
  attendee_name?: string;
  attendee_email?: string;
  authorized_days: any[];
  used_days: any[];
  created_at: any;
}

interface OrderSummary {
  id: string;
  createdAt: any;
  ticketCount: number;
  configuredTickets: number;
  pendingTickets: number;
  usedTickets: number;
  totalAmount: number;
  currency: string;
  allConfigured: boolean;
  tickets: TicketSummary[];
}

interface EventGroup {
  event_id: string;
  event_name: string;
  event_location: string;
  event_start_date: any;
  event_end_date: any;
  event_description?: string;
  totalTickets: number;
  totalAmount: number;
  totalOrders: number;
  currency: string;
  configuredTickets: number;
  pendingTickets: number;
  usedTickets: number;
  orders: OrderSummary[];
}

interface UserTicketsResponse {
  success: boolean;
  userId: string;
  events: EventGroup[];
  summary: {
    totalTickets: number;
    totalEvents: number;
    totalAmount: number;
    totalOrders: number;
    configuredTickets: number;
    pendingTickets: number;
    usedTickets: number;
    currency: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;

    console.log('🔍 Getting all tickets for user:', userId);

    // Validar que userId existe
    if (!userId || userId === 'undefined') {
      return NextResponse.json({ 
        error: 'User ID is required and cannot be undefined' 
      }, { status: 400 });
    }

    // Verificar autenticación y permisos
    const authUser = await getAuthFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verificar que es el propio usuario o admin
    const isOwnUser = authUser.uid === userId;
    const isAdmin = authUser.roles?.includes('admin') || false;
    
    if (!isOwnUser && !isAdmin) {
      console.log('❌ Access denied:', {
        requestingUser: authUser.uid,
        requestedUser: userId,
        isAdmin
      });
      return NextResponse.json({ 
        error: 'Forbidden - You can only access your own tickets' 
      }, { status: 403 });
    }

    console.log('✅ Access granted:', { isOwnUser, isAdmin });

    // Buscar todos los tickets del usuario
    let ticketsSnapshot;
    
    try {
      // Buscar por user_id
      ticketsSnapshot = await adminDb.collection('tickets')
        .where('user_id', '==', userId)
        .get();
        
      console.log(`📋 Found ${ticketsSnapshot.size} tickets by user_id`);
      
      // Si no encuentra por user_id, buscar por customer_email
      if (ticketsSnapshot.empty && authUser.email) {
        console.log('🔄 Trying search by customer_email:', authUser.email);
        
        ticketsSnapshot = await adminDb.collection('tickets')
          .where('customer_email', '==', authUser.email.toLowerCase())
          .get();
          
        console.log(`📋 Found ${ticketsSnapshot.size} tickets by customer_email`);
      }
      
    } catch (error) {
      console.error('❌ Query error:', error);
      
      // Fallback: obtener todos los tickets y filtrar manualmente
      console.log('🔄 Fallback: manual filtering...');
      const allTicketsSnapshot = await adminDb.collection('tickets').get();
      
      const matchingDocs: any[] = [];
      allTicketsSnapshot.forEach(doc => {
        const data = doc.data();
        const matchesUserId = data.user_id === userId;
        const matchesEmail = authUser.email && 
          data.customer_email?.toLowerCase() === authUser.email.toLowerCase();
          
        if (matchesUserId || matchesEmail) {
          matchingDocs.push(doc);
        }
      });
      
      // Crear mock snapshot
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
      console.log('📭 No tickets found for user:', userId);
      
      return NextResponse.json({
        success: true,
        userId,
        events: [],
        summary: {
          totalTickets: 0,
          totalEvents: 0,
          totalAmount: 0,
          totalOrders: 0,
          configuredTickets: 0,
          pendingTickets: 0,
          usedTickets: 0,
          currency: 'MXN'
        }
      } as UserTicketsResponse);
    }

    console.log(`📋 Processing ${ticketsSnapshot.size} tickets`);

    // 🆕 Procesar tickets y agrupar por evento → orden
    const eventGroupsMap = new Map<string, EventGroup>();
    const eventIds = new Set<string>();

    ticketsSnapshot.forEach((doc: any) => {
      const data = doc.data();
      
      console.log(`📝 Processing ticket ${doc.id}:`, {
        event_id: data.event_id,
        ticket_type_name: data.ticket_type_name,
        status: data.status,
        order_id: data.order_id || data.orderID
      });

      const ticket: TicketSummary = {
        id: doc.id,
        order_id: data.order_id || data.orderID,
        event_id: data.event_id,
        ticket_type_name: data.ticket_type_name,
        status: data.status || 'purchased',
        amount_paid: data.amount_paid || 0,
        currency: data.currency || 'MXN',
        purchase_date: data.purchase_date,
        attendee_name: data.attendee_name,
        attendee_email: data.attendee_email,
        authorized_days: data.authorized_days || [],
        used_days: data.used_days || [],
        created_at: data.created_at,
      };

      eventIds.add(data.event_id);

      // Crear grupo de evento si no existe
      if (!eventGroupsMap.has(data.event_id)) {
        eventGroupsMap.set(data.event_id, {
          event_id: data.event_id,
          event_name: 'Cargando...', // Se actualizará con datos reales
          event_location: '',
          event_start_date: null,
          event_end_date: null,
          totalTickets: 0,
          totalAmount: 0,
          totalOrders: 0,
          currency: ticket.currency,
          configuredTickets: 0,
          pendingTickets: 0,
          usedTickets: 0,
          orders: []
        });
      }

      const eventGroup = eventGroupsMap.get(data.event_id)!;
      
      // 🆕 Buscar o crear orden dentro del evento
      let orderSummary = eventGroup.orders.find(order => order.id === ticket.order_id);
      
      if (!orderSummary) {
        orderSummary = {
          id: ticket.order_id,
          createdAt: ticket.created_at,
          ticketCount: 0,
          configuredTickets: 0,
          pendingTickets: 0,
          usedTickets: 0,
          totalAmount: 0,
          currency: ticket.currency,
          allConfigured: false,
          tickets: []
        };
        eventGroup.orders.push(orderSummary);
      }

      // Agregar ticket a la orden
      orderSummary.tickets.push(ticket);
      orderSummary.ticketCount++;
      orderSummary.totalAmount += ticket.amount_paid;

      // Actualizar contadores por estado
      switch (ticket.status) {
        case 'configured':
          orderSummary.configuredTickets++;
          break;
        case 'purchased':
          orderSummary.pendingTickets++;
          break;
        case 'used':
          orderSummary.usedTickets++;
          break;
      }

      // Determinar si todas están configuradas
      orderSummary.allConfigured = orderSummary.pendingTickets === 0 && orderSummary.ticketCount > 0;
    });

    console.log(`🎪 Found ${eventIds.size} unique events`);

    // Obtener información de los eventos
    for (const eventId of eventIds) {
      try {
        console.log(`🔍 Fetching event: ${eventId}`);
        const eventDoc = await adminDb.collection('events').doc(eventId).get();
        
        if (eventDoc.exists) {
          const eventData = eventDoc.data()!;
          const eventGroup = eventGroupsMap.get(eventId)!;
          
          // Actualizar información del evento
          eventGroup.event_name = eventData.name;
          eventGroup.event_location = eventData.location;
          eventGroup.event_start_date = eventData.start_date;
          eventGroup.event_end_date = eventData.end_date;
          eventGroup.event_description = eventData.description;
          
          console.log(`✅ Event loaded: ${eventData.name}`);
        } else {
          console.warn(`⚠️ Event ${eventId} not found`);
        }
      } catch (error) {
        console.error(`❌ Error fetching event ${eventId}:`, error);
      }
    }

    // 🆕 Calcular estadísticas por evento (sumando todas las órdenes)
    eventGroupsMap.forEach((eventGroup) => {
      // Ordenar órdenes por fecha (más recientes primero)
      eventGroup.orders.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
      });

      // Actualizar estadísticas globales del evento
      eventGroup.totalOrders = eventGroup.orders.length;
      eventGroup.totalTickets = eventGroup.orders.reduce((sum, order) => sum + order.ticketCount, 0);
      eventGroup.totalAmount = eventGroup.orders.reduce((sum, order) => sum + order.totalAmount, 0);
      eventGroup.configuredTickets = eventGroup.orders.reduce((sum, order) => sum + order.configuredTickets, 0);
      eventGroup.pendingTickets = eventGroup.orders.reduce((sum, order) => sum + order.pendingTickets, 0);
      eventGroup.usedTickets = eventGroup.orders.reduce((sum, order) => sum + order.usedTickets, 0);
      
      // Ordenar tickets dentro de cada orden por fecha
      eventGroup.orders.forEach(order => {
        order.tickets.sort((a, b) => {
          const dateA = a.created_at?.toDate?.() || new Date(a.created_at || 0);
          const dateB = b.created_at?.toDate?.() || new Date(b.created_at || 0);
          return dateB.getTime() - dateA.getTime();
        });
      });
    });

    // Convertir Map a array y ordenar por fecha del evento
    const events = Array.from(eventGroupsMap.values()).sort((a, b) => {
      const dateA = a.event_start_date?.toDate?.() || new Date(a.event_start_date || 0);
      const dateB = b.event_start_date?.toDate?.() || new Date(b.event_start_date || 0);
      return dateA.getTime() - dateB.getTime(); // Próximos eventos primero
    });

    // Calcular resumen global
    const globalSummary = {
      totalTickets: events.reduce((sum, event) => sum + event.totalTickets, 0),
      totalEvents: events.length,
      totalAmount: events.reduce((sum, event) => sum + event.totalAmount, 0),
      totalOrders: events.reduce((sum, event) => sum + event.totalOrders, 0),
      configuredTickets: events.reduce((sum, event) => sum + event.configuredTickets, 0),
      pendingTickets: events.reduce((sum, event) => sum + event.pendingTickets, 0),
      usedTickets: events.reduce((sum, event) => sum + event.usedTickets, 0),
      currency: events[0]?.currency || 'MXN'
    };

    console.log('📊 User tickets summary:', globalSummary);
    console.log('🎪 Events with orders:', events.map(e => ({
      name: e.event_name,
      orders: e.orders.length,
      tickets: e.totalTickets
    })));

    const response: UserTicketsResponse = {
      success: true,
      userId,
      events,
      summary: globalSummary
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error getting user tickets:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get user tickets',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
