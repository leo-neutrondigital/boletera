import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCourtesyOrders, useEvents, useCachedTicketTypes } from '@/contexts/DataCacheContext';
import { auth } from '@/lib/firebase/client';
import { Gift } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageContent } from '@/components/shared/PageContent';
import { useToast } from '@/hooks/use-toast';

// Importar componentes
import { CourtesyStats } from './CourtesyStats';
import { CourtesyFilters } from './CourtesyFilters';
import { EventGroupCard } from '@/components/shared/EventGroupCard';
import { CourtesyEmptyState } from './CourtesyEmptyState';
import { CreateCourtesyDialog } from './CreateCourtesyDialog';
import { CourtesyGuide } from './CourtesyGuide';
import { CourtesyPageSkeleton } from '@/components/shared/CourtesySkeletons'; // 🆕 Skeletons mejorados
import { 
  groupCourtesyOrdersByUserAndEvent, 
  adaptCourtesyGroupToEventGroup
} from '@/components/shared/courtesyAdapters'; // 🆕 Adaptadores

// Importar tipos
import { 
  CourtesyStats as StatsType,
  COURTESY_TYPES
} from './types';

export function CourtesyPageContent() {
  const { userData } = useAuth();
  const { toast } = useToast();
  
  // 🆕 Usar hooks de cache en lugar de estado local
  const { 
    courtesyOrders, 
    loading: loadingOrders, 
    loadCourtesyOrders, 
    invalidate: invalidateOrders 
  } = useCourtesyOrders();
  
  const { 
    events: allEvents, 
    loading: loadingEvents, 
    loadEvents 
  } = useEvents();

  // 🆕 Filtrar eventos para mostrar solo eventos actuales/futuros
  const events = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Inicio del día de hoy
    
    return allEvents.filter(event => {
      const eventEndDate = new Date(event.end_date);
      eventEndDate.setHours(23, 59, 59, 999); // Final del día del evento
      
      // Mostrar eventos que terminen hoy o en el futuro
      return eventEndDate >= today;
    });
  }, [allEvents]);
  
  // Estado para evento seleccionado
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  
  // Hook de ticket types con auto-carga cuando cambie el evento
  const {
    ticketTypes: rawTicketTypes
  } = useCachedTicketTypes(selectedEventId || '');

  // Adaptar ticketTypes para asegurar que tengan 'currency'
  const ticketTypes = useMemo(() => {
    if (!selectedEventId) return [];
    return rawTicketTypes.map(tt => ({
      currency: 'MXN' as const,
      ...tt,
    }));
  }, [rawTicketTypes, selectedEventId]);
  
  // Estados para filtros y paginación
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourtesyType, setSelectedCourtesyType] = useState('all');
  const [creating, setCreating] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // 🆕 Loading general (solo si ambos están cargando)
  const loading = loadingOrders && loadingEvents;

  // Cargar datos iniciales usando cache
  useEffect(() => {
    console.log('[CourtesyPage] Initial load: loading courtesy orders and events');
    loadCourtesyOrders();
    loadEvents();
  }, [loadCourtesyOrders, loadEvents]);

  // Función para manejar cambio de evento
  const handleEventChange = (eventId: string) => {
    setSelectedEventId(eventId);
    // El hook useCachedTicketTypes se encarga de cargar automáticamente
  };

  // Crear cortesía (invalidar cache después)
  const createCourtesyTickets = async (formData: any) => {
    try {
      setCreating(true);
      
      // Lógica de creación (usando la API directamente)
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
        // Recarga inmediata y síncrona para ver cambios
        console.log('[CourtesyPage] Courtesy created, reloading data immediately');
        
        // Invalidar cache primero
        invalidateOrders();
        
        // Recarga inmediata
        await loadCourtesyOrders(true);
        
        console.log('[CourtesyPage] Data reloaded after courtesy creation');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear cortesías');
      }
    } catch (error) {
      console.error('Error creating courtesy tickets:', error);
      throw error;
    } finally {
      setCreating(false);
    }
  };

  // Estadísticas calculadas (adaptadas para órdenes)
  const stats: StatsType = {
    total: courtesyOrders.reduce((acc, order) => acc + order.total_tickets, 0),
    linked: courtesyOrders.reduce((acc, order) => acc + order.configured_tickets, 0),
    unlinked: courtesyOrders.reduce((acc, order) => acc + order.pending_tickets, 0),
    byType: courtesyOrders.reduce((acc, order) => {
      const type = order.courtesy_type || 'otro';
      acc[type] = (acc[type] || 0) + order.total_tickets;
      return acc;
    }, {} as Record<string, number>)
  };

  // Agrupar órdenes por usuario + evento usando adapter
  const eventGroups = useMemo(() => {
    console.log(`[CourtesyPage] Grouping ${courtesyOrders.length} courtesy orders`);
    const groups = groupCourtesyOrdersByUserAndEvent(courtesyOrders);
    console.log(`[CourtesyPage] Created ${groups.length} event groups`);
    return groups;
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
  
  // 🆕 Eliminar orden individual (invalidar cache después)
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
        
        // 🆕 Invalidar cache para que recargue
        invalidateOrders();
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
    <div className="h-full flex flex-col">
      {/* Header */}
      <PageHeader
        icon={Gift}
        title="Gestión de Cortesías"
        description="Crear y gestionar boletos de cortesía gratuitos"
        iconColor="green"
        badgeColor="green"
        actions={
          <CreateCourtesyDialog
            events={events}
            ticketTypes={ticketTypes}
            courtesyTypes={COURTESY_TYPES}
            onEventChange={handleEventChange} // 🆕 Usar nueva función
            onCreateCourtesy={createCourtesyTickets}
            isCreating={creating}
          />
        }
      />

      {/* Main Content */}
      <PageContent className="flex-1" padding="lg">
        
        {/* Stats */}
        <CourtesyStats stats={stats} />

        <CourtesyFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedType={selectedCourtesyType}
          onTypeChange={setSelectedCourtesyType}
          onRefresh={() => loadCourtesyOrders(true)} // 🆕 Forzar recarga
          isLoading={loading}
          courtesyTypes={COURTESY_TYPES}
          showAllEvents={showAllEvents}
          onToggleAllEvents={setShowAllEvents}
          totalResults={filteredGroups.length}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />

        {/* Content */}
        {loading ? (
          // 🆕 Loading State con skeletons mejorados
          <CourtesyPageSkeleton />
        ) : filteredGroups.length === 0 ? (
          // Empty State
          <CourtesyEmptyState
            hasData={courtesyOrders.length > 0}
            searchTerm={searchTerm}
            selectedType={selectedCourtesyType}
            onClearFilters={handleClearFilters}
          />
        ) : (
          // 🆕 Vista agrupada usando componente reutilizable
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Eventos con cortesías ({filteredGroups.length})
              </h2>
            </div>

            {paginatedGroups.map((group, index) => {
              const adaptedGroup = adaptCourtesyGroupToEventGroup(group);
              
              return (
                <EventGroupCard 
                  key={`${group.customerEmail}_${group.eventName}_${index}`}
                  event={adaptedGroup}
                  mode="admin"
                  onOrderAction={handleViewOrder}
                  onDeleteOrder={userData?.roles?.includes('admin') || userData?.roles?.includes('gestor') 
                    ? handleDeleteOrder
                    : undefined}
                  headerColor="green"
                  userInfo={{
                    name: group.customerName,
                    email: group.customerEmail
                  }}
                  showEventAction={false}
                />
              );
            })}
          </div>
        )}

        {/* Guide */}
        <CourtesyGuide courtesyTypes={COURTESY_TYPES} />

      </PageContent>
    </div>
  );
}
