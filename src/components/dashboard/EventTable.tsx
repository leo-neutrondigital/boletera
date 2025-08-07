"use client"

import { Edit, Trash2, Calendar, MapPin, Users, Settings, Globe, Bell, ExternalLink } from "lucide-react"
import { format } from "date-fns"
import { EventFormDialog } from "./EventFormDialog"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { Can } from "@/components/auth/Can"
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
      {/* Vista de tarjetas mejorada */}
      <div className="grid gap-4">
        {events.map((event) => {
          const dateInfo = getEventDateInfo(event);
          
          return (
            <div 
              key={event.id} 
              className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* Header con nombre y badges */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
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
                        {event.allow_preregistration && (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700">
                            <Bell className="h-3 w-3 mr-1" />
                            Prerregistro
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* URL pública si está publicado */}
                    {event.published && event.slug && (
                      <div className="ml-4 flex-shrink-0">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 px-2 text-xs text-blue-600 hover:text-blue-800"
                          asChild
                        >
                          <a 
                            href={`/events/${event.slug}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1"
                          >
                            <Globe className="h-3 w-3" />
                            Ver público
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      </div>
                    )}
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

                    {/* Slug/URL */}
                    {event.slug && (
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 flex-shrink-0" />
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          /events/{event.slug}
                        </code>
                      </div>
                    )}

                    {/* Descripción pública o interna */}
                    {event.public_description && (
                      <div className="flex items-start gap-2">
                        <Users className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{event.public_description}</span>
                      </div>
                    )}

                    {/* Información adicional en una fila compacta */}
                    <div className="flex gap-4 text-xs pt-2 border-t">
                      {event.contact_email && (
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                          Contacto: {event.contact_email}
                        </span>
                      )}
                      {event.featured_image_url && (
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                          Con imagen
                        </span>
                      )}
                      {event.terms_and_conditions && (
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                          Con términos
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex gap-2 ml-4 flex-shrink-0">
                  {/* 🔐 Botón para gestionar tipos de boletos */}
                  <Can do="read" on="ticketTypes">
                    <Link href={`/dashboard/eventos/${event.id}/boletos`}>
                      <Button variant="outline" size="sm" className="h-8 px-3 text-xs">
                        <Settings className="h-3 w-3 mr-1" />
                        Boletos
                      </Button>
                    </Link>
                  </Can>

                  {/* 🔐 Botón Editar */}
                  <Can do="update" on="events">
                    <EventFormDialog 
                      eventToEdit={event}
                      onSuccess={handleEventSuccess}
                      trigger={
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Edit className="h-4 w-4" />
                        </Button>
                      }
                    />
                  </Can>
                  
                  {/* 🔐 Botón Eliminar - Solo admin */}
                  <Can do="delete" on="events">
                    <ConfirmDialog
                      trigger={
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-800">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      }
                      title="¿Eliminar evento?"
                      description={`¿Estás seguro de que quieres eliminar "${event.name}"? Esta acción eliminará también todos los boletos asociados y no se puede deshacer.`}
                      onConfirm={() => handleDelete(event.id)}
                      confirmText="Eliminar"
                      cancelText="Cancelar"
                      destructive
                    />
                  </Can>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}