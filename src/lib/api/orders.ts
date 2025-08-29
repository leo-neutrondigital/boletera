import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
// import type { Order, Cart } from '@/types'; // Eliminado porque no existen

const COLLECTION_NAME = 'orders';

// ✅ Crear orden desde carrito
export async function createOrderFromCart(data: {
  user_id: string;
  event_id: string;
  cart_snapshot: any;
  payment_provider: 'paypal';
  total_amount: number;
  currency: 'MXN' | 'USD';
}): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...data,
      status: 'pending',
      created_at: serverTimestamp(),
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
}

// ✅ Obtener orden por ID
export async function getOrderById(orderId: string): Promise<any | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, orderId);
    const snapshot = await getDoc(docRef);
    
    if (!snapshot.exists()) {
      return null;
    }
    
    const data = snapshot.data();
    return {
      id: snapshot.id,
      ...data,
      created_at: data.created_at?.toDate() || new Date(),
      paid_at: data.paid_at?.toDate(),
      // Convertir timestamps en cart_snapshot
      cart_snapshot: {
        ...data.cart_snapshot,
        created_at: data.cart_snapshot.created_at?.toDate() || new Date(),
        expires_at: data.cart_snapshot.expires_at?.toDate() || new Date(),
      },
  };
  } catch (error) {
    console.error('Error fetching order:', error);
    throw error;
  }
}

// ✅ Actualizar estado de orden (webhook PayPal)
export async function updateOrderStatus(
  orderId: string, 
  status: 'paid' | 'failed' | 'cancelled',
  paymentData?: {
    payment_id: string;
    payment_details: any;
  }
): Promise<void> {
  try {
    const updateData: any = {
      status,
      updated_at: serverTimestamp(),
    };
    
    if (status === 'paid' && paymentData) {
      updateData.payment_id = paymentData.payment_id;
      updateData.payment_details = paymentData.payment_details;
      updateData.paid_at = serverTimestamp();
    }
    
    const docRef = doc(db, COLLECTION_NAME, orderId);
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
}

// ✅ Obtener órdenes por usuario
export async function getOrdersByUser(userId: string): Promise<any[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('user_id', '==', userId),
      orderBy('created_at', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        created_at: data.created_at?.toDate() || new Date(),
        paid_at: data.paid_at?.toDate(),
        cart_snapshot: {
          ...data.cart_snapshot,
          created_at: data.cart_snapshot.created_at?.toDate() || new Date(),
          expires_at: data.cart_snapshot.expires_at?.toDate() || new Date(),
        },
  };
    });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    throw error;
  }
}

// ✅ Obtener órdenes por evento
export async function getOrdersByEvent(eventId: string): Promise<any[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('event_id', '==', eventId),
      orderBy('created_at', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        created_at: data.created_at?.toDate() || new Date(),
        paid_at: data.paid_at?.toDate(),
        cart_snapshot: {
          ...data.cart_snapshot,
          created_at: data.cart_snapshot.created_at?.toDate() || new Date(),
          expires_at: data.cart_snapshot.expires_at?.toDate() || new Date(),
        },
  };
    });
  } catch (error) {
    console.error('Error fetching event orders:', error);
    throw error;
  }
}

// ✅ Obtener órdenes pagadas por evento (para reportes)
export async function getPaidOrdersByEvent(eventId: string): Promise<any[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('event_id', '==', eventId),
      where('status', '==', 'paid'),
      orderBy('paid_at', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        created_at: data.created_at?.toDate() || new Date(),
        paid_at: data.paid_at?.toDate(),
        cart_snapshot: {
          ...data.cart_snapshot,
          created_at: data.cart_snapshot.created_at?.toDate() || new Date(),
          expires_at: data.cart_snapshot.expires_at?.toDate() || new Date(),
        },
  };
    });
  } catch (error) {
    console.error('Error fetching paid orders:', error);
    throw error;
  }
}

// ✅ Buscar orden por payment_id de PayPal
export async function getOrderByPaymentId(paymentId: string): Promise<any | null> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('payment_id', '==', paymentId)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    const data = doc.data();
    
    return {
      id: doc.id,
      ...data,
      created_at: data.created_at?.toDate() || new Date(),
      paid_at: data.paid_at?.toDate(),
      cart_snapshot: {
        ...data.cart_snapshot,
        created_at: data.cart_snapshot.created_at?.toDate() || new Date(),
        expires_at: data.cart_snapshot.expires_at?.toDate() || new Date(),
      },
  };
  } catch (error) {
    console.error('Error fetching order by payment ID:', error);
    throw error;
  }
}

// ✅ Estadísticas de ventas por evento
export async function getEventSalesStats(eventId: string) {
  try {
    const orders = await getPaidOrdersByEvent(eventId);
    
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
    console.error('Error getting event sales stats:', error);
    throw error;
  }
}

// ✅ Cancelar orden (solo si está pending)
export async function cancelOrder(orderId: string, reason?: string): Promise<void> {
  try {
    const order = await getOrderById(orderId);
    
    if (!order) {
      throw new Error('Orden no encontrada');
    }
    
    if (order.status !== 'pending') {
      throw new Error('Solo se pueden cancelar órdenes pendientes');
    }
    
    const docRef = doc(db, COLLECTION_NAME, orderId);
    await updateDoc(docRef, {
      status: 'cancelled',
      cancellation_reason: reason || 'Cancelada por el usuario',
      cancelled_at: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    throw error;
  }
}
