'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDataCache } from '@/contexts/DataCacheContext'; // 🆕 Cache
import { auth } from '@/lib/firebase/client';
import Link from 'next/link';
import { ArrowLeft, Gift, Package, Users, CheckCircle, Clock, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

// 🆕 Reutilizar componentes de my-tickets
import { TicketCard } from '@/components/tickets/TicketCard';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CourtesyOrderPageContentProps {
  orderId: string;
  pageTitle?: string;
  pageDescription?: string;
  breadcrumbTitle?: string;
  breadcrumbPath?: string;
  orderType?: 'cortesia' | 'venta';
  eventId?: string;
}

interface OrderData {
  order_id: string;
  tickets: any[];
  event: any;
  ticket_types: any[];
  stats: {
    total_tickets: number;
    configured_tickets: number;
    pending_tickets: number;
    generated_tickets: number;
    total_amount: number;
    courtesy_type: string;
    created_at: Date;
    customer_name: string;
    customer_email: string;
  };
}

export function CourtesyOrderPageContent({ 
  orderId,
  pageTitle = "Orden de cortesía",
  pageDescription = "Gestión de cortesías",
  breadcrumbTitle = "Cortesías",
  breadcrumbPath = "/dashboard/cortesias",
  orderType = "cortesia",
  eventId
}: CourtesyOrderPageContentProps) {
  const { user, userData } = useAuth();
  const { invalidateCache } = useDataCache(); // 🆕 Para invalidar cache
  const [loading, setLoading] = useState(true);
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 🆕 Agregar estado para prevenir recargas innecesarias
  const [isUpdatingTicket, setIsUpdatingTicket] = useState(false);

  // Determinar URLs de navegación temprano para uso en casos de error
  const finalBackPath = eventId 
    ? `/dashboard/eventos/${eventId}/boletos-vendidos`
    : breadcrumbPath;
    
  const finalBackLabel = eventId 
    ? 'Volver a boletos vendidos'
    : `Volver a ${breadcrumbTitle.toLowerCase()}`;

  // Cargar datos de la orden
  useEffect(() => {
    if (user && !isUpdatingTicket) { // 🆕 No recargar si estamos actualizando
      loadOrderData();
    }
  }, [user, orderId, isUpdatingTicket]);

  const loadOrderData = async () => {
    try {
      // 🆕 Solo mostrar loading si no tenemos datos o no estamos actualizando
      if (!orderData && !isUpdatingTicket) {
        setLoading(true);
      }
      setError(null);

      const currentUser = auth.currentUser;
      if (!currentUser) {
        setError('Usuario no autenticado');
        return;
      }

      const token = await currentUser.getIdToken();

      // 🔄 Usar endpoint correcto según el tipo de orden
      const endpoint = orderType === 'venta' 
        ? `/api/admin/sales-orders/${orderId}`
        : `/api/admin/courtesy-orders/${orderId}`;

      console.log(`🔍 Loading ${orderType} order from:`, endpoint);

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOrderData(data);
        console.log(`✅ ${orderType} order loaded:`, data.order_id);
      } else {
        const errorData = await response.json();
        setError(errorData.error || `Error al cargar la orden de ${orderType}`);
      }
    } catch (error) {
      console.error(`❌ Error loading ${orderType} order:`, error);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  // Estados de carga
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6"> {/* 🆕 Mismo ancho que cortesías */}
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto"> {/* 🆕 Mismo ancho que cortesías */}
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
          <Button asChild className="mt-4">
            <Link href="/dashboard/cortesias">Volver a cortesías</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto"> {/* 🆕 Mismo ancho que cortesías */}
          <Alert>
            <AlertDescription>
              Orden no encontrada
            </AlertDescription>
          </Alert>
          <Button asChild className="mt-4">
            <Link href={finalBackPath}>{finalBackLabel}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { tickets, event, stats } = orderData;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header con navegación */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4"> {/* 🆕 Mismo ancho que cortesías */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href={finalBackPath} className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                {finalBackLabel}
              </Link>
            </Button>
            <div className="h-6 border-l border-gray-300" />
            <div>
              <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                {orderType === 'cortesia' ? (
                  <Gift className="w-5 h-5 text-green-600" />
                ) : (
                  <Package className="w-5 h-5 text-blue-600" />
                )}
                {pageTitle} #{orderId.slice(-8).toUpperCase()}
              </h1>
              <p className="text-sm text-gray-600">
                {event.name} • {format(stats.created_at, "d 'de' MMMM, yyyy", { locale: es })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto p-6 space-y-6"> {/* 🆕 Mismo ancho que cortesías */}
        
        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="text-center">
            <CardContent className="p-4">
              <Package className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold">{stats.total_tickets}</p>
              <p className="text-sm text-gray-600">Total boletos</p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="p-4">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold text-green-600">{stats.configured_tickets}</p>
              <p className="text-sm text-gray-600">Configurados</p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="p-4">
              <Clock className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
              <p className="text-2xl font-bold text-yellow-600">{stats.pending_tickets}</p>
              <p className="text-sm text-gray-600">Pendientes</p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="p-4">
              <FileText className="w-8 h-8 mx-auto mb-2 text-purple-600" />
              <p className="text-2xl font-bold text-purple-600">{stats.generated_tickets}</p>
              <p className="text-sm text-gray-600">PDFs generados</p>
            </CardContent>
          </Card>
        </div>

        {/* Info de cortesía */}
        <Card className="border-l-4 border-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-green-600" />
              Información de cortesía
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Tipo de cortesía</p>
                <Badge className="mt-1 bg-green-100 text-green-700 border-green-300">
                  {stats.courtesy_type}
                </Badge>
              </div>
              <div>
                <p className="text-gray-600">Solicitante</p>
                <p className="font-medium">{stats.customer_name}</p>
              </div>
              <div>
                <p className="text-gray-600">Email</p>
                <p className="font-medium">{stats.customer_email}</p>
              </div>
              <div>
                <p className="text-gray-600">Valor total</p>
                <p className="font-medium text-green-600">GRATIS</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 🆕 Información de la orden (simplificada) */}
        <Card>
          <CardHeader>
            <CardTitle>Resumen de la orden</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Orden</p>
                <p className="font-mono text-xs">#{orderId.slice(-8).toUpperCase()}</p>
              </div>
              <div>
                <p className="text-gray-600">Fecha</p>
                <p className="font-medium">{format(stats.created_at, "d MMM yyyy", { locale: es })}</p>
              </div>
              <div>
                <p className="text-gray-600">Total</p>
                <p className="font-medium text-green-600">GRATIS</p>
              </div>
              <div>
                <p className="text-gray-600">Estado</p>
                <Badge className="bg-green-100 text-green-700">Cortesía</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 🆕 Lista de boletos reutilizando TicketCard con UI optimista */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Boletos de cortesía</h2>
            <Badge variant="outline">
              {tickets.length} boleto{tickets.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          {tickets.map((ticket, index) => (
            <TicketCard 
              key={ticket.id}
              ticket={ticket}
              onUpdate={async (ticketId: string, updates: any) => {
                // 🆕 Prevenir recargas mientras actualizamos
                setIsUpdatingTicket(true);
                
                // 🆕 UI optimista: Actualizar estado local inmediatamente
                if (orderData) {
                  const updatedTickets = orderData.tickets.map(t => 
                    t.id === ticketId ? { ...t, ...updates } : t
                  );
                  
                  // Recalcular estadísticas
                  const newStats = {
                    ...orderData.stats,
                    configured_tickets: updatedTickets.filter(t => t.attendee_name && t.attendee_email).length,
                    pending_tickets: updatedTickets.filter(t => !t.attendee_name || !t.attendee_email).length,
                    generated_tickets: updatedTickets.filter(t => t.pdf_url && t.pdf_url !== 'generating...').length,
                  };
                  
                  // Actualizar estado local inmediatamente
                  setOrderData({
                    ...orderData,
                    tickets: updatedTickets,
                    stats: newStats
                  });
                }
                
                // 🆕 Invalidar cache para lista principal (sin esperar)
                invalidateCache(['courtesyOrders']);
                
                // 🆕 Permitir recargas nuevamente después de un momento
                setTimeout(() => {
                  setIsUpdatingTicket(false);
                }, 2000); // 2 segundos para que termine la operación
              }}
              canEdit={true} // Admin puede editar
              autoEdit={!ticket.attendee_name} // Auto-editar si no tiene nombre
            />
          ))}
        </div>

        {/* Información adicional para admin */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Información administrativa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Orden ID</p>
                <p className="font-mono text-xs">{orderId}</p>
              </div>
              <div>
                <p className="text-gray-600">Creado por</p>
                <p className="font-medium">Admin</p>
              </div>
              <div>
                <p className="text-gray-600">Fecha de creación</p>
                <p className="font-medium">
                  {format(stats.created_at, "d/MM/yyyy HH:mm", { locale: es })}
                </p>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Nota:</strong> Los boletos de cortesía funcionan igual que los boletos normales. 
                Configura los datos del asistente y genera los PDFs desde esta misma página.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
