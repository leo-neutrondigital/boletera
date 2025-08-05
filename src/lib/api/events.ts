//src/lib/api/events.ts
import { adminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import type { Event } from "@/types"
import { generateUniqueEventSlug } from "@/lib/utils/slug-generator";

export type EventData = {
  name: string;
  start_date: Date;
  end_date: Date;
  location: string;
  description?: string;
  internal_notes?: string;
  published: boolean;
  // 🆕 Campos nuevos para carrito de compras
  slug?: string;
  allow_preregistration?: boolean;
  preregistration_message?: string;
  public_description?: string;
  featured_image_url?: string;
  terms_and_conditions?: string;
  contact_email?: string;
};

// Tipo para datos de actualización con fechas convertidas
interface EventUpdatePayload {
  name?: string;
  start_date?: Timestamp;
  end_date?: Timestamp;
  location?: string;
  description?: string;
  internal_notes?: string;
  published?: boolean;
  // 🆕 Campos nuevos
  slug?: string;
  allow_preregistration?: boolean;
  preregistration_message?: string;
  public_description?: string;
  featured_image_url?: string;
  terms_and_conditions?: string;
  contact_email?: string;
  updated_at: Timestamp;
}

export async function getAllEvents(): Promise<Event[]> {
  const snapshot = await adminDb.collection("events").orderBy("start_date", "desc").get();
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      start_date: data.start_date?.toDate?.() ?? new Date(data.start_date),
      end_date: data.end_date?.toDate?.() ?? new Date(data.end_date),
      location: data.location,
      description: data.description,
      internal_notes: data.internal_notes,
      published: data.published,
      created_at: data.created_at?.toDate?.() ?? new Date(data.created_at),
      updated_at: data.updated_at?.toDate?.() ?? new Date(data.updated_at),
      // 🆕 Campos nuevos (con fallbacks para compatibilidad)
      slug: data.slug || '',
      allow_preregistration: data.allow_preregistration ?? false,
      preregistration_message: data.preregistration_message || '',
      public_description: data.public_description || data.description || '',
      featured_image_url: data.featured_image_url || '',
      terms_and_conditions: data.terms_and_conditions || '',
      contact_email: data.contact_email || '',
    };
  });
}

export async function createEvent(data: EventData) {
  // 🆕 Generar slug único si no se proporciona
  let slug = data.slug;
  if (!slug) {
    const existingSlugs = await getAllEventSlugs();
    slug = generateUniqueEventSlug(data.name, data.start_date, existingSlugs);
  }
  
  const newDoc = await adminDb.collection("events").add({
    ...data,
    slug,
    start_date: Timestamp.fromDate(new Date(data.start_date)),
    end_date: Timestamp.fromDate(new Date(data.end_date)),
    // 🆕 Valores por defecto para campos nuevos
    allow_preregistration: data.allow_preregistration ?? false,
    public_description: data.public_description || data.description || '',
    created_at: Timestamp.now(),
  });
  return newDoc.id;
}

export async function updateEvent(id: string, data: Partial<EventData>) {
  const updateData: EventUpdatePayload = {
    updated_at: Timestamp.now(),
  };
  
  // Copiar campos básicos
  if (data.name !== undefined) updateData.name = data.name;
  if (data.location !== undefined) updateData.location = data.location;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.internal_notes !== undefined) updateData.internal_notes = data.internal_notes;
  if (data.published !== undefined) updateData.published = data.published;
  
  // 🆕 Campos nuevos
  if (data.slug !== undefined) updateData.slug = data.slug;
  if (data.allow_preregistration !== undefined) updateData.allow_preregistration = data.allow_preregistration;
  if (data.preregistration_message !== undefined) updateData.preregistration_message = data.preregistration_message;
  if (data.public_description !== undefined) updateData.public_description = data.public_description;
  if (data.featured_image_url !== undefined) updateData.featured_image_url = data.featured_image_url;
  if (data.terms_and_conditions !== undefined) updateData.terms_and_conditions = data.terms_and_conditions;
  if (data.contact_email !== undefined) updateData.contact_email = data.contact_email;
  
  // Convertir fechas si están presentes
  if (data.start_date) {
    updateData.start_date = Timestamp.fromDate(new Date(data.start_date));
  }
  if (data.end_date) {
    updateData.end_date = Timestamp.fromDate(new Date(data.end_date));
  }
  
  // 🆕 Si se actualiza el nombre, regenerar slug si no se proporciona uno
  if (data.name && !data.slug) {
    const existingSlugs = await getAllEventSlugs();
    const currentEvent = await getEventById(id);
    if (currentEvent) {
      // Filtrar el slug actual para evitar conflictos consigo mismo
      const filteredSlugs = existingSlugs.filter(s => s !== currentEvent.slug);
      updateData.slug = generateUniqueEventSlug(data.name, currentEvent.start_date, filteredSlugs);
    }
  }
  
  await adminDb.collection("events").doc(id).update(updateData);
}

