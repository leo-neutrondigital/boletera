import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getAuthFromRequest, requireRoles } from "@/lib/auth/server-auth";

export async function GET(request: NextRequest) {
  try {
    // 🔐 Verificar autenticación 
    const user = await getAuthFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!requireRoles(user.roles, ['admin', 'gestor'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const eventId = url.searchParams.get('eventId');
    
    if (!eventId) {
      return NextResponse.json({ error: 'eventId parameter required' }, { status: 400 });
    }

    console.log(`🐛 DEBUG: Analyzing ticket states for event: ${eventId}`);

    // Obtener todos los tickets del evento
    const ticketsSnapshot = await adminDb
      .collection("tickets")
      .where("event_id", "==", eventId)
      .get();

    const stateAnalysis = {
      total_tickets: ticketsSnapshot.size,
      states: {} as Record<string, number>,
      sample_tickets: [] as any[],
      courtesy_analysis: {
        by_is_courtesy_field: {} as Record<string, number>,
        by_courtesy_type_field: {} as Record<string, number>
      }
    };

    // Analizar cada ticket
    ticketsSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      
      // Contar por estado
      const status = data.status || 'undefined';
      stateAnalysis.states[status] = (stateAnalysis.states[status] || 0) + 1;
      
      // Analizar cortesías
      const isCourtesy = data.is_courtesy;
      const courtesyType = data.courtesy_type;
      
      stateAnalysis.courtesy_analysis.by_is_courtesy_field[String(isCourtesy)] = 
        (stateAnalysis.courtesy_analysis.by_is_courtesy_field[String(isCourtesy)] || 0) + 1;
      
      if (courtesyType) {
        stateAnalysis.courtesy_analysis.by_courtesy_type_field[courtesyType] = 
          (stateAnalysis.courtesy_analysis.by_courtesy_type_field[courtesyType] || 0) + 1;
      }
      
      // Guardar muestras (primeros 3 tickets)
      if (index < 3) {
        stateAnalysis.sample_tickets.push({
          id: doc.id,
          status: data.status,
          is_courtesy: data.is_courtesy,
          courtesy_type: data.courtesy_type,
          customer_name: data.customer_name,
          ticket_type_name: data.ticket_type_name,
          amount_paid: data.amount_paid,
          created_at: data.created_at?.toDate?.()?.toISOString?.() || data.created_at
        });
      }
    });

    console.log(`🐛 DEBUG Results:`, stateAnalysis);

    return NextResponse.json({
      success: true,
      event_id: eventId,
      analysis: stateAnalysis,
      suggestions: {
        most_common_state: Object.entries(stateAnalysis.states)
          .sort(([,a], [,b]) => b - a)[0]?.[0] || 'none',
        has_courtesy_flag: Object.keys(stateAnalysis.courtesy_analysis.by_is_courtesy_field).length > 1,
        has_courtesy_types: Object.keys(stateAnalysis.courtesy_analysis.by_courtesy_type_field).length > 0
      }
    });

  } catch (error) {
    console.error("❌ DEBUG Error:", error);
    return NextResponse.json(
      { 
        error: "Error en debug",
        details: error instanceof Error ? error.message : "Error desconocido"
      }, 
      { status: 500 }
    );
  }
}
