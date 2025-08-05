// src/app/dashboard/eventos/page.tsx
import { getAllEvents } from "@/lib/api/events"
import EventPageClient from "./event-page-client"

export default async function EventPage() {
  const events = await getAllEvents()

  return <EventPageClient events={events} />
}
