"use client";

import { useEffect } from 'react';
import { useEventCache, type CourtesyTicket } from './use-event-cache';

// Hook específico para boletos de cortesía
export function useCourtesyTickets() {
  const { 
    courtesyTickets, 
    loading, 
    loadCourtesyTickets, 
    invalidateCache 
  } = useEventCache();
  
  // Auto-cargar cortesías al montar el hook
  useEffect(() => {
    console.log('📦 useCourtesyTickets: Auto-loading courtesy tickets...');
    loadCourtesyTickets();
  }, [loadCourtesyTickets]);
  
  // Funciones específicas para cortesías
  const refreshCourtesyTickets = () => loadCourtesyTickets(true);
  const invalidateCourtesyTickets = () => invalidateCache(['courtesyTickets']);
  
  // Estadísticas calculadas
  const stats = {
    total: courtesyTickets.length,
    configured: courtesyTickets.reduce((sum, t) => sum + t.configured_tickets, 0),
    pending: courtesyTickets.reduce((sum, t) => sum + t.pending_tickets, 0),
    totalTickets: courtesyTickets.reduce((sum, t) => sum + t.total_tickets, 0),
    byType: courtesyTickets.reduce((acc, t) => {
      acc[t.courtesy_type] = (acc[t.courtesy_type] || 0) + t.total_tickets;
      return acc;
    }, {} as Record<string, number>)
  };
  
  return {
    courtesyTickets,
    loading: loading.courtesyTickets,
    stats,
    refreshCourtesyTickets,
    invalidateCourtesyTickets,
    error: null // Por compatibilidad
  };
}
