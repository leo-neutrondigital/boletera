// src/app/api/admin/ticket-types/[id]/route.ts
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getAuthFromRequest } from "@/lib/auth/server-auth";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`🔄 PUT /api/admin/ticket-types/${params.id}`);
    
    const user = await getAuthFromRequest(req);
    if (!user || (!user.roles.includes("admin") && !user.roles.includes("gestor"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    console.log("📦 Update request body:", body);

    // Verificar que el ticket type existe
    const ticketTypeDoc = await adminDb.collection("ticket_types").doc(id).get();
    if (!ticketTypeDoc.exists) {
      return NextResponse.json({ error: "Ticket type not found" }, { status: 404 });
    }

    // Procesar datos
    const updateData: any = { ...body };
    delete updateData.id; // Remover ID del body
    delete updateData.event_id; // No permitir cambiar event_id
    delete updateData.sold_count; // No permitir cambiar sold_count manualmente

    // Si es cortesía, forzar precio a 0
    if (updateData.is_courtesy) {
      updateData.price = 0;
    }

    // Procesar fechas
    if (updateData.sale_start) {
      updateData.sale_start = new Date(updateData.sale_start);
    } else if (updateData.sale_start === "") {
      updateData.sale_start = null;
    }
    
    if (updateData.sale_end) {
      updateData.sale_end = new Date(updateData.sale_end);
    } else if (updateData.sale_end === "") {
      updateData.sale_end = null;
    }
    
    if (updateData.available_days) {
      updateData.available_days = updateData.available_days.map((d: string) => new Date(d));
    }

    // Manejar campos opcionales correctamente
    if (updateData.limit_per_user === "" || updateData.limit_per_user === null) {
      updateData.limit_per_user = null;
    } else if (updateData.limit_per_user !== undefined) {
      updateData.limit_per_user = Number(updateData.limit_per_user);
    }

    if (updateData.total_stock === "" || updateData.total_stock === null) {
      updateData.total_stock = null;
    } else if (updateData.total_stock !== undefined) {
      updateData.total_stock = Number(updateData.total_stock);
    }

    // Validar features si se proporciona
    if (updateData.features) {
      if (!Array.isArray(updateData.features)) {
        return NextResponse.json({ error: "Features must be an array" }, { status: 400 });
      }
      updateData.features = updateData.features.filter(f => f && f.trim());
    }

    // Limpiar strings
    if (updateData.name) updateData.name = updateData.name.trim();
    if (updateData.description) updateData.description = updateData.description.trim();
    if (updateData.public_description) updateData.public_description = updateData.public_description.trim();
    if (updateData.terms) updateData.terms = updateData.terms.trim();

    // Validaciones
    if (updateData.price !== undefined && (isNaN(updateData.price) || updateData.price < 0)) {
      return NextResponse.json({ error: "Invalid price" }, { status: 400 });
    }

    if (updateData.currency && !["MXN", "USD"].includes(updateData.currency)) {
      return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
    }

    if (updateData.access_type && !["all_days", "specific_days", "any_single_day"].includes(updateData.access_type)) {
      return NextResponse.json({ error: "Invalid access_type" }, { status: 400 });
    }

    // Si es specific_days, validar available_days
    if (updateData.access_type === "specific_days" && (!updateData.available_days || updateData.available_days.length === 0)) {
      return NextResponse.json({ error: "specific_days requires available_days" }, { status: 400 });
    }

    const updatePayload = {
      ...updateData,
      updated_at: new Date(),
    };

    console.log("📝 Updating ticket type with payload:", updatePayload);
    await adminDb.collection("ticket_types").doc(id).update(updatePayload);
    console.log("✅ Ticket type updated successfully");

    return NextResponse.json({ success: true, message: "Ticket type updated successfully" });
  } catch (error) {
    console.error("❌ Error updating ticket type:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`🗑️ DELETE /api/admin/ticket-types/${params.id}`);
    
    const user = await getAuthFromRequest(req);
    if (!user || !user.roles.includes("admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    // Verificar que el ticket type existe
    const ticketTypeDoc = await adminDb.collection("ticket_types").doc(id).get();
    if (!ticketTypeDoc.exists) {
      return NextResponse.json({ error: "Ticket type not found" }, { status: 404 });
    }

    const ticketTypeData = ticketTypeDoc.data();

    // Verificar si hay boletos vendidos
    if (ticketTypeData?.sold_count && ticketTypeData.sold_count > 0) {
      return NextResponse.json({ 
        error: `Cannot delete ticket type with ${ticketTypeData.sold_count} sold tickets` 
      }, { status: 400 });
    }

    // Verificar si hay tickets pendientes en la colección tickets
    const ticketsSnapshot = await adminDb
      .collection("tickets")
      .where("ticket_type_id", "==", id)
      .limit(1)
      .get();

    if (!ticketsSnapshot.empty) {
      return NextResponse.json({ 
        error: "Cannot delete ticket type with existing tickets" 
      }, { status: 400 });
    }

    console.log("🎯 Deleting ticket type:", id);
    await adminDb.collection("ticket_types").doc(id).delete();
    console.log("✅ Ticket type deleted successfully");

    return NextResponse.json({ success: true, message: "Ticket type deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting ticket type:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
