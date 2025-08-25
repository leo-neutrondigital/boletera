"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { auth } from '@/lib/firebase/client';

// Tipos para el cache
interface CourtesyOrder {
  order_id: string;
  total_tickets: number;
  configured_tickets: number;
  pending_tickets: number;
  total_amount: number;
  currency: string;
  created_at: Date;
  courtesy_type: string;
  event_id: string;
  event_name: string;
  event_start_date: Date;
  event_end_date: Date;
  event_location: string;
  customer_email: string;
  customer_name: string;
  tickets: any[];
}

// 🆕 Tipos para el scanner
interface AttendeeTicket {
  id: string;
  attendee_name: string;
  attendee_email?: string;
  attendee_phone?: string;
  customer_name: string;
  customer_email: string;
  ticket_type_name: string;
  status: 'purchased' | 'configured' | 'generated' | 'used';
  check_in_status: 'not_arrived' | 'checked_in' | 'partial';
  authorized_days: string[];
  used_days: string[];
  last_checkin?: string;
  can_undo_until?: string;
  qr_id?: string;
  amount_paid: number;
  currency: string;
}

interface EventData {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  location: string;
  description?: string;
}

interface EventStats {
  total_tickets: number;
  configured_tickets: number;
  checked_in_count: number;
  not_arrived_count: number;
  attendance_rate: number;
}

interface Event {
  id: string;
  name: string;
  start_date: Date;
  end_date: Date;
  location: string;
  description?: string;
  published: boolean;
}

interface TicketType {
  id: string;
  event_id: string;
  name: string;
  price: number;
  is_active: boolean;
  is_courtesy: boolean;
}

interface CacheState {
  // Datos en cache
  courtesyOrders: CourtesyOrder[];
  events: Event[];
  ticketTypesByEvent: Record<string, TicketType[]>;
  
  // 🆕 Nuevos datos del scanner
  eventAttendees: Record<string, AttendeeTicket[]>;
  eventDetails: Record<string, EventData>;
  eventStats: Record<string, EventStats>;
  
  // Estados de carga
  loading: {
    courtesyOrders: boolean;
    events: boolean;
    ticketTypes: Record<string, boolean>;
    // 🆕 Estados de carga del scanner
    eventAttendees: Record<string, boolean>;
    eventDetails: Record<string, boolean>;
  };
  
  // Timestamps del cache (para invalidación)
  lastUpdated: {
    courtesyOrders: number | null;
    events: number | null;
    ticketTypes: Record<string, number>;
    // 🆕 Timestamps del scanner
    eventAttendees: Record<string, number>;
    eventDetails: Record<string, number>;
  };
  
  // Acciones
  loadCourtesyOrders: (force?: boolean) => Promise<void>;
  loadEvents: (force?: boolean) => Promise<void>;
  loadTicketTypes: (eventId: string, force?: boolean) => Promise<void>;
  // 🆕 Nuevas acciones del scanner
  loadEventAttendees: (eventId: string, force?: boolean) => Promise<void>;
  invalidateCache: (keys?: string[]) => void;
  invalidateEvent: (eventId: string) => void; // 🆕 Invalidación granular
  refreshAll: () => Promise<void>;
}

const DataCacheContext = createContext<CacheState | null>(null);

// Configuración de cache
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
const BACKGROUND_REFRESH = 2 * 60 * 1000; // 2 minutos para refresh en background

