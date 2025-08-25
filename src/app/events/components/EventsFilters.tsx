'use client';

import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EventsFiltersProps {
  dateFilter: 'all' | 'today' | 'week' | 'month';
  onDateFilterChange: (filter: 'all' | 'today' | 'week' | 'month') => void;
}

export function EventsFilters({ dateFilter, onDateFilterChange }: EventsFiltersProps) {
  const dateOptions = [
    { value: 'all', label: 'Todas las fechas', icon: Calendar },
    { value: 'today', label: 'Hoy', icon: Calendar },
    { value: 'week', label: 'Esta semana', icon: Calendar },
    { value: 'month', label: 'Este mes', icon: Calendar },
  ] as const;

  return (
    <div className="mt-6 pt-6 border-t border-gray-200">
      <div className="space-y-4">
        
        {/* Filtros por fecha */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Filtrar por fecha:</h4>
          <div className="flex flex-wrap gap-2">
            {dateOptions.map(({ value, label, icon: Icon }) => (
              <Button
                key={value}
                variant={dateFilter === value ? "default" : "outline"}
                size="sm"
                onClick={() => onDateFilterChange(value)}
                className="flex items-center gap-2"
              >
                <Icon className="w-4 h-4" />
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Info adicional */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="p-1 bg-blue-100 rounded-full">
              <Calendar className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-sm">
              <p className="font-medium text-blue-900 mb-1">💡 Consejos de búsqueda:</p>
              <ul className="text-blue-700 space-y-1">
                <li>• Usa palabras clave como "música", "teatro", "festival"</li>
                <li>• Busca por ciudad o lugar específico</li>
                <li>• Combina filtros para resultados más precisos</li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
