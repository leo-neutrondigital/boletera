import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
// import type { Ticket, Order } from '@/types'; // Eliminado porque Order no existe

const COLLECTION_NAME = 'tickets';

// ✅ Crear boletos desde orden pagada
export async function createTicketsFromOrder(order: any): Promise<string[]> {
  try {
    const batch = writeBatch(db);
    const ticketIds: string[] = [];
    
    // Crear un boleto por cada item en el carrito
    for (const item of order.cart_snapshot.items) {
      for (let i = 0; i < item.quantity; i++) {
        const ticketRef = doc(collection(db, COLLECTION_NAME));
        ticketIds.push(ticketRef.id);
        
        // Generar código QR único
        const qrCode = `${order.id}-${ticketRef.id}-${Date.now()}`;
        
        // Determinar días de acceso basado en el tipo de boleto
        const accessDays = item.selected_days || [];
        
        // Información del asistente (por defecto el comprador)
        const attendeeInfo = item.attendee_info?.[i] || {
          name: '', // Se llenará después
          email: '', // Se llenará después
        };
        
  const ticketData = {
          order_id: order.id,
          user_id: order.user_id,
          event_id: order.event_id,
          ticket_type_id: item.ticket_type_id,
          
          // Información del asistente
          attendee_name: attendeeInfo.name,
          attendee_email: attendeeInfo.email,
          attendee_company: attendeeInfo.company,
          
          // Estado inicial
          status: 'purchased',
          
          // QR y PDF (PDF se generará después)
          qr_code: qrCode,
          pdf_url: '', // Se actualizará cuando se genere el PDF
          
          // Control de acceso
          access_days: accessDays,
          used_days: [],
          
          // Timestamps
          created_at: new Date(),
        };
        
        batch.set(ticketRef, {
          ...ticketData,
          created_at: serverTimestamp(),
        });
      }
    }
    
    await batch.commit();
    return ticketIds;
  } catch (error) {
    console.error('Error creating tickets from order:', error);
    throw error;
  }
}

// ✅ Obtener boleto por ID
export async function getTicketById(ticketId: string): Promise<any | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, ticketId);
    const snapshot = await getDoc(docRef);
    
    if (!snapshot.exists()) {
      return null;
    }
    
    const data = snapshot.data();
    return {
      id: snapshot.id,
      ...data,
      created_at: data.created_at?.toDate() || new Date(),
      last_validated_at: data.last_validated_at?.toDate(),
    };
  } catch (error) {
    console.error('Error fetching ticket:', error);
    throw error;
  }
}

// ✅ Obtener boletos por usuario
export async function getTicketsByUser(userId: string): Promise<any[]> {
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
        last_validated_at: data.last_validated_at?.toDate(),
      };
    });
  } catch (error) {
    console.error('Error fetching user tickets:', error);
    throw error;
  }
}

// ✅ Obtener boletos por evento
export async function getTicketsByEvent(eventId: string): Promise<any[]> {
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
        last_validated_at: data.last_validated_at?.toDate(),
  };
    });
  } catch (error) {
    console.error('Error fetching event tickets:', error);
    throw error;
  }
}

// ✅ Obtener boletos por orden
export async function getTicketsByOrder(orderId: string): Promise<any[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('order_id', '==', orderId),
      orderBy('created_at', 'asc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        created_at: data.created_at?.toDate() || new Date(),
        last_validated_at: data.last_validated_at?.toDate(),
  };
    });
  } catch (error) {
    console.error('Error fetching order tickets:', error);
    throw error;
  }
}

// ✅ Buscar boleto por código QR
export async function getTicketByQRCode(qrCode: string): Promise<any | null> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('qr_code', '==', qrCode)
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
      last_validated_at: data.last_validated_at?.toDate(),
  };
  } catch (error) {
    console.error('Error fetching ticket by QR code:', error);
    throw error;
  }
}

// ✅ Validar boleto (marcar como usado para un día específico)
export async function validateTicket(
  ticketId: string, 
  validationDate: Date = new Date()
): Promise<{ success: boolean; message: string }> {
  try {
    const ticket = await getTicketById(ticketId);
    
    if (!ticket) {
      return { success: false, message: 'Boleto no encontrado' };
    }
    
  if (ticket.status !== 'purchased') {
      return { success: false, message: 'Boleto no válido' };
    }
    
    // Verificar si el día está autorizado
    const validationDay = validationDate.toISOString().split('T')[0];
  const authorizedDays = (ticket.access_days as any[]).map((d: any) => d.toISOString().split('T')[0]);
    
    if (authorizedDays.length > 0 && !authorizedDays.includes(validationDay)) {
      return { success: false, message: 'Boleto no válido para este día' };
    }
    
    // Verificar si ya fue usado este día
  const usedDays = (ticket.used_days as any[]).map((d: any) => d.toISOString().split('T')[0]);
    
    if (usedDays.includes(validationDay)) {
      return { success: false, message: 'Boleto ya utilizado para este día' };
    }
    
    // Marcar como usado
    const docRef = doc(db, COLLECTION_NAME, ticketId);
    await updateDoc(docRef, {
      used_days: [...ticket.used_days, validationDate],
      last_validated_at: serverTimestamp(),
    });
    
    return { success: true, message: 'Boleto validado correctamente' };
  } catch (error) {
    console.error('Error validating ticket:', error);
    return { success: false, message: 'Error al validar boleto' };
  }
}

// ✅ Actualizar URL del PDF
export async function updateTicketPDFUrl(ticketId: string, pdfUrl: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, ticketId);
    await updateDoc(docRef, {
      pdf_url: pdfUrl,
    });
  } catch (error) {
    console.error('Error updating ticket PDF URL:', error);
    throw error;
  }
}

// ✅ Actualizar información del asistente
export async function updateTicketAttendeeInfo(
  ticketId: string, 
  attendeeInfo: {
    name: string;
    email: string;
    company?: string;
  }
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, ticketId);
    await updateDoc(docRef, {
      attendee_name: attendeeInfo.name,
      attendee_email: attendeeInfo.email,
      attendee_company: attendeeInfo.company || '',
    });
  } catch (error) {
    console.error('Error updating ticket attendee info:', error);
    throw error;
  }
}

// ✅ Cancelar boleto
export async function cancelTicket(ticketId: string, reason?: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, ticketId);
    await updateDoc(docRef, {
      status: 'cancelled',
      cancellation_reason: reason || 'Cancelado por el usuario',
      cancelled_at: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error cancelling ticket:', error);
    throw error;
  }
}

// ✅ Estadísticas de boletos por evento
export async function getTicketStatsForEvent(eventId: string) {
  try {
    const tickets = await getTicketsByEvent(eventId);
    
    const stats = {
      total: tickets.length,
  active: tickets.filter((t: any) => t.status === 'purchased').length,
      used: tickets.filter(t => t.used_days.length > 0).length,
  cancelled: tickets.filter((t: any) => t.status === 'cancelled').length,
      by_type: {} as Record<string, number>,
      usage_by_day: {} as Record<string, number>,
    };
    
    tickets.forEach(ticket => {
      // Por tipo
      stats.by_type[ticket.ticket_type_id] = (stats.by_type[ticket.ticket_type_id] || 0) + 1;
      
      // Por día de uso
  (ticket.used_days as any[]).forEach((usedDay: any) => {
        const day = usedDay.toISOString().split('T')[0];
        stats.usage_by_day[day] = (stats.usage_by_day[day] || 0) + 1;
      });
    });
    
    return stats;
  } catch (error) {
    console.error('Error getting ticket stats:', error);
    throw error;
  }
}