export function DataCacheProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  
  // Estados del cache
  const [courtesyOrders, setCourtesyOrders] = useState<CourtesyOrder[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [ticketTypesByEvent, setTicketTypesByEvent] = useState<Record<string, TicketType[]>>({});
  
  // 🆕 Nuevos estados del scanner
  const [eventAttendees, setEventAttendees] = useState<Record<string, AttendeeTicket[]>>({});
  const [eventDetails, setEventDetails] = useState<Record<string, EventData>>({});
  const [eventStats, setEventStats] = useState<Record<string, EventStats>>({});
  
  // Estados de carga
  const [loading, setLoading] = useState({
    courtesyOrders: false,
    events: false,
    ticketTypes: {} as Record<string, boolean>,
    // 🆕 Estados de carga del scanner
    eventAttendees: {} as Record<string, boolean>,
    eventDetails: {} as Record<string, boolean>
  });
  
  // Timestamps
  const [lastUpdated, setLastUpdated] = useState({
    courtesyOrders: null as number | null,
    events: null as number | null,
    ticketTypes: {} as Record<string, number>,
    // 🆕 Timestamps del scanner
    eventAttendees: {} as Record<string, number>,
    eventDetails: {} as Record<string, number>
  });

  // Función para verificar si el cache es válido
  const isCacheValid = (timestamp: number | null): boolean => {
    if (!timestamp) return false;
    return Date.now() - timestamp < CACHE_DURATION;
  };

  // Función para verificar si necesita refresh en background
  const needsBackgroundRefresh = (timestamp: number | null): boolean => {
    if (!timestamp) return false;
    return Date.now() - timestamp > BACKGROUND_REFRESH;
  };

  // Cargar órdenes de cortesías
  const loadCourtesyOrders = useCallback(async (force = false) => {
    if (!isAuthenticated || !user) return;
    
    // Si no es forzado y el cache es válido, no recargar
    if (!force && isCacheValid(lastUpdated.courtesyOrders)) {
      console.log('📦 Using cached courtesy orders');
      return;
    }
    
    // Si tiene datos y no es forzado, cargar en background
    const inBackground = !force && courtesyOrders.length > 0;
    
    if (!inBackground) {
      setLoading(prev => ({ ...prev, courtesyOrders: true }));
    }
    
    try {
      console.log(inBackground ? '🔄 Background loading courtesy orders' : '📥 Loading courtesy orders');
      
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/courtesy-orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCourtesyOrders(data.orders || []);
        setLastUpdated(prev => ({ ...prev, courtesyOrders: Date.now() }));
        console.log('✅ Courtesy orders loaded:', data.orders?.length || 0);
      }
    } catch (error) {
      console.error('❌ Error loading courtesy orders:', error);
    } finally {
      if (!inBackground) {
        setLoading(prev => ({ ...prev, courtesyOrders: false }));
      }
    }
  }, [isAuthenticated, user, lastUpdated.courtesyOrders, courtesyOrders.length]);

  // Cargar eventos
  const loadEvents = useCallback(async (force = false) => {
    if (!isAuthenticated || !user) return;
    
    if (!force && isCacheValid(lastUpdated.events)) {
      console.log('📦 Using cached events');
      return;
    }
    
    const inBackground = !force && events.length > 0;
    
    if (!inBackground) {
      setLoading(prev => ({ ...prev, events: true }));
    }
    
    try {
      console.log(inBackground ? '🔄 Background loading events' : '📥 Loading events');
      
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/events', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const publishedEvents = data.filter((event: Event) => event.published) || [];
        setEvents(publishedEvents);
        setLastUpdated(prev => ({ ...prev, events: Date.now() }));
        console.log('✅ Events loaded:', publishedEvents.length);
      }
    } catch (error) {
      console.error('❌ Error loading events:', error);
    } finally {
      if (!inBackground) {
        setLoading(prev => ({ ...prev, events: false }));
      }
    }
  }, [isAuthenticated, user, lastUpdated.events, events.length]);

  // Cargar tipos de boletos por evento
  const loadTicketTypes = useCallback(async (eventId: string, force = false) => {
    if (!isAuthenticated || !user) return;
    
    if (!force && isCacheValid(lastUpdated.ticketTypes[eventId])) {
      console.log(`📦 Using cached ticket types for event ${eventId}`);
      return;
    }
    
    const inBackground = !force && ticketTypesByEvent[eventId]?.length > 0;
    
    if (!inBackground) {
      setLoading(prev => ({ 
        ...prev, 
        ticketTypes: { ...prev.ticketTypes, [eventId]: true }
      }));
    }
    
    try {
      console.log(inBackground ? `🔄 Background loading ticket types for ${eventId}` : `📥 Loading ticket types for ${eventId}`);
      
      const token = await user.getIdToken();
      const response = await fetch(`/api/admin/ticket-types?eventId=${eventId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const activeTypes = data.filter((type: TicketType) => type.is_active) || [];
        
        setTicketTypesByEvent(prev => ({ ...prev, [eventId]: activeTypes }));
        setLastUpdated(prev => ({ 
          ...prev, 
          ticketTypes: { ...prev.ticketTypes, [eventId]: Date.now() }
        }));
        console.log(`✅ Ticket types loaded for ${eventId}:`, activeTypes.length);
      }
    } catch (error) {
      console.error(`❌ Error loading ticket types for ${eventId}:`, error);
    } finally {
      if (!inBackground) {
        setLoading(prev => ({ 
          ...prev, 
          ticketTypes: { ...prev.ticketTypes, [eventId]: false }
        }));
      }
    }
  }, [isAuthenticated, user, lastUpdated.ticketTypes, ticketTypesByEvent]);

  // 🆕 Cargar asistentes de evento (para scanner)
  const loadEventAttendees = useCallback(async (eventId: string, force = false) => {
    if (!isAuthenticated || !user) return;
    
    if (!force && isCacheValid(lastUpdated.eventAttendees[eventId])) {
      console.log(`📦 Using cached attendees for event ${eventId}`);
      return;
    }
    
    const inBackground = !force && eventAttendees[eventId]?.length > 0;
    
    if (!inBackground) {
      setLoading(prev => ({ 
        ...prev, 
        eventAttendees: { ...prev.eventAttendees, [eventId]: true }
      }));
    }
    
    try {
      console.log(inBackground ? `🔄 Background loading attendees for ${eventId}` : `📥 Loading attendees for ${eventId}`);
      
      const token = await user.getIdToken();
      const response = await fetch(`/api/scanner/events/${eventId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Actualizar asistentes
        setEventAttendees(prev => ({ ...prev, [eventId]: data.attendees || [] }));
        
        // Actualizar detalles del evento
        if (data.event) {
          setEventDetails(prev => ({ ...prev, [eventId]: data.event }));
        }
        
        // Actualizar estadísticas
        if (data.stats) {
          setEventStats(prev => ({ ...prev, [eventId]: data.stats }));
        }
        
        // Actualizar timestamps
        setLastUpdated(prev => ({ 
          ...prev, 
          eventAttendees: { ...prev.eventAttendees, [eventId]: Date.now() },
          eventDetails: { ...prev.eventDetails, [eventId]: Date.now() }
        }));
        
        console.log(`✅ Event data loaded for ${eventId}:`, {
          attendees: data.attendees?.length || 0,
          stats: data.stats
        });
      }
    } catch (error) {
      console.error(`❌ Error loading event data for ${eventId}:`, error);
    } finally {
      if (!inBackground) {
        setLoading(prev => ({ 
          ...prev, 
          eventAttendees: { ...prev.eventAttendees, [eventId]: false }
        }));
      }
    }
  }, [isAuthenticated, user, lastUpdated.eventAttendees, eventAttendees]);

  // Invalidar cache específico
  const invalidateCache = useCallback((keys?: string[]) => {
    console.log('🗑️ Invalidating cache:', keys || 'all');
    
    if (!keys || keys.includes('courtesyOrders')) {
      setLastUpdated(prev => ({ ...prev, courtesyOrders: null }));
    }
    
    if (!keys || keys.includes('events')) {
      setLastUpdated(prev => ({ ...prev, events: null }));
    }
    
    if (!keys || keys.includes('ticketTypes')) {
      setLastUpdated(prev => ({ ...prev, ticketTypes: {} }));
      setTicketTypesByEvent({});
    }
    
    // 🆕 Invalidar datos del scanner
    if (!keys || keys.includes('eventAttendees')) {
      setLastUpdated(prev => ({ ...prev, eventAttendees: {} }));
      setEventAttendees({});
      setEventDetails({});
      setEventStats({});
    }
  }, []);

  // 🆕 Invalidar evento específico (para check-ins)
  const invalidateEvent = useCallback((eventId: string) => {
    console.log(`🗑️ Invalidating cache for event: ${eventId}`);
    
    // Invalidar asistentes y stats del evento
    setLastUpdated(prev => ({
      ...prev,
      eventAttendees: { ...prev.eventAttendees, [eventId]: 0 }, // Forzar recarga
      eventDetails: { ...prev.eventDetails, [eventId]: 0 }
    }));
    
    // También invalidar cortesías relacionadas (pueden haberse actualizado)
    setLastUpdated(prev => ({ ...prev, courtesyOrders: null }));
  }, []);

  // Refrescar todo
  const refreshAll = async () => {
    console.log('🔄 Refreshing all data');
    await Promise.all([
      loadCourtesyOrders(true),
      loadEvents(true)
    ]);
  };

  // Auto-refresh en background cuando el cache está obsoleto
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const interval = setInterval(() => {
      // Refresh en background si es necesario
      if (needsBackgroundRefresh(lastUpdated.courtesyOrders)) {
        loadCourtesyOrders();
      }
      
      if (needsBackgroundRefresh(lastUpdated.events)) {
        loadEvents();
      }
    }, 30000); // Verificar cada 30 segundos
    
    return () => clearInterval(interval);
  }, [isAuthenticated, lastUpdated]);

  // Limpiar cache cuando el usuario cambia
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('🧹 Clearing cache - user logged out');
      setCourtesyOrders([]);
      setEvents([]);
      setTicketTypesByEvent({});
      // 🆕 Limpiar datos del scanner
      setEventAttendees({});
      setEventDetails({});
      setEventStats({});
      setLastUpdated({
        courtesyOrders: null,
        events: null,
        ticketTypes: {},
        // 🆕 Limpiar timestamps del scanner
        eventAttendees: {},
        eventDetails: {}
      });
    }
  }, [isAuthenticated]);

  const value: CacheState = {
    // Datos
    courtesyOrders,
    events,
    ticketTypesByEvent,
    // 🆕 Nuevos datos del scanner
    eventAttendees,
    eventDetails,
    eventStats,
    
    // Estados
    loading,
    lastUpdated,
    
    // Acciones
    loadCourtesyOrders,
    loadEvents,
    loadTicketTypes,
    // 🆕 Nuevas acciones del scanner
    loadEventAttendees,
    invalidateCache,
    invalidateEvent,
    refreshAll
  };

  return (
    <DataCacheContext.Provider value={value}>
      {children}
    </DataCacheContext.Provider>
  );
}

