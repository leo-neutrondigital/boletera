'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Info, 
  ExternalLink,
  Share2,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Event } from '@/types';

interface EventDetailsProps {
  event: Event;
}

export function EventDetails({ event }: EventDetailsProps) {
  const eventStart = event.start_date;
  const eventEnd = event.end_date;
  const isMultiDay = eventStart.toDateString() !== eventEnd.toDateString();

  const handleShare = async () => {
    const shareData = {
      title: event.name,
      text: `¡Mira este evento: ${event.name}!`,
      url: window.location.href,
    };

    if (navigator.share && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        // Usuario canceló el share
      }
    } else {
      // Fallback: copiar al portapapeles
      try {
        await navigator.clipboard.writeText(window.location.href);
        // TODO: Mostrar toast de éxito
      } catch (error) {
        console.error('Error copying to clipboard:', error);
      }
    }
  };

  const handleAddToCalendar = () => {
    // Generar URL para agregar al calendario
    const title = encodeURIComponent(event.name);
    const details = encodeURIComponent(event.public_description || event.description || '');
    const location = encodeURIComponent(event.location);
    
    // Formato de fecha para Google Calendar (YYYYMMDDTHHMMSSZ)
    const startDate = eventStart.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endDate = eventEnd.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${details}&location=${location}`;
    
    window.open(googleCalendarUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Información detallada del evento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Detalles del Evento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Fecha y Hora */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                Fecha
              </h4>
              {isMultiDay ? (
                <div className="space-y-1">
                  <p className="text-gray-700">
                    <strong>Inicio:</strong> {format(eventStart, 'EEEE, dd MMMM yyyy', { locale: es })}
                  </p>
                  <p className="text-gray-700">
                    <strong>Fin:</strong> {format(eventEnd, 'EEEE, dd MMMM yyyy', { locale: es })}
                  </p>
                </div>
              ) : (
                <p className="text-gray-700">
                  {format(eventStart, 'EEEE, dd MMMM yyyy', { locale: es })}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-500" />
                Horario
              </h4>
              {isMultiDay ? (
                <p className="text-gray-700">
                  Evento de múltiples días
                </p>
              ) : (
                <p className="text-gray-700">
                  {format(eventStart, 'HH:mm')} - {format(eventEnd, 'HH:mm')}
                </p>
              )}
            </div>
          </div>

          {/* Ubicación */}
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-red-500" />
              Ubicación
            </h4>
            <p className="text-gray-700">{event.location}</p>
            
            {/* Botón para abrir en mapas */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`;
                window.open(mapUrl, '_blank');
              }}
              className="mt-2"
            >
              <ExternalLink className="h-3 w-3 mr-2" />
              Ver en mapas
            </Button>
          </div>

          {/* Acciones rápidas */}
          <div className="flex flex-wrap gap-3 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddToCalendar}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Agregar al calendario
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="flex items-center gap-2"
            >
              <Share2 className="h-4 w-4" />
              Compartir evento
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Descripción completa */}
      {event.description && event.description !== event.public_description && (
        <Card>
          <CardHeader>
            <CardTitle>Descripción Completa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notas importantes */}
      {event.internal_notes && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-900">Notas Importantes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-amber-800 whitespace-pre-wrap">
              {event.internal_notes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Información de contacto */}
      {event.contact_email && (
        <Card>
          <CardHeader>
            <CardTitle>¿Tienes preguntas?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Si tienes alguna duda sobre el evento, no dudes en contactarnos.
            </p>
            <Button asChild>
              <a href={`mailto:${event.contact_email}?subject=Consulta sobre ${event.name}`}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Enviar consulta
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Metadatos del evento */}
      <Card className="bg-gray-50">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              Evento público
            </Badge>
            
            {isMultiDay && (
              <Badge variant="secondary">
                Múltiples días
              </Badge>
            )}
            
            {event.allow_preregistration && (
              <Badge variant="secondary">
                Prerregistro disponible
              </Badge>
            )}
            
            <Badge variant="secondary">
              ID: {event.slug}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
