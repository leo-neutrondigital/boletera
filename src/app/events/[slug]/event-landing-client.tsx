'use client';

import { useEffect, useState } from 'react';
import { EventFlowProvider, useEventFlow } from '@/components/event/EventFlowProvider';
import { CompactEventPage } from './components/CompactEventPage';
import type { Event } from '@/types';
import { getPublicTicketTypesForEvent } from '@/lib/api/public-events';

interface EventLandingClientProps {
  event: Event;
}

// Componente interno que usa el EventFlow
function EventLandingContent({ event }: EventLandingClientProps) {
  const { initializeFlow } = useEventFlow();
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔧 ARREGLO: Inicializar el flujo SOLO UNA VEZ - SIN verificación de contextEvent
  useEffect(() => {
    // Solo verificar si ya está inicializado
    if (isInitialized) {
      console.log('🚫 Skipping initializeFlow - already initialized');
      return;
    }

    async function init() {
      try {
        console.log('🚀 Initializing flow with event:', event.id);
        
        // Cargar tipos de boletos
        const ticketTypes = await getPublicTicketTypesForEvent(event.id, event.slug);
        console.log('✅ Loaded ticket types:', ticketTypes.length);
        
        // Inicializar el flujo
        initializeFlow(event, ticketTypes);
        console.log('✅ Flow initialized successfully');
        
        setIsInitialized(true);
      } catch (err) {
        console.error('❌ Error initializing flow:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsInitialized(true);
      }
    }

    init();
  }, [event.id, isInitialized]); // 🔧 REMOVER initializeFlow y contextEvent de dependencias

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Inicializando flujo del evento...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-100 border border-red-300 rounded-lg p-4">
            <h3 className="font-bold text-red-800 mb-2">❌ ERROR</h3>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return <CompactEventPage />;
}

// Wrapper principal con EventFlowProvider
export function EventLandingClient({ event }: EventLandingClientProps) {
  console.log('🔍 EventLandingClient called with event:', event);

  if (!event || !event.id) {
    console.log('❌ No event or no event.id:', { event: !!event, id: event?.id });
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Event not found or invalid</p>
          <p className="text-xs text-gray-400 mt-2">Event: {JSON.stringify(!!event)}, ID: {event?.id || 'null'}</p>
        </div>
      </div>
    );
  }

  console.log('✅ Event is valid, rendering EventFlowProvider');

  return (
    <EventFlowProvider>
      <EventLandingContent event={event} />
    </EventFlowProvider>
  );
}
