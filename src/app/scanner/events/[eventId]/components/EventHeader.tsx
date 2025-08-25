'use client';

import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { EventData } from '../types';

interface EventHeaderProps {
  event: EventData | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export function EventHeader({ event, isLoading, onRefresh }: EventHeaderProps) {
  const router = useRouter();

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return format(date, "d 'de' MMMM, yyyy", { locale: es });
    } catch {
      return 'Fecha inválida';
    }
  };

  return (
    <div className="bg-white shadow-sm border-b sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Button
              variant="ghost"
              onClick={() => router.push('/scanner/events')}
              className="p-2 flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold text-gray-900 truncate">
                {event?.name || 'Cargando...'}
              </h1>
              <p className="text-sm text-gray-500 truncate">
                {event && `${formatDate(event.start_date)} • ${event.location}`}
              </p>
            </div>
          </div>
          
          <Button
            variant="outline"
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 flex-shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>
    </div>
  );
}
