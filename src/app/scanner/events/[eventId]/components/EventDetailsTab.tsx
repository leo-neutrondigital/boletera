'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Calendar,
  MapPin,
  Clock,
  Search,
  UserCheck,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ManualCheckInModal } from '@/components/scanner/ManualCheckInModal';

// 🆕 Importar tipos del cache unificado
import { AttendeeTicket, EventData, EventStats } from '@/contexts/DataCacheContext';

interface EventDetailsTabProps {
  event: EventData | null;
  attendees: AttendeeTicket[];
  stats: EventStats | null;
  isLoading: boolean;
  onRefresh: () => void;
  eventId: string;
}

export function EventDetailsTab({ 
  event, 
  attendees, 
  stats, 
  isLoading, 
  onRefresh,
  eventId 
}: EventDetailsTabProps) {
  
  // Estados para búsqueda manual
  const [manualSearchTerm, setManualSearchTerm] = useState('');
  const [manualStatusFilter, setManualStatusFilter] = useState<'all' | 'not_arrived' | 'checked_in'>('not_arrived');
  
  // Estados para modal de check-in
  const [selectedAttendee, setSelectedAttendee] = useState<AttendeeTicket | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filtrar asistentes para búsqueda manual
  const manualSearchResults = useMemo(() => {
    if (!manualSearchTerm.trim()) return [];

    let filtered = attendees;
    const term = manualSearchTerm.toLowerCase();

    // Filtrar por término de búsqueda
    filtered = filtered.filter(attendee => 
      attendee.attendee_name.toLowerCase().includes(term) ||
      attendee.attendee_email?.toLowerCase().includes(term) ||
      attendee.customer_name.toLowerCase().includes(term) ||
      attendee.customer_email.toLowerCase().includes(term) ||
      attendee.ticket_type_name.toLowerCase().includes(term)
    );

    // Filtrar por estado
    if (manualStatusFilter !== 'all') {
      filtered = filtered.filter(attendee => attendee.check_in_status === manualStatusFilter);
    }

    // Limitar resultados para performance
    return filtered.slice(0, 20);
  }, [attendees, manualSearchTerm, manualStatusFilter]);

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
    setManualSearchTerm(''); // Limpiar búsqueda después del check-in
  };

  // Funciones de estilo
  const getStatusColor = (status: AttendeeTicket['check_in_status']) => {
    switch (status) {
      case 'checked_in': return 'text-green-600 bg-green-50 border-green-200';
      case 'partial': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'not_arrived': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusText = (status: AttendeeTicket['check_in_status']) => {
    switch (status) {
      case 'checked_in': return 'Registrado';
      case 'partial': return 'Parcial';
      case 'not_arrived': return 'Pendiente';
      default: return 'Desconocido';
    }
  };
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return format(date, "d 'de' MMMM, yyyy", { locale: es });
    } catch {
      return 'Fecha inválida';
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return format(date, "HH:mm 'hrs'", { locale: es });
    } catch {
      return '';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-300 rounded mb-6"></div>
          <div className="h-4 bg-gray-300 rounded w-1/3 mb-4"></div>
          <div className="h-20 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* Event Information */}
      {event && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Información del Evento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Basic Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Nombre del Evento</h4>
                <p className="text-gray-700">{event.name}</p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Ubicación</h4>
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>{event.location}</span>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Fecha de Inicio</h4>
                <div className="flex items-center gap-2 text-gray-700">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>{formatDate(event.start_date)} - {formatTime(event.start_date)}</span>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Fecha de Fin</h4>
                <div className="flex items-center gap-2 text-gray-700">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>{formatDate(event.end_date)} - {formatTime(event.end_date)}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            {event.description && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Descripción</h4>
                <p className="text-gray-700 leading-relaxed">{event.description}</p>
              </div>
            )}

            {/* Stats Summary */}
            {stats && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Resumen de Asistencia</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{stats.total_tickets}</div>
                    <div className="text-xs text-gray-600">Boletos Totales</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{stats.checked_in_count}</div>
                    <div className="text-xs text-gray-600">Ya Registrados</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-600">{stats.not_arrived_count}</div>
                    <div className="text-xs text-gray-600">Por Llegar</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{stats.attendance_rate}%</div>
                    <div className="text-xs text-gray-600">% Asistencia</div>
                  </div>
                </div>
              </div>
            )}

          </CardContent>
        </Card>
      )}

      {/* Manual Check-in Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5" />
            Check-in Manual
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            Busca asistentes por nombre o email para realizar check-in sin escanear QR.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Search Controls */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre, email o tipo de boleto..."
                value={manualSearchTerm}
                onChange={(e) => setManualSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={manualStatusFilter} onValueChange={(value: any) => setManualStatusFilter(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="not_arrived">Pendientes</SelectItem>
                <SelectItem value="checked_in">Registrados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search Results */}
          {manualSearchTerm.trim() ? (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">
                Resultados de búsqueda ({manualSearchResults.length})
              </h4>

              {manualSearchResults.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {manualSearchResults.map((attendee) => (
                    <Card 
                      key={attendee.id}
                      className="cursor-pointer hover:shadow-sm transition-all duration-200 border-l-4 border-l-blue-500"
                      onClick={() => openCheckInModal(attendee)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">
                              {attendee.attendee_name}
                            </h4>
                            <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                              <span className="truncate">{attendee.ticket_type_name}</span>
                              {attendee.attendee_email && (
                                <span className="truncate">{attendee.attendee_email}</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 ml-4">
                            <Badge 
                              variant="outline" 
                              className={getStatusColor(attendee.check_in_status)}
                            >
                              {getStatusText(attendee.check_in_status)}
                            </Badge>
                            
                            {attendee.check_in_status === 'not_arrived' && (
                              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                                <UserCheck className="w-4 h-4 mr-1" />
                                Registrar
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Search className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No se encontraron asistentes con ese término.</p>
                  <p className="text-sm">Intenta con otro nombre o email.</p>
                </div>
              )}
            </div>
          ) : (
            <Alert className="bg-blue-50 border-blue-200">
              <Zap className="h-4 w-4" />
              <AlertDescription className="text-blue-800">
                <p className="font-medium mb-1">¿Cómo usar el check-in manual?</p>
                <ul className="text-sm space-y-1">
                  <li>• Escribe el nombre o email del asistente</li>
                  <li>• Selecciona al asistente de los resultados</li>
                  <li>• Confirma el check-in en el modal</li>
                  <li>• Útil cuando el QR no funciona o está dañado</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}

        </CardContent>
      </Card>

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
