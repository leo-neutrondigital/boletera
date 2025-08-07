import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

interface UpdateTicketRequest {
  attendee_name?: string;
  attendee_email?: string;
  attendee_phone?: string;
  special_requirements?: string;
  selected_days?: string[]; // Para boletos de "any_single_day"
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { ticketId: string } }
) {
  try {
    const { ticketId } = params;
    const updates: UpdateTicketRequest = await request.json();

    console.log('🔄 Updating ticket:', ticketId, updates);

    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 });
    }

    // Validar que el ticket existe
    const ticketRef = adminDb.collection('tickets').doc(ticketId);
    const ticketDoc = await ticketRef.get();

    if (!ticketDoc.exists) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const ticketData = ticketDoc.data()!;

    // Validaciones
    if (ticketData.status === 'used') {
      return NextResponse.json({ 
        error: 'Cannot update used tickets' 
      }, { status: 400 });
    }

    // Preparar actualizaciones
    const updateData: any = {
      updated_at: FieldValue.serverTimestamp(),
    };

    if (updates.attendee_name !== undefined) {
      updateData.attendee_name = updates.attendee_name.trim();
    }

    if (updates.attendee_email !== undefined) {
      updateData.attendee_email = updates.attendee_email.trim().toLowerCase();
    }

    if (updates.attendee_phone !== undefined) {
      updateData.attendee_phone = updates.attendee_phone.trim();
    }

    if (updates.special_requirements !== undefined) {
      updateData.special_requirements = updates.special_requirements.trim();
    }

    // Manejar días seleccionados para boletos de "any_single_day"
    if (updates.selected_days !== undefined) {
      updateData.selected_days = updates.selected_days.map(day => new Date(day));
    }

    // Determinar si el ticket está ahora "configurado"
    const hasRequiredData = (updates.attendee_name && updates.attendee_name.trim()) ||
                           (ticketData.attendee_name && updates.attendee_name !== '');

    if (hasRequiredData && ticketData.status === 'purchased') {
      updateData.status = 'configured';
      updateData.configured_at = FieldValue.serverTimestamp();
    }

    // Aplicar actualización
    await ticketRef.update(updateData);

    console.log('✅ Ticket updated successfully');

    // Obtener el ticket actualizado
    const updatedDoc = await ticketRef.get();
    const updatedData = updatedDoc.data()!;

    return NextResponse.json({
      success: true,
      ticket: {
        id: updatedDoc.id,
        ...updatedData,
        // Convertir Timestamps para el frontend
        authorized_days: (updatedData.authorized_days || []).map((day: any) =>
          day && day.toDate ? day.toDate().toISOString() : new Date(day).toISOString()
        ),
        used_days: (updatedData.used_days || []).map((day: any) =>
          day && day.toDate ? day.toDate().toISOString() : new Date(day).toISOString()
        ),
        created_at: updatedData.created_at?.toDate?.()?.toISOString() || null,
        updated_at: updatedData.updated_at?.toDate?.()?.toISOString() || null,
      },
      message: 'Ticket updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating ticket:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update ticket',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Obtener un ticket específico
export async function GET(
  request: NextRequest,
  { params }: { params: { ticketId: string } }
) {
  try {
    const { ticketId } = params;

    const ticketDoc = await adminDb.collection('tickets').doc(ticketId).get();

    if (!ticketDoc.exists) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const ticketData = ticketDoc.data()!;

    // Obtener información del evento
    let eventData = null;
    if (ticketData.event_id) {
      const eventDoc = await adminDb.collection('events').doc(ticketData.event_id).get();
      if (eventDoc.exists) {
        const eventInfo = eventDoc.data()!;
        eventData = {
          id: eventDoc.id,
          name: eventInfo.name,
          start_date: eventInfo.start_date,
          end_date: eventInfo.end_date,
          location: eventInfo.location,
        };
      }
    }

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticketDoc.id,
        ...ticketData,
        event: eventData,
        // Convertir Timestamps
        authorized_days: (ticketData.authorized_days || []).map((day: any) =>
          day && day.toDate ? day.toDate().toISOString() : new Date(day).toISOString()
        ),
        used_days: (ticketData.used_days || []).map((day: any) =>
          day && day.toDate ? day.toDate().toISOString() : new Date(day).toISOString()
        ),
        created_at: ticketData.created_at?.toDate?.()?.toISOString() || null,
        updated_at: ticketData.updated_at?.toDate?.()?.toISOString() || null,
      }
    });

  } catch (error) {
    console.error('❌ Error getting ticket:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get ticket',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
