"use client";

import { useMemo, useCallback } from 'react';
import useSWR from 'swr';
import { authenticatedGet } from '@/lib/utils/api';

// Interfaz para venta offline
interface OfflineSale {
  id: string;
  event_id: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  total_amount: number;
  currency: string;
  payment_method: 'cash' | 'transfer' | 'card' | 'other';
  payment_reference?: string;
  total_tickets: number;
  notes?: string;
  created_at: Date;
  created_by: string;
  tickets: Array<{
    id: string;
    ticket_type_id: string;
    ticket_type_name: string;
    attendee_name?: string;
    status: string;
  }>;
}

interface OfflineSalesStats {
  total_orders: number;
  total_tickets: number;
  total_revenue: number;
  currency: string;
  by_payment_method: {
    cash: number;
    transfer: number;
    card: number;
    other: number;
  };
}

// Fetcher para SWR
const fetcher = async (url: string) => {
  const response = await authenticatedGet(url);
  if (!response.ok) {
    throw new Error('Error loading offline sales');
  }
  return response.json();
};

export function useOfflineSalesOrders(eventId?: string) {
  const swrKey = eventId ? `/api/admin/offline-sales?eventId=${eventId}` : null;
  
  const { data, error, isLoading, mutate } = useSWR(swrKey, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    dedupingInterval: 2 * 60 * 1000, // 2 minutos
    shouldRetryOnError: false,
  });

  // Procesar ventas offline
  const offlineSales = useMemo((): OfflineSale[] => {
    if (!data?.orders) return [];
    
    return data.orders
      .filter((sale: any) => sale.order_id) // Filtrar órdenes sin ID
      .map((sale: any) => ({
        id: sale.order_id,
        event_id: sale.event_id,
        customer_name: sale.customer_name,
        customer_email: sale.customer_email,
        customer_phone: sale.customer_phone,
        total_amount: sale.total_amount || 0,
        currency: sale.currency || 'MXN',
        payment_method: sale.payment_method,
        payment_reference: sale.payment_reference,
        total_tickets: sale.total_tickets || 0,
        notes: sale.notes,
        created_at: new Date(sale.created_at || sale.sale_date || Date.now()),
        created_by: sale.created_by,
        tickets: sale.tickets || [],
      }));
  }, [data]);

  const stats = useMemo((): OfflineSalesStats => {
    if (!data?.stats) {
      return {
        total_orders: 0,
        total_tickets: 0,
        total_revenue: 0,
        currency: 'MXN',
        by_payment_method: {
          cash: 0,
          transfer: 0,
          card: 0,
          other: 0,
        },
      };
    }

    return {
      total_orders: data.stats.total_orders || 0,
      total_tickets: data.stats.total_tickets || 0,
      total_revenue: data.stats.total_revenue || 0,
      currency: data.stats.currency || 'MXN',
      by_payment_method: data.stats.by_payment_method || {
        cash: 0,
        transfer: 0,
        card: 0,
        other: 0,
      },
    };
  }, [data]);
  
  // Función para refrescar manualmente (botón de recarga)
  const refreshOfflineSales = useCallback(() => {
    console.log('🔄 Manually refreshing offline sales...');
    mutate();
  }, [mutate]);
  
  // Función para invalidar caché
  const invalidateOfflineCache = useCallback(() => {
    console.log('🗑️ Invalidating offline sales cache...');
    mutate(undefined, { revalidate: false });
  }, [mutate]);
  
  return {
    offlineSales,
    loading: isLoading,
    stats,
    error: error ? (error instanceof Error ? error.message : 'Error loading offline sales') : null,
    refreshOfflineSales,
    invalidateOfflineCache,
    mutate, // Exponer mutate para invalidación granular
  };
}
