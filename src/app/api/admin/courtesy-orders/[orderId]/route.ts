import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getAuthFromRequest, requireRoles } from '@/lib/auth/server-auth';

/**
 * 🎁 API para obtener una orden específica de cortesías
 * Reutiliza lógica similar a my-tickets pero para admin
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
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

    const { orderId } = params;

    console.log(`🔍 Loading courtesy order: ${orderId}`);

    // Buscar todos los tickets de esta orden
    const ticketsSnapshot = await adminDb
      .collection('tickets')
      .where('order_id', '==', orderId)
      .where('is_courtesy', '==', true)
      .orderBy('created_at', 'asc')
      .get();

    if (ticketsSnapshot.empty) {
      return NextResponse.json(
        { error: 'Order not found or not a courtesy order' },
        { status: 404 }
      );
    }

    const tickets = ticketsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Convertir timestamps de Firestore a fechas
      created_at: doc.data().created_at?.toDate() || new Date(),
      purchase_date: doc.data().purchase_date?.toDate() || new Date(),
      updated_at: doc.data().updated_at?.toDate() || null,
      authorized_days: doc.data().authorized_days?.map((day: any) => 
        day.toDate ? day.toDate() : new Date(day)
      ) || [],
      used_days: doc.data().used_days?.map((day: any) => 
        day.toDate ? day.toDate() : new Date(day)
      ) || [],
    }));

    // Obtener información del evento
    const eventId = tickets[0].event_id;
    const eventDoc = await adminDb.collection('events').doc(eventId).get();
    
    if (!eventDoc.exists) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    const eventData = {
      id: eventDoc.id,
      ...eventDoc.data(),
      start_date: eventDoc.data()?.start_date?.toDate() || new Date(),
      end_date: eventDoc.data()?.end_date?.toDate() || new Date(),
    };

    // Obtener tipos de boletos únicos
    const ticketTypeIds = [...new Set(tickets.map(t => t.ticket_type_id))];
    const ticketTypesPromises = ticketTypeIds.map(id => 
      adminDb.collection('ticket_types').doc(id).get()
    );
    
    const ticketTypesData = await Promise.all(ticketTypesPromises);
    const ticketTypes = ticketTypesData
      .filter(doc => doc.exists)
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convertir fechas
        sale_start: doc.data()?.sale_start?.toDate() || null,
        sale_end: doc.data()?.sale_end?.toDate() || null,
        available_days: doc.data()?.available_days?.map((day: any) => 
          day.toDate ? day.toDate() : new Date(day)
        ) || [],
      }));

    // Estadísticas de la orden
    const orderStats = {
      total_tickets: tickets.length,
      configured_tickets: tickets.filter(t => t.attendee_name && t.attendee_email).length,
      pending_tickets: tickets.filter(t => !t.attendee_name || !t.attendee_email).length,
      generated_tickets: tickets.filter(t => t.pdf_url).length,
      total_amount: tickets.reduce((sum, t) => sum + (t.amount_paid || 0), 0),
      courtesy_type: tickets[0].courtesy_type,
      created_at: tickets[0].created_at,
      customer_name: tickets[0].customer_name,
      customer_email: tickets[0].customer_email,
    };

    console.log(`✅ Found order ${orderId} with ${tickets.length} tickets`);

    return NextResponse.json({
      success: true,
      order_id: orderId,
      tickets,
      event: eventData,
      ticket_types: ticketTypes,
      stats: orderStats,
      message: `Order ${orderId} loaded successfully`
    });

  } catch (error) {
    console.error('❌ Error loading courtesy order:', error);
    return NextResponse.json(
      { 
        error: 'Failed to load courtesy order',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * 🆕 DELETE: Eliminar orden completa de cortesías
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
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

    const { orderId } = params;

    console.log(`🗑️ Deleting courtesy order: ${orderId}`);

    // Buscar todos los tickets de esta orden
    const ticketsSnapshot = await adminDb
      .collection('tickets')
      .where('order_id', '==', orderId)
      .where('is_courtesy', '==', true)
      .get();

    if (ticketsSnapshot.empty) {
      return NextResponse.json(
        { error: 'Order not found or not a courtesy order' },
        { status: 404 }
      );
    }

    // Crear batch para eliminar todos los tickets
    const batch = adminDb.batch();
    const ticketsToDelete = [];

    ticketsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
      ticketsToDelete.push({
        id: doc.id,
        attendee_name: doc.data().attendee_name || 'Sin configurar',
        ticket_type_name: doc.data().ticket_type_name
      });
    });

    // Ejecutar eliminación en batch
    await batch.commit();

    console.log(`✅ Deleted order ${orderId} with ${ticketsToDelete.length} tickets`);

    return NextResponse.json({
      success: true,
      message: `Orden ${orderId.slice(-8).toUpperCase()} eliminada exitosamente`,
      deleted_order_id: orderId,
      deleted_tickets: ticketsToDelete.length,
      tickets_details: ticketsToDelete
    });

  } catch (error) {
    console.error('❌ Error deleting courtesy order:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete courtesy order',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
