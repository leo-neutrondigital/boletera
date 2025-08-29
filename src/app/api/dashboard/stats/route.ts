import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, requireRoles } from '@/lib/auth/server-auth';
import { getAllEventsAdmin } from '@/lib/api/events-admin';
import { getPaidOrdersByEventAdmin, getAllPaidOrdersAdmin } from '@/lib/api/orders-admin';
import { getPreregistrationStatsAdmin } from '@/lib/api/preregistrations-admin';

export async function GET(request: NextRequest) {
  try {
    // Validar autenticación y permisos
    const user = await getAuthFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { error: "No autorizado - Token inválido" },
        { status: 401 }
      );
    }
    
    // Verificar que tenga permisos para ver eventos (admin, gestor, comprobador)
    if (!requireRoles(user.roles, ['admin', 'gestor', 'comprobador'])) {
      return NextResponse.json(
        { error: "No tienes permisos para ver estadísticas" },
        { status: 403 }
      );
    }
    
    console.log('✅ Dashboard stats requested by:', {
      uid: user.uid,
      roles: user.roles,
      email: user.email
    });

    // Obtener todos los eventos publicados usando Admin SDK
    const publishedEvents = await getAllEventsAdmin();
    const filteredEvents = publishedEvents.filter(event => event.published);

    // Calcular estadísticas del mes actual
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Inicializar contadores
    let totalTicketsSold = 0;
    let totalRevenue = 0;
    const allOrders = [];

    // Obtener órdenes pagadas de todos los eventos para el mes actual usando Admin SDK
    for (const event of filteredEvents) {
      try {
        const eventOrders = await getPaidOrdersByEventAdmin(event.id);
        const monthOrders = eventOrders.filter(order => {
          const orderDate = order.paid_at || order.created_at;
          return orderDate >= startOfMonth && orderDate <= endOfMonth;
        });
        
        allOrders.push(...monthOrders);
        
        // Contar boletos y sumar ingresos
        monthOrders.forEach(order => {
          const ticketsInOrder = order.cart_snapshot.items.reduce(
            (sum, item) => sum + item.quantity, 
            0
          );
          totalTicketsSold += ticketsInOrder;
          totalRevenue += order.total_amount;
        });
      } catch (error) {
        console.error(`Error fetching orders for event ${event.id}:`, error);
      }
    }

    // Contar preregistros activos usando Admin SDK
    let totalPreregistrations = 0;
    for (const event of filteredEvents) {
      try {
        const preregStats = await getPreregistrationStatsAdmin(event.id);
        totalPreregistrations += preregStats.nuevo + preregStats.contactado + preregStats.interesado;
      } catch (error) {
        console.error(`Error fetching preregistration stats for event ${event.id}:`, error);
      }
    }

    // Obtener eventos próximos
    const upcomingEvents = filteredEvents
      .filter(event => new Date(event.start_date) >= now)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
      .slice(0, 5);

    // Obtener órdenes recientes
    const recentOrders = allOrders
      .sort((a, b) => {
        const dateA = b.paid_at || b.created_at;
        const dateB = a.paid_at || a.created_at;
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 10);

    const stats = {
      totalEvents: filteredEvents.length,
      totalTicketsSold,
      totalRevenue,
      totalPreregistrations,
      recentEvents: upcomingEvents,
      recentOrders,
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error in dashboard stats API:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}