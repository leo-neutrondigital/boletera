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

    console.log('📮 Resending email for ticket:', ticketId);

    // 1. Verificar autenticación
    const authUser = await getAuthFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verificar permisos (solo admin/gestor pueden reenviar)
    const canResend = authUser.roles?.includes('admin') || authUser.roles?.includes('gestor');
    if (!canResend) {
      return NextResponse.json({ 
        error: 'Forbidden - Only admin and gestor can resend emails' 
      }, { status: 403 });
    }

    // 3. Obtener ticket de la base de datos
    const ticketDoc = await adminDb.collection('tickets').doc(ticketId).get();
    
    if (!ticketDoc.exists) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const ticketData = ticketDoc.data()!;

    // 4. Verificar que el ticket tiene PDF generado
    if (!ticketData.pdf_url) {
      return NextResponse.json({ 
        error: 'No PDF found for this ticket. Generate PDF first.' 
      }, { status: 400 });
    }

    // 5. Verificar que el ticket está configurado
    if (!ticketData.attendee_name || !ticketData.customer_email) {
      return NextResponse.json({ 
        error: 'Ticket not properly configured. Missing attendee name or email.' 
      }, { status: 400 });
    }

    // 6. Obtener datos del evento y tipo de boleto
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

    // 7. Preparar ticket completo
    const completeTicket = {
      ...ticketData,
      id: ticketId,
      event: {
        ...eventData,
        start_date: eventData.start_date?.toDate() || new Date(),
        end_date: eventData.end_date?.toDate() || new Date(),
      }
    };

    // 8. Reenviar email (sin regenerar PDF)
    const ticketEmailService = new TicketEmailService();
    await ticketEmailService.resendTicketEmail(
      completeTicket,
      completeTicket.event,
      ticketTypeData
    );

    // 9. Registrar reenvío en base de datos
    await adminDb.collection('tickets').doc(ticketId).update({
      last_email_sent: new Date(),
      resent_by: authUser.uid,
      resent_at: new Date()
    });

    console.log('✅ Email resent successfully');

    return NextResponse.json({
      success: true,
      message: 'Email resent successfully',
      sent_to: ticketData.customer_email
    });

  } catch (error) {
    console.error('❌ Error resending email:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to resend email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
