'use client';

import { useState, useEffect } from 'react';
import { Calendar, MapPin, Clock, Ticket, Star, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils/currency';
import { getEventPricingSummary, isEventAvailableForPurchase } from '@/lib/api/public-events';
import type { Event, TicketType } from '@/types';

interface EventCardProps {
  event: Event;
  featured?: boolean;
}

export function EventCard({ event, featured = false }: EventCardProps) {
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  // Evitar hidration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Información del evento - solo del lado cliente para evitar hidration mismatch
  const getDisplayInfo = () => {
    if (!mounted) return { displayDate: '', isMultiDay: false, isToday: false, isTomorrow: false, daysDifference: 0 };
    
    const now = new Date();
    const start = new Date(event.start_date);
    const end = new Date(event.end_date);
    
    const isMultiDay = start.toDateString() !== end.toDateString();
    const isToday = start.toDateString() === now.toDateString();
    const isTomorrow = start.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();
    
    let displayDate: string;
    
    if (isToday) {
      displayDate = 'Hoy';
    } else if (isTomorrow) {
      displayDate = 'Mañana';
    } else if (isMultiDay) {
      displayDate = `${start.toLocaleDateString('es-ES')} - ${end.toLocaleDateString('es-ES')}`;
    } else {
      displayDate = start.toLocaleDateString('es-ES');
    }
    
    return {
      displayDate,
      isMultiDay,
      isToday,
      isTomorrow,
      daysDifference: Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    };
  };
  
  const displayInfo = getDisplayInfo();
  const availability = isEventAvailableForPurchase(event);
  
  // Cargar tipos de boletos para calcular precios
  useEffect(() => {
    async function loadTicketTypes() {
      try {
        // Usar fetch directo a la API pública
        const response = await fetch(`/api/public/events/${event.slug}/ticket-types`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setTicketTypes(data.ticketTypes);
          }
        }
      } catch (error) {
        console.error('Error loading ticket types for card:', error);
      } finally {
        setLoading(false);
      }
    }
    
    if (event.slug) {
      loadTicketTypes();
    } else {
      setLoading(false);
    }
  }, [event.slug]);

  // Información de precios
  const pricingSummary = getEventPricingSummary(ticketTypes);

  // Función para navegar al evento
  const handleViewEvent = () => {
    if (event.slug) {
      window.location.href = `/events/${event.slug}`;
    }
  };

  // Determinar estado del evento
  const getEventStatus = () => {
    if (!availability.available) {
      return { label: 'Finalizado', color: 'bg-gray-100 text-gray-600' };
    }
    
    if (displayInfo.isToday) {
      return { label: 'Hoy', color: 'bg-green-100 text-green-700' };
    }
    
    if (displayInfo.isTomorrow) {
      return { label: 'Mañana', color: 'bg-blue-100 text-blue-700' };
    }
    
    if (displayInfo.daysDifference <= 7 && displayInfo.daysDifference >= 0) {
      return { label: 'Esta semana', color: 'bg-orange-100 text-orange-700' };
    }
    
    return null;
  };

  const eventStatus = getEventStatus();

  // Classes dinámicas
  const cardClasses = [
    'group hover:shadow-xl transition-all duration-300 border-0',
    featured ? 'ring-2 ring-yellow-200 shadow-lg' : 'hover:shadow-lg',
    !availability.available ? 'opacity-75' : ''
  ].join(' ');

  const imageClasses = [
    'h-48 bg-gradient-to-br from-blue-500 to-purple-600 rounded-t-lg relative overflow-hidden',
    featured ? 'h-56' : ''
  ].join(' ');

  const titleClasses = [
    'font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors',
    featured ? 'text-xl' : 'text-lg'
  ].join(' ');

  const buttonClasses = [
    'flex-1',
    featured ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700' : ''
  ].join(' ');

  return (
    <Card className={cardClasses}>
      
      {/* Header con imagen placeholder */}
      <div className="relative">
        <div className={imageClasses}>
          
          {/* Patrón de fondo simple */}
          <div className="absolute inset-0 opacity-30">
            <div className="w-full h-full bg-repeat" style={{
              backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"40\" height=\"40\" viewBox=\"0 0 40 40\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"0.1\"%3E%3Ccircle cx=\"20\" cy=\"20\" r=\"1\"/%3E%3C/g%3E%3C/svg%3E')"
            }}></div>
          </div>
          
          {/* Contenido sobre la imagen */}
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <div className="text-center text-white">
              <Ticket className="w-12 h-12 mx-auto mb-2 opacity-80" />
              <p className="text-sm font-medium opacity-90">
                {event.name.substring(0, 30)}{event.name.length > 30 ? '...' : ''}
              </p>
            </div>
          </div>

          {/* Badges */}
          <div className="absolute top-4 left-4 flex gap-2">
            {featured && (
              <Badge className="bg-yellow-500 text-yellow-900 border-0">
                <Star className="w-3 h-3 mr-1" />
                Destacado
              </Badge>
            )}
            
            {eventStatus && (
              <Badge className={`border-0 ${eventStatus.color}`}>
                {eventStatus.label}
              </Badge>
            )}
          </div>

          {/* Precios en la esquina */}
          {!loading && ticketTypes.length > 0 && (
            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2">
              <div className="text-sm font-semibold text-gray-900">
                {pricingSummary.freeEvent ? (
                  'Gratis'
                ) : pricingSummary.hasVariedPricing ? (
                  `Desde ${formatCurrency(pricingSummary.minPrice, pricingSummary.currency as 'MXN' | 'USD' | 'EUR' | 'GBP')}`
                ) : (
                  formatCurrency(pricingSummary.minPrice, pricingSummary.currency as 'MXN' | 'USD' | 'EUR' | 'GBP')
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <CardContent className="p-6">
        
        {/* Título */}
        <h3 className={titleClasses}>
          {event.name}
        </h3>

        {/* Información del evento */}
        <div className="space-y-3 mb-6">
          
          {/* Fecha */}
          <div className="flex items-center gap-3 text-gray-600">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-sm">
              {mounted ? (
                <>
                  {displayInfo.displayDate}
                  {displayInfo.isMultiDay && (
                    <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      {Math.ceil((event.end_date.getTime() - event.start_date.getTime()) / (1000 * 60 * 60 * 24))} días
                    </span>
                  )}
                </>
              ) : (
                <span className="bg-gray-200 rounded w-24 h-4 inline-block animate-pulse"></span>
              )}
            </span>
          </div>

          {/* Ubicación */}
          <div className="flex items-center gap-3 text-gray-600">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="text-sm line-clamp-1">{event.location}</span>
          </div>

          {/* Descripción */}
          {event.public_description && (
            <div className="text-sm text-gray-600 line-clamp-2">
              {event.public_description}
            </div>
          )}
        </div>

        {/* Información de boletos */}
        {!loading && (
          <div className="mb-6">
            {ticketTypes.length > 0 ? (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Ticket className="w-4 h-4 text-gray-400" />
                <span>
                  {ticketTypes.length} tipo{ticketTypes.length !== 1 ? 's' : ''} de boleto{ticketTypes.length !== 1 ? 's' : ''} disponible{ticketTypes.length !== 1 ? 's' : ''}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <Clock className="w-4 h-4" />
                <span>Boletos próximamente</span>
              </div>
            )}
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex gap-3">
          <Button 
            onClick={handleViewEvent}
            className={buttonClasses}
            disabled={!availability.available && !event.allow_preregistration}
          >
            {!availability.available ? (
              event.allow_preregistration ? (
                <>Preregistrarse</>
              ) : (
                <>Ver Detalles</>
              )
            ) : (
              <>Comprar Boletos</>
            )}
            <ExternalLink className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Info adicional para preregistro */}
        {!availability.available && event.allow_preregistration && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700">
              💡 Este evento permite preregistro sin costo. ¡Asegura tu lugar!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
