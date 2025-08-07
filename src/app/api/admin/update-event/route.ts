import { adminDb } from "@/lib/firebase/admin"
import { NextResponse } from "next/server"
import { getAuthFromRequest } from "@/lib/auth/server-auth"
import { isSlugAvailable } from "@/lib/api/events"

// Tipo para los datos de actualización de evento
interface EventUpdateData {
  name?: string;
  slug?: string;
  start_date?: string | Date;
  end_date?: string | Date;
  location?: string;
  description?: string;
  internal_notes?: string;
  published?: boolean;
  
  // 🆕 Nuevos campos
  public_description?: string;
  allow_preregistration?: boolean;
  preregistration_message?: string;
  featured_image_url?: string;
  terms_and_conditions?: string;
  contact_email?: string;
  
  [key: string]: unknown;
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

    // Validaciones adicionales
    if (updateData.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updateData.contact_email)) {
      return NextResponse.json({ 
        error: "Email de contacto inválido" 
      }, { status: 400 });
    }

    if (updateData.featured_image_url && updateData.featured_image_url !== "" && 
        !/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(updateData.featured_image_url)) {
      return NextResponse.json({ 
        error: "URL de imagen inválida. Debe ser una URL válida terminada en jpg, png, gif o webp" 
      }, { status: 400 });
    }

    // Validar slug si se está actualizando
    if (updateData.slug) {
      const slugAvailable = await isSlugAvailable(updateData.slug, id);
      if (!slugAvailable) {
        return NextResponse.json({ 
          error: `El slug "${updateData.slug}" ya está en uso por otro evento` 
        }, { status: 400 });
      }
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

    // Si se cambia published a true, validar que tenga public_description
    if (processedData.published === true) {
      const currentData = eventDoc.data();
      const finalPublicDescription = processedData.public_description || currentData?.public_description;
      
      if (!finalPublicDescription) {
        return NextResponse.json({ 
          error: "Para publicar el evento se requiere una descripción pública" 
        }, { status: 400 });
      }
    }

    const updatePayload = {
      ...processedData,
      updated_at: new Date(),
    };

    console.log("📝 Updating event with payload:", updatePayload);
    await adminDb.collection("events").doc(id).update(updatePayload);
    console.log("✅ Event updated successfully");

    return NextResponse.json({ 
      success: true, 
      message: "Event updated successfully",
      slug: updateData.slug // Retornar el slug para redirección si es necesario
    });
    
  } catch (error) {
    console.error("❌ Error updating event:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
