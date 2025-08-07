'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Ticket as TicketIcon,
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
  Plus,
  Search,
  ArrowRight,
  Settings,
  Receipt,
  Package
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils/currency';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ClientAuthGuard } from '@/components/auth/ClientAuthGuard';
import { authenticatedGet } from '@/lib/utils/api';
import type { UserTicketsResponse, EventGroup, OrderSummary } from '@/types';

function safeConvertDate(dateValue: any): Date {
  if (!dateValue) return new Date();
  if (dateValue instanceof Date) return dateValue;
  if (dateValue._seconds) return new Date(dateValue._seconds * 1000);
  return new Date(dateValue);
}

// Función para obtener el texto del botón según el estado de la orden
function getOrderButtonText(order: OrderSummary): string {
  const { configuredTickets, ticketCount } = order;
  
  if (configuredTickets === 0) return 'Configurar boletos';
  if (configuredTickets === ticketCount) return 'Ver boletos';
  return `Configurar (${ticketCount - configuredTickets} pendientes)`;
}

// Función para obtener la variante del botón según el estado
function getOrderButtonVariant(order: OrderSummary): "default" | "outline" | "secondary" {
  const { configuredTickets, ticketCount } = order;
  
  if (configuredTickets === 0) return 'default';  // Azul
  if (configuredTickets === ticketCount) return 'outline';  // Gris
  return 'secondary';  // Amarillo/naranja
}

