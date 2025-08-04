// src/app/dashboard/eventos/page.tsx
import { getAllEvents } from "@/lib/api/events"
import EventPageClient from "./event-page-client"
import { RoleGuard } from "@/components/auth/RoleGuard"

export default async function EventPage() {
  const events = await getAllEvents()

  return (
    <RoleGuard allowedRoles={["admin", "gestor"]}>
      <EventPageClient events={events} />
    </RoleGuard>
  )
}