// 🆕 Función auxiliar para obtener todos los slugs existentes
export async function getAllEventSlugs(): Promise<string[]> {
  const snapshot = await adminDb.collection("events").select("slug").get();
  return snapshot.docs.map(doc => doc.data().slug).filter(Boolean);
}

// 🆕 Función auxiliar para obtener un evento por ID
export async function getEventById(id: string): Promise<Event | null> {
  const doc = await adminDb.collection("events").doc(id).get();
  if (!doc.exists) {
    return null;
  }
  
  const data = doc.data()!;
  return {
    id: doc.id,
    name: data.name,
    start_date: data.start_date?.toDate?.() ?? new Date(data.start_date),
    end_date: data.end_date?.toDate?.() ?? new Date(data.end_date),
    location: data.location,
    description: data.description,
    internal_notes: data.internal_notes,
    published: data.published,
    created_at: data.created_at?.toDate?.() ?? new Date(data.created_at),
    updated_at: data.updated_at?.toDate?.() ?? new Date(data.updated_at),
    slug: data.slug || '',
    allow_preregistration: data.allow_preregistration ?? false,
    preregistration_message: data.preregistration_message || '',
    public_description: data.public_description || data.description || '',
    featured_image_url: data.featured_image_url || '',
    terms_and_conditions: data.terms_and_conditions || '',
    contact_email: data.contact_email || '',
  };
}

// 🆕 Verificar si un slug está disponible
export async function isSlugAvailable(slug: string, excludeEventId?: string): Promise<boolean> {
  const query = adminDb.collection("events").where("slug", "==", slug);
  const snapshot = await query.get();
  
  if (snapshot.empty) {
    return true;
  }
  
  // Si se proporciona un ID a excluir (para actualizaciones), verificar que no sea el mismo evento
  if (excludeEventId) {
    return snapshot.docs.every(doc => doc.id === excludeEventId);
  }
  
  return false;
}

// 🆕 Obtener evento público por slug (server-side)
export async function getPublicEventBySlug(slug: string): Promise<Event | null> {
  const query = adminDb.collection("events")
    .where("slug", "==", slug)
    .where("published", "==", true);
  
  const snapshot = await query.get();
  
  if (snapshot.empty) {
    return null;
  }
  
  const doc = snapshot.docs[0];
  const data = doc.data();
  
  return {
    id: doc.id,
    name: data.name,
    start_date: data.start_date?.toDate?.() ?? new Date(data.start_date),
    end_date: data.end_date?.toDate?.() ?? new Date(data.end_date),
    location: data.location,
    description: data.description,
    internal_notes: data.internal_notes,
    published: data.published,
    created_at: data.created_at?.toDate?.() ?? new Date(data.created_at),
    updated_at: data.updated_at?.toDate?.() ?? new Date(data.updated_at),
    slug: data.slug || '',
    allow_preregistration: data.allow_preregistration ?? false,
    preregistration_message: data.preregistration_message || '',
    public_description: data.public_description || data.description || '',
    featured_image_url: data.featured_image_url || '',
    terms_and_conditions: data.terms_and_conditions || '',
    contact_email: data.contact_email || '',
  };
}
