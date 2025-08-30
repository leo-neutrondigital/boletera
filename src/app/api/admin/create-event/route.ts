import { getAuthFromRequest } from "@/lib/auth/server-auth";
import { adminDb } from "@/lib/firebase/admin";
import { generateUniqueEventSlug, isSlugAvailable } from "@/lib/api/events";
import { NextResponse } from "next/server";
import { revalidatePath } from 'next/cache';

// ✅ Forzar modo dinámico para usar request.headers
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
      slug,
      start_date, 
      end_date, 
      location, 
      description, 
      internal_notes, 
      published,
      // 🆕 Nuevos campos
      public_description,
      allow_preregistration,
      preregistration_message,
      featured_image_url,
      terms_and_conditions,
      contact_email
    } = body;

    // Validaciones básicas
    if (!name || !start_date || !end_date || !location || !public_description) {
      return NextResponse.json({ 
        error: "Campos requeridos: name, start_date, end_date, location, public_description" 
      }, { status: 400 });
    }

    // Validar fechas
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    
    if (endDate < startDate) {
      return NextResponse.json(
        { error: "La fecha de fin debe ser igual o posterior a la fecha de inicio" }, 
        { status: 400 }
      );
    }

    // Generar o validar slug
    let finalSlug = slug;
    if (!finalSlug) {
      // Auto-generar slug desde el nombre
      const existingSlugs = await getAllEventSlugs();
      finalSlug = generateUniqueEventSlug(name, startDate, existingSlugs);
    } else {
      // Validar que el slug esté disponible
      const slugAvailable = await isSlugAvailable(finalSlug);
      if (!slugAvailable) {
        return NextResponse.json({ 
          error: `El slug "${finalSlug}" ya está en uso` 
        }, { status: 400 });
      }
    }

    // Validar email si se proporciona
    if (contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact_email)) {
      return NextResponse.json({ 
        error: "Email de contacto inválido" 
      }, { status: 400 });
    }

    // Validar URL de imagen si se proporciona
    if (featured_image_url && !/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(featured_image_url)) {
      return NextResponse.json({ 
        error: "URL de imagen inválida. Debe ser una URL válida terminada en jpg, png, gif o webp" 
      }, { status: 400 });
    }

    const newEvent = {
      name,
      slug: finalSlug,
      start_date: startDate,
      end_date: endDate,
      location,
      description: description || "",
      internal_notes: internal_notes || "",
      published: !!published,
      
      // 🆕 Nuevos campos
      public_description,
      allow_preregistration: !!allow_preregistration,
      preregistration_message: preregistration_message || "",
      featured_image_url: featured_image_url || "",
      terms_and_conditions: terms_and_conditions || "",
      contact_email: contact_email || "",
      
      created_at: new Date(),
      updated_at: new Date(),
    };

    console.log("📁 Event to be stored:", newEvent);
    const docRef = await adminDb.collection("events").add(newEvent);

    // 🆕 Revalidar páginas después de crear el evento
    try {
      if (published && finalSlug) {
        await revalidatePath(`/events/${finalSlug}`);
        console.log(`✅ Revalidated new public page: /events/${finalSlug}`);
      }
      
      await revalidatePath('/dashboard/eventos');
      console.log("✅ Revalidated admin events page");
      
    } catch (revalidationError) {
      console.warn("⚠️ Error during revalidation (event still created):", revalidationError);
    }

    return NextResponse.json({ 
      message: "Event created successfully", 
      id: docRef.id,
      slug: finalSlug
    }, { status: 201 });
    
  } catch (error) {
    console.error("❌ Error creating event:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Función auxiliar para obtener todos los slugs (duplicada temporalmente)
async function getAllEventSlugs(): Promise<string[]> {
  const snapshot = await adminDb.collection("events").select("slug").get();
  return snapshot.docs.map(doc => doc.data().slug).filter(Boolean);
}
