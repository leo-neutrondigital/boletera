'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, MapPin, Clock, Users, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { Event } from '@/types';

interface EventHeroProps {
  event: Event;
}

export function EventHero({ event }: EventHeroProps) {
  const eventStart = event.start_date;
  const eventEnd = event.end_date;
  const isMultiDay = eventStart.toDateString() !== eventEnd.toDateString();
  const now = new Date();
  
  // Calcular días restantes
  const daysUntilEvent = Math.ceil((eventStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  const getEventStatus = () => {
    if (daysUntilEvent < 0) return { text: 'Evento finalizado', color: 'bg-gray-500' };
    if (daysUntilEvent === 0) return { text: 'Hoy', color: 'bg-red-500' };
    if (daysUntilEvent === 1) return { text: 'Mañana', color: 'bg-orange-500' };
    if (daysUntilEvent <= 7) return { text: `En ${daysUntilEvent} días`, color: 'bg-yellow-500' };
    return { text: `${daysUntilEvent} días restantes`, color: 'bg-blue-500' };
  };

  const eventStatus = getEventStatus();

  return (
    <Card className="overflow-hidden">
      {/* Imagen destacada */}
      {event.featured_image_url && (
        <div className="relative h-64 md:h-80 lg:h-96 overflow-hidden">
          <img
            src={event.featured_image_url}
            alt={event.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          
          {/* Badge de estado sobre la imagen */}
          <div className="absolute top-4 left-4">
            <Badge className={`${eventStatus.color} text-white border-0`}>
              {eventStatus.text}
            </Badge>
          </div>

          {/* Información superpuesta */}
          <div className="absolute bottom-6 left-6 right-6 text-white">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
              {event.name}
            </h1>
            
            <div className="flex flex-wrap gap-4 text-sm md:text-base">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>
                  {isMultiDay 
                    ? `${format(eventStart, 'dd MMM', { locale: es })} - ${format(eventEnd, 'dd MMM yyyy', { locale: es })}`
                    : format(eventStart, 'dd MMMM yyyy', { locale: es })
                  }
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{event.location}</span>
              </div>
              
              {!isMultiDay && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>
                    {format(eventStart, 'HH:mm')} - {format(eventEnd, 'HH:mm')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Contenido sin imagen */}
      {!event.featured_image_url && (
        <CardContent className="p-8">
          {/* Badge de estado */}
          <div className="mb-4">
            <Badge className={`${eventStatus.color} text-white border-0`}>
              {eventStatus.text}
            </Badge>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-gray-900">
            {event.name}
          </h1>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-gray-600">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium">
                  {isMultiDay 
                    ? `${format(eventStart, 'dd MMM', { locale: es })} - ${format(eventEnd, 'dd MMM yyyy', { locale: es })}`
                    : format(eventStart, 'dd MMMM yyyy', { locale: es })
                  }
                </p>
                {!isMultiDay && (
                  <p className="text-sm">
                    {format(eventStart, 'HH:mm')} - {format(eventEnd, 'HH:mm')}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">{event.location}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-500" />
              <div>
                <p className="font-medium">Evento público</p>
                <p className="text-sm">Todos son bienvenidos</p>
              </div>
            </div>
          </div>
        </CardContent>
      )}

      {/* Descripción pública */}
      {event.public_description && (
        <CardContent className="px-8 pb-8">
          <div className="max-w-4xl">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">
              Acerca del evento
            </h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {event.public_description}
              </p>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
