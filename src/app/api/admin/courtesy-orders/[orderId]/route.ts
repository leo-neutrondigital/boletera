import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getAuthFromRequest, requireRoles } from '@/lib/auth/server-auth';

// ✅ Forzar modo dinámico para usar request.headers
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

    // console.log(`🔍 Loading courtesy order: ${orderId}`);

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

    const tickets = ticketsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Convertir timestamps de Firestore a fechas
        created_at: data.created_at?.toDate() || new Date(),
        purchase_date: data.purchase_date?.toDate() || new Date(),
        updated_at: data.updated_at?.toDate() || null,
        authorized_days: data.authorized_days?.map((day: any) => 
          day.toDate ? day.toDate() : new Date(day)
        ) || [],
        used_days: data.used_days?.map((day: any) => 
          day.toDate ? day.toDate() : new Date(day)
        ) || [],
      } as any;
    });

    // 🔍 DEBUG: Ver datos RAW de Firestore
    console.log('🔍 [API] Raw tickets from Firestore:', tickets.map(t => ({
      id: t.id,
      attendee_name: t.attendee_name,
      attendee_email: t.attendee_email,
      pdf_url: t.pdf_url,
      pdf_path: t.pdf_path,
      status: t.status
    })));

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

    // Obtener tipos de boletos únicos usando sintaxis compatible
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
        // Convertir fechas
        sale_start: doc.data()?.sale_start?.toDate() || null,
        sale_end: doc.data()?.sale_end?.toDate() || null,
        available_days: doc.data()?.available_days?.map((day: any) => 
          day.toDate ? day.toDate() : new Date(day)
        ) || [],
      }));

    // Estadísticas de la orden usando type assertion
    const firstTicket = tickets[0] as any;
    const orderStats = {
      total_tickets: tickets.length,
      configured_tickets: tickets.filter((t: any) => t.attendee_name && t.attendee_email).length,
      pending_tickets: tickets.filter((t: any) => !t.attendee_name || !t.attendee_email).length,
      generated_tickets: tickets.filter((t: any) => t.pdf_url).length,
      total_amount: tickets.reduce((sum: number, t: any) => sum + (t.amount_paid || 0), 0),
      courtesy_type: firstTicket.courtesy_type,
      created_at: firstTicket.created_at,
      customer_name: firstTicket.customer_name,
      customer_email: firstTicket.customer_email,
    };

    // console.log(`✅ Found order ${orderId} with ${tickets.length} tickets`);

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
    const { searchParams } = new URL(request.url);
    const ticketIdsParam = searchParams.get('ticketIds');
    
    if (!ticketIdsParam) {
      return NextResponse.json(
        { error: 'ticketIds parameter is required' },
        { status: 400 }
      );
    }

    const ticketIds = ticketIdsParam.split(',');
    console.log('[Courtesy Orders] Deleting order:', { orderId, ticketIds });

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
          attendee_name: docData?.attendee_name || 'Sin configurar',
          ticket_type_name: docData?.ticket_type_name
        });
      }
    }

    // Ejecutar eliminación en batch
    await batch.commit();

    // console.log(`✅ Deleted order ${orderId} with ${ticketsToDelete.length} tickets`);

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
