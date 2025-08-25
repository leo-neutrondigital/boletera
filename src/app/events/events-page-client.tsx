'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search, Calendar, MapPin, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Event } from '@/types';
import { EventsHero } from './components/EventsHero';
import { EventsGrid } from './components/EventsGrid';
import { EventsFilters } from './components/EventsFilters';

interface EventsPageClientProps {
  initialEvents: Event[];
  error: string | null;
}

export function EventsPageClient({ initialEvents, error }: EventsPageClientProps) {
  const [events] = useState<Event[]>(initialEvents);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Evitar hidration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // 🌟 PREPARADO: Lógica para eventos destacados (cuando agregues el campo 'featured')
  const { featuredEvents, regularEvents, filteredEvents } = useMemo(() => {
    let filtered = events;

    // Aplicar filtros
    if (searchTerm) {
      filtered = filtered.filter(event => 
        event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (event.public_description || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (locationFilter) {
      filtered = filtered.filter(event => 
        event.location.toLowerCase().includes(locationFilter.toLowerCase())
      );
    }

    // Filtro por fecha - solo del lado cliente
    if (dateFilter !== 'all' && mounted) {
      const now = new Date();
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.start_date);
        const diffTime = eventDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        switch (dateFilter) {
          case 'today':
            return diffDays === 0;
          case 'week':
            return diffDays >= 0 && diffDays <= 7;
          case 'month':
            return diffDays >= 0 && diffDays <= 30;
          default:
            return true;
        }
      });
    }

    // 🌟 PREPARADO: Separar destacados (cuando agregues el campo 'featured')
    // const featured = filtered.filter(e => e.featured);
    // const regular = filtered.filter(e => !e.featured);
    
    // Por ahora, todos son regulares
    const featured: Event[] = [];
    const regular = filtered;

    return {
      featuredEvents: featured,
      regularEvents: regular,
      filteredEvents: filtered
    };
  }, [events, searchTerm, locationFilter, dateFilter, mounted]);

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Error al cargar eventos</h1>
            <p className="text-lg text-gray-600 mb-8">{error}</p>
            <Button onClick={() => window.location.reload()} className="bg-red-600 hover:bg-red-700">
              Reintentar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Estado vacío
  if (events.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <EventsHero />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">No hay eventos disponibles</h2>
            <p className="text-lg text-gray-600 mb-8">
              Actualmente no hay eventos programados. ¡Vuelve pronto para descubrir nuevos eventos!
            </p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Actualizar página
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <EventsHero />

      {/* Búsqueda y filtros */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Barra de búsqueda principal */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            
            {/* Búsqueda por nombre */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar eventos por nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12 text-base"
                />
              </div>
            </div>

            {/* Búsqueda por ubicación */}
            <div className="lg:w-64">
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Ubicación..."
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="pl-10 h-12 text-base"
                />
              </div>
            </div>

            {/* Botón de filtros */}
            <Button
              variant={showFilters ? "default" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
              className="lg:w-auto h-12 px-6"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </Button>

          </div>

          {/* Filtros expandidos */}
          {showFilters && (
            <EventsFilters
              dateFilter={dateFilter}
              onDateFilterChange={setDateFilter}
            />
          )}
        </div>

        {/* Contador de resultados */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {filteredEvents.length === 1 
                  ? '1 evento encontrado'
                  : `${filteredEvents.length} eventos encontrados`
                }
              </h2>
              {searchTerm || locationFilter || dateFilter !== 'all' ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearchTerm('');
                    setLocationFilter('');
                    setDateFilter('all');
                  }}
                  className="text-sm text-gray-600 hover:text-gray-900 p-0 h-auto"
                >
                  Limpiar filtros
                </Button>
              ) : null}
            </div>

            {/* 🌟 PREPARADO: Badge para eventos destacados */}
            {featuredEvents.length > 0 && (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                {featuredEvents.length} destacado{featuredEvents.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>

        {/* Grid de eventos */}
        {filteredEvents.length > 0 ? (
          <EventsGrid 
            featuredEvents={featuredEvents}
            regularEvents={regularEvents}
          />
        ) : (
          /* No results */
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              No se encontraron eventos
            </h3>
            <p className="text-gray-600 mb-6">
              Intenta ajustar tus filtros de búsqueda para encontrar más eventos.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setLocationFilter('');
                setDateFilter('all');
              }}
            >
              Mostrar todos los eventos
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}
