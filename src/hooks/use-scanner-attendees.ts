'use client';

import useSWR from 'swr';
import { useAuth } from '@/contexts/AuthContext';

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
  
  // SWR hook
  const { data, error, mutate, isValidating } = useSWR(
    eventId && user ? `/api/scanner/events/${eventId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,      // No revalidar al cambiar de tab
      revalidateOnReconnect: true,   // Sí revalidar al reconectar
      dedupingInterval: 60000,       // Deduplicar requests por 60s
      refreshInterval: 600000,       // Background refresh cada 10 min (reducido 80%)
      
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
    isLoading: !error && !data && isValidating,
    error,
    refresh: mutate,
    updateAttendee
  };
}
