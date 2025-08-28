"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getPreregistrationsByEvent } from '@/lib/api/preregistrations'; // Client-side
import { authenticatedGet } from '@/lib/utils/api';

// Tipos específicos para cache de evento
interface SoldTicket {
  id: string;
  user_id: string;
  customer_name: string;
  customer_email: string;
  ticket_type_name: string;
  amount_paid: number;
  currency: string;
  status: 'purchased' | 'configured' | 'generated' | 'used';
  purchase_date: Date;
  qr_id?: string;
}

interface CourtesyTicket {
  id: string;
  order_id: string;
  customer_name: string;
  customer_email: string;
  total_tickets: number;
  configured_tickets: number;
  pending_tickets: number;
  courtesy_type: string;
  event_id: string;
  created_at: Date;
  tickets: Array<{
    id: string;
    ticket_type_name: string;
    attendee_name?: string;
    status?: string;
  }>;
}

interface Preregistration {
  id: string;
  user_id: null;
  customer_data: {
    name: string;
    email: string;
    phone: string;
    company?: string;
  };
  interested_tickets: {
    ticket_type_id: string;
    quantity: number;
    unit_price: number;
  }[];
  status: 'nuevo' | 'contactado' | 'interesado' | 'convertido';
  created_at: Date;
  source: string;
}

interface EventTicketType {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  is_active: boolean;
  is_courtesy: boolean;
  access_type: 'all_days' | 'specific_days' | 'any_single_day';
  available_days?: Date[];
  limit_per_user?: number;
  total_stock?: number;
  sold_count: number;
  sale_start?: Date;
  sale_end?: Date;
  sort_order: number;
}

interface EventDetails {
  id: string;
  name: string;
  start_date: Date;
  end_date: Date;
  location: string;
  description?: string;
  internal_notes?: string;
  published: boolean;
}

interface EventCacheState {
  eventId: string;
  
  // Datos en cache
  soldTickets: SoldTicket[];
  courtesyTickets: CourtesyTicket[];
  preregistrations: Preregistration[];
  ticketTypes: EventTicketType[];
  eventDetails: EventDetails | null;
  
  // Estados de carga
  loading: {
    soldTickets: boolean;
    courtesyTickets: boolean;
    preregistrations: boolean;
    ticketTypes: boolean;
    eventDetails: boolean;
  };
  
  // Timestamps del cache
  lastUpdated: {
    soldTickets: number | null;
    courtesyTickets: number | null;
    preregistrations: number | null;
    ticketTypes: number | null;
    eventDetails: number | null;
  };
  
  // Acciones
  loadSoldTickets: (force?: boolean) => Promise<void>;
  loadCourtesyTickets: (force?: boolean) => Promise<void>;
  loadPreregistrations: (force?: boolean) => Promise<void>;
  loadTicketTypes: (force?: boolean) => Promise<void>;
  loadEventDetails: (force?: boolean) => Promise<void>;
  invalidateCache: (keys?: string[]) => void;
  refreshAll: () => Promise<void>;
}

const EventCacheContext = createContext<EventCacheState | null>(null);

// Configuración de cache (mismo patrón que DataCacheContext)
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
const BACKGROUND_REFRESH = 2 * 60 * 1000; // 2 minutos para refresh en background

