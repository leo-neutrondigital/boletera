import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth/server-auth';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { qrId: string } }
) {
  try {
    const { qrId } = params;

    console.log('🔍 Fetching ticket by QR:', qrId);

    // Verificar autenticación
    const authUser = await getAuthFromRequest(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Buscar el ticket por QR usando admin SDK
    const ticketsRef = adminDb.collection('tickets');
    console.log('🔍 Searching in collection tickets for qr_id:', qrId);
    
    const querySnapshot = await ticketsRef.where('qr_id', '==', qrId).get();
    
    console.log('📊 Query results:', {
      empty: querySnapshot.empty,
      size: querySnapshot.size,
      docs: querySnapshot.docs.length
    });
    
    if (querySnapshot.empty) {
      console.log('❌ No ticket found with QR ID:', qrId);
      return NextResponse.json(
        { success: false, error: 'Ticket not found' },
        { status: 404 }
      );
    }

    const ticketDoc = querySnapshot.docs[0];
    const ticketData = ticketDoc.data();
    const ticket = { id: ticketDoc.id, ...ticketData };

    console.log('✅ Ticket found:', ticket.id);

    // Obtener información del evento
    const eventDoc = await adminDb.collection('events').doc(ticketData.event_id).get();
    const eventData = eventDoc.exists ? eventDoc.data() : null;

    // Obtener información del tipo de ticket
    const ticketTypeDoc = await adminDb
      .collection('events')
      .doc(ticketData.event_id)
      .collection('ticket_types')
      .doc(ticketData.ticket_type_id)
      .get();
    const ticketTypeData = ticketTypeDoc.exists ? ticketTypeDoc.data() : null;

    // Construir respuesta con información completa
    const ticketInfo = {
      id: ticket.id,
      attendee_name: ticketData.attendee_name,
      attendee_email: ticketData.attendee_email,
      attendee_phone: ticketData.attendee_phone,
      qr_code: ticketData.qr_id, // El campo real es qr_id
      created_at: ticketData.created_at,
      last_checkin: ticketData.last_checkin,
      used_days: ticketData.used_days || [],
      event: eventData ? {
        id: ticketData.event_id,
        name: eventData.name,
        location: eventData.location,
        start_date: eventData.start_date,
        end_date: eventData.end_date
      } : null,
      ticket_type: ticketTypeData ? {
        id: ticketData.ticket_type_id,
        name: ticketTypeData.name,
        access_type: ticketTypeData.access_type
      } : null
    };

    console.log('✅ Ticket info prepared for:', ticketInfo.attendee_name);

    return NextResponse.json({
      success: true,
      ticket: ticketInfo
    });

  } catch (error) {
    console.error('❌ Error fetching ticket by QR:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
