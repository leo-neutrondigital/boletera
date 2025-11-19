'use client';

import useSWR from 'swr';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedPut } from '@/lib/utils/api';

// 🗄️ localStorage provider para persistir cache entre recargas
const localStorageProvider = () => {
  const CACHE_KEY = 'courtesy-order-cache';
  
  // Cargar cache existente
  const map = new Map<string, any>(JSON.parse(localStorage.getItem(CACHE_KEY) || '[]'));
  
  // Guardar cache antes de cerrar/recargar
  window.addEventListener('beforeunload', () => {
    const appCache = Array.from(map.entries());
    localStorage.setItem(CACHE_KEY, JSON.stringify(appCache));
  });
  
  return map;
};

export function useCourtesyOrder(orderId: string, orderType: 'cortesia' | 'venta' = 'cortesia') {
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
  
  // Determinar endpoint según tipo
  const endpoint = orderType === 'venta' 
    ? `/api/admin/sales-orders/${orderId}`
    : `/api/admin/courtesy-orders/${orderId}`;
  
  // SWR hook con localStorage persistence
  const { data, error, mutate, isValidating } = useSWR(
    orderId && user ? endpoint : null,
    fetcher,
    {
      provider: localStorageProvider,  // 🆕 Persistir en localStorage
      revalidateOnFocus: false,        // No revalidar al cambiar de tab
      revalidateIfStale: true,         // Revalidar si datos están stale
      revalidateOnReconnect: true,     // Revalidar al reconectar
      dedupingInterval: 2000,          // Deduplicar requests por 2s
      refreshInterval: 0,              // Sin polling automático
      
      onError: (err) => console.error(`[${orderType}] Error loading order:`, err),
      onSuccess: (data) => {
        console.log(`✅ ${orderType} order loaded:`, data.order_id);
        console.log('🔍 [SWR Hook] Tickets from API:', data.tickets?.map((t: any) => ({
          id: t.id,
          name: t.attendee_name,
          email: t.attendee_email,
          pdf_url: t.pdf_url,
          pdf_path: t.pdf_path,
          status: t.status
        })));
      }
    }
  );
  
  // ✨ Actualizar UN ticket con persistencia a Firestore + optimismo
  const updateTicket = async (ticketId: string, updates: any) => {
    // 1. Actualización optimista inmediata (UI)
    mutate(
      (currentData: any) => {
        if (!currentData?.tickets) return currentData;
        
        return {
          ...currentData,
          tickets: currentData.tickets.map((t: any) =>
            t.id === ticketId ? { ...t, ...updates } : t
          )
        };
      },
      { revalidate: false }  // No revalidar todavía
    );
    
    // 2. Detectar tipo de actualización
    const isInitialUpdate = updates.pdf_url === 'generating...';
    const isFinalUpdate = updates.pdf_url && updates.pdf_url.startsWith('http');
    
    // 3. Si es actualización inicial (guardar datos del asistente), persistir a Firestore
    if (isInitialUpdate) {
      console.log('💾 Persisting attendee data to Firestore...');
      
      try {
        // Guardar solo campos permitidos (sin pdf_url temporal)
        const dataToSave: any = {};
        if (updates.attendee_name) dataToSave.attendee_name = updates.attendee_name;
        if (updates.attendee_email) dataToSave.attendee_email = updates.attendee_email;
        if (updates.attendee_phone) dataToSave.attendee_phone = updates.attendee_phone;
        if (updates.special_requirements) dataToSave.special_requirements = updates.special_requirements;
        
        const response = await authenticatedPut(`/api/tickets/${ticketId}`, dataToSave);
        
        if (!response.ok) {
          const error = await response.json();
          console.error('❌ Failed to persist data:', error);
          throw new Error(error.error || 'Failed to save data');
        }
        
        console.log('✅ Attendee data persisted to Firestore');
        
        // Esperar generación de PDF y revalidar
        await new Promise(resolve => setTimeout(resolve, 2000));
        await mutate();
        console.log('✅ Order revalidated after ticket save');
        
      } catch (error) {
        console.error('❌ Error persisting data:', error);
        // Revertir estado optimista en caso de error
        await mutate();
        throw error;
      }
      
    } else if (isFinalUpdate) {
      console.log('✅ Final update detected (PDF ready), keeping optimistic state');
      // No revalidar, el estado optimista ya tiene el PDF correcto
    } else {
      console.log('📝 Partial update, no revalidation needed');
    }
  };
  
  return {
    orderData: data || null,
    tickets: data?.tickets || [],
    event: data?.event || null,
    stats: data?.stats || null,
    isLoading: !error && !data,
    isValidating,
    error,
    updateTicket,
    refresh: mutate
  };
}
