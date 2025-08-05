'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  Mail,
  ArrowLeft,
  ExternalLink
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { CartProvider, useCart } from '@/contexts/CartContext';
import type { Event, TicketType } from '@/types';
import { getPublicTicketTypesForEvent } from '@/lib/api/public-events';

// Componentes específicos
import { EventHero } from './components/EventHero';
import { TicketTypesGrid } from './components/TicketTypesGrid';
import { PreregisterSection } from './components/PreregisterSection';
import { EventDetails } from './components/EventDetails';
import { CartFloatingButton } from '@/components/cart/CartFloatingButton';

interface EventLandingClientProps {
  event: Event;
}

function EventLandingContent({ event }: EventLandingClientProps) {
  const { user } = useAuth();
  const { setEventId } = useCart();
  const router = useRouter();
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Establecer evento en el carrito al cargar
  useEffect(() => {
    setEventId(event.id);
  }, [event.id, setEventId]);

  // Cargar tipos de boletos disponibles
  useEffect(() => {
    async function loadTicketTypes() {
      try {
        setIsLoading(true);
        const types = await getPublicTicketTypesForEvent(event.id);
        setTicketTypes(types);
      } catch (err) {
        console.error('Error loading ticket types:', err);
        setError('Error al cargar los tipos de boletos');
      } finally {
        setIsLoading(false);
      }
    }

    loadTicketTypes();
  }, [event.id]);

  // Calcular información de fechas
  const eventStart = event.start_date;
  const eventEnd = event.end_date;
  const isMultiDay = eventStart.toDateString() !== eventEnd.toDateString();
  const now = new Date();
  
  const formatEventDate = (start: Date, end: Date) => {
    if (isMultiDay) {
      return `${format(start, 'dd MMM', { locale: es })} - ${format(end, 'dd MMM yyyy', { locale: es })}`;
    }
    return format(start, 'dd MMMM yyyy', { locale: es });
  };

  const formatEventTime = (start: Date, end: Date) => {
    if (isMultiDay) {
      return 'Varios días';
    }
    return `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;
  };

  // Determinar si mostrar prerregistro o venta
  const availableTicketTypes = ticketTypes.filter(tt => tt.is_active && !tt.is_courtesy);
  const hasAvailableTickets = availableTicketTypes.length > 0;
  const canPreregister = event.allow_preregistration && !hasAvailableTickets;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header con navegación */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
            
            <div className="flex items-center gap-4">
              {event.contact_email && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`mailto:${event.contact_email}`}>
                    <Mail className="h-4 w-4 mr-2" />
                    Contacto
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <EventHero event={event} />

        {/* Info Grid */}
        <div className="grid lg:grid-cols-3 gap-8 mt-8">
          {/* Columna Principal */}
          <div className="lg:col-span-2 space-y-8">
            {/* Detalles del Evento */}
            <EventDetails event={event} />

            {/* Sección de Boletos o Prerregistro */}
            {isLoading ? (
              <Card>
                <CardHeader>
                  <CardTitle>Cargando boletos...</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="animate-pulse space-y-4">
                    <div className="h-20 bg-gray-200 rounded"></div>
                    <div className="h-20 bg-gray-200 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ) : error ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-red-600">Error</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{error}</p>
                </CardContent>
              </Card>
            ) : hasAvailableTickets ? (
              <TicketTypesGrid 
                ticketTypes={availableTicketTypes}
                event={event}
              />
            ) : canPreregister ? (
              <PreregisterSection event={event} />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Boletos no disponibles</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Los boletos para este evento no están disponibles en este momento.
                  </p>
                  {event.contact_email && (
                    <Button className="mt-4" asChild>
                      <a href={`mailto:${event.contact_email}`}>
                        Contactar organizador
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Info Rápida */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Información del Evento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 mt-1 text-gray-500" />
                  <div>
                    <p className="font-medium">{formatEventDate(eventStart, eventEnd)}</p>
                    <p className="text-sm text-gray-600">{formatEventTime(eventStart, eventEnd)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 mt-1 text-gray-500" />
                  <div>
                    <p className="font-medium">{event.location}</p>
                  </div>
                </div>

                {hasAvailableTickets && (
                  <div className="flex items-start gap-3">
                    <Users className="h-4 w-4 mt-1 text-gray-500" />
                    <div>
                      <p className="font-medium">{availableTicketTypes.length} tipos de boletos</p>
                      <p className="text-sm text-gray-600">
                        Desde ${Math.min(...availableTicketTypes.map(t => t.price))}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Términos y Condiciones */}
            {event.terms_and_conditions && (
              <Card>
                <CardHeader>
                  <CardTitle>Términos y Condiciones</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-600 text-sm whitespace-pre-wrap">
                      {event.terms_and_conditions}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* CTA Fijo en Sidebar */}
            {hasAvailableTickets && (
              <div className="sticky top-8">
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <h3 className="font-semibold text-blue-900 mb-2">
                        ¡Asegura tu lugar!
                      </h3>
                      <p className="text-blue-700 text-sm mb-4">
                        Los boletos se están agotando rápidamente
                      </p>
                      <Button 
                        className="w-full"
                        onClick={() => {
                          const ticketsSection = document.getElementById('tickets-section');
                          ticketsSection?.scrollIntoView({ behavior: 'smooth' });
                        }}
                      >
                        Ver Boletos
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Botón flotante del carrito */}
      <CartFloatingButton />
    </div>
  );
}

// Wrapper con CartProvider
export function EventLandingClient({ event }: EventLandingClientProps) {
  return (
    <CartProvider>
      <EventLandingContent event={event} />
    </CartProvider>
  );
}