export function EventCacheProvider({ 
  children, 
  eventId 
}: { 
  children: React.ReactNode;
  eventId: string;
}) {
  const { user, isAuthenticated } = useAuth();
  
  // Estados del cache específico del evento
  const [soldTickets, setSoldTickets] = useState<SoldTicket[]>([]);
  const [courtesyTickets, setCourtesyTickets] = useState<CourtesyTicket[]>([]);
  const [preregistrations, setPreregistrations] = useState<Preregistration[]>([]);
  const [ticketTypes, setTicketTypes] = useState<EventTicketType[]>([]);
  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);
  
  // Estados de carga
  const [loading, setLoading] = useState({
    soldTickets: false,
    courtesyTickets: false,
    preregistrations: false,
    ticketTypes: false,
    eventDetails: false
  });
  
  // Timestamps
  const [lastUpdated, setLastUpdated] = useState({
    soldTickets: null as number | null,
    courtesyTickets: null as number | null,
    preregistrations: null as number | null,
    ticketTypes: null as number | null,
    eventDetails: null as number | null
  });

  // Utilidades de cache (mismo patrón)
  const isCacheValid = (timestamp: number | null): boolean => {
    if (!timestamp) return false;
    return Date.now() - timestamp < CACHE_DURATION;
  };

  const needsBackgroundRefresh = (timestamp: number | null): boolean => {
    if (!timestamp) return false;
    return Date.now() - timestamp > BACKGROUND_REFRESH;
  };

  // 🎫 Cargar boletos vendidos
  const loadSoldTickets = useCallback(async (force = false) => {
    if (!isAuthenticated || !user || !eventId) return;
    
    if (!force && isCacheValid(lastUpdated.soldTickets)) {
      console.log('📦 Using cached sold tickets for event:', eventId);
      return;
    }
    
    const inBackground = !force && soldTickets.length > 0;
    
    if (!inBackground) {
      setLoading(prev => ({ ...prev, soldTickets: true }));
    }
    
    try {
      console.log(inBackground ? `🔄 Background loading sold tickets for ${eventId}` : `📥 Loading sold tickets for ${eventId}`);
      
      // Usar API server-side existente
      const response = await authenticatedGet(`/api/admin/events/${eventId}/sales`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Error loading sold tickets');
      }
      
      console.log('🔍 Debug: API sales response:', result);
      
      // Transformar respuesta de la API a formato SoldTicket para compatibilidad
      const transformedTickets = result.sales.orders.flatMap((order: any) => 
        order.tickets.map((ticket: any) => ({
          id: ticket.id,
          user_id: order.user_id || '',
          customer_name: order.customer_name,
          customer_email: order.customer_email,
          ticket_type_name: ticket.ticket_type_name || 'Boleto',
          amount_paid: order.total_amount / order.total_tickets, // Dividir monto total
          currency: order.currency || 'MXN',
          status: ticket.status === 'generated' ? 'generated' : 
                  ticket.status === 'used' ? 'used' : 'purchased',
          purchase_date: new Date(order.created_at),
          qr_id: ticket.id
        }))
      );
      
      setSoldTickets(transformedTickets);
      setLastUpdated(prev => ({ ...prev, soldTickets: Date.now() }));
      console.log('✅ Sold tickets loaded from API:', transformedTickets.length);
    } catch (error) {
      console.error('❌ Error loading sold tickets:', error);
    } finally {
      if (!inBackground) {
        setLoading(prev => ({ ...prev, soldTickets: false }));
      }
    }
  }, [isAuthenticated, user, eventId, lastUpdated.soldTickets, soldTickets.length]);

  // 🎁 Cargar boletos de cortesía
  const loadCourtesyTickets = useCallback(async (force = false) => {
    if (!isAuthenticated || !user || !eventId) return;
    
    if (!force && isCacheValid(lastUpdated.courtesyTickets)) {
      console.log('📦 Using cached courtesy tickets for event:', eventId);
      return;
    }
    
    const inBackground = !force && courtesyTickets.length > 0;
    
    if (!inBackground) {
      setLoading(prev => ({ ...prev, courtesyTickets: true }));
    }
    
    try {
      console.log(inBackground ? `🔄 Background loading courtesy tickets for ${eventId}` : `📥 Loading courtesy tickets for ${eventId}`);
      
      // Usar la misma API server-side que ya tenemos
      const response = await authenticatedGet(`/api/admin/events/${eventId}/sales`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Error loading courtesy tickets');
      }
      
      console.log('🔍 Debug: API courtesy response:', result.courtesies);
      
      // Los datos de cortesías ya vienen en el formato correcto desde la API
      const courtesyOrders = result.courtesies.orders.map((order: any) => ({
        id: order.id,
        order_id: order.id,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        total_tickets: order.total_tickets,
        configured_tickets: order.configured_tickets,
        pending_tickets: order.pending_tickets,
        courtesy_type: order.courtesy_type,
        event_id: eventId,
        created_at: new Date(order.created_at),
        tickets: order.tickets
      }));
      
      setCourtesyTickets(courtesyOrders);
      setLastUpdated(prev => ({ ...prev, courtesyTickets: Date.now() }));
      console.log('✅ Courtesy tickets loaded from API:', courtesyOrders.length);
    } catch (error) {
      console.error('❌ Error loading courtesy tickets:', error);
    } finally {
      if (!inBackground) {
        setLoading(prev => ({ ...prev, courtesyTickets: false }));
      }
    }
  }, [isAuthenticated, user, eventId, lastUpdated.courtesyTickets, courtesyTickets.length]);

  // 📋 Cargar preregistros
  const loadPreregistrations = useCallback(async (force = false) => {
    if (!isAuthenticated || !user || !eventId) return;
    
    if (!force && isCacheValid(lastUpdated.preregistrations)) {
      console.log('📦 Using cached preregistrations for event:', eventId);
      return;
    }
    
    const inBackground = !force && preregistrations.length > 0;
    
    if (!inBackground) {
      setLoading(prev => ({ ...prev, preregistrations: true }));
    }
    
    try {
      console.log(inBackground ? `🔄 Background loading preregistrations for ${eventId}` : `📥 Loading preregistrations for ${eventId}`);
      
      // Usar función client-side directamente (como era antes)
      console.log('🔍 Debug: Loading preregistrations for event:', eventId);
      const preregistrationsData = await getPreregistrationsByEvent(eventId);
      console.log('🔍 Debug: Raw preregistrations loaded:', preregistrationsData.length, preregistrationsData);
      
      // Los datos ya vienen en el formato correcto
      setPreregistrations(preregistrationsData);
      setLastUpdated(prev => ({ ...prev, preregistrations: Date.now() }));
      console.log('✅ Preregistrations loaded:', preregistrationsData.length);
    } catch (error) {
      console.error('❌ Error loading preregistrations:', error);
    } finally {
      if (!inBackground) {
        setLoading(prev => ({ ...prev, preregistrations: false }));
      }
    }
  }, [isAuthenticated, user, eventId, lastUpdated.preregistrations, preregistrations.length]);

  // 🎟️ Cargar tipos de boletos  
  const loadTicketTypes = useCallback(async (force = false) => {
    if (!isAuthenticated || !user || !eventId) return;
    
    if (!force && isCacheValid(lastUpdated.ticketTypes)) {
      console.log('📦 Using cached ticket types for event:', eventId);
      return;
    }
    
    const inBackground = !force && ticketTypes.length > 0;
    
    if (!inBackground) {
      setLoading(prev => ({ ...prev, ticketTypes: true }));
    }
    
    try {
      console.log(inBackground ? `🔄 Background loading ticket types for ${eventId}` : `📥 Loading ticket types for ${eventId}`);
      
      const token = await user.getIdToken();
      const response = await fetch(`/api/admin/ticket-types?eventId=${eventId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTicketTypes(data || []);
        setLastUpdated(prev => ({ ...prev, ticketTypes: Date.now() }));
        console.log('✅ Ticket types loaded:', data?.length || 0);
      }
    } catch (error) {
      console.error('❌ Error loading ticket types:', error);
    } finally {
      if (!inBackground) {
        setLoading(prev => ({ ...prev, ticketTypes: false }));
      }
    }
  }, [isAuthenticated, user, eventId, lastUpdated.ticketTypes, ticketTypes.length]);

  // 📄 Cargar detalles del evento
  const loadEventDetails = useCallback(async (force = false) => {
    if (!isAuthenticated || !user || !eventId) return;
    
    if (!force && isCacheValid(lastUpdated.eventDetails)) {
      console.log('📦 Using cached event details for:', eventId);
      return;
    }
    
    const inBackground = !force && eventDetails !== null;
    
    if (!inBackground) {
      setLoading(prev => ({ ...prev, eventDetails: true }));
    }
    
    try {
      console.log(inBackground ? `🔄 Background loading event details for ${eventId}` : `📥 Loading event details for ${eventId}`);
      
      const token = await user.getIdToken();
      const response = await fetch(`/api/admin/events/${eventId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEventDetails(data);
        setLastUpdated(prev => ({ ...prev, eventDetails: Date.now() }));
        console.log('✅ Event details loaded:', data.name);
      }
    } catch (error) {
      console.error('❌ Error loading event details:', error);
    } finally {
      if (!inBackground) {
        setLoading(prev => ({ ...prev, eventDetails: false }));
      }
    }
  }, [isAuthenticated, user, eventId, lastUpdated.eventDetails, eventDetails]);

  // Invalidar cache específico
  const invalidateCache = useCallback((keys?: string[]) => {
    console.log('🗑️ Invalidating event cache:', keys || 'all', 'for event:', eventId);
    
    if (!keys || keys.includes('soldTickets')) {
      setLastUpdated(prev => ({ ...prev, soldTickets: null }));
    }
    
    if (!keys || keys.includes('courtesyTickets')) {
      setLastUpdated(prev => ({ ...prev, courtesyTickets: null }));
    }
    
    if (!keys || keys.includes('preregistrations')) {
      setLastUpdated(prev => ({ ...prev, preregistrations: null }));
    }
    
    if (!keys || keys.includes('ticketTypes')) {
      setLastUpdated(prev => ({ ...prev, ticketTypes: null }));
    }
    
    if (!keys || keys.includes('eventDetails')) {
      setLastUpdated(prev => ({ ...prev, eventDetails: null }));
    }
  }, [eventId]);

  // Refrescar todo
  const refreshAll = async () => {
    console.log('🔄 Refreshing all event data for:', eventId);
    await Promise.all([
      loadSoldTickets(true),
      loadCourtesyTickets(true),
      loadPreregistrations(true),
      loadTicketTypes(true),
      loadEventDetails(true)
    ]);
  };

  // Auto-refresh en background cuando el cache está obsoleto
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const interval = setInterval(() => {
      if (needsBackgroundRefresh(lastUpdated.soldTickets)) {
        loadSoldTickets();
      }
      
      if (needsBackgroundRefresh(lastUpdated.courtesyTickets)) {
        loadCourtesyTickets();
      }
      
      if (needsBackgroundRefresh(lastUpdated.preregistrations)) {
        loadPreregistrations();
      }
      
      if (needsBackgroundRefresh(lastUpdated.ticketTypes)) {
        loadTicketTypes();
      }
      
      if (needsBackgroundRefresh(lastUpdated.eventDetails)) {
        loadEventDetails();
      }
    }, 30000); // Verificar cada 30 segundos
    
    return () => clearInterval(interval);
  }, [isAuthenticated, lastUpdated]);

  // Limpiar cache cuando cambia el evento o se desautentica
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('🧹 Clearing event cache - user logged out');
      setSoldTickets([]);
      setCourtesyTickets([]);
      setPreregistrations([]);
      setTicketTypes([]);
      setEventDetails(null);
      setLastUpdated({
        soldTickets: null,
        courtesyTickets: null,
        preregistrations: null,
        ticketTypes: null,
        eventDetails: null
      });
    }
  }, [isAuthenticated]);

  // Limpiar cache cuando cambia de evento
  useEffect(() => {
    console.log('🔄 Event ID changed, clearing cache. New event:', eventId);
    setSoldTickets([]);
    setCourtesyTickets([]);
    setPreregistrations([]);
    setTicketTypes([]);
    setEventDetails(null);
    setLastUpdated({
      soldTickets: null,
      courtesyTickets: null,
      preregistrations: null,
      ticketTypes: null,
      eventDetails: null
    });
  }, [eventId]);

  const value: EventCacheState = {
    eventId,
    
    // Datos
    soldTickets,
    courtesyTickets,
    preregistrations,
    ticketTypes,
    eventDetails,
    
    // Estados
    loading,
    lastUpdated,
    
    // Acciones
    loadSoldTickets,
    loadCourtesyTickets,
    loadPreregistrations,
    loadTicketTypes,
    loadEventDetails,
    invalidateCache,
    refreshAll
  };

  return (
    <EventCacheContext.Provider value={value}>
      {children}
    </EventCacheContext.Provider>
  );
}

// Hook para usar el cache de evento
export function useEventCache(): EventCacheState {
  const context = useContext(EventCacheContext);
  if (!context) {
    throw new Error('useEventCache must be used within an EventCacheProvider');
  }
  return context;
}

// Exportar tipos para uso en componentes
export type { 
  SoldTicket, 
  CourtesyTicket,
  Preregistration, 
  EventTicketType, 
  EventDetails 
};
