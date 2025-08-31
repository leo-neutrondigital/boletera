import { NextResponse } from "next/server";
import { getEventById } from "@/lib/api/events";
import { getAuthFromRequest } from "@/lib/auth/server-auth";

// ✅ Forzar modo dinámico para usar request.headers
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    console.log(`📋 GET /api/admin/events/${params.eventId} triggered`);
    
    const user = await getAuthFromRequest(req);
    console.log("👤 User from token:", user);
    
    if (!user || (!user.roles.includes("admin") && !user.roles.includes("gestor"))) {
      console.warn("⛔ Unauthorized access attempt", user);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const event = await getEventById(params.eventId);
    
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    
    console.log(`✅ Retrieved event: ${event.name}`);
    
    // 🔧 FIX: Serializar fechas correctamente para JSON
    const serializedEvent = {
      ...event,
      start_date: event.start_date.toISOString(),
      end_date: event.end_date.toISOString(),
      created_at: event.created_at?.toISOString() || null,
      updated_at: event.updated_at?.toISOString() || null,
    };
    
    return NextResponse.json(serializedEvent);
  } catch (error) {
    console.error(`❌ Error fetching event ${params.eventId}:`, error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
