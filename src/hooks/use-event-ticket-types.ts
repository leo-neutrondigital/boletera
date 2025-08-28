"use client";

import { useEffect } from 'react';
import { useEventCache, type EventTicketType } from './use-event-cache';

// Hook específico para tipos de boletos de evento
export function useEventTicketTypes() {
  const { 
    ticketTypes, 
    loading, 
    loadTicketTypes, 
    invalidateCache 
  } = useEventCache();
  
  // Auto-cargar tipos de boletos al montar el hook
  useEffect(() => {
    console.log('📦 useEventTicketTypes: Auto-loading ticket types...');
    loadTicketTypes();
  }, [loadTicketTypes]);
  
  // Funciones específicas para tipos de boletos
  const refreshTicketTypes = () => loadTicketTypes(true);
  const invalidateTicketTypes = () => invalidateCache(['ticketTypes']);
  
  // Filtros útiles
  const activeTicketTypes = ticketTypes.filter(t => t.is_active);
  const courtesyTicketTypes = ticketTypes.filter(t => t.is_courtesy);
  const regularTicketTypes = ticketTypes.filter(t => !t.is_courtesy && t.is_active);
  
  // Estadísticas calculadas
  const stats = {
    total: ticketTypes.length,
    active: activeTicketTypes.length,
    inactive: ticketTypes.filter(t => !t.is_active).length,
    courtesy: courtesyTicketTypes.length,
    regular: regularTicketTypes.length,
    totalSold: ticketTypes.reduce((sum, t) => sum + (t.sold_count || 0), 0),
    totalStock: ticketTypes.reduce((sum, t) => sum + (t.total_stock || 0), 0),
    lowestPrice: Math.min(...ticketTypes.filter(t => !t.is_courtesy).map(t => t.price)),
    highestPrice: Math.max(...ticketTypes.filter(t => !t.is_courtesy).map(t => t.price))
  };
  
  return {
    ticketTypes,
    activeTicketTypes,
    courtesyTicketTypes,
    regularTicketTypes,
    loading: loading.ticketTypes,
    stats,
    refreshTicketTypes,
    invalidateTicketTypes,
    error: null // Por compatibilidad
  };
}
