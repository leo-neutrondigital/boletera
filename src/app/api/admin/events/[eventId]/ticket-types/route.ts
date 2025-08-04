// src/app/api/admin/events/[eventId]/ticket-types/route.ts
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getAuthFromRequest } from "@/lib/auth/server-auth";
import type { TicketType } from "@/types";

export async function GET(
  req: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    console.log(`📋 GET /api/admin/events/${params.eventId}/ticket-types`);
    
    const user = await getAuthFromRequest(req);
    if (!user || (!user.roles.includes("admin") && !user.roles.includes("gestor"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { eventId } = params;

    // Verificar que el evento existe
    const eventDoc = await adminDb.collection("events").doc(eventId).get();
    if (!eventDoc.exists) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Obtener tipos de boletos del evento (SIN orderBy por ahora)
    const ticketTypesSnapshot = await adminDb
      .collection("ticket_types")
      .where("event_id", "==", eventId)
      .get(); // Removemos .orderBy("sort_order", "asc") temporalmente

    const ticketTypes: TicketType[] = ticketTypesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        event_id: data.event_id,
        name: data.name,
        description: data.description,
        price: data.price,
        currency: data.currency,
        access_type: data.access_type,
        available_days: data.available_days?.map((d: any) => d.toDate ? d.toDate() : new Date(d)) || [],
        limit_per_user: data.limit_per_user,
        total_stock: data.total_stock,
        sold_count: data.sold_count || 0,
        is_active: data.is_active,
        sale_start: data.sale_start?.toDate ? data.sale_start.toDate() : (data.sale_start ? new Date(data.sale_start) : null),
        sale_end: data.sale_end?.toDate ? data.sale_end.toDate() : (data.sale_end ? new Date(data.sale_end) : null),
        is_courtesy: data.is_courtesy || false, // 🆕 Campo cortesía
        sort_order: data.sort_order || 999,
        created_at: data.created_at?.toDate ? data.created_at.toDate() : new Date(data.created_at),
        updated_at: data.updated_at?.toDate ? data.updated_at.toDate() : (data.updated_at ? new Date(data.updated_at) : undefined),
      };
    })
    // Ordenar en memoria por sort_order
    .sort((a, b) => a.sort_order - b.sort_order);

    console.log(`✅ Found ${ticketTypes.length} ticket types for event ${eventId}`);
    return NextResponse.json(ticketTypes);

  } catch (error) {
    console.error("❌ Error fetching ticket types:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
