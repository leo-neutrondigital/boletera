"use client";

import { useState, useCallback } from 'react';
import { useDataCache } from '@/contexts/DataCacheContext';
import { authenticatedGet } from '@/lib/utils/api';

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

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
  
  // Cache keys
  const getCacheKey = (eventId: string) => `sales_orders_${eventId}`;
  const getStatsKey = (eventId: string) => `sales_orders_stats_${eventId}`;
  const getTimestampKey = (eventId: string) => `sales_orders_timestamp_${eventId}`;
  
  // Verificar si el cache es válido
  const isCacheValid = useCallback((eventId: string): boolean => {
    try {
      const timestamp = localStorage.getItem(getTimestampKey(eventId));
      if (!timestamp) return false;
      return Date.now() - parseInt(timestamp) < CACHE_DURATION;
    } catch {
      return false;
    }
  }, []);
  
  // Cargar desde cache
  const loadFromCache = useCallback((eventId: string): boolean => {
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
  }, []);
  
  // Guardar en cache
  const saveToCache = useCallback((eventId: string, orders: SalesOrder[], orderStats: SalesOrdersStats) => {
    try {
      localStorage.setItem(getCacheKey(eventId), JSON.stringify(orders));
      localStorage.setItem(getStatsKey(eventId), JSON.stringify(orderStats));
      localStorage.setItem(getTimestampKey(eventId), Date.now().toString());
      console.log('💾 Saved sales orders to cache');
    } catch (error) {
      console.warn('⚠️ Error saving sales orders to cache:', error);
    }
  }, []);
  
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
  
  // Función para cargar TODAS las órdenes de ventas (sin paginación)
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
      console.log('📥 Loading ALL sales orders from API for event:', eventId);
      
      // Traer TODAS las órdenes (sin límite) - paginación en frontend
      // dataType=sales → solo trae ventas, no cortesías (optimización)
      const response = await authenticatedGet(`/api/admin/events/${eventId}/sales?salesLimit=10000&dataType=sales`);
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
      
      // Usar estadísticas del API (calculadas con TODAS las órdenes, no solo la página actual)
      const orderStats: SalesOrdersStats = {
        total_orders: result.sales.stats.total_orders || result.sales.pagination.totalItems || 0,
        total_tickets: result.sales.stats.total_tickets || 0,
        total_revenue: result.sales.stats.total_revenue || 0,
        configured_tickets: result.sales.stats.configured_tickets || 0,
        pending_tickets: result.sales.stats.pending_tickets || 0,
        used_tickets: result.sales.stats.used_tickets || 0,
        avg_order_value: result.sales.stats.avg_order_value || 0,
      };
      
      setStats(orderStats);
      
      // Ya no necesitamos guardar pagination - se calcula en frontend
      
      // Guardar en cache
      saveToCache(eventId, orders, orderStats);
      
      console.log('✅ ALL sales orders loaded from API:', orders.length, 'orders');
      console.log('📊 Frontend will paginate in memory');
      
    } catch (error) {
      console.error('❌ Error loading sales orders:', error);
      setError(error instanceof Error ? error.message : 'Error loading sales orders');
    } finally {
      setLoading(false);
    }
  }, [eventId, isCacheValid, loadFromCache, saveToCache]);
  
  // 🔒 LAZY LOADING: NO auto-cargar al montar
  // El componente debe llamar loadSalesOrders() manualmente cuando sea necesario
  // useEffect(() => {
  //   if (eventId) {
  //     console.log('📦 useSalesOrders: Auto-loading sales orders...');
  //     if (!loadFromCache(eventId)) {
  //       loadSalesOrders();
  //     }
  //   }
  // }, [eventId]);
  
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
    loadSalesOrders, // 🆕 Expuesto para lazy loading manual
    refreshSalesOrders,
    invalidateSalesCache,
  };
}
