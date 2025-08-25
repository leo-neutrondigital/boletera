'use client';

import type { Event } from '@/types';
import { EventCard } from './EventCard';

interface EventsGridProps {
  featuredEvents: Event[];
  regularEvents: Event[];
}

export function EventsGrid({ featuredEvents, regularEvents }: EventsGridProps) {
  return (
    <div id="eventos" className="space-y-12">
      
      {/* 🌟 PREPARADO: Sección de eventos destacados */}
      {featuredEvents.length > 0 && (
        <div>
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">⭐</span>
              <h2 className="text-2xl font-bold text-gray-900">Eventos Destacados</h2>
            </div>
            <p className="text-gray-600">
              Los eventos más populares y recomendados para ti
            </p>
          </div>
          
          {/* Grid especial para destacados - más prominente */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 mb-12">
            {featuredEvents.map((event) => (
              <EventCard 
                key={event.id} 
                event={event} 
                featured={true} 
              />
            ))}
          </div>
        </div>
      )}

      {/* Eventos regulares */}
      {regularEvents.length > 0 && (
        <div>
          {featuredEvents.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Todos los Eventos</h2>
              <p className="text-gray-600">
                Descubre más experiencias únicas disponibles
              </p>
            </div>
          )}
          
          {/* Grid regular */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {regularEvents.map((event) => (
              <EventCard 
                key={event.id} 
                event={event} 
                featured={false} 
              />
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
