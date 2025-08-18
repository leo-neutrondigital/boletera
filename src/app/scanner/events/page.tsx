'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Clock,
  Play,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedGet } from '@/lib/utils/api';

interface EventSummary {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  location: string;
  status: 'happening_now' | 'today' | 'upcoming' | 'past';
  total_tickets: number;
  checked_in_count: number;
  configured_tickets: number;
}

interface ScannerEventsData {
  happening_now: EventSummary[];
  today: EventSummary[];
  upcoming: EventSummary[];
}

export default function ScannerEventsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  
  const [data, setData] = useState<ScannerEventsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar eventos
  const loadEvents = async () => {
    try {
      setIsLoading(true);
      console.log('📅 Loading scanner events...');

      const response = await authenticatedGet('/api/scanner/events');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error loading events');
      }

      console.log('✅ Events loaded:', result.events);
      setData(result.events);

    } catch (error) {
      console.error('❌ Error loading events:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setError(errorMessage);
      
      toast({
        variant: "destructive",
        title: "Error cargando eventos",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar eventos solo cuando la autenticación esté lista
  useEffect(() => {
    if (!isAuthLoading && user) {
      console.log('🔐 Auth ready, loading events for user:', user.email);
      loadEvents();
    } else if (!isAuthLoading && !user) {
      console.log('⚠️ No authenticated user found');
      setError('Usuario no autenticado');
      setIsLoading(false);
    }
  }, [isAuthLoading, user]);

  // Formatear fecha
  const formatEventDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return format(date, "d MMM yyyy", { locale: es });
    } catch {
      return 'Fecha inválida';
    }
  };

  // Formatear hora
  const formatEventTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return format(date, "HH:mm", { locale: es });
    } catch {
      return '';
    }
  };

  // Calcular porcentaje de asistencia
  const getAttendanceRate = (checkedIn: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((checkedIn / total) * 100);
  };

  // Componente de evento individual
  const EventCard = ({ event }: { event: EventSummary }) => {
    const attendanceRate = getAttendanceRate(event.checked_in_count, event.total_tickets);
    
    return (
      <Card 
        className="cursor-pointer hover:shadow-md transition-all duration-200 border-l-4 border-l-transparent hover:border-l-blue-500"
        onClick={() => router.push(`/scanner/events/${event.id}`)}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            
            {/* Info del evento */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 mb-1 truncate">
                {event.name}
              </h3>
              
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">
                    {formatEventDate(event.start_date)}
                    {event.start_date !== event.end_date && (
                      <span> - {formatEventDate(event.end_date)}</span>
                    )}
                  </span>
                </div>
                
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{event.location}</span>
                </div>
              </div>
            </div>

            {/* Stats y acción */}
            <div className="flex flex-col items-end gap-2 ml-4">
              
              {/* Contador de asistentes */}
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900">
                  {event.checked_in_count}/{event.total_tickets}
                </div>
                <div className="text-xs text-gray-500">Asistentes</div>
              </div>

              {/* Porcentaje de asistencia */}
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium text-gray-700">
                  {attendanceRate}%
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
              
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
        
        {/* Header */}
        <div className="bg-white shadow-sm border-b sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  onClick={() => router.push('/scanner')}
                  className="p-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">
                    Eventos
                  </h1>
                  <p className="text-sm text-gray-500">
                    Lista de asistentes y check-ins
                  </p>
                </div>
              </div>
              
              <Button
                variant="outline"
                onClick={loadEvents}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          
          {/* Loading State - Auth */}
          {isAuthLoading && (
            <div className="space-y-6">
              {/* Auth Loading Skeleton */}
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Verificando autenticación...
                </h3>
                <p className="text-gray-600">
                  Un momento por favor
                </p>
              </div>
            </div>
          )}

          {/* Loading State - Data */}
          {!isAuthLoading && isLoading && (
            <div className="space-y-6">
              {/* Happening Now Skeleton */}
              <div>
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="space-y-3">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              </div>
              
              {/* Today Skeleton */}
              <div>
                <Skeleton className="h-6 w-24 mb-4" />
                <div className="space-y-3">
                  <Skeleton className="h-24 w-full" />
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {!isAuthLoading && error && !isLoading && (
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-800">
                <div className="flex items-start gap-2">
                  <div>
                    <p className="font-medium">Error cargando eventos</p>
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Empty State */}
          {!isAuthLoading && !isLoading && !error && data && 
           data.happening_now.length === 0 && 
           data.today.length === 0 && 
           data.upcoming.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay eventos disponibles
              </h3>
              <p className="text-gray-600">
                No se encontraron eventos publicados para mostrar.
              </p>
            </div>
          )}

          {/* Events Content */}
          {!isAuthLoading && !isLoading && !error && data && (
            <div className="space-y-8">
              
              {/* Happening Now */}
              {data.happening_now.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="bg-red-100 p-1 rounded-full">
                      <Play className="w-4 h-4 text-red-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Ahora en vivo
                    </h2>
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                      {data.happening_now.length}
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    {data.happening_now.map((event) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                </section>
              )}

              {/* Today */}
              {data.today.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="bg-blue-100 p-1 rounded-full">
                      <Clock className="w-4 h-4 text-blue-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Hoy
                    </h2>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                      {data.today.length}
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    {data.today.map((event) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                </section>
              )}

              {/* Upcoming */}
              {data.upcoming.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="bg-gray-100 p-1 rounded-full">
                      <Calendar className="w-4 h-4 text-gray-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Próximamente
                    </h2>
                    <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">
                      {data.upcoming.length}
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    {data.upcoming.map((event) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                </section>
              )}

            </div>
          )}

          {/* Quick Access Tip */}
          {!isAuthLoading && !isLoading && data && (
            <div className="mt-8">
              <Alert className="bg-blue-50 border-blue-200">
                <Zap className="h-4 w-4" />
                <AlertDescription className="text-blue-800">
                  <p className="font-medium mb-1">Acceso rápido</p>
                  <p className="text-sm">
                    Toca cualquier evento para ver la lista de asistentes y realizar check-ins manuales.
                  </p>
                </AlertDescription>
              </Alert>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