// Hook para usar el cache
export function useDataCache(): CacheState {
  const context = useContext(DataCacheContext);
  if (!context) {
    throw new Error('useDataCache must be used within a DataCacheProvider');
  }
  return context;
}

// Hook específico para courtesy orders
export function useCourtesyOrders() {
  const { courtesyOrders, loading, loadCourtesyOrders, invalidateCache } = useDataCache();
  
  return {
    courtesyOrders,
    loading: loading.courtesyOrders,
    loadCourtesyOrders,
    refresh: () => loadCourtesyOrders(true),
    invalidate: () => invalidateCache(['courtesyOrders'])
  };
}

// 🆕 Exportar tipos para uso en componentes
export type { AttendeeTicket, EventData, EventStats };

// Hook específico para events
export function useEvents() {
  const { events, loading, loadEvents, invalidateCache } = useDataCache();
  
  return {
    events,
    loading: loading.events,
    loadEvents,
    refresh: () => loadEvents(true),
    invalidate: () => invalidateCache(['events'])
  };
}

// Hook específico para ticket types
export function useTicketTypes(eventId?: string) {
  const { ticketTypesByEvent, loading, loadTicketTypes, invalidateCache } = useDataCache();
  
  const ticketTypes = eventId ? ticketTypesByEvent[eventId] || [] : [];
  const isLoading = eventId ? loading.ticketTypes[eventId] || false : false;
  
  // 🆕 Usar useCallback para evitar crear nuevas funciones en cada render
  const load = useCallback(() => {
    if (eventId) {
      loadTicketTypes(eventId);
    }
  }, [eventId, loadTicketTypes]);
  
  const refresh = useCallback(() => {
    if (eventId) {
      loadTicketTypes(eventId, true);
    }
  }, [eventId, loadTicketTypes]);
  
  const invalidate = useCallback(() => {
    invalidateCache(['ticketTypes']);
  }, [invalidateCache]);
  
  return {
    ticketTypes,
    loading: isLoading,
    loadTicketTypes: load,
    refresh,
    invalidate
  };
}

