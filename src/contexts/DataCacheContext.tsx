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

// 🆕 Tipo para boletos huérfanos (soporte)
interface OrphanTicket {
  id: string;
  user_id: null;
  customer_email: string;
  customer_name: string;
  customer_phone: string;
  order_id: string;
  ticket_type_name: string;
  amount_paid: number;
  currency: string;
  event_id: string;
  authorized_days: Date[];
  orphan_recovery_data: {
    recovery_status: 'pending' | 'recovered' | 'expired';
    customer_email: string;
    customer_name: string;
    customer_phone: string;
    order_id: string;
    failure_timestamp: Date;
    account_requested: boolean;
    password_provided: boolean;
  };
  purchase_date: Date;
  qr_id: string;
}

// 🆕 Tipo para opciones de usuario (búsqueda)
interface UserOption {
  id: string;
  email: string;
  name: string;
}

// 🆕 Tipo para usuarios (reutilizando del proyecto)
interface User {
  id: string;
  uid: string;
  email: string;
  name: string;
  phone?: string;
  company?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  roles: string[];
  created_at: Date;
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
  users: User[]; // 🆕 Nuevo: usuarios en cache
  orphanTickets: OrphanTicket[]; // 🆕 Nuevo: boletos huérfanos
  ticketTypesByEvent: Record<string, TicketType[]>;
  
  // 🆕 Nuevos datos del scanner
  eventAttendees: Record<string, AttendeeTicket[]>;
  eventDetails: Record<string, EventData>;
  eventStats: Record<string, EventStats>;
  
  // Estados de carga
  loading: {
    courtesyOrders: boolean;
    events: boolean;
    users: boolean; // 🆕 Nuevo: loading de usuarios
    orphanTickets: boolean; // 🆕 Nuevo: loading de boletos huérfanos
    ticketTypes: Record<string, boolean>;
    // 🆕 Estados de carga del scanner
    eventAttendees: Record<string, boolean>;
    eventDetails: Record<string, boolean>;
  };
  
  // Timestamps del cache (para invalidación)
  lastUpdated: {
    courtesyOrders: number | null;
    events: number | null;
    users: number | null; // 🆕 Nuevo: timestamp de usuarios
    orphanTickets: number | null; // 🆕 Nuevo: timestamp de boletos huérfanos
    ticketTypes: Record<string, number>;
    // 🆕 Timestamps del scanner
    eventAttendees: Record<string, number>;
    eventDetails: Record<string, number>;
  };
  
  // Acciones
  loadCourtesyOrders: (force?: boolean) => Promise<void>;
  loadEvents: (force?: boolean) => Promise<void>;
  loadUsers: (force?: boolean) => Promise<void>; // 🆕 Nuevo: cargar usuarios
  loadOrphanTickets: (force?: boolean) => Promise<void>; // 🆕 Nuevo: cargar boletos huérfanos
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
  const [users, setUsers] = useState<User[]>([]); // 🆕 Nuevo: estado de usuarios
  const [orphanTickets, setOrphanTickets] = useState<OrphanTicket[]>([]); // 🆕 Nuevo: boletos huérfanos
  const [ticketTypesByEvent, setTicketTypesByEvent] = useState<Record<string, TicketType[]>>({});
  
  // 🆕 Nuevos estados del scanner
  const [eventAttendees, setEventAttendees] = useState<Record<string, AttendeeTicket[]>>({});
  const [eventDetails, setEventDetails] = useState<Record<string, EventData>>({});
  const [eventStats, setEventStats] = useState<Record<string, EventStats>>({});
  
  // Estados de carga
  const [loading, setLoading] = useState({
    courtesyOrders: false,
    events: false,
    users: false, // 🆕 Nuevo: loading de usuarios
    orphanTickets: false, // 🆕 Nuevo: loading de boletos huérfanos
    ticketTypes: {} as Record<string, boolean>,
    // 🆕 Estados de carga del scanner
    eventAttendees: {} as Record<string, boolean>,
    eventDetails: {} as Record<string, boolean>
  });
  
