"use client";

import { useEffect } from 'react';
import { useDataCache, type OrphanTicket, type UserOption } from '@/contexts/DataCacheContext';
import { auth } from '@/lib/firebase/client';

// Hook específico para boletos huérfanos (soporte)
export function useOrphanTickets() {
  const { orphanTickets, loading, loadOrphanTickets, invalidateCache } = useDataCache();
  
  // Auto-cargar boletos huérfanos al montar el hook
  useEffect(() => {
    console.log('📦 useOrphanTickets: Auto-loading orphan tickets on mount...');
    loadOrphanTickets();
  }, [loadOrphanTickets]);
  
  // Función para buscar usuarios por email
  const searchUsersForTicket = async (ticketId: string, email: string): Promise<UserOption[]> => {
    if (!email || email.length < 3) {
      return [];
    }
    
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return [];
      
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/admin/users/search?email=${encodeURIComponent(email)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.users || [];
      }
    } catch (error) {
      console.error('Error searching users:', error);
    }
    
    return [];
  };
  
  // Función para vincular boleto a usuario
  const linkTicketToUser = async (ticketId: string, userId: string): Promise<boolean> => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('No authenticated user');
      
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/admin/link-ticket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ ticketId, userId })
      });
      
      if (response.ok) {
        invalidateCache(['orphanTickets']);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error linking ticket to user:', error);
      return false;
    }
  };
  
  return {
    orphanTickets,
    loading: loading.orphanTickets,
    error: null,
    refreshOrphanTickets: () => loadOrphanTickets(true),
    searchUsersForTicket,
    linkTicketToUser
  };
}
