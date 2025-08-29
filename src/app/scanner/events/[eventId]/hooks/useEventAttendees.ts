'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedGet } from '@/lib/utils/api';
import type { EventData, AttendeeTicket, EventStats } from '../types';

export function useEventAttendees(eventId: string) {
  const { toast } = useToast();
  const { user, loading: isAuthLoading } = useAuth();
  
  const [event, setEvent] = useState<EventData | null>(null);
  const [attendees, setAttendees] = useState<AttendeeTicket[]>([]);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar asistentes del evento
  const loadAttendees = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('👥 Loading attendees for event:', eventId);

      const response = await authenticatedGet(`/api/scanner/events/${eventId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error loading attendees');
      }

      console.log('✅ Attendees loaded:', result);
      setEvent(result.event);
      setAttendees(result.attendees || []);
      setStats(result.stats);
      setError(null);

    } catch (error) {
      console.error('❌ Error loading attendees:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

      setError(errorMessage);

      toast({
        variant: 'destructive',
        title: 'Error cargando asistentes',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, [eventId, toast]);

  useEffect(() => {
    if (!isAuthLoading && user && eventId) {
      console.log('🔐 Auth ready, loading attendees for event:', eventId);
      loadAttendees();
    } else if (!isAuthLoading && !user) {
      console.log('⚠️ No authenticated user found');
      setError('Usuario no autenticado');
      setIsLoading(false);
    }
  }, [isAuthLoading, user, eventId, loadAttendees]);

  return {
    event,
    attendees,
    stats,
    isLoading: isLoading || isAuthLoading,
    error,
    refetch: loadAttendees
  };
}
