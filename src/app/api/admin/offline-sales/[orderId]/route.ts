import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { getAuthFromRequest, requireRoles } from '@/lib/auth/server-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET - Obtener detalle de una orden offline específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const user = await getAuthFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    if (!requireRoles(user.roles, ['admin', 'gestor', 'comprobador'])) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { orderId } = params;

    console.log('[Offline Sales] Loading order:', orderId);

    // Obtener todos los tickets de esta orden
    const ticketsQuery = await adminDb
      .collection('tickets')
      .where('order_id', '==', orderId)
      .where('is_manual_sale', '==', true)
      .get();

    if (ticketsQuery.empty) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Construir orden con todos sus tickets
    const tickets = ticketsQuery.docs.map(doc => {
      const data = doc.data() as any;
      return {
        id: doc.id,
        ...data,
        created_at: data.created_at?.toDate(),
        purchase_date: data.purchase_date?.toDate(),
        sale_date: data.sale_date?.toDate()
      };
    });

    const firstTicket = tickets[0] as any;
    const order = {
      order_id: orderId,
      event_id: firstTicket.event_id,
      customer_name: firstTicket.customer_name,
      customer_email: firstTicket.customer_email,
      customer_phone: firstTicket.customer_phone,
      payment_method: firstTicket.payment_method,
      payment_reference: firstTicket.payment_reference,
      sale_date: firstTicket.sale_date,
      created_at: firstTicket.created_at,
      created_by: firstTicket.created_by,
      currency: firstTicket.currency,
      tickets: tickets,
      total_tickets: tickets.length,
      total_amount: tickets.reduce((sum, t: any) => sum + (t.amount_paid || 0), 0)
    };

    console.log('[Offline Sales] Order loaded:', {
      order_id: orderId,
      tickets: tickets.length,
      total: order.total_amount
    });

    return NextResponse.json({
      success: true,
      order
    });

  } catch (error) {
    console.error('[Offline Sales] Error loading order:', error);
    return NextResponse.json(
      { 
        error: 'Failed to load order',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Eliminar una orden offline (solo admin)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const user = await getAuthFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Solo administradores pueden eliminar ventas offline
    if (!requireRoles(user.roles, ['admin'])) {
      return NextResponse.json(
        { 
          error: 'Forbidden - Admin access required to delete offline sales',
          required: ['admin'],
          current: user.roles
        },
        { status: 403 }
      );
    }

    const { orderId } = params;
    const { searchParams } = new URL(request.url);
    const ticketIdsParam = searchParams.get('ticketIds');
    
    if (!ticketIdsParam) {
      return NextResponse.json(
        { error: 'ticketIds parameter is required' },
        { status: 400 }
      );
    }

    const ticketIds = ticketIdsParam.split(',');
    console.log('[Offline Sales] Deleting order:', { orderId, ticketIds });

    // Eliminar tickets directamente por ID (sin queries innecesarios)
    const batch = adminDb.batch();
    const ticketsToDelete: any[] = [];
    
    for (const ticketId of ticketIds) {
      const ticketRef = adminDb.collection('tickets').doc(ticketId);
      const ticketDoc = await ticketRef.get();
      
      if (ticketDoc.exists) {
        const docData = ticketDoc.data();
        batch.delete(ticketRef);
        ticketsToDelete.push({
          id: ticketDoc.id,
          attendee_name: docData?.attendee_name || docData?.customer_name || 'Sin nombre',
          ticket_type_name: docData?.ticket_type_name
        });
      }
    }

    // Ejecutar eliminación en batch
    await batch.commit();

    console.log('[Offline Sales] Order deleted:', {
      order_id: orderId,
      tickets_deleted: ticketsToDelete.length
    });

    return NextResponse.json({
      success: true,
      message: `Orden ${orderId.slice(-8).toUpperCase()} eliminada exitosamente`,
      deleted_order_id: orderId,
      deleted_tickets: ticketsToDelete.length,
      tickets_details: ticketsToDelete
    });

  } catch (error) {
    console.error('[Offline Sales] Error deleting order:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete order',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
