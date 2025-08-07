'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Ticket as TicketIcon,
  Calendar,
  Mail,
  Phone,
  User,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Shield
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { TicketCard } from '@/components/tickets/TicketCard';
import { useToast } from '@/hooks/use-toast';
import { useOrderAccess } from '@/components/auth/ClientAuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import type { Ticket, TicketsOrderResponse } from '@/types';
import { formatCurrency } from '@/lib/utils/currency';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { authenticatedGet, authenticatedPut } from '@/lib/utils/api';

// Función para convertir fechas de Firestore de forma segura
function safeConvertFirestoreDate(dateValue: any): Date | null {
  if (!dateValue) return null;
  
  if (dateValue instanceof Date) {
    return isNaN(dateValue.getTime()) ? null : dateValue;
  }
  
  if (dateValue._seconds) {
    return new Date(dateValue._seconds * 1000);
  }
  
  try {
    const date = new Date(dateValue);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

function safeDateFormat(dateValue: any, formatStr: string = "d MMM yyyy"): string {
  const date = safeConvertFirestoreDate(dateValue);
  if (!date) return 'Fecha no disponible';
  
  try {
    return format(date, formatStr, { locale: es });
  } catch {
    return 'Fecha inválida';
  }
}

export default function MyTicketsOrderPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user, userData } = useAuth();
  const orderId = params.orderId as string;
  
  // 🆕 Hook para validar acceso a la orden
  const { canAccess, isChecking: isCheckingAccess } = useOrderAccess(orderId);
  
  const [data, setData] = useState<TicketsOrderResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Cargar tickets solo si tiene acceso
  useEffect(() => {
    async function loadTickets() {
      if (isCheckingAccess || canAccess === null) {
        return; // Esperar validación de acceso
      }

      if (!canAccess) {
        setIsLoading(false);
        return; // El componente de acceso denegado se mostrará
      }

      if (!orderId) {
        setError('ID de orden faltante');
        setIsLoading(false);
        return;
      }

      try {
        console.log('🔍 Loading tickets for order:', orderId);

        const response = await authenticatedGet(`/api/tickets/order/${orderId}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Error loading tickets');
        }

        console.log('✅ Tickets loaded:', result);

        // Procesar fechas de forma segura
        const processedData: TicketsOrderResponse = {
          ...result,
          tickets: result.tickets.map((ticket: any) => ({
            ...ticket,
            authorized_days: (ticket.authorized_days || []).map((day: any) => 
              safeConvertFirestoreDate(day)
            ).filter(Boolean),
            used_days: (ticket.used_days || []).map((day: any) => 
              safeConvertFirestoreDate(day)
            ).filter(Boolean),
            purchase_date: safeConvertFirestoreDate(ticket.purchase_date),
            created_at: safeConvertFirestoreDate(ticket.created_at),
            updated_at: safeConvertFirestoreDate(ticket.updated_at),
            event: ticket.event ? {
              ...ticket.event,
              start_date: safeConvertFirestoreDate(ticket.event.start_date),
              end_date: safeConvertFirestoreDate(ticket.event.end_date),
            } : undefined
          })),
          summary: {
            ...result.summary,
            events: result.summary.events.map((event: any) => ({
              ...event,
              start_date: safeConvertFirestoreDate(event.start_date),
              end_date: safeConvertFirestoreDate(event.end_date),
            }))
          }
        };

        setData(processedData);

      } catch (error) {
        console.error('❌ Error loading tickets:', error);
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

    loadTickets();
  }, [orderId, toast, canAccess, isCheckingAccess]);

  // Actualizar ticket
  const handleUpdateTicket = async (ticketId: string, updates: any) => {
    try {
      setIsUpdating(true);
      console.log('🔄 Updating ticket:', ticketId, updates);

      const response = await authenticatedPut(`/api/tickets/${ticketId}`, updates);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error updating ticket');
      }

      console.log('✅ Ticket updated:', result);

      // Actualizar el ticket en el estado local
      if (data) {
        const updatedTickets = data.tickets.map(ticket => {
          if (ticket.id === ticketId) {
            return {
              ...ticket,
              ...updates,
              status: result.ticket.status,
              updated_at: new Date()
            };
          }
          return ticket;
        });

        setData({
          ...data,
          tickets: updatedTickets,
          summary: {
            ...data.summary,
            configuredTickets: updatedTickets.filter(t => t.status === 'configured').length,
            pendingTickets: updatedTickets.filter(t => t.status === 'purchased').length,
          }
        });
      }

      toast({
        title: "¡Boleto actualizado!",
        description: "Los datos del asistente se guardaron correctamente.",
      });

    } catch (error) {
      console.error('❌ Error updating ticket:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      
      toast({
        variant: "destructive",
        title: "Error actualizando boleto",
        description: errorMessage,
      });
      
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  // Validando acceso
  if (isCheckingAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Validando acceso...
          </h2>
          <p className="text-gray-600">
            Verificando que puedas acceder a estos boletos
          </p>
        </div>
      </div>
    );
  }

  // Sin acceso a la orden
  if (canAccess === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <Shield className="h-5 w-5" />
                Acceso restringido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-red-50 border-red-200">
                <AlertDescription className="text-red-800">
                  No tienes permisos para ver estos boletos. Solo puedes acceder a boletos que hayas comprado.
                </AlertDescription>
              </Alert>

              <div className="text-sm text-gray-600">
                <p><strong>Order ID:</strong> {orderId}</p>
                <p><strong>Usuario:</strong> {user?.email}</p>
                <p>Si compraste estos boletos, verifica que estés usando la misma cuenta de email.</p>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/my-tickets')}
                  className="flex-1"
                >
                  Mis boletos
                </Button>
                <Button 
                  onClick={() => router.push('/')}
                  className="flex-1"
                >
                  Ir al inicio
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header skeleton */}
          <div className="mb-8">
            <Skeleton className="h-8 w-32 mb-4" />  {/* Botón volver */}
            <Skeleton className="h-10 w-64 mb-2" />  {/* Título */}
            <Skeleton className="h-5 w-96 mb-2" />   {/* Descripción */}
            <Skeleton className="h-4 w-48" />        {/* Order ID */}
          </div>

          {/* Layout de 2 columnas skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Columna izquierda skeleton (30%) */}
            <div className="lg:col-span-4">
              <div className="space-y-6">
                
                {/* Resumen card skeleton */}
                <Card>
                  <CardHeader>
                    <Skeleton className="h-6 w-40" />  {/* Título del resumen */}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    
                    {/* Estadísticas 2x2 skeleton */}
                    <div className="grid grid-cols-2 gap-3">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="p-3 bg-gray-50 rounded-lg">
                          <Skeleton className="h-6 w-8 mb-1 mx-auto" />  {/* Número */}
                          <Skeleton className="h-3 w-12 mx-auto" />      {/* Label */}
                        </div>
                      ))}
                    </div>

                    {/* Info comprador skeleton */}
                    <div className="bg-gray-50 rounded-lg p-3">
                      <Skeleton className="h-4 w-16 mb-2" />  {/* "Comprador" */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-3 w-3 rounded-full" />  {/* Icon */}
                          <Skeleton className="h-3 w-24" />              {/* Nombre */}
                        </div>
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-3 w-3 rounded-full" />  {/* Icon */}
                          <Skeleton className="h-3 w-32" />              {/* Email */}
                        </div>
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-3 w-3 rounded-full" />  {/* Icon */}
                          <Skeleton className="h-3 w-20" />              {/* Teléfono */}
                        </div>
                      </div>
                    </div>

                    {/* Evento skeleton */}
                    <div>
                      <Skeleton className="h-4 w-12 mb-2" />  {/* "Evento" */}
                      <Skeleton className="h-4 w-40 mb-1" />  {/* Nombre evento */}
                      <div className="flex items-center gap-1">
                        <Skeleton className="h-3 w-3 rounded-full" />  {/* Icon calendario */}
                        <Skeleton className="h-3 w-20" />              {/* Fecha */}
                      </div>
                    </div>
                    
                  </CardContent>
                </Card>

                {/* Progreso card skeleton */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Skeleton className="h-4 w-16" />  {/* "Progreso" */}
                      <Skeleton className="h-4 w-8" />   {/* "2/3" */}
                    </div>
                    <Skeleton className="h-2 w-full rounded-full mb-2" />  {/* Barra progreso */}
                    <Skeleton className="h-3 w-32" />  {/* Texto descriptivo */}
                  </CardContent>
                </Card>

              </div>
            </div>

            {/* Columna derecha skeleton (70%) */}
            <div className="lg:col-span-8">
              
              {/* Alert skeleton */}
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Skeleton className="h-4 w-4 rounded-sm" />  {/* Icon */}
                  <div className="flex-1">
                    <Skeleton className="h-4 w-40 mb-1" />  {/* Título alert */}
                    <Skeleton className="h-3 w-64" />       {/* Descripción */}
                  </div>
                </div>
              </div>

              {/* Header de boletos skeleton */}
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-6 w-32" />  {/* "Boletos (2)" */}
              </div>

              {/* Lista de boletos skeleton */}
              <div className="space-y-4">
                {[1, 2].map(i => (
                  <div key={i}>
                    {/* Badge del boleto skeleton */}
                    <div className="flex items-center gap-2 mb-2">
                      <Skeleton className="h-5 w-16 rounded-full" />  {/* "Boleto 1" */}
                      <Skeleton className="h-3 w-20" />               {/* ID */}
                      <Skeleton className="h-3 w-16" />               {/* Tipo */}
                    </div>
                    
                    {/* Ticket Card skeleton */}
                    <Card>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <Skeleton className="h-10 w-10 rounded-full" />  {/* Icon ticket */}
                            <div className="flex-1">
                              <Skeleton className="h-5 w-32 mb-2" />  {/* Tipo de boleto */}
                              <div className="flex items-center gap-2">
                                <Skeleton className="h-4 w-20 rounded-full" />  {/* Badge estado */}
                                <Skeleton className="h-4 w-16" />              {/* Precio */}
                              </div>
                            </div>
                          </div>
                          <Skeleton className="h-8 w-8 rounded" />  {/* Botón editar */}
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        {/* Días autorizados skeleton (opcional) */}
                        <div>
                          <Skeleton className="h-4 w-24 mb-2" />  {/* "Días de acceso" */}
                          <div className="flex flex-wrap gap-1">
                            <Skeleton className="h-5 w-12 rounded-full" />  {/* Badge día */}
                            <Skeleton className="h-5 w-12 rounded-full" />  {/* Badge día */}
                            <Skeleton className="h-5 w-12 rounded-full" />  {/* Badge día */}
                          </div>
                        </div>
                        
                        {/* Formulario skeleton */}
                        <div>
                          <Skeleton className="h-4 w-32 mb-3" />  {/* "Datos del asistente" */}
                          <div className="space-y-3">
                            <div>
                              <Skeleton className="h-3 w-24 mb-1" />  {/* Label */}
                              <Skeleton className="h-10 w-full" />     {/* Input */}
                            </div>
                            <div>
                              <Skeleton className="h-3 w-16 mb-1" />  {/* Label */}
                              <Skeleton className="h-10 w-full" />     {/* Input */}
                            </div>
                            <div className="flex gap-2">
                              <Skeleton className="h-8 w-20" />  {/* Botón guardar */}
                              <Skeleton className="h-8 w-20" />  {/* Botón cancelar */}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>

            </div>
          </div>

        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Error cargando boletos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-red-50 border-red-200">
                <AlertDescription className="text-red-800">
                  {error || 'No se pudieron cargar los boletos de esta orden.'}
                </AlertDescription>
              </Alert>

              <div className="text-sm text-gray-600">
                <p><strong>Order ID:</strong> {orderId}</p>
                <p>Verifica que el enlace sea correcto o que la orden exista.</p>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => window.location.reload()}
                  className="flex-1"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reintentar
                </Button>
                <Button 
                  onClick={() => router.push('/my-tickets')}
                  className="flex-1"
                >
                  Mis boletos
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { tickets, summary } = data;
  
  // Determinar si el usuario puede editar (admin o primera vez que configura)
  const isAdmin = userData?.roles?.includes('admin') || false;
  const hasUnconfiguredTickets = tickets.some(ticket => ticket.status === 'purchased' && !ticket.attendee_name);
  const canEdit = isAdmin || hasUnconfiguredTickets;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/my-tickets')}
            className="mb-4 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Mis boletos
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {hasUnconfiguredTickets ? 'Configurar boletos' : 'Mis boletos'}
          </h1>
          <p className="text-gray-600">
            {hasUnconfiguredTickets 
              ? 'Asigna los datos de cada asistente para generar los boletos finales'
              : 'Resumen de tu compra y boletos configurados'
            }
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Order ID: <code className="bg-gray-200 px-1 rounded">{orderId}</code>
          </p>
        </div>

        {/* Layout de 2 columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Columna izquierda: Resumen compacto (30%) */}
          <div className="lg:col-span-4">
            <div className="sticky top-8 space-y-6">
              
              {/* Resumen de la orden */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TicketIcon className="w-5 h-5" />
                    Resumen de compra
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  
                  {/* Estadísticas compactas */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-xl font-bold text-blue-600">{summary.totalTickets}</div>
                      <div className="text-xs text-gray-600">Boletos</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-xl font-bold text-green-600">{summary.configuredTickets}</div>
                      <div className="text-xs text-gray-600">Listos</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <div className="text-xl font-bold text-yellow-600">{summary.pendingTickets}</div>
                      <div className="text-xs text-gray-600">Pendientes</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-lg font-bold text-purple-600">
                        {formatCurrency(summary.totalAmount, summary.currency)}
                      </div>
                      <div className="text-xs text-gray-600">Total</div>
                    </div>
                  </div>

                  {/* Información del comprador */}
                  {tickets.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <h4 className="font-medium text-gray-900 mb-2 text-sm">Comprador</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="w-3 h-3 text-gray-500" />
                          <span className="truncate">{tickets[0].customer_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="w-3 h-3 text-gray-500" />
                          <span className="truncate">{tickets[0].customer_email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-3 h-3 text-gray-500" />
                          <span>{tickets[0].customer_phone}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Eventos */}
                  {summary.events.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2 text-sm">Evento</h4>
                      <div className="space-y-2">
                        {summary.events.map((event) => (
                          <div key={event.id} className="text-sm">
                            <div className="font-medium text-gray-900">{event.name}</div>
                            <div className="flex items-center gap-1 text-gray-500">
                              <Calendar className="w-3 h-3" />
                              <span>{safeDateFormat(event.start_date, "d MMM yyyy")}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                </CardContent>
              </Card>

              {/* Progreso */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">Progreso</span>
                    <span className="text-sm text-gray-500">
                      {summary.configuredTickets}/{summary.totalTickets}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                      style={{ 
                        width: `${summary.totalTickets > 0 ? (summary.configuredTickets / summary.totalTickets) * 100 : 0}%` 
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {summary.pendingTickets > 0 
                      ? `${summary.pendingTickets} boleto${summary.pendingTickets !== 1 ? 's' : ''} por configurar`
                      : 'Todos los boletos configurados'
                    }
                  </p>
                </CardContent>
              </Card>

            </div>
          </div>

          {/* Columna derecha: Configuración de boletos (70%) */}
          <div className="lg:col-span-8">
            
            {/* Estado general */}
            {summary.pendingTickets > 0 && (
              <Alert className="mb-6 bg-yellow-50 border-yellow-200">
                <Clock className="h-4 w-4" />
                <AlertDescription className="text-yellow-800">
                  <div className="flex items-start gap-2">
                    <div>
                      <p className="font-medium">Configuración pendiente</p>
                      <p className="text-sm">
                        Completa los datos de los asistentes para recibir los boletos por email.
                      </p>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {summary.pendingTickets === 0 && summary.configuredTickets > 0 && (
              <Alert className="mb-6 bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription className="text-green-800">
                  <div className="flex items-start gap-2">
                    <div>
                      <p className="font-medium">¡Todos los boletos configurados!</p>
                      <p className="text-sm">
                        Los boletos con códigos QR se enviarán a tu email.
                      </p>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Restricción de edición para usuarios no admin */}
            {!canEdit && (
              <Alert className="mb-6 bg-blue-50 border-blue-200">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-blue-800">
                  <div className="flex items-start gap-2">
                    <div>
                      <p className="font-medium">Boletos ya configurados</p>
                      <p className="text-sm">
                        Los datos de los asistentes ya han sido establecidos. Para cambios, contacta al organizador.
                      </p>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Lista de boletos */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Boletos ({tickets.length})
                </h2>
                
                {/* Indicador de actualización */}
                {isUpdating && (
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <div className="w-4 h-4 border border-blue-600 border-t-transparent rounded-full animate-spin" />
                    Guardando cambios...
                  </div>
                )}
              </div>

              {/* Tickets */}
              {tickets.map((ticket, index) => (
                <div key={ticket.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      Boleto {index + 1}
                    </Badge>
                    <span className="text-xs text-gray-500">ID: {ticket.id}</span>
                    <span className="text-xs text-gray-500">• {ticket.ticket_type_name}</span>
                  </div>
                  
                  <TicketCard
                    ticket={ticket}
                    onUpdate={handleUpdateTicket}
                    isLoading={isUpdating}
                    canEdit={canEdit}
                    autoEdit={hasUnconfiguredTickets && ticket.status === 'purchased' && !ticket.attendee_name}
                  />
                </div>
              ))}
            </div>

            {/* Próximos pasos - Solo si hay pendientes */}
            {summary.pendingTickets > 0 && (
              <div className="mt-8 bg-white rounded-lg border p-6">
                <h3 className="font-medium text-gray-900 mb-4">Próximos pasos</h3>
                
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-600 text-xs font-semibold">1</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Completa los datos</p>
                      <p>Asigna el nombre de cada asistente en los campos de arriba</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-600 text-xs font-semibold">2</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Recibe tus boletos</p>
                      <p>Los boletos con códigos QR se enviarán automáticamente a tu email</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-600 text-xs font-semibold">3</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Presenta en el evento</p>
                      <p>Muestra el código QR en tu teléfono o imprime el PDF</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Soporte */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            ¿Problemas con tus boletos?{' '}
            <a href="mailto:soporte@boletera.com" className="text-blue-600 hover:underline">
              Contáctanos
            </a>
            {' '}o guarda tu Order ID: <code className="bg-gray-200 px-1 rounded">{orderId}</code>
          </p>
        </div>

      </div>
    </div>
  );
}
