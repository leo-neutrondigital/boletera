"use client";

import { useMemo, useCallback } from 'react';
import useSWR from 'swr';
import { authenticatedGet } from '@/lib/utils/api';

// Interfaz para órdenes de cortesía
interface CourtesyOrder {
  id: string;            // order_id
  customer_name: string;
  customer_email: string;
  total_tickets: number;
  configured_tickets: number;
  pending_tickets: number;
  courtesy_type: string;
  created_at: Date;
  tickets: Array<{
    id: string;
    ticket_type_name: string;
    attendee_name: string;
    status: string;
  }>;
}

interface CourtesyOrdersStats {
  total_orders: number;
  total_tickets: number;
  configured_tickets: number;
  pending_tickets: number;
  by_type: Record<string, number>;
}

// Fetcher para SWR
const fetcher = async (url: string) => {
  const response = await authenticatedGet(url);
  if (!response.ok) {
    throw new Error('Error loading courtesy orders');
  }
  return response.json();
};

export function useCourtesyOrders(eventId?: string) {
  const swrKey = eventId ? `/api/admin/events/${eventId}/sales?dataType=courtesies&courtesyLimit=10000` : null;
  
  const { data, error, isLoading, mutate } = useSWR(swrKey, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    dedupingInterval: 2 * 60 * 1000, // 2 minutos
    shouldRetryOnError: false,
  });

  // Procesar órdenes de cortesía
  const courtesyOrders = useMemo((): CourtesyOrder[] => {
    if (!data?.courtesies?.orders) return [];
    
    return data.courtesies.orders.map((order: any) => ({
      id: order.id,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      total_tickets: order.total_tickets,
      configured_tickets: order.configured_tickets,
      pending_tickets: order.pending_tickets,
      courtesy_type: order.courtesy_type || 'general',
      created_at: new Date(order.created_at),
      tickets: order.tickets.map((ticket: any) => ({
        id: ticket.id,
        ticket_type_name: ticket.ticket_type_name || 'Cortesía',
        attendee_name: ticket.attendee_name,
        status: ticket.status,
      })),
    }));
  }, [data]);

  const stats = useMemo((): CourtesyOrdersStats => {
    if (!data?.courtesies?.stats) {
      return {
        total_orders: 0,
        total_tickets: 0,
        configured_tickets: 0,
        pending_tickets: 0,
        by_type: {},
      };
    }

    return {
      total_orders: data.courtesies.stats.total_orders || 0,
      total_tickets: data.courtesies.stats.total_tickets || 0,
      configured_tickets: data.courtesies.stats.configured_tickets || 0,
      pending_tickets: data.courtesies.stats.pending_tickets || 0,
      by_type: data.courtesies.stats.by_type || {},
    };
  }, [data]);
  
  // Función para refrescar manualmente (botón de recarga)
  const refreshCourtesyOrders = useCallback(() => {
    console.log('🔄 Manually refreshing courtesy orders...');
    mutate();
  }, [mutate]);
  
  // Función para invalidar caché
  const invalidateCourtesyCache = useCallback(() => {
    console.log('🗑️ Invalidating courtesy orders cache...');
    mutate(undefined, { revalidate: false });
  }, [mutate]);
  
  return {
    courtesyOrders,
    loading: isLoading,
    stats,
    error: error ? (error instanceof Error ? error.message : 'Error loading courtesy orders') : null,
    refreshCourtesyOrders,
    invalidateCourtesyCache,
    mutate, // Exponer mutate para invalidación granular
  };
}
