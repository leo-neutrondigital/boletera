import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getAuthFromRequest, requireRoles } from '@/lib/auth/server-auth';

/**
 * 🎁 API para obtener cortesías agrupadas por orden
 * Similar a my-tickets pero para panel administrativo
 */
export async function GET(request: NextRequest) {
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

    console.log('🔍 Loading courtesy orders grouped by order_id...');

    // Buscar todas las cortesías
    const courtesyTicketsSnapshot = await adminDb
      .collection('tickets')
      .where('is_courtesy', '==', true)
      .orderBy('created_at', 'desc')
      .limit(500) // Aumentar límite para manejar múltiples órdenes
      .get();

    const allTickets = courtesyTicketsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Convertir timestamps de Firestore
      created_at: doc.data().created_at?.toDate() || new Date(),
      purchase_date: doc.data().purchase_date?.toDate() || new Date(),
      updated_at: doc.data().updated_at?.toDate() || null,
      order_id: doc.data().order_id || undefined,
      currency: doc.data().currency || undefined,
      courtesy_type: doc.data().courtesy_type || undefined,
      event_id: doc.data().event_id || undefined,
      customer_email: doc.data().customer_email || undefined,
      customer_name: doc.data().customer_name || undefined,
      attendee_name: doc.data().attendee_name || undefined,
      attendee_email: doc.data().attendee_email || undefined,
      status: doc.data().status || undefined,
    }));

    // Agrupar por order_id
    const orderGroups = allTickets.reduce((acc, ticket) => {
      const orderId = ticket.order_id || 'unknown';
      
      if (!acc[orderId]) {
        acc[orderId] = {
          order_id: orderId,
          tickets: [],
          total_tickets: 0,
          configured_tickets: 0,
          pending_tickets: 0,
          total_amount: 0,
          currency: ticket.currency || 'MXN',
          created_at: ticket.created_at,
          courtesy_type: ticket.courtesy_type,
          event_id: ticket.event_id,
          event_name: '', // Se llenará después
          customer_email: ticket.customer_email,
          customer_name: ticket.customer_name,
        };
      }

      acc[orderId].tickets.push(ticket);
      acc[orderId].total_tickets++;
      
      // Contar configurados (con datos del asistente)
      if (ticket.attendee_name && ticket.attendee_email) {
        acc[orderId].configured_tickets++;
      } else {
        acc[orderId].pending_tickets++;
      }

      return acc;
    }, {} as Record<string, any>);

    // Convertir a array y obtener información de eventos
    const orders = Object.values(orderGroups);

    // Obtener información de eventos únicos
    const eventIds = [...new Set(orders.map(order => order.event_id))];
    const eventsPromises = eventIds.map(id => 
      adminDb.collection('events').doc(id).get()
    );
    
    const eventsData = await Promise.all(eventsPromises);
    const eventsMap = eventsData.reduce((acc, doc) => {
      if (doc.exists) {
        acc[doc.id] = {
          id: doc.id,
          ...doc.data(),
          start_date: doc.data()?.start_date?.toDate() || new Date(),
          end_date: doc.data()?.end_date?.toDate() || new Date(),
        };
      }
      return acc;
    }, {} as Record<string, any>);

    // Enriquecer órdenes con información de eventos
    const enrichedOrders = orders.map(order => ({
      ...order,
      event_name: eventsMap[order.event_id]?.name || 'Evento no encontrado',
      event_start_date: eventsMap[order.event_id]?.start_date || new Date(),
      event_end_date: eventsMap[order.event_id]?.end_date || new Date(),
      event_location: eventsMap[order.event_id]?.location || '',
    }));

    // Ordenar por fecha de creación (más recientes primero)
    enrichedOrders.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Estadísticas globales
    const stats = {
      total_orders: enrichedOrders.length,
      total_tickets: allTickets.length,
      configured_tickets: allTickets.filter(t => t.attendee_name && t.attendee_email).length,
      pending_tickets: allTickets.filter(t => !t.attendee_name || !t.attendee_email).length,
      by_courtesy_type: allTickets.reduce((acc, ticket) => {
        const type = ticket.courtesy_type || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      by_status: allTickets.reduce((acc, ticket) => {
        const status = ticket.status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    console.log(`✅ Found ${enrichedOrders.length} courtesy orders with ${allTickets.length} total tickets`);

    return NextResponse.json({
      success: true,
      orders: enrichedOrders,
      stats,
      message: `Found ${enrichedOrders.length} courtesy orders`
    });

  } catch (error) {
    console.error('❌ Error loading courtesy orders:', error);
    return NextResponse.json(
      { 
        error: 'Failed to load courtesy orders',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
