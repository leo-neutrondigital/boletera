import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Event, TicketType } from '@/types';

// ✅ Obtener evento público por slug
export async function getPublicEventBySlug(slug: string): Promise<Event | null> {
  try {
    const q = query(
      collection(db, 'events'),
      where('slug', '==', slug),
      where('published', '==', true)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    const data = doc.data();
    
    return {
      id: doc.id,
      ...data,
      start_date: data.start_date?.toDate() || new Date(),
      end_date: data.end_date?.toDate() || new Date(),
      created_at: data.created_at?.toDate(),
      updated_at: data.updated_at?.toDate(),
    } as Event;
  } catch (error) {
    console.error('Error fetching public event by slug:', error);
    throw error;
  }
}

// ✅ Obtener tipos de boletos públicos para un evento (SIMPLIFICADO)
export async function getPublicTicketTypesForEvent(eventId: string): Promise<TicketType[]> {
  try {
    console.log('🎫 Fetching ticket types for event:', eventId);
    
    // Consulta simplificada sin orderBy múltiples para evitar problemas de índices
    const q = query(
      collection(db, 'ticket_types'),
      where('event_id', '==', eventId),
      where('is_active', '==', true)
    );
    
    const snapshot = await getDocs(q);
    console.log('📊 Found ticket types:', snapshot.docs.length);
    
    const ticketTypes = snapshot.docs.map(doc => {
      const data = doc.data();
      console.log('🎯 Processing ticket type:', { id: doc.id, name: data.name, is_courtesy: data.is_courtesy });
      
      return {
        id: doc.id,
        ...data,
        created_at: data.created_at?.toDate() || new Date(),
        updated_at: data.updated_at?.toDate(),
        sale_start: data.sale_start?.toDate(),
        sale_end: data.sale_end?.toDate(),
        available_days: data.available_days?.map((d: any) => d.toDate()) || [],
      } as TicketType;
    });
    
    // Filtrar cortesías y ordenar en JavaScript
    const publicTicketTypes = ticketTypes
      .filter(tt => !tt.is_courtesy) // Excluir cortesías
      .sort((a, b) => {
        // Ordenar por sort_order, luego por precio
        if (a.sort_order !== b.sort_order) {
          return (a.sort_order || 999) - (b.sort_order || 999);
        }
        return a.price - b.price;
      });
    
    console.log('✅ Public ticket types after filtering:', publicTicketTypes.length);
    
    return publicTicketTypes;
  } catch (error) {
    console.error('❌ Error fetching public ticket types:', error);
    throw error;
  }
}

// ✅ Verificar si un tipo de boleto está disponible para venta
export function isTicketTypeAvailableForSale(ticketType: TicketType): {
  available: boolean;
  reason?: string;
} {
  const now = new Date();
  
  // Verificar si está activo
  if (!ticketType.is_active) {
    return { available: false, reason: 'Tipo de boleto no disponible' };
  }
  
  // Verificar si es cortesía (no debería aparecer en público)
  if (ticketType.is_courtesy) {
    return { available: false, reason: 'Boleto de cortesía' };
  }
  
  // Verificar ventana de venta
  if (ticketType.sale_start && now < ticketType.sale_start) {
    return { available: false, reason: 'La venta aún no ha comenzado' };
  }
  
  if (ticketType.sale_end && now > ticketType.sale_end) {
    return { available: false, reason: 'La venta ha terminado' };
  }
  
  // Verificar stock disponible
  if (ticketType.total_stock !== null && ticketType.total_stock !== undefined) {
    const remaining = ticketType.total_stock - ticketType.sold_count;
    if (remaining <= 0) {
      return { available: false, reason: 'Agotado' };
    }
  }
  
  return { available: true };
}

// ✅ Obtener stock disponible de un tipo de boleto
export function getAvailableStock(ticketType: TicketType): number | null {
  if (ticketType.total_stock === null || ticketType.total_stock === undefined) {
    return null; // Stock ilimitado
  }
  
  return Math.max(0, ticketType.total_stock - ticketType.sold_count);
}

// ✅ Verificar límite por usuario para un tipo de boleto
export function canUserBuyTicketType(
  ticketType: TicketType, 
  currentQuantityInCart: number,
  userPreviousPurchases: number = 0
): {
  canBuy: boolean;
  maxQuantity: number;
  reason?: string;
} {
  const availableStock = getAvailableStock(ticketType);
  let maxQuantity = availableStock || 999;
  
  // Aplicar límite por usuario si existe
  if (ticketType.limit_per_user !== null && ticketType.limit_per_user !== undefined) {
    const remainingForUser = ticketType.limit_per_user - userPreviousPurchases;
    
    if (remainingForUser <= 0) {
      return {
        canBuy: false,
        maxQuantity: 0,
        reason: 'Has alcanzado el límite máximo para este tipo de boleto',
      };
    }
    
    maxQuantity = Math.min(maxQuantity, remainingForUser);
  }
  
  // Verificar disponibilidad general
  const availability = isTicketTypeAvailableForSale(ticketType);
  if (!availability.available) {
    return {
      canBuy: false,
      maxQuantity: 0,
      reason: availability.reason,
    };
  }
  
  return {
    canBuy: maxQuantity > 0,
    maxQuantity,
  };
}

// ✅ Obtener eventos públicos próximos (para futuros catálogos)
export async function getUpcomingPublicEvents(limitCount: number = 10): Promise<Event[]> {
  try {
    const now = new Date();
    const q = query(
      collection(db, 'events'),
      where('published', '==', true),
      where('start_date', '>=', now),
      orderBy('start_date'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        start_date: data.start_date?.toDate() || new Date(),
        end_date: data.end_date?.toDate() || new Date(),
        created_at: data.created_at?.toDate(),
        updated_at: data.updated_at?.toDate(),
      } as Event;
    });
  } catch (error) {
    console.error('Error fetching upcoming public events:', error);
    throw error;
  }
}

