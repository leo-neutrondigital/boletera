import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getAuthFromRequest } from '@/lib/auth/server-auth';
import { TicketEmailService } from '@/lib/email/ticket-email-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { ticketId: string } }
) {
  try {
    const { ticketId } = params;

    console.log('🔄 Regenerating PDF and sending email for ticket:', ticketId);

    // 1. Verificar autenticación
    const authUser = await getAuthFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verificar permisos (solo admin/gestor pueden regenerar)
    const canRegenerate = authUser.roles?.includes('admin') || authUser.roles?.includes('gestor');
    if (!canRegenerate) {
      return NextResponse.json({ 
        error: 'Forbidden - Only admin and gestor can regenerate tickets' 
      }, { status: 403 });
    }

    // 3. Obtener ticket de la base de datos
    const ticketDoc = await adminDb.collection('tickets').doc(ticketId).get();
    
    if (!ticketDoc.exists) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const ticketData = ticketDoc.data()!;

    // 4. Verificar que el ticket está configurado
    if (!ticketData.attendee_name || !ticketData.customer_email) {
      return NextResponse.json({ 
        error: 'Ticket not properly configured. Missing attendee name or email.' 
      }, { status: 400 });
    }

    // 5. Obtener datos del evento y tipo de boleto
    const [eventDoc, ticketTypeDoc] = await Promise.all([
      adminDb.collection('events').doc(ticketData.event_id).get(),
      adminDb.collection('ticket_types').doc(ticketData.ticket_type_id).get()
    ]);

    if (!eventDoc.exists || !ticketTypeDoc.exists) {
      return NextResponse.json({ 
        error: 'Event or ticket type not found' 
      }, { status: 404 });
    }

    const eventData = eventDoc.data()!;
    const ticketTypeData = ticketTypeDoc.data()!;

    // 6. Preparar ticket completo con datos necesarios
    const completeTicket = {
      ...ticketData,
      id: ticketId,
      event: {
        ...eventData,
        start_date: eventData.start_date?.toDate() || new Date(),
        end_date: eventData.end_date?.toDate() || new Date(),
      },
      ticket_type: ticketTypeData
    };

    // 7. Generar PDF y enviar email
    const ticketEmailService = new TicketEmailService();
    const { pdf_url, pdf_path } = await ticketEmailService.generateAndSendTicket(
      completeTicket,
      completeTicket.event,
      ticketTypeData
    );

    // 8. Actualizar ticket en base de datos
    await adminDb.collection('tickets').doc(ticketId).update({
      pdf_url,
      pdf_path,
      updated_at: new Date(),
      regenerated_by: authUser.uid,
      regenerated_at: new Date()
    });

    console.log('✅ Ticket regenerated and email sent successfully');

    return NextResponse.json({
      success: true,
      message: 'Ticket regenerated and email sent successfully',
      pdf_url,
      pdf_path
    });

  } catch (error) {
    console.error('❌ Error regenerating ticket:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to regenerate ticket',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
