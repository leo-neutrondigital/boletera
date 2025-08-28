"use client";

import { useEffect } from 'react';
import { useEventCache, type Preregistration } from './use-event-cache';
import { auth } from '@/lib/firebase/client';

// Hook específico para preregistros
export function usePreregistrations() {
  const { 
    preregistrations, 
    loading, 
    loadPreregistrations, 
    invalidateCache 
  } = useEventCache();
  
  // Auto-cargar preregistros al montar el hook
  useEffect(() => {
    console.log('📦 usePreregistrations: Auto-loading preregistrations...');
    loadPreregistrations();
  }, [loadPreregistrations]);
  
  // Funciones específicas para preregistros
  const refreshPreregistrations = () => loadPreregistrations(true);
  const invalidatePreregistrations = () => invalidateCache(['preregistrations']);
  
  // Función para actualizar estado de preregistro
  const updatePreregistrationStatus = async (preregistrationId: string, status: string): Promise<boolean> => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('No authenticated user');
      
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/admin/update-preregistration-status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ preregistrationId, status })
      });
      
      if (response.ok) {
        // Invalidar cache para recargar
        invalidateCache(['preregistrations']);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating preregistration status:', error);
      return false;
    }
  };
  
  // Función para eliminar preregistros múltiples
  const deletePreregistrations = async (preregistrationIds: string[]): Promise<boolean> => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('No authenticated user');
      
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/admin/delete-preregistrations', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ preregistrationIds })
      });
      
      if (response.ok) {
        // Invalidar cache para recargar
        invalidateCache(['preregistrations']);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting preregistrations:', error);
      return false;
    }
  };
  
  // Estadísticas calculadas
  const stats = {
    total: preregistrations.length,
    nuevo: preregistrations.filter(p => p.status === 'nuevo').length,
    contactado: preregistrations.filter(p => p.status === 'contactado').length,
    interesado: preregistrations.filter(p => p.status === 'interesado').length,
    convertido: preregistrations.filter(p => p.status === 'convertido').length
  };
  
  return {
    preregistrations,
    loading: loading.preregistrations,
    stats,
    refreshPreregistrations,
    invalidatePreregistrations,
    updatePreregistrationStatus,
    deletePreregistrations,
    error: null // Por compatibilidad
  };
}
