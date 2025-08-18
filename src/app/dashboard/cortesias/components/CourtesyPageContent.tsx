import { useState, useEffect, useMemo } from 'react'; // 🆕 Agregar useMemo
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase/client';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Gift, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast'; // 🆕 Para toast notifications

// Importar componentes
import { CourtesyStats } from './CourtesyStats';
import { CourtesyFilters } from './CourtesyFilters';
import { GroupedCourtesyCard } from './GroupedCourtesyCard'; // 🆕 Nuevo componente agrupado
import { CourtesyEmptyState } from './CourtesyEmptyState';
import { CreateCourtesyDialog } from './CreateCourtesyDialog';
import { CourtesyGuide } from './CourtesyGuide';

// Importar tipos
import { 
  CourtesyOrder, // 🆕 Nuevo tipo
  Event, 
  TicketType, 
  CourtesyStats as StatsType,
  COURTESY_TYPES
} from './types';

export function CourtesyPageContent() {
  const { user, userData } = useAuth();
  const { toast } = useToast(); // 🆕 Toast notifications
  const [loading, setLoading] = useState(false);
  const [courtesyOrders, setCourtesyOrders] = useState<CourtesyOrder[]>([]); // 🆕 Cambio a órdenes
  const [events, setEvents] = useState<Event[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourtesyType, setSelectedCourtesyType] = useState('all');
  const [creating, setCreating] = useState(false);
  
  // Estados para filtros y paginación
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Cargar datos iniciales
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([
      loadCourtesyOrders(), // 🆕 Cambio de nombre
      loadEvents()
    ]);
  };

  // 🆕 Cargar órdenes de cortesías agrupadas
  const loadCourtesyOrders = async () => {
    try {
      setLoading(true);
      
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      
      const token = await currentUser.getIdToken();
      
      const response = await fetch('/api/admin/courtesy-orders', {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCourtesyOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Error loading courtesy orders:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cargar eventos
  const loadEvents = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      
      const token = await currentUser.getIdToken();
      
      const response = await fetch('/api/admin/events', {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEvents(data.filter((event: Event) => event.published) || []);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  // Cargar tipos de boletos cuando se selecciona un evento
  const loadTicketTypes = async (eventId: string) => {
    try {
      // Limpiar tipos existentes
      setTicketTypes([]);
      
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      
      const token = await currentUser.getIdToken();
      
      const response = await fetch(`/api/admin/ticket-types?eventId=${eventId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const activeTypes = data.filter((type: TicketType) => type.is_active) || [];
        setTicketTypes(activeTypes);
      } else {
        console.error('Failed to load ticket types:', response.status);
      }
    } catch (error) {
      console.error('Error loading ticket types:', error);
    }
  };

  // Crear cortesía
  const createCourtesyTickets = async (formData: any) => {
    try {
      setCreating(true);
      
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      
      const token = await currentUser.getIdToken();
      
      const response = await fetch('/api/admin/courtesy-tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        // 🆕 Ya no mostramos alert aquí - el formulario maneja el toast
        await loadCourtesyOrders(); // 🆕 Cambio de nombre
      } else {
        const errorData = await response.json();
        // 🆕 Lanzar error para que el formulario lo maneje
        throw new Error(errorData.error || 'Error al crear cortesías');
      }
    } catch (error) {
      console.error('Error creating courtesy tickets:', error);
      // 🆕 Re-lanzar para que el formulario lo maneje
      throw error;
    } finally {
      setCreating(false);
    }
  };

  // Eliminar cortesía
  const deleteCourtesyTicket = async (ticketId: string) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      
      const token = await currentUser.getIdToken();
      
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (response.ok) {
        // 🆕 Recargar sin alert - usar toast en el lugar donde se llame
        await loadCourtesyOrders(); // 🆕 Cambio de nombre
        return true; // Indicar éxito
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar cortesía');
      }
    } catch (error) {
      console.error('Error deleting courtesy ticket:', error);
      throw error;
    }
  };

  // 🆕 Estadísticas calculadas (adaptadas para órdenes)
  const stats: StatsType = {
    total: courtesyOrders.reduce((acc, order) => acc + order.total_tickets, 0), // Total de boletos
    linked: courtesyOrders.reduce((acc, order) => acc + order.configured_tickets, 0), // Configurados
    unlinked: courtesyOrders.reduce((acc, order) => acc + order.pending_tickets, 0), // Pendientes
    byType: courtesyOrders.reduce((acc, order) => {
      const type = order.courtesy_type || 'otro';
      acc[type] = (acc[type] || 0) + order.total_tickets;
      return acc;
    }, {} as Record<string, number>)
  };

  // 🆕 Agrupar órdenes por usuario + evento (manteniendo órdenes separadas)
  const eventGroups = useMemo(() => {
    const groups: Record<string, {
      eventName: string;
      eventDate: Date;
      eventLocation: string;
      customerName: string;
      customerEmail: string;
      orders: CourtesyOrder[];
    }> = {};
    
    courtesyOrders.forEach(order => {
      const groupKey = `${order.customer_email}_${order.event_id}`;
      
      if (groups[groupKey]) {
        // Agregar orden al grupo existente
        groups[groupKey].orders.push(order);
      } else {
        // Crear nuevo grupo
        groups[groupKey] = {
          eventName: order.event_name,
          eventDate: order.event_start_date,
          eventLocation: order.event_location,
          customerName: order.customer_name,
          customerEmail: order.customer_email,
          orders: [order]
        };
      }
    });
    
    return Object.values(groups);
  }, [courtesyOrders]);

  // 🆕 Filtrar grupos con lógica de eventos futuros
  const filteredGroups = eventGroups.filter(group => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      group.eventName.toLowerCase().includes(searchLower) ||
      group.customerName.toLowerCase().includes(searchLower) ||
      group.customerEmail.toLowerCase().includes(searchLower) ||
      group.orders.some(order => order.courtesy_type.toLowerCase().includes(searchLower))
    );
    
    const matchesType = selectedCourtesyType === 'all' || 
      group.orders.some(order => order.courtesy_type === selectedCourtesyType);
    
    // Filtro por eventos futuros (si está habilitado)
    let matchesEventDate = true;
    if (!showAllEvents) {
      // 🆕 Usar la fecha de fin del evento para el filtro
      const eventEndDate = new Date(group.orders[0].event_end_date); // Usar end_date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Mostrar eventos que terminen hoy o en el futuro
      matchesEventDate = eventEndDate >= today;
    }
    
    return matchesSearch && matchesType && matchesEventDate;
  });

  // Paginación
  const totalPages = Math.ceil(filteredGroups.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedGroups = filteredGroups.slice(startIndex, endIndex);
  
  // Reset página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCourtesyType, showAllEvents]);

  // Handlers
  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCourtesyType('all');
    setShowAllEvents(false);
  };
  
  // 🆕 Navegación a orden individual
  const handleViewOrder = (orderId: string) => {
    window.location.href = `/dashboard/cortesias/orden/${orderId}`;
  };
  
  // 🆕 Eliminar orden individual
  const handleDeleteOrder = async (orderId: string): Promise<void> => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Usuario no autenticado');
      
      const token = await currentUser.getIdToken();
      
      const response = await fetch(`/api/admin/courtesy-orders/${orderId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // 🆕 Toast de éxito
        toast({
          title: "Orden eliminada exitosamente",
          description: `Se eliminaron ${data.deleted_tickets} boleto${data.deleted_tickets > 1 ? 's' : ''} de cortesía`,
        });
        
        // Recargar órdenes
        await loadCourtesyOrders();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar orden');
      }
    } catch (error) {
      console.error('Error deleting courtesy order:', error);
      
      // 🆕 Toast de error
      toast({
        variant: "destructive",
        title: "Error al eliminar orden",
        description: error instanceof Error ? error.message : "Ocurrió un error inesperado",
      });
      
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-green-600 p-2 rounded-lg">
                <Gift className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Gestión de Cortesías
                </h1>
                <p className="text-sm text-gray-500">
                  Crear y gestionar boletos de cortesía gratuitos
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                <ShieldAlert className="w-3 h-3 mr-1" />
                {userData?.roles?.includes('admin') ? 'Administrador' : 'Gestor'}
              </Badge>
              
              <CreateCourtesyDialog
                events={events}
                ticketTypes={ticketTypes}
                courtesyTypes={COURTESY_TYPES}
                onEventChange={loadTicketTypes}
                onCreateCourtesy={createCourtesyTickets}
                isCreating={creating}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Stats */}
        <CourtesyStats stats={stats} />

        <CourtesyFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedType={selectedCourtesyType}
          onTypeChange={setSelectedCourtesyType}
          onRefresh={loadCourtesyOrders} // 🆕 Cambio de nombre
          isLoading={loading}
          courtesyTypes={COURTESY_TYPES}
          showAllEvents={showAllEvents}
          onToggleAllEvents={setShowAllEvents}
          totalResults={filteredGroups.length} // 🆕 Cambio a grupos
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />

        {/* Content */}
        {loading ? (
          // Loading State
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded" />
                    <div>
                      <Skeleton className="h-5 w-32 mb-1" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredGroups.length === 0 ? (
          // Empty State
          <CourtesyEmptyState
            hasData={courtesyOrders.length > 0}
            searchTerm={searchTerm}
            selectedType={selectedCourtesyType}
            onClearFilters={handleClearFilters}
          />
        ) : (
          // 🆕 Vista agrupada de eventos
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Eventos con cortesías ({filteredGroups.length})
              </h2>
            </div>

            {paginatedGroups.map((group, index) => (
              <GroupedCourtesyCard 
                key={`${group.customerEmail}_${group.eventName}_${index}`}
                eventName={group.eventName}
                eventDate={group.eventDate}
                eventLocation={group.eventLocation}
                customerName={group.customerName}
                customerEmail={group.customerEmail}
                orders={group.orders}
                onViewOrder={handleViewOrder}
                onDeleteOrder={userData?.roles?.includes('admin') || userData?.roles?.includes('gestor') 
                  ? handleDeleteOrder
                  : undefined}
              />
            ))}
          </div>
        )}

        {/* Guide */}
        <CourtesyGuide courtesyTypes={COURTESY_TYPES} />

      </div>
    </div>
  );
}
