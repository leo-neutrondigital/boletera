'use client';

import useSWR from 'swr';
import { useAuth } from '@/contexts/AuthContext';

// 🗄️ localStorage provider para persistir cache entre recargas
const localStorageProvider = () => {
  const CACHE_KEY = 'scanner-attendees-cache';
  
  // Cargar cache existente con tipos correctos
  const map = new Map<string, any>(JSON.parse(localStorage.getItem(CACHE_KEY) || '[]'));
  
  // Guardar cache antes de cerrar/recargar
  window.addEventListener('beforeunload', () => {
    const appCache = Array.from(map.entries());
    localStorage.setItem(CACHE_KEY, JSON.stringify(appCache));
  });
  
  return map;
};

export function useScannerAttendees(eventId: string) {
  const { user } = useAuth();
  
  // Fetcher function
  const fetcher = async (url: string) => {
    if (!user) throw new Error('No authenticated user');
    
    const token = await user.getIdToken();
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  };
  
  // SWR hook con localStorage persistence
  const { data, error, mutate, isValidating } = useSWR(
    eventId && user ? `/api/scanner/events/${eventId}` : null,
    fetcher,
    {
      provider: localStorageProvider,  // 🆕 Persistir en localStorage
      revalidateOnFocus: false,        // No revalidar al cambiar de tab
      revalidateIfStale: true,         // 🆕 SÍ revalidar si no hay cache (primera vez)
      revalidateOnReconnect: true,     // Sí revalidar al reconectar
      dedupingInterval: 60000,         // Deduplicar requests por 60s
      refreshInterval: 0,              // 🆕 Desactivar refresh automático
      
      onError: (err) => console.error('[Scanner] Error:', err),
      onSuccess: (data) => console.log(`✅ ${data?.attendees?.length || 0} attendees loaded`)
    }
  );
  
  // Actualizar UN boleto localmente (optimista)
  const updateAttendee = (ticketId: string, updates: any) => {
    mutate(
      (currentData: any) => {
        if (!currentData?.attendees) return currentData;
        
        return {
          ...currentData,
          attendees: currentData.attendees.map((a: any) =>
            a.id === ticketId ? { ...a, ...updates } : a
          )
        };
      },
      { revalidate: false }  // No revalidar inmediatamente
    );
  };
  
  return {
    attendees: data?.attendees || [],
    event: data?.event || null,
    stats: data?.stats || null,
    isLoading: !error && !data,           // Primera carga (sin data)
    isValidating,                         // 🆕 Refrescando en background (con o sin data)
    error,
    refresh: mutate,
    updateAttendee
  };
}
