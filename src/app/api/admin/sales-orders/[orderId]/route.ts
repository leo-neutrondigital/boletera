import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getAuthFromRequest, requireRoles } from '@/lib/auth/server-auth';

// ✅ Forzar modo dinámico para usar request.headers
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * 💰 API para obtener una orden específica de ventas (no cortesías)
 * Similar a courtesy-orders pero para ventas regulares
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

    console.log(`🔍 Loading sales order: ${orderId}`);

    // Primero verificar si existen tickets con este order_id
    const ticketsCountQuery = await adminDb
      .collection('tickets')
      .where('order_id', '==', orderId)
      .get();
      
    console.log(`🎫 Total tickets found with order_id "${orderId}": ${ticketsCountQuery.size}`);
    
    // También verificar tickets de cortesía para debug
    const courtesyTicketsQuery = await adminDb
      .collection('tickets')
      .where('order_id', '==', orderId)
      .where('is_courtesy', '==', true)
      .get();
      
    console.log(`🎁 Courtesy tickets with same order_id: ${courtesyTicketsQuery.size}`);

    // Buscar todos los tickets de esta orden
    // En lugar de filtrar por is_courtesy === false, vamos a buscar todos y filtrar después
    const allTicketsSnapshot = await adminDb
      .collection('tickets')
      .where('order_id', '==', orderId)
      .orderBy('created_at', 'asc')
      .get();

    console.log(`🔍 All tickets found: ${allTicketsSnapshot.size}`);

    // Filtrar tickets de ventas (no cortesías) después de la consulta
    const salesTickets = allTicketsSnapshot.docs.filter(doc => {
      const data = doc.data();
      const isCourtesy = data.is_courtesy === true || !!data.courtesy_type;
      return !isCourtesy;
    });

    console.log(`🔍 Sales tickets after filtering: ${salesTickets.length}`);

    if (salesTickets.length === 0) {
      console.log(`❌ No sales tickets found for order_id: ${orderId}`);
      
      // Debug: mostrar todos los tickets para entender la estructura
      if (allTicketsSnapshot.size > 0) {
        console.log(`🔍 Debug - All tickets for this order_id:`);
        allTicketsSnapshot.docs.forEach((doc, index) => {
          const data = doc.data();
          console.log(`  ${index + 1}. ${doc.id}:`, {
            is_courtesy: data.is_courtesy,
            courtesy_type: data.courtesy_type,
            customer_name: data.customer_name,
            event_id: data.event_id
          });
        });
      }
      
      return NextResponse.json(
        { error: 'Sales order not found' },
        { status: 404 }
      );
    }

    const tickets = salesTickets.map(doc => ({
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
    } as any));

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
    const ticketTypeIds = Array.from(new Set(tickets.map((t: any) => t.ticket_type_id)));
    const ticketTypesPromises = ticketTypeIds.map(id => 
      adminDb.collection('ticket_types').doc(id).get()
    );
    
    const ticketTypesData = await Promise.all(ticketTypesPromises);
    const ticketTypes = ticketTypesData
      .filter(doc => doc.exists)
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

    // Calcular estadísticas de la orden
    const totalTickets = tickets.length;
    const configuredTickets = tickets.filter((t: any) => 
      t.attendee_name && t.attendee_name !== 'Pendiente de configurar'
    ).length;
    const pendingTickets = totalTickets - configuredTickets;
    const generatedTickets = tickets.filter((t: any) => t.qr_code || t.pdf_url).length;
    const usedTickets = tickets.filter((t: any) => t.status === 'used').length;

    // Obtener datos del cliente desde el primer ticket
    const firstTicket = tickets[0];
    const totalAmount = tickets.reduce((sum: number, t: any) => sum + (t.amount_paid || 0), 0);

    // Detectar método de pago
    let paymentMethod = 'Pago con tarjeta'; // Default para pagos online
    if (firstTicket.is_manual_sale && firstTicket.payment_method) {
      // Ventas manuales tienen payment_method definido
      paymentMethod = firstTicket.payment_method;
    }

    const stats = {
      total_tickets: totalTickets,
      configured_tickets: configuredTickets,
      pending_tickets: pendingTickets,
      generated_tickets: generatedTickets,
      used_tickets: usedTickets,
      total_amount: totalAmount,
      currency: firstTicket.currency || 'MXN',
      created_at: firstTicket.purchase_date || firstTicket.created_at,
      customer_name: firstTicket.customer_name,
      customer_email: firstTicket.customer_email,
      payment_method: paymentMethod,
    };

    console.log('✅ Sales order loaded:', {
      orderId,
      totalTickets,
      configuredTickets,
      customerName: stats.customer_name
    });

    return NextResponse.json({
      order_id: orderId,
      tickets,
      event: eventData,
      ticket_types: ticketTypes,
      stats,
    });

  } catch (error) {
    console.error('❌ Error fetching sales order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