// ✅ Validar que un evento esté disponible para compra
export function isEventAvailableForPurchase(event: Event): {
  available: boolean;
  reason?: string;
} {
  const now = new Date();
  
  if (!event.published) {
    return { available: false, reason: 'Evento no publicado' };
  }
  
  // Verificar si el evento ya pasó
  if (event.end_date < now) {
    return { available: false, reason: 'Evento ya terminó' };
  }
  
  return { available: true };
}

// ✅ Calcular información de fechas para mostrar en público
export function getEventDisplayInfo(event: Event) {
  const now = new Date();
  const start = event.start_date;
  const end = event.end_date;
  
  const isMultiDay = start.toDateString() !== end.toDateString();
  const isToday = start.toDateString() === now.toDateString();
  const isTomorrow = start.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();
  
  let displayDate: string;
  
  if (isToday) {
    displayDate = 'Hoy';
  } else if (isTomorrow) {
    displayDate = 'Mañana';
  } else if (isMultiDay) {
    displayDate = `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  } else {
    displayDate = start.toLocaleDateString();
  }
  
  return {
    displayDate,
    isMultiDay,
    isToday,
    isTomorrow,
    daysDifference: Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
  };
}

// ✅ Obtener resumen de precios para mostrar en la página del evento
export function getEventPricingSummary(ticketTypes: TicketType[]) {
  const availableTypes = ticketTypes.filter(tt => 
    isTicketTypeAvailableForSale(tt).available
  );
  
  if (availableTypes.length === 0) {
    return {
      minPrice: 0,
      maxPrice: 0,
      currency: 'MXN',
      hasVariedPricing: false,
      freeEvent: false,
    };
  }
  
  const prices = availableTypes.map(tt => tt.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  
  const currencies = [...new Set(availableTypes.map(tt => tt.currency))];
  const mainCurrency = currencies[0]; // Tomar la primera moneda
  
  return {
    minPrice,
    maxPrice,
    currency: mainCurrency,
    hasVariedPricing: minPrice !== maxPrice,
    freeEvent: maxPrice === 0,
    multiCurrency: currencies.length > 1,
  };
}
