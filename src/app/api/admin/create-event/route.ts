import { getAuthFromRequest } from "@/lib/auth/server-auth";
import { adminDb } from "@/lib/firebase/admin";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  console.log("🟡 POST /api/admin/create-event triggered");
  try {
    const user = await getAuthFromRequest(req);
    console.log("🧾 User from token:", user);
    if (!user || !Array.isArray(user.roles) || (!user.roles.includes("admin") && !user.roles.includes("gestor"))) {
      console.warn("⛔ Unauthorized access attempt", user);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    console.log("📦 Request body received:", body);
    const { 
      name, 
      start_date, 
      end_date, 
      location, 
      description, 
      internal_notes, 
      published 
    } = body;

    const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    if (!name || !start_date || !end_date || !location) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    // Validar que end_date >= start_date
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    
    if (endDate < startDate) {
      return NextResponse.json(
        { error: "La fecha de fin debe ser igual o posterior a la fecha de inicio" }, 
        { status: 400 }
      );
    }

    const newEvent = {
      name,
      slug,
      start_date: startDate,
      end_date: endDate,
      location,
      description: description || "",
      internal_notes: internal_notes || "",
      published: !!published,
      created_at: new Date(),
    };

    console.log("📁 Event to be stored:", newEvent);
    const docRef = await adminDb.collection("events").add(newEvent);

    return NextResponse.json({ message: "Event created", id: docRef.id }, { status: 201 });
  } catch (error) {
    console.error("❌ Error creating event:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