function MyTicketsPageContent() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, userData, loading: authLoading, isAuthenticated } = useAuth();
  const [data, setData] = useState<UserTicketsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Cargar tickets del usuario
  useEffect(() => {
    async function loadUserTickets() {
      // ✨ Esperar a que la autenticación esté completamente cargada
      if (authLoading) {
        console.log('🔄 Auth still loading, waiting...');
        return;
      }
      
      // Si no hay usuario autenticado después de cargar
      if (!isAuthenticated || !user) {
        console.log('⚠️ No authenticated user found');
        setIsLoading(false);
        return;
      }

      try {
        console.log('🔍 Loading tickets for user:', user.email, user.uid);
        console.log('🛡️ User roles:', userData?.roles);
        setError(null);

        const response = await authenticatedGet(`/api/tickets/user/${user.uid}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Error loading user tickets');
        }

        console.log('✅ User tickets loaded:', result);

        // Procesar fechas de forma segura
        const processedData: UserTicketsResponse = {
          ...result,
          events: result.events.map((event: EventGroup) => ({
            ...event,
            event_start_date: safeConvertDate(event.event_start_date),
            event_end_date: safeConvertDate(event.event_end_date),
            orders: event.orders.map((order: OrderSummary) => ({
              ...order,
              createdAt: safeConvertDate(order.createdAt),
              tickets: order.tickets.map((ticket: any) => ({
                ...ticket,
                purchase_date: safeConvertDate(ticket.purchase_date),
                created_at: safeConvertDate(ticket.created_at),
                authorized_days: (ticket.authorized_days || []).map(safeConvertDate),
                used_days: (ticket.used_days || []).map(safeConvertDate),
              }))
            }))
          }))
        };

        setData(processedData);

      } catch (error) {
        console.error('❌ Error loading user tickets:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        setError(errorMessage);
        
        toast({
          variant: "destructive",
          title: "Error cargando boletos",
          description: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadUserTickets();
  }, [user, toast, authLoading, isAuthenticated]); // ✨ Agregar dependencias de auth

  // Loading state
  if (isLoading) {
    return (
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header skeleton */}
          <div className="mb-8">
            <Skeleton className="h-10 w-64 mb-4" />
            <Skeleton className="h-6 w-96" />
          </div>

          {/* Stats skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Events skeleton */}
          <div className="space-y-6">
            {[1, 2].map(i => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>

        </div>
      </div>
    );
  }

  // Estado vacío - sin tickets
  const hasNoTickets = !data || data.events.length === 0;
  const events = data?.events || [];
  const summary = data?.summary || {
    totalTickets: 0,
    totalEvents: 0,
    totalAmount: 0,
    totalOrders: 0,
    configuredTickets: 0,
    pendingTickets: 0,
    usedTickets: 0,
    currency: 'MXN'
  };

  if (hasNoTickets) {
    return (
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Mis boletos
            </h1>
            <p className="text-gray-600">
              Gestiona todos tus boletos de eventos en un solo lugar
            </p>
          </div>

          {/* Estado vacío */}
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <TicketIcon className="w-12 h-12 text-gray-400" />
            </div>
            
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              Aún no tienes boletos
            </h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Cuando compres boletos para eventos, aparecerán aquí y podrás gestionarlos fácilmente.
            </p>

            <div className="space-y-4">
              <Button
                onClick={() => router.push('/')}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Buscar eventos
              </Button>

              <div className="text-sm text-gray-500 space-y-2">
                <p>También puedes acceder a boletos específicos con el enlace que recibiste por email</p>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <h4 className="font-medium text-blue-900 mb-2">¿Tienes un enlace de boletos?</h4>
                  <p className="text-sm text-blue-700">
                    Si compraste boletos y recibiste un enlace por email como:
                    <br />
                    <code className="bg-blue-100 px-2 py-1 rounded mt-1 inline-block">
                      /my-tickets/ABC123...
                    </code>
                    <br />
                    Úsalo para acceder directamente a esos boletos específicos.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // Filtrar eventos
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.event_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.event_location.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' ||
                         (statusFilter === 'configured' && event.configuredTickets > 0) ||
                         (statusFilter === 'pending' && event.pendingTickets > 0);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Mis boletos
              </h1>
              <p className="text-gray-600">
                Gestiona todos tus boletos de eventos en un solo lugar
              </p>
            </div>
            
            <Button
              variant="outline"
              onClick={() => router.push('/')}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Buscar eventos
            </Button>
          </div>
        </div>

        {/* Estadísticas globales */}
        {events.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <TicketIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">{summary.totalTickets}</p>
                    <p className="text-sm text-gray-600">Total boletos</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-full">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">{summary.configuredTickets}</p>
                    <p className="text-sm text-gray-600">Configurados</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-full">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">{summary.pendingTickets}</p>
                    <p className="text-sm text-gray-600">Pendientes</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-full">
                    <Receipt className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(summary.totalAmount, summary.currency)}
                    </p>
                    <p className="text-sm text-gray-600">Total gastado</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Búsqueda y filtros */}
        {events.length > 0 && (
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar por evento o ubicación..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">Todos los estados</option>
              <option value="pending">Pendientes</option>
              <option value="configured">Configurados</option>
            </select>
          </div>
        )}

        {/* Lista de eventos con órdenes separadas */}
        <div className="space-y-8">
          {filteredEvents.map((event) => (
            <Card key={event.event_id} className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">{event.event_name}</CardTitle>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{format(event.event_start_date, "d 'de' MMMM, yyyy", { locale: es })}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{event.event_location}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">
                      {event.totalTickets}
                    </p>
                    <p className="text-sm text-gray-600">boletos</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {event.totalOrders} orden{event.totalOrders !== 1 ? 'es' : ''}
                    </p>
                  </div>
                </div>
                
                {/* Estadísticas rápidas del evento */}
                <div className="grid grid-cols-3 gap-4 mt-4 p-3 bg-white/70 rounded-lg">
                  <div className="text-center">
                    <p className="text-lg font-semibold text-green-600">
                      {event.configuredTickets}
                    </p>
                    <p className="text-xs text-gray-600">Configurados</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-yellow-600">
                      {event.pendingTickets}
                    </p>
                    <p className="text-xs text-gray-600">Pendientes</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-purple-600">
                      {formatCurrency(event.totalAmount, event.currency)}
                    </p>
                    <p className="text-xs text-gray-600">Total</p>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-6">
                <div className="space-y-4">
                  
                  {/* Órdenes separadas por evento */}
                  {event.orders.map((order) => (
                    <div key={order.id} className="border-l-4 border-blue-500 pl-4 py-3 bg-gray-50 rounded-r-lg">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Package className="w-4 h-4 text-gray-500" />
                            <p className="font-medium text-gray-900">
                              Orden #{order.id.slice(-8).toUpperCase()}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {format(order.createdAt, "d MMM yyyy", { locale: es })}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div>
                              <p className="text-gray-600">Boletos</p>
                              <p className="font-semibold">{order.ticketCount}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Configurados</p>
                              <p className="font-semibold text-green-600">{order.configuredTickets}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Pendientes</p>
                              <p className="font-semibold text-yellow-600">{order.pendingTickets}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Total</p>
                              <p className="font-semibold">{formatCurrency(order.totalAmount, order.currency)}</p>
                            </div>
                          </div>
                          
                          {/* Vista previa de boletos de esta orden */}
                          {order.tickets.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs text-gray-500 mb-2">Boletos en esta orden:</p>
                              <div className="flex flex-wrap gap-1">
                                {order.tickets.slice(0, 3).map((ticket) => (
                                  <Badge 
                                    key={ticket.id} 
                                    variant="outline" 
                                    className="text-xs"
                                  >
                                    {ticket.ticket_type_name}
                                    {ticket.attendee_name && (
                                      <span className="ml-1 text-gray-500">
                                        • {ticket.attendee_name.split(' ')[0]}
                                      </span>
                                    )}
                                  </Badge>
                                ))}
                                {order.tickets.length > 3 && (
                                  <Badge variant="outline" className="text-xs text-gray-500">
                                    +{order.tickets.length - 3} más
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="ml-4">
                          <Button
                            onClick={() => router.push(`/my-tickets/${order.id}`)}
                            variant={getOrderButtonVariant(order)}
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <Settings className="w-4 h-4" />
                            {getOrderButtonText(order)}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Acción para ver el evento */}
                  <div className="pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/events/${event.event_id}`)}
                      className="flex items-center gap-2 w-full sm:w-auto"
                    >
                      Ver página del evento
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Mensaje cuando no hay resultados */}
        {events.length > 0 && filteredEvents.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No se encontraron boletos que coincidan con tu búsqueda</p>
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

        {/* Información adicional */}
        {events.length > 0 && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-medium text-blue-900 mb-2">
              💡 Consejos para gestionar tus boletos
            </h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Configura todos tus boletos lo antes posible para recibirlos por email</li>
              <li>• Cada orden tiene su propio enlace que puedes compartir si es necesario</li>
              <li>• Los boletos configurados se generan automáticamente con códigos QR únicos</li>
              <li>• Guarda el ID de tu orden para soporte: las últimas 8 letras del enlace</li>
            </ul>
          </div>
        )}

      </div>
    </div>
  );
}

export default function MyTicketsPage() {
  return (
    <ClientAuthGuard requireAuth={true} allowedRoles={['usuario', 'admin', 'gestor']}>
      <MyTicketsPageContent />
    </ClientAuthGuard>
  );
}
