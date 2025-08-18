import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getAuthFromRequest } from '@/lib/auth/server-auth';

interface EventSummary {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  location: string;
  status: 'happening_now' | 'today' | 'upcoming' | 'past';
  total_tickets: number;
  checked_in_count: number;
  configured_tickets: number;
}

interface ScannerEventsResponse {
  success: boolean;
  events?: {
    happening_now: EventSummary[];
    today: EventSummary[];
    upcoming: EventSummary[];
  };
  error?: string;
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<ScannerEventsResponse>> {
  try {
    console.log('📅 Fetching events for scanner dashboard');

    // 1. Verificar autenticación
    const authUser = await getAuthFromRequest(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Verificar permisos (solo comprobadores, gestores y admins)
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

    // 3. Obtener todos los eventos publicados
    const eventsSnapshot = await adminDb
      .collection('events')
      .where('published', '==', true)
      .orderBy('start_date', 'asc')
      .get();

    if (eventsSnapshot.empty) {
      return NextResponse.json({
        success: true,
        events: {
          happening_now: [],
          today: [],
          upcoming: []
        }
      });
    }

    // 4. Procesar eventos y obtener estadísticas de tickets
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const eventPromises = eventsSnapshot.docs.map(async (eventDoc) => {
      const eventData = eventDoc.data();
      const eventId = eventDoc.id;
      
      // Convertir fechas de Firestore
      const startDate = eventData.start_date?.toDate() || new Date();
      const endDate = eventData.end_date?.toDate() || new Date();

      // Obtener estadísticas de tickets para este evento
      const ticketsSnapshot = await adminDb
        .collection('tickets')
        .where('event_id', '==', eventId)
        .get();

      const tickets = ticketsSnapshot.docs.map(doc => doc.data());
      
      const totalTickets = tickets.length;
      const configuredTickets = tickets.filter(t => 
        t.status === 'configured' || t.status === 'generated' || t.pdf_url
      ).length;
      
      // Contar check-ins únicos (considerando eventos multi-día)
      const checkedInCount = tickets.filter(t => {
        const usedDays = t.used_days || [];
        return usedDays.length > 0;
      }).length;

      // Determinar estado del evento
      let status: EventSummary['status'] = 'upcoming';
      
      if (now >= startDate && now <= endDate) {
        status = 'happening_now';
      } else if (startDate >= todayStart && startDate <= todayEnd) {
        status = 'today';
      } else if (startDate < now) {
        status = 'past';
      }

      const eventSummary: EventSummary = {
        id: eventId,
        name: eventData.name,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        location: eventData.location || 'Ubicación no especificada',
        status,
        total_tickets: totalTickets,
        checked_in_count: checkedInCount,
        configured_tickets: configuredTickets
      };

      return eventSummary;
    });

    const allEvents = await Promise.all(eventPromises);

    // 5. Agrupar eventos por estado (solo mostrar relevantes)
    const relevantEvents = allEvents.filter(event => event.status !== 'past');
    
    const groupedEvents = {
      happening_now: relevantEvents.filter(e => e.status === 'happening_now'),
      today: relevantEvents.filter(e => e.status === 'today'),
      upcoming: relevantEvents.filter(e => e.status === 'upcoming').slice(0, 10) // Limitar próximos
    };

    console.log('✅ Scanner events fetched:', {
      happening_now: groupedEvents.happening_now.length,
      today: groupedEvents.today.length,
      upcoming: groupedEvents.upcoming.length
    });

    return NextResponse.json({
      success: true,
      events: groupedEvents
    });

  } catch (error) {
    console.error('❌ Error fetching scanner events:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}
