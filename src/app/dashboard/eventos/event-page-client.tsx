"use client"

import { Plus, Calendar, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import EventTable from "@/components/dashboard/EventTable"
import { EventFormDialog } from "@/components/dashboard/EventFormDialog"
import { PageHeader } from "@/components/shared/PageHeader"
import { PageContent } from "@/components/shared/PageContent"
import { useEvents } from "@/hooks/use-events"
import type { Event } from "@/types"

export default function EventPageClient({ events: initialEvents }: { events: Event[] }) {
  const { 
    events, 
    isLoading, 
    refreshEvents, 
    deleteEvent, 
    updateEventLocally, 
    addEventLocally 
  } = useEvents(initialEvents)

  const handleEventSuccess = (event?: Event) => {
    if (event) {
      // Verificar si es actualización o creación basado en si existe en la lista actual
      const existingEvent = events.find(e => e.id === event.id)
      if (existingEvent) {
        updateEventLocally(event)
      } else {
        addEventLocally(event)
      }
    } else {
      // Fallback a refresh completo
      refreshEvents()
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <PageHeader
        icon={Calendar}
        title="Gestión de Eventos"
        description="Crear, editar y administrar eventos de la plataforma"
        iconColor="blue"
        badgeColor="blue"
        actions={
          <>
            <Button 
              variant="outline" 
              onClick={refreshEvents}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              {isLoading ? "Actualizando..." : "Actualizar"}
            </Button>
            <EventFormDialog
              onSuccess={handleEventSuccess}
              trigger={
                <Button className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Crear evento
                </Button>
              }
            />
          </>
        }
      />

      {/* Content */}
      <PageContent className="flex-1" padding="lg">
        <EventTable 
          events={events} 
          onRefresh={refreshEvents}
          onDeleteEvent={deleteEvent}
          onUpdateEvent={updateEventLocally}
          onAddEvent={addEventLocally}
        />
      </PageContent>
    </div>
  )
}