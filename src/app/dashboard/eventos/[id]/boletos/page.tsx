// src/app/dashboard/eventos/[id]/boletos/page.tsx
import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { TicketTypesPageClient } from "./ticket-types-page-client";
import type { Event, TicketType } from "@/types";

async function getEventWithTicketTypes(eventId: string): Promise<{ event: Event; ticketTypes: TicketType[] } | null> {
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
      slug: eventData!.slug || eventDoc.id, // fallback to id if slug missing
      allow_preregistration: eventData!.allow_preregistration,
      preregistration_message: eventData!.preregistration_message,
      public_description: eventData!.public_description,
      featured_image_url: eventData!.featured_image_url,
      terms_and_conditions: eventData!.terms_and_conditions,
      contact_email: eventData!.contact_email,
    };

    // Obtener tipos de boletos
    const ticketTypesSnapshot = await adminDb
      .collection("ticket_types")
      .where("event_id", "==", eventId)
      .get();

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
        sale_start: data.sale_start?.toDate ? data.sale_start.toDate() : (data.sale_start ? new Date(data.sale_start) : undefined),
        sale_end: data.sale_end?.toDate ? data.sale_end.toDate() : (data.sale_end ? new Date(data.sale_end) : undefined),
        is_courtesy: data.is_courtesy || false,
        sort_order: data.sort_order || 999,
        created_at: data.created_at?.toDate ? data.created_at.toDate() : new Date(data.created_at),
        updated_at: data.updated_at?.toDate ? data.updated_at.toDate() : (data.updated_at ? new Date(data.updated_at) : undefined),
      };
    })
    .sort((a, b) => a.sort_order - b.sort_order);

    return { event, ticketTypes };
  } catch (error) {
    console.error("Error fetching event with ticket types:", error);
    return null;
  }
}

interface PageProps {
  params: { id: string };
}

export default async function TicketTypesPage({ params }: PageProps) {
  const data = await getEventWithTicketTypes(params.id);
  
  if (!data) {
    notFound();
  }

  return <TicketTypesPageClient event={data.event} initialTicketTypes={data.ticketTypes} />;
}
