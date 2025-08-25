'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { Event, TicketType } from '@/types';

// Estados del flujo
type FlowStep = 'method' | 'selection' | 'details' | 'payment' | 'configure';
type PurchaseMethod = 'preregister' | 'purchase';

// Boleto seleccionado en el flujo
interface SelectedTicket {
  ticket_type_id: string;
  ticket_type_name: string;
  quantity: number;
  unit_price: number;
  currency: string;
  total_price: number;
  // Para eventos de múltiples días
  selected_days?: Date[];
}

// Datos del cliente
interface CustomerData {
  name: string;
  email: string;
  phone: string;
  company?: string;
  // Para compras (crear cuenta)
  createAccount?: boolean;
  password?: string;
  // Para usuarios loggeados
  userId?: string; // 🆕 AGREGADO para usuarios registrados
}

// Estado completo del flujo
interface EventFlowState {
  // Información del evento
  event: Event | null;
  availableTicketTypes: TicketType[];
  
  // Estado del flujo
  currentStep: FlowStep;
  method: PurchaseMethod | null;
  
  // Selección de boletos
  selectedTickets: SelectedTicket[];
  totalAmount: number;
  
  // Datos del cliente
  customerData: CustomerData | null;
  
  // Estado de carga
  isLoading: boolean;
  error: string | null;
}

// Acciones del contexto
interface EventFlowActions {
  // Navegación
  setStep: (step: FlowStep) => void;
  goNext: () => void;
  goBack: () => void;
  
  // Configuración inicial
  initializeFlow: (event: Event, ticketTypes: TicketType[]) => void;
  
  // Método
  setMethod: (method: PurchaseMethod) => void;
  
  // Selección de boletos
  addTicket: (ticketType: TicketType, quantity: number, selectedDays?: Date[]) => void;
  updateTicketQuantity: (ticketTypeId: string, quantity: number) => void;
  removeTicket: (ticketTypeId: string) => void;
  clearSelection: () => void;
  
  // Datos del cliente
  setCustomerData: (data: CustomerData) => void;
  
  // Utilidades
  reset: () => void;
  canProceed: () => boolean;
}

type EventFlowContextType = EventFlowState & EventFlowActions;

const EventFlowContext = createContext<EventFlowContextType | undefined>(undefined);

// Estado inicial
const initialState: EventFlowState = {
  event: null,
  availableTicketTypes: [],
  currentStep: 'method',
  method: null,
  selectedTickets: [],
  totalAmount: 0,
  customerData: null,
  isLoading: false,
  error: null,
};

