"use client";

import { useEffect, useState, useCallback } from 'react';
import { useDataCache } from '@/contexts/DataCacheContext';
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

// Hook específico para órdenes de ventas (no boletos individuales)
export function useSalesOrders(eventId?: string) {
  const { invalidateCache } = useDataCache(); // Para invalidar otros caches relacionados
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<SalesOrdersStats>({
    total_orders: 0,
    total_tickets: 0,
    total_revenue: 0,
    configured_tickets: 0,
    pending_tickets: 0,
    used_tickets: 0,
    avg_order_value: 0,
  });
  const [error, setError] = useState<string | null>(null);
  
  // Cache configuration
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
  const getCacheKey = (eventId: string) => `sales_orders_${eventId}`;
  const getStatsKey = (eventId: string) => `sales_orders_stats_${eventId}`;
  const getTimestampKey = (eventId: string) => `sales_orders_timestamp_${eventId}`;
  
  // Verificar si el cache es válido
  const isCacheValid = (eventId: string): boolean => {
    try {
      const timestamp = localStorage.getItem(getTimestampKey(eventId));
      if (!timestamp) return false;
      return Date.now() - parseInt(timestamp) < CACHE_DURATION;
    } catch {
      return false;
    }
  };
  
  // Cargar desde cache
  const loadFromCache = (eventId: string): boolean => {
    try {
      const cachedOrders = localStorage.getItem(getCacheKey(eventId));
      const cachedStats = localStorage.getItem(getStatsKey(eventId));
      
      if (cachedOrders && cachedStats) {
        const orders = JSON.parse(cachedOrders).map((order: any) => ({
          ...order,
          created_at: new Date(order.created_at),
        }));
        
        setSalesOrders(orders);
        setStats(JSON.parse(cachedStats));
        console.log('📦 Loaded sales orders from cache:', orders.length, 'orders');
        return true;
      }
    } catch (error) {
      console.warn('⚠️ Error loading sales orders from cache:', error);
    }
    return false;
  };
  
  // Guardar en cache
  const saveToCache = (eventId: string, orders: SalesOrder[], orderStats: SalesOrdersStats) => {
    try {
      localStorage.setItem(getCacheKey(eventId), JSON.stringify(orders));
      localStorage.setItem(getStatsKey(eventId), JSON.stringify(orderStats));
      localStorage.setItem(getTimestampKey(eventId), Date.now().toString());
      console.log('💾 Saved sales orders to cache');
    } catch (error) {
      console.warn('⚠️ Error saving sales orders to cache:', error);
    }
  };
  
  // Limpiar cache
  const clearCache = (eventId: string) => {
    try {
      localStorage.removeItem(getCacheKey(eventId));
      localStorage.removeItem(getStatsKey(eventId));
      localStorage.removeItem(getTimestampKey(eventId));
      console.log('🗑️ Cleared sales orders cache');
    } catch (error) {
      console.warn('⚠️ Error clearing sales orders cache:', error);
    }
  };
  
  // Función para cargar órdenes de ventas
  const loadSalesOrders = useCallback(async (force = false) => {
    if (!eventId) return;
    
    // Si no es forzado y el cache es válido, usar cache
    if (!force && isCacheValid(eventId)) {
      if (loadFromCache(eventId)) {
        return; // Cache hit, no necesitamos cargar desde API
      }
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('📥 Loading sales orders from API for event:', eventId);
      
      // Usar API existente que ya agrupa por órdenes
      const response = await authenticatedGet(`/api/admin/events/${eventId}/sales`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Error loading sales orders');
      }
      
      // Los datos ya vienen agrupados por órdenes
      const orders: SalesOrder[] = result.sales.orders.map((order: any) => ({
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
      
      setSalesOrders(orders);
      
      // Calcular estadísticas
      const orderStats: SalesOrdersStats = {
        total_orders: orders.length,
        total_tickets: orders.reduce((sum, order) => sum + order.total_tickets, 0),
        total_revenue: orders.reduce((sum, order) => sum + order.total_amount, 0),
        configured_tickets: orders.reduce((sum, order) => sum + order.configured_tickets, 0),
        pending_tickets: orders.reduce((sum, order) => sum + order.pending_tickets, 0),
        used_tickets: orders.reduce((sum, order) => sum + order.used_tickets, 0),
        avg_order_value: orders.length > 0 
          ? orders.reduce((sum, order) => sum + order.total_amount, 0) / orders.length 
          : 0,
      };
      
      setStats(orderStats);
      
      // Guardar en cache
      saveToCache(eventId, orders, orderStats);
      
      console.log('✅ Sales orders loaded from API:', orders.length, 'orders');
      
    } catch (error) {
      console.error('❌ Error loading sales orders:', error);
      setError(error instanceof Error ? error.message : 'Error loading sales orders');
    } finally {
      setLoading(false);
    }
  }, [eventId]);
  
  // Auto-cargar al montar el hook
  useEffect(() => {
    if (eventId) {
      console.log('📦 useSalesOrders: Auto-loading sales orders...');
      // Primero intentar cargar desde cache
      if (!loadFromCache(eventId)) {
        // Si no hay cache válido, cargar desde API
        loadSalesOrders();
      }
    }
  }, [eventId]); // Removido loadSalesOrders de dependencias para evitar re-renders
  
  // Funciones de utilidad
  const refreshSalesOrders = () => {
    if (eventId) {
      clearCache(eventId);
      loadSalesOrders(true);
    }
  };
  
  // Función para invalidar cache cuando se actualice un boleto
  const invalidateSalesCache = () => {
    if (eventId) {
      clearCache(eventId);
      invalidateCache(); // También invalidar otros caches relacionados
    }
  };
  
  return {
    salesOrders,
    loading,
    stats,
    error,
    refreshSalesOrders,
    invalidateSalesCache,
  };
}
