'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  ArrowLeft,
  Users,
  Calendar,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
// 🆕 Usar SWR para cache eficiente
import { useScannerAttendees } from '@/hooks/use-scanner-attendees';

// Importar componentes específicos
import { EventHeader } from './components/EventHeader';
import { AttendeesList } from './components/AttendeesList';
import { EventDetailsTab } from './components/EventDetailsTab';

export default function EventAttendeesPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: isAuthLoading } = useAuth();
  const eventId = params.eventId as string;
  
  // 🆕 Usar SWR para cache automático
  const {
    attendees,
    event,
    stats,
    isLoading,
    isValidating,
    error: swrError,
    refresh,
    updateAttendee
  } = useScannerAttendees(eventId);
  
  // Estado local
  const [error, setError] = useState<string | null>(null);

  // Verificar autenticación
  useEffect(() => {
    if (!isAuthLoading && !user) {
      console.log('⚠️ No authenticated user found');
      setError('Usuario no autenticado');
    }
  }, [isAuthLoading, user]);
  
  // Actualizar error si SWR falla
  useEffect(() => {
    if (swrError) {
      setError(swrError.message || 'Error al cargar datos');
    }
  }, [swrError]);

  // Formatear fecha para header
  const formatEventDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return format(date, "d 'de' MMMM, yyyy", { locale: es });
    } catch {
      return 'Fecha inválida';
    }
  };

  // Callback para refrescar datos después de check-ins
  const handleDataRefresh = () => {
    refresh(); // 🆕 Usar función de refresh del cache
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <EventHeader 
        event={event}
        isLoading={isValidating}
        onRefresh={refresh}
      />

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Loading State - Auth */}
        {isAuthLoading && (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Verificando autenticación...
            </h3>
            <p className="text-gray-600">Un momento por favor</p>
          </div>
        )}

        {/* Error State */}
        {!isAuthLoading && error && !isLoading && (
          <Alert className="bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-800">
              <div>
                <p className="font-medium">Error cargando datos del evento</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        {!isAuthLoading && !error && (
          <Tabs defaultValue="attendees" className="space-y-6">
            
            {/* Tabs Navigation */}
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="attendees" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Lista de Asistentes</span>
              </TabsTrigger>
              <TabsTrigger value="details" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Check-in Manual</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab: Lista de Asistentes */}
            <TabsContent value="attendees">
              <AttendeesList
                attendees={attendees}
                stats={stats}
                isLoading={isLoading || isValidating}
                onRefresh={handleDataRefresh}
                onAttendeeUpdate={updateAttendee}
                eventId={eventId}
                eventName={event?.name || 'Evento'}
              />
            </TabsContent>

            {/* Tab: Check-in Manual y Detalles */}
            <TabsContent value="details">
              <EventDetailsTab
                event={event}
                attendees={attendees}
                stats={stats}
                isLoading={isLoading}
                eventId={eventId}
              />
            </TabsContent>

          </Tabs>
        )}

        {/* Loading Skeleton */}
        {!isAuthLoading && isLoading && (
          <div className="space-y-6">
            {/* Header skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
            
            {/* Content skeleton */}
            <Skeleton className="h-10 w-full" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