// Provider
export function EventFlowProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<EventFlowState>(initialState);
  const renderCount = useRef(0);
  
  // 🔧 DEBUG: Añadir debugging de estado en cada render
  renderCount.current += 1;
  console.log('🔄 EventFlowProvider render #', renderCount.current, 'with state:', {
    method: state.method,
    currentStep: state.currentStep,
    eventId: state.event?.id,
    hasCustomerData: !!state.customerData,
    customerDataName: state.customerData?.name || 'none',
    selectedTicketsCount: state.selectedTickets.length
  });

  // Calcular total automáticamente
  useEffect(() => {
    const total = state.selectedTickets.reduce((sum, ticket) => sum + ticket.total_price, 0);
    if (total !== state.totalAmount) {
      console.log('💰 Updating total amount:', total, '(prev:', state.totalAmount, ')');
      
      // 🔧 VERIFICAR SI ESTO ESTÁ CORROMPIENDO EL ESTADO
      setState(prev => {
        if (prev.customerData) {
          console.log('💰 totalAmount update - preserving customerData:', prev.customerData.name);
        } else {
          console.log('💰 totalAmount update - no customerData to preserve');
        }
        return { ...prev, totalAmount: total };
      });
    } else {
      console.log('💰 Total amount unchanged:', total);
    }
  }, [state.selectedTickets, state.totalAmount]);

  // Función canProceed como función normal (sin useCallback)
  const canProceed = (): boolean => {
    const result = (() => {
      switch (state.currentStep) {
        case 'method':
          return state.method !== null;
        case 'selection':
          return state.selectedTickets.length > 0; // ✅ OBLIGATORIO para ambos métodos
        case 'details':
          // 🔧 ARREGLO: Para preregistros NO necesitamos boletos
          const hasCustomerData = state.customerData !== null && 
                                  state.customerData.name.trim() !== '' && 
                                  state.customerData.email.trim() !== '';
          
          if (state.method === 'preregister') {
            // Para preregistros, solo necesitamos datos del cliente
            return hasCustomerData;
          } else {
            // Para compras, necesitamos datos Y boletos
            return hasCustomerData && state.selectedTickets.length > 0;
          }
        case 'payment':
          return true;
        case 'configure':
          return true;
        default:
          return false;
      }
    })();

    console.log('🔍 canProceed:', {
      step: state.currentStep,
      method: state.method,
      result,
      tickets: state.selectedTickets.length,
      hasCustomerData: !!state.customerData,
      customerDataName: state.customerData?.name || 'none',
      customerDataEmail: state.customerData?.email || 'none'
    });

    return result;
  };

  // Acciones
  const actions: EventFlowActions = {
    // Navegación
    setStep: (step: FlowStep) => {
      console.log('🔄 setStep called:', step);
      setState(prev => {
        console.log('🔄 setStep - prev state:', prev.currentStep, '-> new:', step);
        return { ...prev, currentStep: step };
      });
    },

    goNext: () => {
      const stepOrder: FlowStep[] = ['method', 'selection', 'details', 'payment', 'configure'];
      const currentIndex = stepOrder.indexOf(state.currentStep);
      
      // 🔧 ARREGLO FINAL: Evaluar canProceed DIRECTAMENTE sin function closure
      const directCanProceed = (() => {
        switch (state.currentStep) {
          case 'method':
            return state.method !== null;
          case 'selection':
            return state.selectedTickets.length > 0; // ✅ OBLIGATORIO para ambos métodos
          case 'details':
            const hasCustomerDataNow = state.customerData !== null && 
                                    state.customerData.name.trim() !== '' && 
                                    state.customerData.email.trim() !== '';
            if (state.method === 'preregister') {
              return hasCustomerDataNow;
            } else {
              return hasCustomerDataNow && state.selectedTickets.length > 0;
            }
          case 'payment':
            return true;
          case 'configure':
            return true;
          default:
            return false;
        }
      })();
      
      console.log('🔄 goNext attempt:', {
        currentStep: state.currentStep,
        currentIndex,
        canProceed: directCanProceed, // 🔧 Usar evaluación directa
        method: state.method,
        hasCustomerDataDirect: !!state.customerData,
        customerDataName: state.customerData?.name || 'none',
        functionCanProceed: canProceed() // 🔧 Para comparación
      });
      
      if (currentIndex < stepOrder.length - 1 && directCanProceed) {
        const nextStep = stepOrder[currentIndex + 1];
        console.log('✅ goNext success:', nextStep);
        setState(prev => ({ ...prev, currentStep: nextStep }));
      } else {
        console.log('❌ goNext blocked - directCanProceed:', directCanProceed, 'functionCanProceed:', canProceed());
      }
    },

    goBack: () => {
      const stepOrder: FlowStep[] = ['method', 'selection', 'details', 'payment', 'configure'];
      const currentIndex = stepOrder.indexOf(state.currentStep);
      if (currentIndex > 0) {
        const prevStep = stepOrder[currentIndex - 1];
        console.log('⬅️ goBack:', prevStep);
        setState(prev => ({ ...prev, currentStep: prevStep }));
      }
    },

    // Configuración inicial
    initializeFlow: (event: Event, ticketTypes: TicketType[]) => {
      const hasPreregistration = event.allow_preregistration;
      const availableTypes = ticketTypes.filter(tt => tt.is_active && !tt.is_courtesy);
      
      console.log('🚀 initializeFlow called:', {
        eventId: event.id,
        hasPreregistration,
        availableTypes: availableTypes.length,
        renderCount: renderCount.current
      });
      
      setState(prev => {
        const newState = {
          ...prev,
          event,
          availableTicketTypes: availableTypes,
          currentStep: hasPreregistration ? 'method' as FlowStep : 'selection' as FlowStep,
          method: hasPreregistration ? null : 'purchase' as PurchaseMethod,
        };
        console.log('🚀 initializeFlow - new state:', {
          currentStep: newState.currentStep,
          method: newState.method,
          hasPreregistration
        });
        return newState;
      });
    },

    // Método - CON DEBUGGING INTENSIVO
    setMethod: (method: PurchaseMethod) => {
      console.log('📝 setMethod called with:', method, 'at render:', renderCount.current);
      setState(prev => {
        console.log('📝 setMethod - previous method:', prev.method, '-> new method:', method);
        const newState = { ...prev, method };
        console.log('📝 setMethod - complete new state:', {
          method: newState.method,
          currentStep: newState.currentStep,
          eventId: newState.event?.id
        });
        return newState;
      });
    },

    // Selección de boletos
    addTicket: (ticketType: TicketType, quantity: number, selectedDays?: Date[]) => {
      const totalPrice = ticketType.price * quantity;
      const newTicket: SelectedTicket = {
        ticket_type_id: ticketType.id,
        ticket_type_name: ticketType.name,
        quantity,
        unit_price: ticketType.price,
        currency: ticketType.currency,
        total_price: totalPrice,
        selected_days: selectedDays,
      };

      console.log('🎫 addTicket:', {
        ticketType: ticketType.name,
        quantity,
        totalPrice
      });

      setState(prev => {
        const existingIndex = prev.selectedTickets.findIndex(
          ticket => ticket.ticket_type_id === ticketType.id
        );

        if (existingIndex >= 0) {
          const updatedTickets = [...prev.selectedTickets];
          updatedTickets[existingIndex] = newTicket;
          return { ...prev, selectedTickets: updatedTickets };
        } else {
          return { ...prev, selectedTickets: [...prev.selectedTickets, newTicket] };
        }
      });
    },

    updateTicketQuantity: (ticketTypeId: string, quantity: number) => {
      if (quantity <= 0) {
        actions.removeTicket(ticketTypeId);
        return;
      }

      setState(prev => ({
        ...prev,
        selectedTickets: prev.selectedTickets.map(ticket =>
          ticket.ticket_type_id === ticketTypeId
            ? { ...ticket, quantity, total_price: ticket.unit_price * quantity }
            : ticket
        ),
      }));
    },

    removeTicket: (ticketTypeId: string) => {
      console.log('🗑️ removeTicket:', ticketTypeId);
      setState(prev => ({
        ...prev,
        selectedTickets: prev.selectedTickets.filter(
          ticket => ticket.ticket_type_id !== ticketTypeId
        ),
      }));
    },

    clearSelection: () => {
      setState(prev => ({ ...prev, selectedTickets: [], totalAmount: 0 }));
    },

    // Datos del cliente
    setCustomerData: (data: CustomerData) => {
      console.log('💾 setCustomerData called with:', {
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        createAccount: data.createAccount,
        hasPassword: !!data.password,
        userId: data.userId || 'none'
      });
      
      setState(prev => {
        console.log('💾 setCustomerData - prev state had customerData:', !!prev.customerData);
        
        // 🔧 VERIFICAR SI EL ESTADO ANTERIOR ESTÁ SIENDO CORRUPTO
        if (prev.customerData && prev.customerData !== data) {
          console.warn('⚠️ setCustomerData - OVERWRITING existing customerData!', {
            existing: prev.customerData,
            new: data
          });
        }
        
        const newState = { ...prev, customerData: data };
        console.log('💾 setCustomerData - new state will have customerData:', !!newState.customerData);
        return newState;
      });
    },

    // Utilidades
    reset: () => {
      console.log('😨 RESET called - THIS MIGHT BE THE PROBLEM!');
      console.trace('Reset called from:'); // Ver quién llama reset
      setState(initialState);
    },

    canProceed,
  };

  const contextValue: EventFlowContextType = {
    ...state,
    ...actions,
  };

  console.log('🎯 EventFlowProvider returning context value:', {
    method: contextValue.method,
    currentStep: contextValue.currentStep,
    canProceed: contextValue.canProceed()
  });

  return (
    <EventFlowContext.Provider value={contextValue}>
      {children}
    </EventFlowContext.Provider>
  );
}

// Hook para usar el contexto
export function useEventFlow() {
  const context = useContext(EventFlowContext);
  if (context === undefined) {
    throw new Error('useEventFlow must be used within an EventFlowProvider');
  }
  return context;
}

// Hook para obtener información del paso actual
export function useCurrentStepInfo() {
  const { currentStep } = useEventFlow();
  
  const stepInfo = {
    method: { title: 'Elige tu método', step: 1, total: 4 },
    selection: { title: 'Selecciona boletos', step: 2, total: 4 },
    details: { title: 'Tus datos', step: 3, total: 4 },
    payment: { title: 'Pago', step: 4, total: 4 },
    configure: { title: 'Configurar asistentes', step: 1, total: 1 },
  };
  
  return stepInfo[currentStep];
}
