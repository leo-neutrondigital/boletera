import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getAuthFromRequest } from '@/lib/auth/server-auth';

interface ManualCheckInRequest {
  ticketId: string;
  eventId: string;
  selectedDay?: string; // Para eventos multi-día
  notes?: string; // Notas del comprobador
}

interface ManualCheckInResponse {
  success: boolean;
  message?: string;
  checkin_data?: {
    ticket_id: string;
    attendee_name: string;
    check_in_time: string;
    day_checked: string;
    performed_by: string;
    can_undo_until: string;
  };
  error?: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ManualCheckInResponse>> {
  try {
    const { ticketId, eventId, selectedDay, notes }: ManualCheckInRequest = await request.json();
    
    console.log('✋ Manual check-in attempt:', {
      ticketId,
      eventId,
      selectedDay,
      hasNotes: !!notes
    });

    // 1. Verificar autenticación
    const authUser = await getAuthFromRequest(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Verificar permisos (solo comprobadores, gestores y admins)
    const canCheckIn = authUser.roles?.some(role => 
      ['admin', 'gestor', 'comprobador'].includes(role)
    );
    
    if (!canCheckIn) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Forbidden - Check-in permission required' 
        },
        { status: 403 }
      );
    }

    // 3. Validar datos requeridos
    if (!ticketId || !eventId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: ticketId and eventId' 
        },
        { status: 400 }
      );
    }

    // 4. Obtener ticket y validar
    const ticketDoc = await adminDb.collection('tickets').doc(ticketId).get();
    
    if (!ticketDoc.exists) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Ticket not found' 
        },
        { status: 404 }
      );
    }

    const ticketData = ticketDoc.data()!;

    // 5. Verificar que el ticket pertenece al evento
    if (ticketData.event_id !== eventId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Ticket does not belong to this event' 
        },
        { status: 400 }
      );
    }

    // 6. Obtener datos del evento
    const eventDoc = await adminDb.collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Event not found' 
        },
        { status: 404 }
      );
    }

    const eventData = eventDoc.data()!;
    const eventStartDate = eventData.start_date?.toDate() || new Date();
    const eventEndDate = eventData.end_date?.toDate() || new Date();
    const now = new Date();

    // 7. Validar que el evento esté activo
    if (now < eventStartDate) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Event has not started yet' 
        },
        { status: 400 }
      );
    }

    if (now > eventEndDate) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Event has already ended' 
        },
        { status: 400 }
      );
    }

    // 8. Obtener información del tipo de boleto
    const ticketTypeDoc = await adminDb.collection('ticket_types').doc(ticketData.ticket_type_id).get();
    if (!ticketTypeDoc.exists) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Ticket type not found' 
        },
        { status: 404 }
      );
    }

    const ticketTypeData = ticketTypeDoc.data()!;

    // 9. Procesar días autorizados
    const authorizedDays = (ticketData.authorized_days || []).map((day: any) => {
      if (day?.toDate) {
        return day.toDate().toISOString().split('T')[0];
      }
      return new Date(day).toISOString().split('T')[0];
    });

    const usedDays = (ticketData.used_days || []).map((day: any) => {
      if (day?.toDate) {
        return day.toDate().toISOString().split('T')[0];
      }
      return new Date(day).toISOString().split('T')[0];
    });

    // 10. Determinar día a registrar
    let dayToCheck = selectedDay;
    const todayStr = now.toISOString().split('T')[0];

    if (!dayToCheck) {
      // Si no se especifica día, usar hoy si está autorizado
      if (authorizedDays.includes(todayStr)) {
        dayToCheck = todayStr;
      } else if (authorizedDays.length === 1) {
        // Si solo hay un día autorizado, usar ese
        dayToCheck = authorizedDays[0];
      } else {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Please specify which day to check-in for this multi-day event' 
          },
          { status: 400 }
        );
      }
    }

    // 11. Validar el día seleccionado
    if (!authorizedDays.includes(dayToCheck)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'This ticket is not authorized for the selected day' 
        },
        { status: 400 }
      );
    }

    // 12. Verificar si ya está registrado para este día
    if (usedDays.includes(dayToCheck)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Already checked in for ${dayToCheck}` 
        },
        { status: 400 }
      );
    }

    // 13. Realizar el check-in
    const checkInTime = new Date();
    const canUndoUntil = new Date(checkInTime.getTime() + 5 * 60 * 1000); // 5 minutos

    const newUsedDays = [...usedDays, dayToCheck];
    
    // Preparar datos de actualización
    const updateData: any = {
      used_days: newUsedDays.map(day => new Date(day + 'T12:00:00Z')), // Noon UTC
      last_checkin: checkInTime,
      can_undo_until: canUndoUntil,
      updated_at: checkInTime
    };

    // Agregar datos de check-in manual
    if (!ticketData.manual_checkins) {
      updateData.manual_checkins = [];
    } else {
      updateData.manual_checkins = ticketData.manual_checkins;
    }

    updateData.manual_checkins.push({
      day: dayToCheck,
      timestamp: checkInTime,
      performed_by: authUser.uid,
      performed_by_email: authUser.email,
      notes: notes || '',
      method: 'manual'
    });

    // 14. Actualizar ticket en Firestore
    await adminDb.collection('tickets').doc(ticketId).update(updateData);

    // 15. Crear registro de auditoría
    await adminDb.collection('checkin_logs').add({
      ticket_id: ticketId,
      event_id: eventId,
      attendee_name: ticketData.attendee_name || 'Sin asignar',
      customer_email: ticketData.customer_email,
      check_in_day: dayToCheck,
      check_in_time: checkInTime,
      performed_by: authUser.uid,
      performed_by_email: authUser.email,
      method: 'manual',
      notes: notes || '',
      can_undo_until: canUndoUntil,
      ticket_type: ticketTypeData.name,
      qr_id: ticketData.qr_id
    });

    console.log('✅ Manual check-in successful:', {
      ticketId,
      attendee: ticketData.attendee_name,
      day: dayToCheck,
      performedBy: authUser.email
    });

    return NextResponse.json({
      success: true,
      message: `Check-in successful for ${dayToCheck}`,
      checkin_data: {
        ticket_id: ticketId,
        attendee_name: ticketData.attendee_name || 'Sin asignar',
        check_in_time: checkInTime.toISOString(),
        day_checked: dayToCheck,
        performed_by: authUser.email || authUser.uid,
        can_undo_until: canUndoUntil.toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error in manual check-in:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}
