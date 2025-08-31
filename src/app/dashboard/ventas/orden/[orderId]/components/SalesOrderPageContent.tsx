'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDataCache } from '@/contexts/DataCacheContext';
import { useSalesOrders } from '@/hooks/use-sales-orders';
import { auth } from '@/lib/firebase/client';
import Link from 'next/link';
import { ArrowLeft, ShoppingCart, Package, Users, CheckCircle, Clock, FileText, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Reutilizar componentes de tickets
import { TicketCard } from '@/components/tickets/TicketCard';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface SalesOrderPageContentProps {
  orderId: string;
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
    created_at: Date;
    customer_name: string;
    customer_email: string;
    payment_method?: string;
    payment_status?: string;
  };
}

export function SalesOrderPageContent({ orderId, eventId }: SalesOrderPageContentProps) {
  const { user, userData } = useAuth();
  const { invalidateCache } = useDataCache();
  const { invalidateSalesCache } = useSalesOrders(eventId); // Para invalidar cache de orders
  const [loading, setLoading] = useState(true);
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUpdatingTicket, setIsUpdatingTicket] = useState(false);

  // Determinar la URL de retorno basada en si tenemos eventId
  const backUrl = eventId 
    ? `/dashboard/eventos/${eventId}/boletos-vendidos`
    : '/dashboard/ventas';
  
  const backLabel = eventId 
    ? 'Volver a boletos vendidos'
    : 'Volver a ventas';

  // Cargar datos de la orden
  useEffect(() => {
    if (user && !isUpdatingTicket) {
      loadOrderData();
    }
  }, [user, orderId, isUpdatingTicket]);

  const loadOrderData = async () => {
    try {
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

      console.log(`🔍 Loading sales order from: /api/admin/sales-orders/${orderId}`);

      const response = await fetch(`/api/admin/sales-orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cargar la orden');
      }

      const data = await response.json();
      console.log('📦 Sales order data loaded:', data);

      setOrderData(data);
    } catch (error) {
      console.error('❌ Error loading sales order:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  // Manejar actualización de boletos
  const handleTicketUpdate = async () => {
    setIsUpdatingTicket(true);
    
    // Invalidar caches para asegurar datos frescos
    invalidateCache(); // Cache general
    invalidateSalesCache(); // Cache específico de sales orders
    
    await loadOrderData();
    setIsUpdatingTicket(false);
    
    console.log('🔄 Ticket updated and caches invalidated');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <Alert>
            <AlertDescription>
              Error: {error}
            </AlertDescription>
          </Alert>
          <Button asChild className="mt-4">
            <Link href={backUrl}>{backLabel}</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <Alert>
            <AlertDescription>
              Orden de venta no encontrada
            </AlertDescription>
          </Alert>
          <Button asChild className="mt-4">
            <Link href={backUrl}>{backLabel}</Link>
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
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href={backUrl} className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                {backLabel}
              </Link>
            </Button>
            <div className="h-6 border-l border-gray-300" />
            <div>
              <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
                Orden de Venta #{orderId.slice(-8).toUpperCase()}
              </h1>
              <p className="text-sm text-gray-600">
                {event.name} • {format(stats.created_at, "d 'de' MMMM, yyyy", { locale: es })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        
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

        {/* Información de venta */}
        <Card className="border-l-4 border-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              Información de venta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Cliente</p>
                <p className="font-medium">{stats.customer_name}</p>
              </div>
              <div>
                <p className="text-gray-600">Email</p>
                <p className="font-medium">{stats.customer_email}</p>
              </div>
              <div>
                <p className="text-gray-600">Método de pago</p>
                <p className="font-medium">{stats.payment_method || 'No especificado'}</p>
              </div>
              <div>
                <p className="text-gray-600">Total pagado</p>
                <p className="font-bold text-green-600">
                  ${stats.total_amount?.toLocaleString('es-CO') || '0'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumen de la orden */}
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
                <p className="text-gray-600">Fecha de compra</p>
                <p className="font-medium">{format(stats.created_at, "d MMM yyyy", { locale: es })}</p>
              </div>
              <div>
                <p className="text-gray-600">Estado de pago</p>
                <Badge className="bg-green-100 text-green-700">
                  {stats.payment_status || 'Pagado'}
                </Badge>
              </div>
              <div>
                <p className="text-gray-600">Tipo</p>
                <Badge className="bg-blue-100 text-blue-700">Venta</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de boletos */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Boletos comprados</h2>
            <Badge variant="outline">
              {tickets.length} boleto{tickets.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          {tickets.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">No hay boletos en esta orden</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <TicketCard 
                  key={ticket.id} 
                  ticket={ticket}
                  canEdit={true}
                  onUpdate={async (ticketId, updates) => {
                    // Aquí podrías hacer la actualización específica del ticket
                    // Por ahora solo recargamos la orden completa
                    await handleTicketUpdate();
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
