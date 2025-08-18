'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  ArrowLeft,
  Search,
  Users,
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  Circle,
  Minus,
  Filter,
  RefreshCw,
  AlertCircle,
  User,
  Mail,
  Phone,
  Zap,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ManualCheckInModal } from '@/components/scanner/ManualCheckInModal';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedGet } from '@/lib/utils/api';

interface AttendeeTicket {
  id: string;
  attendee_name: string;
  attendee_email?: string;
  attendee_phone?: string;
  customer_name: string;
  customer_email: string;
  ticket_type_name: string;
  status: 'purchased' | 'configured' | 'generated' | 'used';
  check_in_status: 'not_arrived' | 'checked_in' | 'partial';
  authorized_days: string[];
  used_days: string[];
  last_checkin?: string;
  can_undo_until?: string;
  qr_id?: string;
  amount_paid: number;
  currency: string;
}

interface EventData {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  location: string;
  description?: string;
}

interface EventStats {
  total_tickets: number;
  configured_tickets: number;
  checked_in_count: number;
  not_arrived_count: number;
  attendance_rate: number;
}

export default function EventAttendeesPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  const eventId = params.eventId as string;
  
  const [event, setEvent] = useState<EventData | null>(null);
  const [attendees, setAttendees] = useState<AttendeeTicket[]>([]);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [filteredAttendees, setFilteredAttendees] = useState<AttendeeTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'checked_in' | 'not_arrived' | 'partial'>('all');

  // Modal de check-in manual
  const [selectedAttendee, setSelectedAttendee] = useState<AttendeeTicket | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Cargar asistentes del evento
  const loadAttendees = async () => {
    try {
      setIsLoading(true);
      console.log('👥 Loading attendees for event:', eventId);

      const response = await authenticatedGet(`/api/scanner/events/${eventId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error loading attendees');
      }

      console.log('✅ Attendees loaded:', result);
      setEvent(result.event);
      setAttendees(result.attendees || []);
      setStats(result.stats);

    } catch (error) {
      console.error('❌ Error loading attendees:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setError(errorMessage);
      
      toast({
        variant: "destructive",
        title: "Error cargando asistentes",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthLoading && user && eventId) {
      console.log('🔐 Auth ready, loading attendees for event:', eventId);
      loadAttendees();
    } else if (!isAuthLoading && !user) {
      console.log('⚠️ No authenticated user found');
      setError('Usuario no autenticado');
      setIsLoading(false);
    }
  }, [isAuthLoading, user, eventId]);

  // Filtrar asistentes
  useEffect(() => {
    let filtered = attendees;

    // Filtrar por término de búsqueda
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(attendee => 
        attendee.attendee_name.toLowerCase().includes(term) ||
        attendee.attendee_email?.toLowerCase().includes(term) ||
        attendee.customer_name.toLowerCase().includes(term) ||
        attendee.customer_email.toLowerCase().includes(term) ||
        attendee.ticket_type_name.toLowerCase().includes(term)
      );
    }

    // Filtrar por estado de check-in
    if (statusFilter !== 'all') {
      filtered = filtered.filter(attendee => attendee.check_in_status === statusFilter);
    }

    setFilteredAttendees(filtered);
  }, [attendees, searchTerm, statusFilter]);

  // Formatear fecha
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return format(date, "d 'de' MMMM, yyyy", { locale: es });
    } catch {
      return 'Fecha inválida';
    }
  };

  // Formatear hora
  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return format(date, "HH:mm", { locale: es });
    } catch {
      return '';
    }
  };

  // Agrupar asistentes alfabéticamente
  const groupAttendeesByLetter = (attendees: AttendeeTicket[]) => {
    const groups: { [key: string]: AttendeeTicket[] } = {};
    
    attendees.forEach(attendee => {
      const firstLetter = attendee.attendee_name.charAt(0).toUpperCase();
      const letter = /[A-ZÑ]/.test(firstLetter) ? firstLetter : '#';
      
      if (!groups[letter]) {
        groups[letter] = [];
      }
      groups[letter].push(attendee);
    });

    return groups;
  };

  // Obtener icono de estado
  const getStatusIcon = (status: AttendeeTicket['check_in_status']) => {
    switch (status) {
      case 'checked_in':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'partial':
        return <Minus className="w-4 h-4 text-yellow-600" />;
      case 'not_arrived':
      default:
        return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  // Obtener color del punto de estado
  const getStatusDotColor = (status: AttendeeTicket['check_in_status']) => {
    switch (status) {
      case 'checked_in':
        return 'bg-green-500';
      case 'partial':
        return 'bg-yellow-500';
      case 'not_arrived':
      default:
        return 'bg-gray-400';
    }
  };

  // Abrir modal de check-in
  const openCheckInModal = (attendee: AttendeeTicket) => {
    setSelectedAttendee(attendee);
    setIsModalOpen(true);
  };

  // Cerrar modal
  const closeCheckInModal = () => {
    setIsModalOpen(false);
    setSelectedAttendee(null);
  };

  // Callback cuando el check-in es exitoso
  const handleCheckInSuccess = () => {
    // Recargar la lista de asistentes
    loadAttendees();
  };

  // Componente de asistente individual
  const AttendeeCard = ({ attendee }: { attendee: AttendeeTicket }) => (
    <Card 
      className="cursor-pointer hover:shadow-sm transition-all duration-200 border-l-4 border-l-transparent hover:border-l-blue-500"
      onClick={() => openCheckInModal(attendee)}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          
          {/* Info del asistente */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            
            {/* Punto de estado */}
            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getStatusDotColor(attendee.check_in_status)}`} />
            
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 truncate">
                {attendee.attendee_name}
              </h3>
              
              <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                <span className="truncate">{attendee.ticket_type_name}</span>
                
                {attendee.check_in_status === 'checked_in' && attendee.last_checkin && (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="w-3 h-3" />
                    <span className="text-xs">
                      {formatTime(attendee.last_checkin)}
                    </span>
                  </div>
                )}
                
                {attendee.check_in_status === 'partial' && (
                  <div className="flex items-center gap-1 text-yellow-600">
                    <Minus className="w-3 h-3" />
                    <span className="text-xs">
                      {attendee.used_days.length}/{attendee.authorized_days.length} días
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Acción */}
          <div className="flex items-center gap-2">
            {attendee.check_in_status === 'not_arrived' && (
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                Registrar
              </Button>
            )}
            
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>
          
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50">
        
        {/* Header */}
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
                onClick={loadAttendees}
                disabled={isLoading}
                className="flex items-center gap-2 flex-shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          
          <Tabs defaultValue="attendees" className="space-y-6">
            
            {/* Tabs Header */}
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="attendees">Asistentes</TabsTrigger>
              <TabsTrigger value="details">Detalles del Evento</TabsTrigger>
            </TabsList>

            {/* Tab: Asistentes */}
            <TabsContent value="attendees" className="space-y-6">
              
              {/* Stats Cards */}
              {!isLoading && stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-gray-900">{stats.total_tickets}</div>
                      <div className="text-sm text-gray-600">Total</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">{stats.checked_in_count}</div>
                      <div className="text-sm text-gray-600">Registrados</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-gray-600">{stats.not_arrived_count}</div>
                      <div className="text-sm text-gray-600">Pendientes</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">{stats.attendance_rate}%</div>
                      <div className="text-sm text-gray-600">Asistencia</div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Search and Filters */}
              {!isLoading && (
                <div className="space-y-4">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Buscar invitados..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Filter Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={statusFilter === 'all' ? 'default' : 'outline'}
                      onClick={() => setStatusFilter('all')}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Users className="w-4 h-4" />
                      Todos ({attendees.length})
                    </Button>
                    
                    <Button
                      variant={statusFilter === 'checked_in' ? 'default' : 'outline'}
                      onClick={() => setStatusFilter('checked_in')}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      Registrados ({stats?.checked_in_count || 0})
                    </Button>
                    
                    <Button
                      variant={statusFilter === 'not_arrived' ? 'default' : 'outline'}
                      onClick={() => setStatusFilter('not_arrived')}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Circle className="w-4 h-4 text-gray-400" />
                      Pendientes ({stats?.not_arrived_count || 0})
                    </Button>
                    
                    <Button
                      variant={statusFilter === 'partial' ? 'default' : 'outline'}
                      onClick={() => setStatusFilter('partial')}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Minus className="w-4 h-4 text-yellow-600" />
                      Parcial
                    </Button>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {isLoading && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                      <Skeleton key={i} className="h-20" />
                    ))}
                  </div>
                  <Skeleton className="h-10 w-full" />
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Skeleton key={i} className="h-16" />
                    ))}
                  </div>
                </div>
              )}

              {/* Error State */}
              {error && !isLoading && (
                <Alert className="bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-red-800">
                    <div className="flex items-start gap-2">
                      <div>
                        <p className="font-medium">Error cargando asistentes</p>
                        <p className="text-sm">{error}</p>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Empty Search Results */}
              {!isLoading && !error && filteredAttendees.length === 0 && attendees.length > 0 && (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No se encontraron resultados
                  </h3>
                  <p className="text-gray-600">
                    Intenta con otros términos de búsqueda o cambia los filtros.
                  </p>
                </div>
              )}

              {/* Attendees List - Grouped Alphabetically */}
              {!isLoading && !error && filteredAttendees.length > 0 && (
                <div className="space-y-6">
                  {Object.entries(groupAttendeesByLetter(filteredAttendees))
                    .sort(([a], [b]) => a.localeCompare(b, 'es'))
                    .map(([letter, letterAttendees]) => (
                      <div key={letter}>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3 px-2">
                          {letter}
                        </h3>
                        <div className="space-y-2">
                          {letterAttendees.map((attendee) => (
                            <AttendeeCard key={attendee.id} attendee={attendee} />
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* Empty State - No Attendees */}
              {!isLoading && !error && attendees.length === 0 && (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No hay asistentes registrados
                  </h3>
                  <p className="text-gray-600">
                    Este evento aún no tiene boletos vendidos.
                  </p>
                </div>
              )}

            </TabsContent>

            {/* Tab: Event Details */}
            <TabsContent value="details" className="space-y-6">
              {!isLoading && event && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Información del Evento
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Nombre</h4>
                        <p className="text-gray-600">{event.name}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Ubicación</h4>
                        <p className="text-gray-600">{event.location}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Fecha de inicio</h4>
                        <p className="text-gray-600">{formatDate(event.start_date)}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Fecha de fin</h4>
                        <p className="text-gray-600">{formatDate(event.end_date)}</p>
                      </div>
                    </div>

                    {event.description && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Descripción</h4>
                        <p className="text-gray-600">{event.description}</p>
                      </div>
                    )}

                  </CardContent>
                </Card>
              )}
            </TabsContent>

          </Tabs>

          {/* Quick Tip */}
          {!isLoading && !error && attendees.length > 0 && (
            <Alert className="bg-blue-50 border-blue-200">
              <Zap className="h-4 w-4" />
              <AlertDescription className="text-blue-800">
                <p className="font-medium mb-1">Check-in rápido</p>
                <p className="text-sm">
                  Toca cualquier asistente para realizar un check-in manual o ver más detalles.
                </p>
              </AlertDescription>
            </Alert>
          )}

        </div>
      </div>

      {/* Modal de Check-in Manual */}
      <ManualCheckInModal
        isOpen={isModalOpen}
        onClose={closeCheckInModal}
        attendee={selectedAttendee}
        eventId={eventId}
        eventName={event?.name || 'Evento'}
        onSuccess={handleCheckInSuccess}
      />

    </div>
  );
}
