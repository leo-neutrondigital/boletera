import { adminDb } from "@/lib/firebase/admin"
import { NextResponse } from "next/server"
import { getAuthFromRequest } from "@/lib/auth/server-auth"

// Tipo para los datos de actualización de evento
interface EventUpdateData {
  name?: string;
  start_date?: string | Date;
  end_date?: string | Date;
  location?: string;
  description?: string;
  internal_notes?: string;
  published?: boolean;
  [key: string]: unknown; // Para otros campos que puedan venir
}

export async function PUT(req: Request) {
  try {
    console.log("🔄 PUT /api/admin/update-event triggered");
    
    const user = await getAuthFromRequest(req)
    console.log("👤 User from token:", user);
    
    if (!user || (!user.roles.includes("admin") && !user.roles.includes("gestor"))) {
      console.warn("⛔ Unauthorized update attempt", user);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    console.log("📦 Update request body:", body);
    
    const { id, ...updateData }: { id: string } & EventUpdateData = body

    if (!id) {
      console.error("❌ Missing event ID");
      return NextResponse.json({ error: "Event ID is required" }, { status: 400 })
    }

    // Verificar que el evento existe
    const eventDoc = await adminDb.collection("events").doc(id).get();
    if (!eventDoc.exists) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Procesar fechas si están presentes
    const processedData: EventUpdateData = { ...updateData };
    
    if (updateData.start_date) {
      processedData.start_date = new Date(updateData.start_date);
    }
    if (updateData.end_date) {
      processedData.end_date = new Date(updateData.end_date);
    }

    // Validar que end_date >= start_date si ambas están presentes
    if (processedData.start_date && processedData.end_date) {
      const startDate = processedData.start_date instanceof Date 
        ? processedData.start_date 
        : new Date(processedData.start_date);
      const endDate = processedData.end_date instanceof Date 
        ? processedData.end_date 
        : new Date(processedData.end_date);
        
      if (endDate < startDate) {
        return NextResponse.json(
          { error: "La fecha de fin debe ser igual o posterior a la fecha de inicio" }, 
          { status: 400 }
        );
      }
    }

    const updatePayload = {
      ...processedData,
      updated_at: new Date(),
    };

    console.log("📝 Updating event with payload:", updatePayload);
    await adminDb.collection("events").doc(id).update(updatePayload);
    console.log("✅ Event updated successfully");

    return NextResponse.json({ success: true, message: "Event updated successfully" });
  } catch (error) {
    console.error("❌ Error updating event:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
