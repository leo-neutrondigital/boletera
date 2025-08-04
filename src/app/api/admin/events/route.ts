// src/app/api/admin/events/route.ts
import { NextResponse } from "next/server";
import { getAllEvents } from "@/lib/api/events";
import { getAuthFromRequest } from "@/lib/auth/server-auth";

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
    
    return NextResponse.json(events);
  } catch (error) {
    console.error("❌ Error fetching events:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
