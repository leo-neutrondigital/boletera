import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { EventConfigurationClient } from "./event-configuration-client";
import type { Event } from "@/types";

async function getEvent(eventId: string): Promise<Event | null> {
  try {
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

    return event;
  } catch (error) {
    console.error("Error fetching event:", error);
    return null;
  }
}

interface PageProps {
  params: { id: string };
}

export default async function EventDetailPage({ params }: PageProps) {
  const event = await getEvent(params.id);
  
  if (!event) {
    notFound();
  }

  return <EventConfigurationClient event={event} />;
}
