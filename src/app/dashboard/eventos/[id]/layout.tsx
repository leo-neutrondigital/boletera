import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { EventTabsNavigation } from "@/components/dashboard/EventTabsNavigation";
import { SalesPageProvider } from "@/contexts/SalesPageContext";
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
    };

    return event;
  } catch (error) {
    console.error("Error fetching event:", error);
    return null;
  }
}

interface EventLayoutProps {
  children: React.ReactNode;
  params: { id: string };
}

export default async function EventLayout({ children, params }: EventLayoutProps) {
  const event = await getEvent(params.id);
  
  if (!event) {
    notFound();
  }

  return (
    <SalesPageProvider>
      <div className="flex flex-col h-full">
        <EventTabsNavigation event={event} />
        <div className="flex-1">
          {children}
        </div>
      </div>
    </SalesPageProvider>
  );
}
