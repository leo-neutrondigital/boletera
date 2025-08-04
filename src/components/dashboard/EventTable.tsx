"use client"

import { Edit, Trash2, Calendar, MapPin, Users, Settings } from "lucide-react"
import { format } from "date-fns"
import { EventFormDialog } from "./EventFormDialog"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { PermissionWrapper } from "@/components/auth/PermissionWrapper"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Event } from "@/types"
import { getEventDateInfo, formatEventDuration } from "@/lib/utils/event-dates"
import Link from "next/link"

type Props = {
  events: Event[]
  onRefresh: () => void
  onDeleteEvent: (eventId: string) => Promise<boolean>
  onUpdateEvent: (event: Event) => void
  onAddEvent: (event: Event) => void
}

export default function EventTable({ 
  events, 
  onRefresh, 
  onDeleteEvent, 
  onUpdateEvent,
  onAddEvent 
}: Props) {
  const handleDelete = async (eventId: string) => {
    const success = await onDeleteEvent(eventId)
    if (success) {
      console.log('✅ Event deleted and state updated')
    }
  }

  const handleEventSuccess = (event?: Event) => {
    if (event) {
      const existingEvent = events.find(e => e.id === event.id)
      if (existingEvent) {
        console.log('🔄 Updating event optimistically:', event)
        onUpdateEvent(event)
      } else {
        console.log('➕ Adding new event optimistically:', event)
        onAddEvent(event)
      }
    } else {
      console.log('🔄 Falling back to full refresh')
      onRefresh()
    }
  }

  if (events.length === 0) {
    return (
      <div className="w-full p-8 text-center text-muted-foreground">
        <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg mb-2">No hay eventos creados</p>
        <p className="text-sm">Crea tu primer evento para comenzar</p>
      </div>
    )
  }

  return (
    <div className="w-full space-y-4">
      {/* Vista de tarjetas para mejor visualización */}
      <div className="grid gap-4">
        {events.map((event) => {
          const dateInfo = getEventDateInfo(event);
          
          // Preparar datos para editar
          const eventToEdit = {
            id: event.id,
            name: event.name,
            start_date: format(new Date(event.start_date), "yyyy-MM-dd"),
            end_date: format(new Date(event.end_date), "yyyy-MM-dd"),
            location: event.location,
            description: event.description || "",
            internal_notes: event.internal_notes || "",
            published: event.published,
          }

          return (
            <div 
              key={event.id} 
              className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* Header con nombre y badges */}
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold truncate">{event.name}</h3>
                    <div className="flex gap-2 flex-shrink-0">
                      <Badge 
                        variant={event.published ? "default" : "secondary"}
                        className={
                          event.published 
                            ? "bg-green-100 text-green-800 hover:bg-green-200" 
                            : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                        }
                      >
                        {event.published ? "Publicado" : "Borrador"}
                      </Badge>
                      {dateInfo.isMultiDay && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          {formatEventDuration(dateInfo.duration)}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Información del evento */}
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <span className="font-medium">{dateInfo.dateRange}</span>
                      {dateInfo.isMultiDay && (
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {dateInfo.duration} días
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span>{event.location}</span>
                    </div>
                    {event.description && (
                      <div className="flex items-start gap-2">
                        <Users className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{event.description}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex gap-2 ml-4 flex-shrink-0">
                  {/* 🔐 Botón para gestionar tipos de boletos - Solo admin y gestor */}
                  <PermissionWrapper resource="ticketTypes" action="read">
                    <Link href={`/dashboard/eventos/${event.id}/boletos`}>
                      <Button variant="outline" size="sm" className="h-8 px-3 text-xs">
                        <Settings className="h-3 w-3 mr-1" />
                        Boletos
                      </Button>
                    </Link>
                  </PermissionWrapper>

                  {/* 🔐 Botón Editar - Solo admin y gestor */}
                  <PermissionWrapper resource="events" action="update">
                    <EventFormDialog 
                      eventToEdit={eventToEdit}
                      onSuccess={handleEventSuccess}
                      trigger={
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Edit className="h-4 w-4" />
                        </Button>
                      }
                    />
                  </PermissionWrapper>
                  
                  {/* 🔐 Botón Eliminar - Solo admin */}
                  <PermissionWrapper resource="events" action="delete">
                    <ConfirmDialog
                      trigger={
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-800">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      }
                      title="¿Eliminar evento?"
                      description={`¿Estás seguro de que quieres eliminar "${event.name}"? Esta acción no se puede deshacer.`}
                      onConfirm={() => handleDelete(event.id)}
                      confirmText="Eliminar"
                      cancelText="Cancelar"
                      destructive
                    />
                  </PermissionWrapper>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}