// src/app/dashboard/eventos/[id]/preregistros-v2/page.tsx
import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { PreregistrosPageClient } from "./preregistros-page-client";
import type { Event } from "@/types";

// 🔧 Hacer la página dinámica para evitar caché
export const revalidate = 0;

interface Preregistration {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string;
  company?: string;
  interested_tickets: {
    ticket_type_id: string;
    quantity: number;
    unit_price: number;
  }[];
  status: 'nuevo' | 'contactado' | 'interesado' | 'convertido';
  created_at: Date;
  source: string;
}

async function getEventWithPreregistros(eventId: string): Promise<{ event: Event; preregistrations: Preregistration[] } | null> {
  try {
    // Obtener evento
    const eventDoc = await adminDb.collection("events").doc(eventId).get();
    if (!eventDoc.exists) return null;

    const eventData = eventDoc.data();
    const event: Event = {
      id: eventDoc.id,
      name: eventData!.name,
      start_date: eventData!.start_date?.toDate() ?? new Date(eventData!.start_date),
      end_date: eventData!.end_date?.toDate() ?? new Date(eventData!.end_date),
      location: eventData!.location,
      description: eventData!.description,
      internal_notes: eventData!.internal_notes,
      published: eventData!.published,
      created_at: eventData!.created_at?.toDate() ?? new Date(eventData!.created_at),
      updated_at: eventData!.updated_at?.toDate() ?? (eventData!.updated_at ? new Date(eventData!.updated_at) : undefined),
      slug: eventData!.slug || eventDoc.id,
      allow_preregistration: eventData!.allow_preregistration,
      preregistration_message: eventData!.preregistration_message,
      public_description: eventData!.public_description,
      featured_image_url: eventData!.featured_image_url,
      terms_and_conditions: eventData!.terms_and_conditions,
      contact_email: eventData!.contact_email,
    };

    // Obtener preregistros
    const preregistrosSnapshot = await adminDb
      .collection("preregistrations")
      .where("event_id", "==", eventId)
      .orderBy("created_at", "desc")
      .get();

    const preregistrations: Preregistration[] = preregistrosSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        user_id: data.user_id || null,
        // Los datos están en el nivel raíz, no en customer_data
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        company: data.company || '',
        interested_tickets: data.interested_tickets || [],
        status: data.status || 'nuevo',
        created_at: data.created_at?.toDate() ?? new Date(data.created_at),
        source: data.source || 'landing_page'
      };
    });

    return { event, preregistrations };
  } catch (error) {
    console.error("Error fetching event with preregistrations:", error);
    return null;
  }
}

interface PageProps {
  params: { id: string };
}

export default async function PreregistrosV2Page({ params }: PageProps) {
  const data = await getEventWithPreregistros(params.id);
  
  if (!data) {
    notFound();
  }

  return <PreregistrosPageClient event={data.event} initialPreregistrations={data.preregistrations} />;
}