// 🆕 Hook específico para asistentes de evento (scanner)
export function useEventAttendees(eventId: string) {
  const { 
    eventAttendees, 
    eventDetails, 
    eventStats, 
    loading, 
    loadEventAttendees, 
    invalidateEvent 
  } = useDataCache();
  
  const attendees = eventAttendees[eventId] || [];
  const event = eventDetails[eventId] || null;
  const stats = eventStats[eventId] || null;
  const isLoading = loading.eventAttendees[eventId] || false;
  
  // Funciones optimizadas
  const load = useCallback(() => {
    loadEventAttendees(eventId);
  }, [eventId, loadEventAttendees]);
  
  const refresh = useCallback(() => {
    loadEventAttendees(eventId, true);
  }, [eventId, loadEventAttendees]);
  
  const invalidate = useCallback(() => {
    invalidateEvent(eventId);
  }, [eventId, invalidateEvent]);
  
  return {
    attendees,
    event,
    stats,
    loading: isLoading,
    loadEventAttendees: load,
    refresh,
    invalidate
  };
}

// 🆕 Hook específico para ventas de evento
export function useEventSales(eventId: string) {
  const { user } = useAuth();
  const [salesData, setSalesData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  const loadEventSales = useCallback(async (force = false) => {
    if (!user || (!force && salesData && Date.now() - lastUpdated < CACHE_DURATION)) {
      return;
    }
    
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/admin/events/${eventId}/sales`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSalesData(data);
        setLastUpdated(Date.now());
      }
    } catch (error) {
      console.error('Error loading event sales:', error);
    } finally {
      setLoading(false);
    }
  }, [user, eventId, salesData, lastUpdated]);
  
  return {
    salesData,
    loading,
    loadEventSales,
    refresh: () => loadEventSales(true)
  };
}
