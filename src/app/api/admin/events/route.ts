// src/app/api/admin/events/route.ts
import { NextResponse } from "next/server";
import { getAllEvents } from "@/lib/api/events";
import { getAuthFromRequest } from "@/lib/auth/server-auth";

// ✅ Forzar modo dinámico para usar request.headers
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    console.log("📋 GET /api/admin/events triggered");
    
    const user = await getAuthFromRequest(req);
    console.log("👤 User from token:", user);
    
    if (!user || (!user.roles.includes("admin") && !user.roles.includes("gestor"))) {
      console.warn("⛔ Unauthorized access attempt", user);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const events = await getAllEvents();
    console.log(`✅ Retrieved ${events.length} events`);
    
    // 🔧 FIX: Serializar fechas correctamente para JSON
    const serializedEvents = events.map(event => ({
      ...event,
      start_date: event.start_date.toISOString(),
      end_date: event.end_date.toISOString(),
      created_at: event.created_at?.toISOString() || null,
      updated_at: event.updated_at?.toISOString() || null,
    }));
    
    return NextResponse.json(serializedEvents);
  } catch (error) {
    console.error("❌ Error fetching events:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
