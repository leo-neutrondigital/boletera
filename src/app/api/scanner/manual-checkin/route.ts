import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getAuthFromRequest } from '@/lib/auth/server-auth';
import { formatDateToLocalString, getTodayAsLocalString, getTodayInMexicoTimezone } from '@/lib/utils/date-utils';

// ✅ Forzar modo dinámico para usar request.headers y request.json()
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

    console.log('🐛 Event date validation debug:', {
      eventStartDate: eventStartDate.toISOString(),
      eventEndDate: eventEndDate.toISOString(),
      currentTime: now.toISOString(),
      eventStartDateStr: eventStartDate.toISOString().split('T')[0],
      eventEndDateStr: eventEndDate.toISOString().split('T')[0],
      currentDateStr: now.toISOString().split('T')[0],
      eventName: eventData.name,
      selectedDay: selectedDay
    });

    // 7. Validar que el evento esté dentro del rango válido
    // Para manual check-in, permitimos registrar para días específicos dentro del evento
    const eventStartDateStr = formatDateToLocalString(eventStartDate);
    const eventEndDateStr = formatDateToLocalString(eventEndDate);
    const currentDateStr = getTodayInMexicoTimezone(); // Usar función centralizada
    
    console.log('🗓️ Event validation (FIXED with centralized functions):', {
      eventStartDateStr,
      eventEndDateStr,
      currentDateStr,
      eventIsActive: currentDateStr <= eventEndDateStr
    });
    
    // Solo validar que el evento no haya terminado completamente
    if (currentDateStr > eventEndDateStr) {
      console.log('❌ Event has ended validation failed');
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

    // 9. Procesar días autorizados usando utilidades centralizadas
    let authorizedDays = (ticketData.authorized_days || []).map((day: any) => 
      formatDateToLocalString(day)
    );

    const usedDays = (ticketData.used_days || []).map((day: any) => 
      formatDateToLocalString(day)
    );

    // 🔧 FIX: Para tickets all_days, auto-corregir authorized_days si están fuera del rango del evento
    if (ticketTypeData.access_type === 'all_days') {
      const eventStartDateStr = formatDateToLocalString(eventStartDate);
      const eventEndDateStr = formatDateToLocalString(eventEndDate);
      
      // Verificar si authorized_days está mal configurado (fuera del rango del evento)
      const validDays = authorizedDays.filter((day: string) => day >= eventStartDateStr && day <= eventEndDateStr);
      
      if (validDays.length === 0) {
        console.log('🔧 Auto-correcting authorized_days for all_days ticket - current days are outside event range');
        // Para all_days, generar todas las fechas del evento
        authorizedDays = [];
        const currentDate = new Date(eventStartDate);
        const endDate = new Date(eventEndDate);
        
        while (currentDate <= endDate) {
          authorizedDays.push(formatDateToLocalString(currentDate));
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        console.log('🔧 Auto-generated authorized_days for all_days ticket:', authorizedDays);
      }
    }

    console.log('🎫 Ticket data processing:', {
      ticketId,
      access_type: ticketTypeData.access_type,
      originalAuthorizedDays: (ticketData.authorized_days || []).map((day: any) => formatDateToLocalString(day)),
      correctedAuthorizedDays: authorizedDays,
      usedDays,
      selectedDay
    });

    // 10. Determinar día a registrar con lógica por access_type
    let dayToCheck = selectedDay;
    const todayStr = getTodayInMexicoTimezone(); // Usar timezone México consistentemente

    if (!dayToCheck) {
      switch (ticketTypeData.access_type) {
        case 'all_days':
          // Para all_days, siempre usar hoy (dentro del rango del evento)
          dayToCheck = todayStr;
          console.log('📅 all_days: Using today:', dayToCheck);
          break;
          
        case 'any_single_day':
          // Para any_single_day, usar hoy si está autorizado, sino el primero disponible
          if (authorizedDays.includes(todayStr)) {
            dayToCheck = todayStr;
            console.log('📅 any_single_day: Using today:', dayToCheck);
          } else if (authorizedDays.length === 1) {
            dayToCheck = authorizedDays[0];
            console.log('📅 any_single_day: Using only available day:', dayToCheck);
          } else {
            return NextResponse.json(
              { 
                success: false, 
                error: 'Please specify which day to check-in for this any_single_day ticket' 
              },
              { status: 400 }
            );
          }
          break;
          
        case 'specific_days':
          // Para specific_days, usar hoy si está autorizado, sino requerir selección
          if (authorizedDays.includes(todayStr)) {
            dayToCheck = todayStr;
            console.log('📅 specific_days: Using today:', dayToCheck);
          } else if (authorizedDays.length === 1) {
            dayToCheck = authorizedDays[0];
            console.log('📅 specific_days: Using only available day:', dayToCheck);
          } else {
            return NextResponse.json(
              { 
                success: false, 
                error: 'Please specify which day to check-in for this multi-day event' 
              },
              { status: 400 }
            );
          }
          break;
          
        default:
          // Fallback para tipos desconocidos
          if (authorizedDays.includes(todayStr)) {
            dayToCheck = todayStr;
          } else if (authorizedDays.length === 1) {
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
    }

    // 11. Validar que tengamos un día para verificar
    if (!dayToCheck) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Unable to determine check-in day' 
        },
        { status: 400 }
      );
    }

    // 12. Validar el día seleccionado según access_type
    console.log('🔍 Day validation:', {
      access_type: ticketTypeData.access_type,
      dayToCheck,
      todayStr,
      authorizedDays,
      eventStartDateStr,
      eventEndDateStr
    });

    switch (ticketTypeData.access_type) {
      case 'all_days':
        // Para all_days, solo verificar que esté dentro del rango del evento
        if (dayToCheck < eventStartDateStr || dayToCheck > eventEndDateStr) {
          return NextResponse.json(
            { 
              success: false, 
              error: `Check-in date must be within event dates (${eventStartDateStr} to ${eventEndDateStr})` 
            },
            { status: 400 }
          );
        }
        console.log('✅ all_days: Day is within event range');
        break;
        
      case 'any_single_day':
      case 'specific_days':
        // Para any_single_day y specific_days, verificar días autorizados
        if (!authorizedDays.includes(dayToCheck)) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'This ticket is not authorized for the selected day' 
            },
            { status: 400 }
          );
        }
        console.log('✅ specific_days/any_single_day: Day is authorized');
        break;
        
      default:
        // Fallback - usar validación de días autorizados
        if (!authorizedDays.includes(dayToCheck)) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'This ticket is not authorized for the selected day' 
            },
            { status: 400 }
          );
        }
    }

    // 13. Verificar si ya está registrado para este día
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
  day_checked: dayToCheck || '',
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
