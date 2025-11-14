"use client";

import { SWRConfig } from 'swr';
import { ReactNode } from 'react';

/**
 * Provider de SWR con persistencia en localStorage
 * 
 * Características:
 * - Cache persiste al cerrar navegador
 * - Namespace aislado: 'swr-cache' (no conflicto con otros caches)
 * - Restauración automática al iniciar app
 * - Limpieza automática antes de cerrar
 * 
 * Coexiste con DataCacheContext (preregistros, usuarios, etc.)
 */

function localStorageProvider() {
  // Clave única para evitar conflictos con otros sistemas de cache
  const CACHE_KEY = 'swr-cache';
  
  // Al iniciar, restaurar cache desde localStorage
  let map: Map<string, any>;
  
  try {
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      map = new Map(parsed);
      console.log('✅ SWR cache restored from localStorage:', map.size, 'entries');
    } else {
      map = new Map();
    }
  } catch (error) {
    console.warn('⚠️ Error restoring SWR cache, starting fresh:', error);
    map = new Map();
  }

  // Guardar en localStorage periódicamente (cada 30 segundos)
  const saveToStorage = () => {
    try {
      const cacheArray = Array.from(map.entries());
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheArray));
      console.log('💾 SWR cache saved to localStorage:', map.size, 'entries');
    } catch (error) {
      console.error('❌ Error saving SWR cache:', error);
    }
  };

  // Auto-guardar cada 30 segundos
  const interval = setInterval(saveToStorage, 30000);

  // Guardar antes de cerrar la página
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      clearInterval(interval);
      saveToStorage();
    });
  }

  return map;
}

interface SWRProviderProps {
  children: ReactNode;
}

/**
 * Provider global de SWR con cache persistente
 * 
 * Uso:
 * - Envolver la app en layout.tsx
 * - Cache automático para todos los hooks SWR
 * - Persiste al cerrar navegador
 */
export function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRConfig 
      value={{ 
        provider: localStorageProvider,
        // Configuración global (puede ser sobrescrita por hooks individuales)
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        dedupingInterval: 2 * 60 * 1000, // 2 minutos
      }}
    >
      {children}
    </SWRConfig>
  );
}
