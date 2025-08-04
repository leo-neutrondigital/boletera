// src/hooks/use-events.ts
"use client"

import { useState, useCallback } from 'react'
import { auth } from '@/lib/firebase/client'
import { useToast } from '@/hooks/use-toast'
import type { Event } from '@/types'

export function useEvents(initialEvents: Event[]) {
  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const refreshEvents = useCallback(async () => {
    try {
      setIsLoading(true)
      
      const currentUser = auth.currentUser
      if (!currentUser) {
        console.warn('No authenticated user for refresh')
        return
      }

      const token = await currentUser.getIdToken()
      console.log('🔄 Refreshing events with token')
      
      const response = await fetch('/api/admin/events', {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch events')
      }
      
      const updatedEvents = await response.json()
      console.log(`✅ Refreshed ${updatedEvents.length} events`)
      setEvents(updatedEvents)
    } catch (error) {
      console.error('Error refreshing events:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron actualizar los eventos",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  const deleteEvent = useCallback(async (eventId: string) => {
    try {
      const currentUser = auth.currentUser
      if (!currentUser) throw new Error('Usuario no autenticado')

      const token = await currentUser.getIdToken()
      console.log('🗑️ Deleting event with ID:', eventId)

      const response = await fetch(`/api/admin/delete-event?id=${eventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al eliminar el evento')
      }

      // Actualizar estado local inmediatamente para mejor UX
      setEvents(prev => prev.filter(event => event.id !== eventId))
      
      toast({
        title: "Evento eliminado",
        description: "El evento se eliminó correctamente",
      })

      return true
    } catch (error) {
      console.error('Error deleting event:', error)
      const err = error as { message?: string }
      toast({
        variant: "destructive",
        title: "Error",
        description: err?.message || "No se pudo eliminar el evento",
      })
      return false
    }
  }, [toast])

  // Función para actualizar un evento en el estado local (optimistic update)
  const updateEventLocally = useCallback((updatedEvent: Event) => {
    setEvents(prev => 
      prev.map(event => 
        event.id === updatedEvent.id ? updatedEvent : event
      )
    )
  }, [])

  // Función para agregar un evento en el estado local
  const addEventLocally = useCallback((newEvent: Event) => {
    setEvents(prev => [newEvent, ...prev])
  }, [])

  return {
    events,
    isLoading,
    refreshEvents,
    deleteEvent,
    updateEventLocally,
    addEventLocally,
  }
}
