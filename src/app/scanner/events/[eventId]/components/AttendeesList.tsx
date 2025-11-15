'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Search,
  Users,
  CheckCircle2,
  UserX,
  Minus,
  ChevronRight,
  Zap,
  Download,
  Settings,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ManualCheckInModal } from '@/components/scanner/ManualCheckInModal';
import { TicketCard } from '@/components/tickets/TicketCard';
import { getTodayInMexicoTimezone } from '@/lib/utils/date-utils';
import { useToast } from '@/hooks/use-toast';

// 🆕 Importar tipos del cache unificado
import { AttendeeTicket, EventStats } from '@/contexts/DataCacheContext';

interface AttendeesListProps {
  attendees: AttendeeTicket[];
  stats: EventStats | null;
  isLoading: boolean;
  onRefresh: () => void;
  onAttendeeUpdate?: (ticketId: string, updates: any) => void; // 🆕 Actualización optimista
  eventId: string;
  eventName: string;
}

export function AttendeesList({ 
  attendees, 
  stats, 
  isLoading, 
  //onRefresh,
  onAttendeeUpdate,
  eventId,
  eventName 
}: AttendeesListProps) {
  const { toast } = useToast();
  
  // Estados locales para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'checked_in' | 'not_arrived' | 'partial'>('all');
  
  // Estados para modal de check-in manual
  const [selectedAttendee, setSelectedAttendee] = useState<AttendeeTicket | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Estados para modal de configuración
  const [selectedTicketForConfig, setSelectedTicketForConfig] = useState<AttendeeTicket | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // 🆕 Determinar estado de check-in para el día actual
  const getTodayCheckInStatus = (attendee: AttendeeTicket): 'checked_in' | 'not_arrived' | 'partial' => {
    // 🎯 USAR LA MISMA FUNCIÓN QUE EL MODAL
    const today = getTodayInMexicoTimezone();
    
    // 🎯 Lógica específica por access_type (igual que QR y API manual)
    if (attendee.access_type === 'all_days') {
      // Para all_days: SOLO dos estados para HOY
      if (attendee.used_days.includes(today)) {
        return 'checked_in';  // Ya hizo check-in HOY
      }
      return 'not_arrived';   // No ha hecho check-in HOY (otros días no importan)
    }
    
    // Para specific_days y any_single_day: usar lógica original (verificar authorized_days)
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
    // 1. Iniciar con todos los asistentes (incluir todos los status)
    let filtered = attendees;

    // 2. Filtrar por término de búsqueda
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

    // 3. Filtrar por estado de check-in (usando estado del día actual)
    if (statusFilter !== 'all') {
      filtered = filtered.filter(attendee => {
        const todayStatus = getTodayCheckInStatus(attendee);
        return todayStatus === statusFilter;
      });
    }

    return filtered;
  }, [attendees, searchTerm, statusFilter]);

  // 🆕 Calcular estadísticas del día actual (todos los boletos)
  const todayStats = useMemo(() => {
    // Usar todos los asistentes
    const configuredAttendees = attendees;
    
    const todayCheckedIn = configuredAttendees.filter(attendee => {
      const status = getTodayCheckInStatus(attendee);
      return status === 'checked_in';
    }).length;
    
    const todayPending = configuredAttendees.filter(attendee => {
      const status = getTodayCheckInStatus(attendee);
      return status === 'not_arrived';
    }).length;
    
    const todayPartial = configuredAttendees.filter(attendee => {
      const status = getTodayCheckInStatus(attendee);
      return status === 'partial';
    }).length;
    
    return { 
      todayCheckedIn, 
      todayPending, 
      todayPartial,
      totalConfigured: configuredAttendees.length 
    };
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

  // 📥 Handler para descargar PDF del boleto
  const handleDownloadPDF = async (attendee: AttendeeTicket, e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar abrir modal
    
    try {
      // Si ya tiene URL, abrir directamente
      if (attendee.pdf_url) {
        window.open(attendee.pdf_url, '_blank');
        toast({
          title: "PDF abierto",
          description: "El boleto se abrió en una nueva pestaña",
        });
      } else {
        toast({
          variant: "destructive",
          title: "PDF no disponible",
          description: "Este boleto aún no tiene PDF generado",
        });
      }
    } catch (error) {
      console.error('Error abriendo PDF:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo abrir el PDF del boleto",
      });
    }
  };

  // ⚙️ Handler para abrir modal de configuración
  const handleConfigureTicket = (attendee: AttendeeTicket, e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar abrir modal de check-in
    setSelectedTicketForConfig(attendee);
    setIsConfigModalOpen(true);
  };

  const closeConfigModal = () => {
    setIsConfigModalOpen(false);
    setSelectedTicketForConfig(null);
  };

  // Componente de tarjeta de asistente
  const AttendeeCard = ({ attendee }: { attendee: AttendeeTicket }) => {
    // 🎯 Usar estado calculado para HOY (igual que modal)
    const todayStatus = getTodayCheckInStatus(attendee);
    
    return (
      <Card 
        className="cursor-pointer hover:shadow-sm transition-all duration-200 border-l-4 border-l-transparent hover:border-l-blue-500"
        onClick={() => openCheckInModal(attendee)}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            
            {/* Info del asistente */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Punto de estado - usar estado de hoy */}
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getStatusDotColor(todayStatus)}`} />
              
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate">
                  {attendee.attendee_name || attendee.customer_email || 'Sin asignar'}
                </h3>
                {/* Mostrar email del comprador siempre (para identificar) */}
                {attendee.customer_email && (
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {attendee.customer_email}
                  </p>
                )}
                
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                  <span className="truncate">{attendee.ticket_type_name}</span>
                  
                  {todayStatus === 'checked_in' && attendee.last_checkin && (
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="w-3 h-3" />
                      <span className="text-xs">
                        {formatTime(attendee.last_checkin)}
                      </span>
                    </div>
                  )}
                  
                  {todayStatus === 'partial' && (
                    <div className="flex items-center gap-1 text-yellow-600">
                      <Minus className="w-3 h-3" />
                      <span className="text-xs">
                        {attendee.access_type === 'all_days' 
                          ? `${attendee.used_days.length} días asistidos`
                          : `${attendee.used_days.length}/${attendee.authorized_days.length} días`
                        }
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Acción - usar estado de HOY */}
            <div className="flex items-center gap-2">
              {/* Botón de configuración - solo si NO está generado */}
              {(attendee.status === 'purchased' || attendee.status === 'configured') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => handleConfigureTicket(attendee, e)}
                  className="flex-shrink-0"
                  title="Configurar boleto"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              )}
              
              {/* Botón de descarga PDF - solo si está generado */}
              {attendee.status === 'generated' && attendee.pdf_url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => handleDownloadPDF(attendee, e)}
                  className="flex-shrink-0"
                  title="Descargar PDF"
                >
                  <Download className="w-4 h-4" />
                </Button>
              )}
              
              {todayStatus === 'not_arrived' && (
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
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-4 text-center">
                <Skeleton className="h-8 w-16 mx-auto mb-2" />
                <Skeleton className="h-4 w-20 mx-auto" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search and Filters Skeleton */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-full sm:w-48" />
        </div>

        {/* Attendees List Skeleton */}
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <Card key={i} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="w-4 h-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Loading indicator */}
        <div className="text-center py-4">
          <div className="inline-flex items-center gap-2 text-sm text-gray-500">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Actualizando lista de asistentes...</span>
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
            Todos ({todayStats.totalConfigured})
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
            <UserX className="w-4 h-4 text-red-600" />
            Hoy pendientes ({todayStats.todayPending})
          </Button>
          
          {/* Solo mostrar "Otros días" si hay boletos con estado partial */}
          {todayStats.todayPartial > 0 && (
            <Button
              variant={statusFilter === 'partial' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('partial')}
              size="sm"
              className="flex items-center gap-2"
            >
              <Minus className="w-4 h-4 text-yellow-600" />
              Otros días ({todayStats.todayPartial})
            </Button>
          )}
        </div>
      </div>

      {/* Results Info */}
      {searchTerm || statusFilter !== 'all' ? (
        <div className="text-sm text-gray-600">
          Mostrando {filteredAttendees.length} de {todayStats.totalConfigured} asistentes
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
        onTicketUpdated={onAttendeeUpdate}
      />

      {/* Modal de Configuración de Boleto */}
      <Dialog open={isConfigModalOpen} onOpenChange={setIsConfigModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configurar Boleto</DialogTitle>
          </DialogHeader>
          {selectedTicketForConfig && (
            <TicketCard
              ticket={{
                ...selectedTicketForConfig,
                ticket_type_name: selectedTicketForConfig.ticket_type_name,
                created_at: new Date(),
                purchase_date: new Date(),
                customer_phone: '',
                event_id: eventId,
                ticket_type_id: '',
                order_id: '',
                capture_id: '',
                qr_id: selectedTicketForConfig.qr_id || '',
                pdf_url: selectedTicketForConfig.pdf_url || undefined,
                authorized_days: selectedTicketForConfig.authorized_days.map(d => new Date(d)),
                used_days: selectedTicketForConfig.used_days.map(d => new Date(d)),
              }}
              onUpdate={async (ticketId, updates) => {
                // Actualización optimista local
                onAttendeeUpdate?.(ticketId, updates);
                closeConfigModal();
                toast({
                  title: "Boleto actualizado",
                  description: updates.status === 'generated' 
                    ? "El boleto ha sido configurado y el PDF se está generando"
                    : "Los datos del boleto han sido guardados",
                });
              }}
              autoEdit={true}
              canEdit={true}
            />
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
