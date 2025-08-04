"use client"

import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import EventTable from "@/components/dashboard/EventTable"
import { EventFormDialog } from "@/components/dashboard/EventFormDialog"
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
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gestión de Eventos</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={refreshEvents}
            disabled={isLoading}
          >
            {isLoading ? "Actualizando..." : "Actualizar"}
          </Button>
          <EventFormDialog
            onSuccess={handleEventSuccess}
            trigger={
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Crear evento
              </Button>
            }
          />
        </div>
      </div>
      
      <EventTable 
        events={events} 
        onRefresh={refreshEvents}
        onDeleteEvent={deleteEvent}
        onUpdateEvent={updateEventLocally}
        onAddEvent={addEventLocally}
      />
    </main>
  )
}