"use client";

import { useMemo, useCallback } from 'react';
import useSWR from 'swr';
import { authenticatedGet } from '@/lib/utils/api';

// Interfaz para órdenes de ventas (agrupadas)
interface SalesOrder {
  id: string;            // order_id
  customer_name: string;
  customer_email: string;
  total_tickets: number;
  configured_tickets: number;
  pending_tickets: number;
  used_tickets: number;
  total_amount: number;
  currency: string;
  created_at: Date;
  tickets: Array<{
    id: string;
    ticket_type_name: string;
    attendee_name?: string;
    status?: string;
  }>;
}

interface SalesOrdersStats {
  total_orders: number;
  total_tickets: number;
  total_revenue: number;
  configured_tickets: number;
  pending_tickets: number;
  used_tickets: number;
  avg_order_value: number;
}

// Fetcher function para SWR
const fetcher = async (url: string) => {
  const response = await authenticatedGet(url);
  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.error || 'Error loading sales orders');
  }
  
  return result;
};

// Hook específico para órdenes de ventas con SWR
export function useSalesOrders(eventId?: string) {
  // Construir key de SWR - solo si hay eventId
  const swrKey = eventId 
    ? `/api/admin/events/${eventId}/sales?dataType=sales&salesLimit=10000`
    : null;
  
  // useSWR con configuración optimizada para datos históricos
  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    fetcher,
    {
      revalidateOnFocus: false,      // No revalidar al volver a la ventana
      revalidateOnReconnect: false,  // No revalidar al reconectar internet
      revalidateIfStale: false,      // No revalidar automáticamente
      dedupingInterval: 2 * 60 * 1000, // 2 minutos - evita requests duplicados
      shouldRetryOnError: false,     // No reintentar en caso de error
    }
  );
  
  // Procesar datos de SWR
  const salesOrders = useMemo(() => {
    if (!data?.sales?.orders) return [];
    
    return data.sales.orders.map((order: any) => ({
      id: order.id,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      total_tickets: order.total_tickets,
      configured_tickets: order.configured_tickets,
      pending_tickets: order.pending_tickets,
      used_tickets: order.used_tickets || 0,
      total_amount: order.total_amount,
      currency: order.currency || 'MXN',
      created_at: new Date(order.created_at),
      tickets: order.tickets.map((ticket: any) => ({
        id: ticket.id,
        ticket_type_name: ticket.ticket_type_name || 'Boleto',
        attendee_name: ticket.attendee_name,
        status: ticket.status,
      })),
    }));
  }, [data]);

  const stats = useMemo((): SalesOrdersStats => {
    if (!data?.sales?.stats) {
      return {
        total_orders: 0,
        total_tickets: 0,
        total_revenue: 0,
        configured_tickets: 0,
        pending_tickets: 0,
        used_tickets: 0,
        avg_order_value: 0,
      };
    }

    return {
      total_orders: data.sales.stats.total_orders || data.sales.pagination?.totalItems || 0,
      total_tickets: data.sales.stats.total_tickets || 0,
      total_revenue: data.sales.stats.total_revenue || 0,
      configured_tickets: data.sales.stats.configured_tickets || 0,
      pending_tickets: data.sales.stats.pending_tickets || 0,
      used_tickets: data.sales.stats.used_tickets || 0,
      avg_order_value: data.sales.stats.avg_order_value || 0,
    };
  }, [data]);
  
  // Función para refrescar manualmente (botón de recarga)
  const refreshSalesOrders = useCallback(() => {
    console.log('🔄 Manually refreshing sales orders...');
    mutate();
  }, [mutate]);
  
  // Función para invalidar caché (cuando se actualiza un boleto desde otra página)
  const invalidateSalesCache = useCallback(() => {
    console.log('🗑️ Invalidating sales orders cache...');
    mutate(undefined, { revalidate: false });
  }, [mutate]);
  
  return {
    salesOrders,
    loading: isLoading,
    stats,
    error: error ? (error instanceof Error ? error.message : 'Error loading sales orders') : null,
    refreshSalesOrders,
    invalidateSalesCache,
    mutate, // Exponer mutate para invalidación granular
  };
}