  // Timestamps
  const [lastUpdated, setLastUpdated] = useState({
    courtesyOrders: null as number | null,
    events: null as number | null,
    users: null as number | null, // 🆕 Nuevo: timestamp de usuarios
    orphanTickets: null as number | null, // 🆕 Nuevo: timestamp de boletos huérfanos
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

  // 🆕 Cargar usuarios
  const loadUsers = useCallback(async (force = false) => {
    if (!isAuthenticated || !user) return;
    
    if (!force && isCacheValid(lastUpdated.users)) {
      console.log('📦 Using cached users');
      return;
    }
    
    const inBackground = !force && users.length > 0;
    
    if (!inBackground) {
      setLoading(prev => ({ ...prev, users: true }));
    }
    
    try {
      console.log(inBackground ? '🔄 Background loading users' : '📥 Loading users');
      
      // 🆕 Usar Firestore directamente en lugar de API REST
      const { collection, onSnapshot, orderBy, query } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase/client');
      
      const q = query(
        collection(db, "users"),
        orderBy("created_at", "desc")
      );
      
      // Obtener snapshot una vez para cache
      const { getDocs } = await import('firebase/firestore');
      const snapshot = await getDocs(q);
      
      const usersData = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          uid: data.uid,
          email: data.email,
          name: data.name,
          roles: data.roles || [],
          phone: data.phone || "",
          company: data.company || "",
          address: data.address || { city: "", country: "México" },
          marketing_consent: data.marketing_consent || false,
          created_via: data.created_via || "unknown",
          created_at: data.created_at?.toDate() || new Date(),
          updated_at: data.updated_at?.toDate(),
        } as User;
      });
      
      setUsers(usersData);
      setLastUpdated(prev => ({ ...prev, users: Date.now() }));
      console.log('✅ Users loaded:', usersData.length);
      
    } catch (error) {
      console.error('❌ Error loading users:', error);
    } finally {
      if (!inBackground) {
        setLoading(prev => ({ ...prev, users: false }));
      }
    }
  }, [isAuthenticated, user, lastUpdated.users, users.length]);

  // 🆕 Cargar boletos huérfanos
  const loadOrphanTickets = useCallback(async (force = false) => {
    if (!isAuthenticated || !user) return;
    
    if (!force && isCacheValid(lastUpdated.orphanTickets)) {
      console.log('📦 Using cached orphan tickets');
      return;
    }
    
    const inBackground = !force && orphanTickets.length > 0;
    
    if (!inBackground) {
      setLoading(prev => ({ ...prev, orphanTickets: true }));
    }
    
    try {
      console.log(inBackground ? '🔄 Background loading orphan tickets' : '📥 Loading orphan tickets');
      
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/orphan-tickets', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setOrphanTickets(data.tickets || []);
        setLastUpdated(prev => ({ ...prev, orphanTickets: Date.now() }));
        console.log('✅ Orphan tickets loaded:', data.tickets?.length || 0);
      }
    } catch (error) {
      console.error('❌ Error loading orphan tickets:', error);
    } finally {
      if (!inBackground) {
        setLoading(prev => ({ ...prev, orphanTickets: false }));
      }
    }
  }, [isAuthenticated, user, lastUpdated.orphanTickets, orphanTickets.length]);

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
    
    // 🆕 Invalidar usuarios
    if (!keys || keys.includes('users')) {
      setLastUpdated(prev => ({ ...prev, users: null }));
    }
    
    // 🆕 Invalidar boletos huérfanos
    if (!keys || keys.includes('orphanTickets')) {
      setLastUpdated(prev => ({ ...prev, orphanTickets: null }));
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
      loadEvents(true),
      loadUsers(true), // 🆕 Incluir usuarios
      loadOrphanTickets(true) // 🆕 Incluir boletos huérfanos
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
      
      // 🆕 Auto-refresh usuarios en background
      if (needsBackgroundRefresh(lastUpdated.users)) {
        loadUsers();
      }
      
      // 🆕 Auto-refresh boletos huérfanos en background
      if (needsBackgroundRefresh(lastUpdated.orphanTickets)) {
        loadOrphanTickets();
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
      setUsers([]); // 🆕 Limpiar usuarios
      setOrphanTickets([]); // 🆕 Limpiar boletos huérfanos
      setTicketTypesByEvent({});
      // 🆕 Limpiar datos del scanner
      setEventAttendees({});
      setEventDetails({});
      setEventStats({});
      setLastUpdated({
        courtesyOrders: null,
        events: null,
        users: null, // 🆕 Timestamp de usuarios
        orphanTickets: null, // 🆕 Timestamp de boletos huérfanos
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
    users, // 🆕 Usuarios
    orphanTickets, // 🆕 Boletos huérfanos
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
    loadUsers, // 🆕 Nueva acción
    loadOrphanTickets, // 🆕 Nueva acción para boletos huérfanos
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
export type { AttendeeTicket, EventData, EventStats, User, OrphanTicket, UserOption };

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

// 🆕 Hook específico para usuarios
export function useCachedUsers() {
  const { users, loading, loadUsers, invalidateCache } = useDataCache();
  
  // 🆕 Auto-cargar usuarios al montar el hook
  useEffect(() => {
    console.log('📦 useCachedUsers: Auto-loading users on mount...');
    loadUsers(); // Cargar desde cache o API si es necesario
  }, [loadUsers]);
  
  // Funciones para mantener compatibilidad con useUsers actual
  const deleteUser = async (userId: string): Promise<boolean> => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('No authenticated user');
      
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      
      if (response.ok) {
        // Invalidar cache para recargar
        invalidateCache(['users']);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  };
  
  const updateUser = async (userId: string, data: Partial<User>): Promise<boolean> => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('No authenticated user');
      
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        // Invalidar cache para recargar
        invalidateCache(['users']);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating user:', error);
      return false;
    }
  };
  
  const addUser = (user: User) => {
    // Invalidar cache para recargar con el nuevo usuario
    invalidateCache(['users']);
  };
  
  // 🆕 Función para crear usuario (mantener compatibilidad)
  const createUser = async (userData: {
    email: string;
    name: string;
    role: string;
    phone?: string;
    company?: string;
    city?: string;
    country?: string;
    marketing_consent?: boolean;
  }) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Usuario no autenticado');
      
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(userData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear usuario');
      }
      
      const result = await response.json();
      
      // Invalidar cache para recargar
      invalidateCache(['users']);
      
      return result;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  };
  
  return {
    users,
    loading: loading.users,
    error: null, // Por compatibilidad
    refreshUsers: () => loadUsers(true),
    deleteUser,
    updateUser,
    addUser,
    createUser // 🆕 Añadir createUser para compatibilidad completa
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
