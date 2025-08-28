"use client";

import { useEffect } from 'react';
import { useEventCache, type SoldTicket } from './use-event-cache';

// Hook específico para boletos vendidos
export function useSoldTickets() {
  const { 
    soldTickets, 
    loading, 
    loadSoldTickets, 
    invalidateCache 
  } = useEventCache();
  
  // Auto-cargar boletos vendidos al montar el hook
  useEffect(() => {
    console.log('📦 useSoldTickets: Auto-loading sold tickets...');
    loadSoldTickets();
  }, [loadSoldTickets]);
  
  // Funciones específicas para boletos vendidos
  const refreshSoldTickets = () => loadSoldTickets(true);
  const invalidateSoldTickets = () => invalidateCache(['soldTickets']);
  
  // Estadísticas calculadas
  const stats = {
    total: soldTickets.length,
    purchased: soldTickets.filter(t => t.status === 'purchased').length,
    configured: soldTickets.filter(t => t.status === 'configured').length,
    generated: soldTickets.filter(t => t.status === 'generated').length,
    used: soldTickets.filter(t => t.status === 'used').length,
    totalAmount: soldTickets.reduce((sum, t) => sum + (t.amount_paid || 0), 0)
  };
  
  return {
    soldTickets,
    loading: loading.soldTickets,
    stats,
    refreshSoldTickets,
    invalidateSoldTickets,
    error: null // Por compatibilidad
  };
}
