'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { CartItem, SessionCart } from '@/types';
import { 
  getSessionCart, 
  saveSessionCart, 
  clearSessionCart,
  calculateCartTotals,
  validateCartItems,
  createCartForCheckout 
} from '@/lib/api/carts';

interface CartContextType {
  // Estado del carrito
  items: CartItem[];
  eventId: string | null;
  isLoading: boolean;
  
  // Información calculada
  totalAmount: number;
  totalItems: number;
  currency: 'MXN' | 'USD';
  hasMixedCurrencies: boolean;
  
  // Acciones
  addItem: (item: Omit<CartItem, 'total_price'>) => void;
  removeItem: (ticketTypeId: string) => void;
  updateItemQuantity: (ticketTypeId: string, quantity: number) => void;
  clearCart: () => void;
  setEventId: (eventId: string) => void;
  
  // Checkout
  saveForCheckout: () => Promise<string>;
  validateCart: () => Promise<{ isValid: boolean; errors: string[]; warnings: string[] }>;
  
  // Utilidades
  getItemByTicketType: (ticketTypeId: string) => CartItem | undefined;
  canAddMoreItems: (ticketTypeId: string, maxAllowed?: number) => boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

interface CartProviderProps {
  children: ReactNode;
}

export function CartProvider({ children }: CartProviderProps) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [eventId, setEventIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Cargar carrito desde sessionStorage al inicializar
  useEffect(() => {
    if (eventId) {
      const savedItems = getSessionCart(eventId);
      setItems(savedItems);
    }
  }, [eventId]);

  // Guardar carrito en sessionStorage cuando cambie
  useEffect(() => {
    if (eventId && items.length > 0) {
      saveSessionCart(eventId, items);
    } else if (eventId && items.length === 0) {
      // Limpiar sessionStorage si el carrito está vacío
      clearSessionCart(eventId);
    }
  }, [items, eventId]);

  // Calcular totales
  const totals = calculateCartTotals(items);

  // ✅ Añadir item al carrito
  const addItem = (newItem: Omit<CartItem, 'total_price'>) => {
    setItems(currentItems => {
      const existingItemIndex = currentItems.findIndex(
        item => item.ticket_type_id === newItem.ticket_type_id
      );

      const itemWithTotal: CartItem = {
        ...newItem,
        total_price: newItem.quantity * newItem.unit_price,
      };

      if (existingItemIndex >= 0) {
        // Actualizar item existente
        const updatedItems = [...currentItems];
        const existingItem = updatedItems[existingItemIndex];
        
        updatedItems[existingItemIndex] = {
          ...existingItem,
          quantity: existingItem.quantity + newItem.quantity,
          total_price: (existingItem.quantity + newItem.quantity) * existingItem.unit_price,
        };
        
        return updatedItems;
      } else {
        // Añadir nuevo item
        return [...currentItems, itemWithTotal];
      }
    });
  };

  // ✅ Remover item del carrito
  const removeItem = (ticketTypeId: string) => {
    setItems(currentItems => 
      currentItems.filter(item => item.ticket_type_id !== ticketTypeId)
    );
  };

  // ✅ Actualizar cantidad de un item
  const updateItemQuantity = (ticketTypeId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(ticketTypeId);
      return;
    }

    setItems(currentItems =>
      currentItems.map(item =>
        item.ticket_type_id === ticketTypeId
          ? {
              ...item,
              quantity,
              total_price: quantity * item.unit_price,
            }
          : item
      )
    );
  };

  // ✅ Limpiar carrito
  const clearCart = () => {
    setItems([]);
    if (eventId) {
      clearSessionCart(eventId);
    }
  };

  // ✅ Establecer evento actual
  const setEventId = (newEventId: string) => {
    // Si cambia el evento, limpiar carrito actual
    if (eventId && eventId !== newEventId) {
      clearCart();
    }
    setEventIdState(newEventId);
  };

  // ✅ Guardar carrito para checkout
  const saveForCheckout = async (): Promise<string> => {
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    if (!eventId) {
      throw new Error('No hay evento seleccionado');
    }

    if (items.length === 0) {
      throw new Error('Carrito vacío');
    }

    setIsLoading(true);
    try {
      const cartId = await createCartForCheckout({
        user_id: user.uid,
        event_id: eventId,
        items,
        total_amount: totals.totalAmount,
        currency: totals.currency,
      });

      return cartId;
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Validar carrito
  const validateCart = async () => {
    return await validateCartItems(items);
  };

  // ✅ Obtener item por tipo de boleto
  const getItemByTicketType = (ticketTypeId: string): CartItem | undefined => {
    return items.find(item => item.ticket_type_id === ticketTypeId);
  };

  // ✅ Verificar si se pueden añadir más items
  const canAddMoreItems = (ticketTypeId: string, maxAllowed: number = 999): boolean => {
    const existingItem = getItemByTicketType(ticketTypeId);
    const currentQuantity = existingItem?.quantity || 0;
    return currentQuantity < maxAllowed;
  };

  const contextValue: CartContextType = {
    // Estado
    items,
    eventId,
    isLoading,
    
    // Totales calculados
    totalAmount: totals.totalAmount,
    totalItems: totals.totalItems,
    currency: totals.currency,
    hasMixedCurrencies: totals.hasMixedCurrencies,
    
    // Acciones
    addItem,
    removeItem,
    updateItemQuantity,
    clearCart,
    setEventId,
    
    // Checkout
    saveForCheckout,
    validateCart,
    
    // Utilidades
    getItemByTicketType,
    canAddMoreItems,
  };

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
}

// Hook para usar el contexto
export function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart debe ser usado dentro de CartProvider');
  }
  return context;
}

// Hook de conveniencia para verificar si hay items en el carrito
export function useCartSummary() {
  const { totalItems, totalAmount, currency, items } = useCart();
  
  return {
    hasItems: items.length > 0,
    totalItems,
    totalAmount,
    currency,
    formattedTotal: new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency,
    }).format(totalAmount),
  };
}

// Hook para verificar disponibilidad de un tipo de boleto en el carrito
export function useTicketTypeInCart(ticketTypeId: string) {
  const { getItemByTicketType, canAddMoreItems } = useCart();
  
  const cartItem = getItemByTicketType(ticketTypeId);
  
  return {
    isInCart: !!cartItem,
    quantity: cartItem?.quantity || 0,
    canAddMore: canAddMoreItems,
    cartItem,
  };
}
