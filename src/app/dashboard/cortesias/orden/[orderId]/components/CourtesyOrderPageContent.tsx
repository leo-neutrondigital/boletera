'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useCourtesyOrder } from '@/hooks/use-courtesy-order'; // 🆕 SWR hook
import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Gift, Package, Users, CheckCircle, Clock, FileText, RefreshCw } from 'lucide-react';
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

export function CourtesyOrderPageContent({ 
  orderId,
  pageTitle = "Orden de cortesía",
  pageDescription = "Gestión de cortesías",
  breadcrumbTitle = "Cortesías",
  breadcrumbPath = "/dashboard/cortesias",
  orderType = "cortesia",
  eventId
}: CourtesyOrderPageContentProps) {
  const { user } = useAuth();
  
  // 🆕 Usar SWR hook con localStorage y actualización optimista
  const { 
    orderData, 
    tickets,
    event,
    stats,
    isLoading, 
    isValidating,
    error: swrError, 
    updateTicket,
    refresh 
  } = useCourtesyOrder(orderId, orderType);

  // 🔍 DEBUG: Ver datos recibidos
  useEffect(() => {
    if (tickets && tickets.length > 0) {
      console.log('🔍 [CourtesyOrderPage] Tickets recibidos:', tickets.map(t => ({
        id: t.id,
        attendee_name: t.attendee_name,
        attendee_email: t.attendee_email,
        pdf_url: t.pdf_url,
        pdf_path: t.pdf_path,
        status: t.status
      })));
    }
  }, [tickets]);

  // Determinar URLs de navegación
  const finalBackPath = eventId 
    ? `/dashboard/eventos/${eventId}/boletos-vendidos`
    : breadcrumbPath;
    
  const finalBackLabel = eventId 
    ? 'Volver a boletos vendidos'
    : `Volver a ${breadcrumbTitle.toLowerCase()}`;

  // Estados de carga
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
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

  if (swrError) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              {swrError.message || 'Error al cargar la orden'}
            </AlertDescription>
          </Alert>
          <Button asChild className="mt-4">
            <Link href="/dashboard/cortesias">Volver a cortesías</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!orderData || !tickets || !event || !stats) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header con navegación */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4"> {/* 🆕 Mismo ancho que cortesías */}
          <div className="flex items-center justify-between gap-4">
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
            
            {/* Botón de recarga */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refresh()}
              disabled={isValidating}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isValidating ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </Button>
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
                // ✨ Usar actualización optimista de SWR
                // 1. UI se actualiza inmediatamente
                // 2. Request al servidor en background (TicketCard lo hace)
                // 3. Revalida y obtiene datos reales después
                await updateTicket(ticketId, updates);
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
