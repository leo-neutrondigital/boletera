// src/app/api/admin/ticket-types/route.ts
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getAuthFromRequest } from "@/lib/auth/server-auth";
import type { TicketType } from "@/types";

export async function POST(req: Request) {
  try {
    console.log("🎫 POST /api/admin/ticket-types triggered");
    
    const user = await getAuthFromRequest(req);
    if (!user || (!user.roles.includes("admin") && !user.roles.includes("gestor"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    console.log("📦 Request body:", body);

    const {
      event_id,
      name,
      description,
      price,
      currency,
      access_type,
      available_days,
      limit_per_user,
      total_stock,
      sale_start,
      sale_end,
      is_active = true,
      is_courtesy = false // 🆕 Campo cortesía
    } = body;

    // Validaciones
    if (!event_id || !name || price === undefined || !currency || !access_type) {
      return NextResponse.json({ 
        error: "Missing required fields: event_id, name, price, currency, access_type" 
      }, { status: 400 });
    }

    if (!["MXN", "USD"].includes(currency)) {
      return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
    }

    if (!["all_days", "specific_days", "any_single_day"].includes(access_type)) {
      return NextResponse.json({ error: "Invalid access_type" }, { status: 400 });
    }

    // 🆕 Si es cortesía, forzar precio a 0
    const finalPrice = is_courtesy ? 0 : Number(price);

    // Verificar que el evento existe
    const eventDoc = await adminDb.collection("events").doc(event_id).get();
    if (!eventDoc.exists) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Obtener el siguiente sort_order
    const ticketTypesSnapshot = await adminDb
      .collection("ticket_types")
      .where("event_id", "==", event_id)
      .get(); // Sin orderBy para evitar error de índice
    
    const nextSortOrder = ticketTypesSnapshot.empty ? 1 : 
      Math.max(...ticketTypesSnapshot.docs.map(doc => doc.data().sort_order || 0)) + 1;

    const newTicketType = {
      event_id,
      name: name.trim(),
      description: description?.trim() || "",
      price: finalPrice,
      currency,
      access_type,
      available_days: available_days ? available_days.map((d: string) => new Date(d)) : null,
      // ✅ ARREGLADO: Manejar valores null correctamente
      limit_per_user: limit_per_user || null,
      total_stock: total_stock || null,
      sold_count: 0,
      is_active: Boolean(is_active),
      sale_start: sale_start ? new Date(sale_start) : null,
      sale_end: sale_end ? new Date(sale_end) : null,
      is_courtesy: Boolean(is_courtesy), // 🆕 Campo cortesía
      sort_order: nextSortOrder,
      created_at: new Date(),
    };

    console.log("💾 Creating ticket type:", newTicketType);
    const docRef = await adminDb.collection("ticket_types").add(newTicketType);

    return NextResponse.json({ 
      message: "Ticket type created successfully", 
      id: docRef.id 
    }, { status: 201 });

  } catch (error) {
    console.error("❌ Error creating ticket type:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
