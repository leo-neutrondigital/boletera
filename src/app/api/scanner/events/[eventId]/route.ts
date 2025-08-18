import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getAuthFromRequest } from '@/lib/auth/server-auth';

interface AttendeeTicket {
  id: string;
  attendee_name: string;
  attendee_email?: string;
  attendee_phone?: string;
  customer_name: string;
  customer_email: string;
  ticket_type_name: string;
  status: 'purchased' | 'configured' | 'generated' | 'used';
  check_in_status: 'not_arrived' | 'checked_in' | 'partial'; // para eventos multi-día
  authorized_days: string[];
  used_days: string[];
  last_checkin?: string;
  can_undo_until?: string;
  qr_id?: string;
  amount_paid: number;
  currency: string;
}

interface EventAttendeesResponse {
  success: boolean;
  event?: {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    location: string;
    description?: string;
  };
  attendees?: AttendeeTicket[];
  stats?: {
    total_tickets: number;
    configured_tickets: number;
    checked_in_count: number;
    not_arrived_count: number;
    attendance_rate: number;
  };
  error?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
): Promise<NextResponse<EventAttendeesResponse>> {
  try {
    const { eventId } = params;
    console.log('👥 Fetching attendees for event:', eventId);

    // 1. Verificar autenticación
    const authUser = await getAuthFromRequest(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Verificar permisos
    const canAccess = authUser.roles?.some(role => 
      ['admin', 'gestor', 'comprobador'].includes(role)
    );
    
    if (!canAccess) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Forbidden - Scanner access required' 
        },
        { status: 403 }
      );
    }

    // 3. Verificar que el evento existe
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

    // 4. Obtener todos los tickets del evento
    const ticketsSnapshot = await adminDb
      .collection('tickets')
      .where('event_id', '==', eventId)
      .get();

    if (ticketsSnapshot.empty) {
      return NextResponse.json({
        success: true,
        event: {
          id: eventId,
          name: eventData.name,
          start_date: eventData.start_date?.toDate().toISOString() || '',
          end_date: eventData.end_date?.toDate().toISOString() || '',
          location: eventData.location || '',
          description: eventData.description
        },
        attendees: [],
        stats: {
          total_tickets: 0,
          configured_tickets: 0,
          checked_in_count: 0,
          not_arrived_count: 0,
          attendance_rate: 0
        }
      });
    }

    // 5. Obtener información de tipos de boleto para completar datos
    const ticketTypeIds = [...new Set(ticketsSnapshot.docs.map(doc => doc.data().ticket_type_id))];
    const ticketTypesPromises = ticketTypeIds.map(id => 
      adminDb.collection('ticket_types').doc(id).get()
    );
    const ticketTypeDocs = await Promise.all(ticketTypesPromises);
    
    const ticketTypesMap = new Map();
    ticketTypeDocs.forEach(doc => {
      if (doc.exists) {
        ticketTypesMap.set(doc.id, doc.data());
      }
    });

    // 6. Procesar tickets en formato de asistentes
    const attendees: AttendeeTicket[] = ticketsSnapshot.docs.map(doc => {
      const ticketData = doc.data();
      const ticketType = ticketTypesMap.get(ticketData.ticket_type_id);

      // Procesar días autorizados y usados
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

      // Determinar estado de check-in
      let checkInStatus: AttendeeTicket['check_in_status'] = 'not_arrived';
      
      if (usedDays.length > 0) {
        if (usedDays.length >= authorizedDays.length) {
          checkInStatus = 'checked_in'; // Completamente registrado
        } else {
          checkInStatus = 'partial'; // Parcialmente registrado (eventos multi-día)
        }
      }

      return {
        id: doc.id,
        attendee_name: ticketData.attendee_name || 'Sin asignar',
        attendee_email: ticketData.attendee_email,
        attendee_phone: ticketData.attendee_phone,
        customer_name: ticketData.customer_name || '',
        customer_email: ticketData.customer_email || '',
        ticket_type_name: ticketType?.name || 'Tipo desconocido',
        status: ticketData.status || 'purchased',
        check_in_status: checkInStatus,
        authorized_days: authorizedDays,
        used_days: usedDays,
        last_checkin: ticketData.last_checkin?.toDate().toISOString(),
        can_undo_until: ticketData.can_undo_until?.toDate().toISOString(),
        qr_id: ticketData.qr_id,
        amount_paid: ticketData.amount_paid || 0,
        currency: ticketData.currency || 'MXN'
      };
    });

    // 7. Ordenar por nombre del asistente (alfabético)
    attendees.sort((a, b) => {
      const nameA = a.attendee_name.toLowerCase();
      const nameB = b.attendee_name.toLowerCase();
      return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
    });

    // 8. Calcular estadísticas
    const totalTickets = attendees.length;
    const configuredTickets = attendees.filter(a => 
      a.status === 'configured' || a.status === 'generated' || a.attendee_name !== 'Sin asignar'
    ).length;
    const checkedInCount = attendees.filter(a => 
      a.check_in_status === 'checked_in' || a.check_in_status === 'partial'
    ).length;
    const notArrivedCount = attendees.filter(a => 
      a.check_in_status === 'not_arrived'
    ).length;
    const attendanceRate = totalTickets > 0 ? Math.round((checkedInCount / totalTickets) * 100) : 0;

    console.log('✅ Event attendees fetched:', {
      eventId,
      totalTickets,
      configuredTickets,
      checkedInCount,
      attendanceRate: `${attendanceRate}%`
    });

    return NextResponse.json({
      success: true,
      event: {
        id: eventId,
        name: eventData.name,
        start_date: eventData.start_date?.toDate().toISOString() || '',
        end_date: eventData.end_date?.toDate().toISOString() || '',
        location: eventData.location || '',
        description: eventData.description
      },
      attendees,
      stats: {
        total_tickets: totalTickets,
        configured_tickets: configuredTickets,
        checked_in_count: checkedInCount,
        not_arrived_count: notArrivedCount,
        attendance_rate: attendanceRate
      }
    });

  } catch (error) {
    console.error('❌ Error fetching event attendees:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}
