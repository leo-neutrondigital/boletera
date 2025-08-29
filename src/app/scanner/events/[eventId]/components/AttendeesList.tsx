'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Search,
  Users,
  CheckCircle2,
  Circle,
  Minus,
  ChevronRight,
  Zap
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ManualCheckInModal } from '@/components/scanner/ManualCheckInModal';

// 🆕 Importar tipos del cache unificado
import { AttendeeTicket, EventStats } from '@/contexts/DataCacheContext';

interface AttendeesListProps {
  attendees: AttendeeTicket[];
  stats: EventStats | null;
  isLoading: boolean;
  onRefresh: () => void;
  eventId: string;
  eventName: string;
}

export function AttendeesList({ 
  attendees, 
  stats, 
  isLoading, 
  onRefresh,
  eventId,
  eventName 
}: AttendeesListProps) {
  // Estados locales para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'checked_in' | 'not_arrived' | 'partial'>('all');
  
  // Estados para modal de check-in manual
  const [selectedAttendee, setSelectedAttendee] = useState<AttendeeTicket | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 🆕 Determinar estado de check-in para el día actual
  const getTodayCheckInStatus = (attendee: AttendeeTicket): 'checked_in' | 'not_arrived' | 'partial' => {
    const today = new Date().toISOString().split('T')[0];
    
    // Si el día de hoy no está en los días autorizados, considerar como 'not_applicable'
    if (!attendee.authorized_days.includes(today)) {
      // Para efectos de filtrado, si no aplica hoy, mostrar estado general
      return attendee.check_in_status;
    }
    
    // Si ya usó el día de hoy
    if (attendee.used_days.includes(today)) {
      return 'checked_in';
    }
    
    // Si no ha usado el día de hoy pero sí otros días
    if (attendee.used_days.length > 0) {
      return 'partial';
    }
    
    // No ha llegado ninguno de sus días
    return 'not_arrived';
  };

  // Filtrar asistentes
  const filteredAttendees = useMemo(() => {
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

    // Filtrar por estado de check-in (usando estado del día actual)
    if (statusFilter !== 'all') {
      filtered = filtered.filter(attendee => {
        const todayStatus = getTodayCheckInStatus(attendee);
        return todayStatus === statusFilter;
      });
    }

    return filtered;
  }, [attendees, searchTerm, statusFilter]);

  // 🆕 Calcular estadísticas del día actual
  const todayStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    
    const todayCheckedIn = attendees.filter(attendee => {
      const status = getTodayCheckInStatus(attendee);
      return status === 'checked_in';
    }).length;
    
    const todayPending = attendees.filter(attendee => {
      const status = getTodayCheckInStatus(attendee);
      return status === 'not_arrived';
    }).length;
    
    return { todayCheckedIn, todayPending };
  }, [attendees]);

  // Agrupar asistentes alfabéticamente
  const groupedAttendees = useMemo(() => {
    const groups: { [key: string]: AttendeeTicket[] } = {};
    
    filteredAttendees.forEach(attendee => {
      const firstLetter = attendee.attendee_name.charAt(0).toUpperCase();
      const letter = /[A-ZÑ]/.test(firstLetter) ? firstLetter : '#';
      
      if (!groups[letter]) {
        groups[letter] = [];
      }
      groups[letter].push(attendee);
    });

    return groups;
  }, [filteredAttendees]);

  // Formatear hora
  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return format(date, "HH:mm", { locale: es });
    } catch {
      return '';
    }
  };

  // Obtener color del punto de estado
  const getStatusDotColor = (status: AttendeeTicket['check_in_status']) => {
    switch (status) {
      case 'checked_in': return 'bg-green-500';
      case 'partial': return 'bg-yellow-500';
      case 'not_arrived': 
      default: return 'bg-gray-400';
    }
  };

  // Handlers para modal
  const openCheckInModal = (attendee: AttendeeTicket) => {
    setSelectedAttendee(attendee);
    setIsModalOpen(true);
  };

  const closeCheckInModal = () => {
    setIsModalOpen(false);
    setSelectedAttendee(null);
  };

  const handleCheckInSuccess = () => {
    onRefresh();
  };

  // Componente de tarjeta de asistente
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Stats Cards */}
      {stats && (
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
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar asistentes por nombre, email o tipo de boleto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filter Buttons con indicador de día actual */}
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
            Hoy registrados ({todayStats.todayCheckedIn})
          </Button>
          
          <Button
            variant={statusFilter === 'not_arrived' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('not_arrived')}
            size="sm"
            className="flex items-center gap-2"
          >
            <Circle className="w-4 h-4 text-gray-400" />
            Hoy pendientes ({todayStats.todayPending})
          </Button>
          
          <Button
            variant={statusFilter === 'partial' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('partial')}
            size="sm"
            className="flex items-center gap-2"
          >
            <Minus className="w-4 h-4 text-yellow-600" />
            Otros días
          </Button>
        </div>
      </div>

      {/* Results Info */}
      {searchTerm || statusFilter !== 'all' ? (
        <div className="text-sm text-gray-600">
          Mostrando {filteredAttendees.length} de {attendees.length} asistentes
          {searchTerm && ` con "${searchTerm}"`}
        </div>
      ) : null}

      {/* Empty Search Results */}
      {filteredAttendees.length === 0 && attendees.length > 0 && (
        <div className="text-center py-8">
          <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No se encontraron resultados
          </h3>
          <p className="text-gray-600">
            Intenta con otros términos de búsqueda o cambia los filtros.
          </p>
          <Button 
            variant="outline" 
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
            }}
            className="mt-4"
          >
            Limpiar filtros
          </Button>
        </div>
      )}

      {/* Attendees List - Grouped Alphabetically */}
      {filteredAttendees.length > 0 && (
        <div className="space-y-6">
          {Object.entries(groupedAttendees)
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
      {attendees.length === 0 && (
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

      {/* Quick Tip */}
      {attendees.length > 0 && (
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

      {/* Modal de Check-in Manual */}
      <ManualCheckInModal
        isOpen={isModalOpen}
        onClose={closeCheckInModal}
        attendee={selectedAttendee}
        eventId={eventId}
        eventName={eventName}
        onSuccess={handleCheckInSuccess}
      />

    </div>
  );
}
