import { adminDb } from '@/lib/firebase/admin';
// import type { Order, Cart } from '@/types'; // ← Cart no usado
// import type { Order } from '@/types'; // Eliminado porque no existe

const COLLECTION_NAME = 'orders';

// ✅ Obtener órdenes pagadas por evento (usando Admin SDK)
export async function getPaidOrdersByEventAdmin(eventId: string): Promise<any[]> {
  try {
    const snapshot = await adminDb
      .collection(COLLECTION_NAME)
      .where('event_id', '==', eventId)
      .where('status', '==', 'paid')
      .orderBy('paid_at', 'desc')
      .get();
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        created_at: data.created_at?.toDate() || new Date(),
        paid_at: data.paid_at?.toDate() || new Date(),
        updated_at: data.updated_at?.toDate(),
        cancelled_at: data.cancelled_at?.toDate(),
        cart_snapshot: {
          ...data.cart_snapshot,
          created_at: data.cart_snapshot.created_at?.toDate() || new Date(),
          expires_at: data.cart_snapshot.expires_at?.toDate() || new Date(),
        },
      };
    });
  } catch (error) {
    console.error('Error fetching paid orders (Admin SDK):', error);
    
    // 🔄 Fallback: Try without orderBy if index is missing
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('requires an index')) {
      console.log('⚠️ Index missing, trying fallback query without orderBy...');
      try {
        const fallbackSnapshot = await adminDb
          .collection(COLLECTION_NAME)
          .where('event_id', '==', eventId)
          .where('status', '==', 'paid')
          .get();
        
        const docs = fallbackSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            created_at: data.created_at?.toDate() || new Date(),
            paid_at: data.paid_at?.toDate() || new Date(),
            updated_at: data.updated_at?.toDate(),
            cancelled_at: data.cancelled_at?.toDate(),
            cart_snapshot: {
              ...data.cart_snapshot,
              created_at: data.cart_snapshot.created_at?.toDate() || new Date(),
              expires_at: data.cart_snapshot.expires_at?.toDate() || new Date(),
            },
          };
        });
        
        // Sort manually by paid_at
        return docs.sort((a, b) => (b.paid_at?.getTime() || 0) - (a.paid_at?.getTime() || 0));
      } catch (fallbackError) {
        console.error('❌ Fallback query also failed:', fallbackError);
        return []; // Return empty array instead of throwing
      }
    }
    
    return []; // Return empty array for other errors during build
  }
}

// ✅ Obtener todas las órdenes pagadas (para estadísticas globales)
export async function getAllPaidOrdersAdmin(): Promise<any[]> {
  try {
    const snapshot = await adminDb
      .collection(COLLECTION_NAME)
      .where('status', '==', 'paid')
      .orderBy('paid_at', 'desc')
      .get();
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        created_at: data.created_at?.toDate() || new Date(),
        paid_at: data.paid_at?.toDate() || new Date(),
        updated_at: data.updated_at?.toDate(),
        cancelled_at: data.cancelled_at?.toDate(),
        cart_snapshot: {
          ...data.cart_snapshot,
          created_at: data.cart_snapshot.created_at?.toDate() || new Date(),
          expires_at: data.cart_snapshot.expires_at?.toDate() || new Date(),
        },
  };
    });
  } catch (error) {
    console.error('Error fetching all paid orders (Admin SDK):', error);
    
    // 🔄 Fallback: Try without orderBy if index is missing
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('requires an index')) {
      console.log('⚠️ Index missing, trying fallback query without orderBy...');
      try {
        const fallbackSnapshot = await adminDb
          .collection(COLLECTION_NAME)
          .where('status', '==', 'paid')
          .get();
        
        const docs = fallbackSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            created_at: data.created_at?.toDate() || new Date(),
            paid_at: data.paid_at?.toDate() || new Date(),
            updated_at: data.updated_at?.toDate(),
            cancelled_at: data.cancelled_at?.toDate(),
            cart_snapshot: {
              ...data.cart_snapshot,
              created_at: data.cart_snapshot.created_at?.toDate() || new Date(),
              expires_at: data.cart_snapshot.expires_at?.toDate() || new Date(),
            },
          };
        });
        
        // Sort manually by paid_at
        return docs.sort((a, b) => (b.paid_at?.getTime() || 0) - (a.paid_at?.getTime() || 0));
      } catch (fallbackError) {
        console.error('❌ Fallback query also failed:', fallbackError);
        return []; // Return empty array instead of throwing
      }
    }
    
    return []; // Return empty array for other errors during build
  }
}

// ✅ Estadísticas de ventas por evento (usando Admin SDK)
export async function getEventSalesStatsAdmin(eventId: string) {
  try {
    const orders = await getPaidOrdersByEventAdmin(eventId);
    
    let totalRevenue = 0;
    let totalTickets = 0;
    const salesByDay: Record<string, { amount: number; tickets: number }> = {};
    const salesByCurrency: Record<string, number> = {};
    
    orders.forEach(order => {
      totalRevenue += order.total_amount;
  totalTickets += order.cart_snapshot.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
      
      // Por día
      const day = order.paid_at?.toISOString().split('T')[0] || 'unknown';
      if (!salesByDay[day]) {
        salesByDay[day] = { amount: 0, tickets: 0 };
      }
      salesByDay[day].amount += order.total_amount;
  salesByDay[day].tickets += order.cart_snapshot.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
      
      // Por moneda
      salesByCurrency[order.currency] = (salesByCurrency[order.currency] || 0) + order.total_amount;
    });
    
    return {
      total_orders: orders.length,
      total_revenue: totalRevenue,
      total_tickets: totalTickets,
      average_order_value: orders.length > 0 ? totalRevenue / orders.length : 0,
      sales_by_day: Object.entries(salesByDay).map(([date, data]) => ({
        date,
        amount: data.amount,
        tickets: data.tickets,
      })),
      sales_by_currency: salesByCurrency,
    };
  } catch (error) {
    console.error('Error getting event sales stats (Admin SDK):', error);
    throw error;
  }
}
