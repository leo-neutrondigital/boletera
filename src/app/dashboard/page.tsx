// src/app/dashboard/page.tsx
import { getAllEventsAdmin } from '@/lib/api/events-admin';
import { getPaidOrdersByEventAdmin } from '@/lib/api/orders-admin';
import { getPreregistrationStatsAdmin } from '@/lib/api/preregistrations-admin';
import DashboardPageClient from './dashboard-page-client';

export default async function DashboardPage() {
  // Cargar estadísticas iniciales en servidor (SSR)
  console.log('🏠 Loading dashboard stats on server...');

  try {
    // Obtener todos los eventos publicados
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

    // Obtener órdenes pagadas de todos los eventos para el mes actual
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

    // Contar preregistros activos
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

    const initialStats = {
      totalEvents: filteredEvents.length,
      totalTicketsSold,
      totalRevenue,
      totalPreregistrations,
      recentEvents: upcomingEvents,
      recentOrders,
    };

    console.log('✅ Dashboard stats loaded on server:', {
      events: initialStats.totalEvents,
      tickets: initialStats.totalTicketsSold,
      revenue: initialStats.totalRevenue,
      preregistrations: initialStats.totalPreregistrations
    });

    return <DashboardPageClient initialStats={initialStats} />;

  } catch (error) {
    console.error('❌ Error loading dashboard stats on server:', error);
    
    // Fallback a stats vacíos si hay error
    const fallbackStats = {
      totalEvents: 0,
      totalTicketsSold: 0,
      totalRevenue: 0,
      totalPreregistrations: 0,
      recentEvents: [],
      recentOrders: [],
    };

    return <DashboardPageClient initialStats={fallbackStats} />;
  }
}
