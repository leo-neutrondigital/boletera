"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSalesOrders } from "@/hooks/use-sales-orders"; // 🆕 Hook SWR ventas
import { useCourtesyOrders } from "@/hooks/use-courtesy-orders"; // 🆕 Hook SWR cortesías
import { useOfflineSalesOrders } from "@/hooks/use-offline-sales-orders"; // 🆕 Hook SWR offline
import { authenticatedGet } from "@/lib/utils/api"; // Para CSV con llamada directa
import {
  Search,
  Plus,
  Gift,
  AlertCircle,
  ArrowRight,
  Banknote
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Can } from "@/components/auth/Can";
import { OrderCard } from "@/components/shared/OrderCard";
import { PaginationControls } from "@/components/shared/PaginationControls";
import { useSalesPage } from "@/contexts/SalesPageContext";
import { OfflineSalesTab } from "./components/tabs/OfflineSalesTab";
import { CreateOfflineSaleDialog } from "./components/offline/CreateOfflineSaleDialog";
import type { Event } from "@/types";

interface EventSalesPageClientProps {
  event: Event;
}

export function EventSalesPageClient({ event }: EventSalesPageClientProps) {
  const { toast } = useToast();
  const { setSalesActions } = useSalesPage();
  
  // 🆕 Hooks SWR: Cache automático, funciones memoizadas estables
  const { 
    salesOrders, 
    loading: salesLoading,
    stats: salesStats,
    refreshSalesOrders 
  } = useSalesOrders(event.id);
  
  const { 
    courtesyOrders, 
    loading: courtesyLoading,
    stats: courtesyStats,
    refreshCourtesyOrders
  } = useCourtesyOrders(event.id);
  
  const {
    offlineSales,
    loading: offlineLoading,
    stats: offlineStats,
    refreshOfflineSales
  } = useOfflineSalesOrders(event.id);
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"sales" | "courtesies" | "offline">("sales");
  const [showOfflineDialog, setShowOfflineDialog] = useState(false);  // 📄 Estados de paginación - definir ANTES de usarlos
  const [salesPage, setSalesPage] = useState(1);
  const [salesLimit, setSalesLimit] = useState(10);
  const [offlinePage, setOfflinePage] = useState(1);
  const [offlineLimit, setOfflineLimit] = useState(10);
  
  // Calcular paginación localmente
  const salesTotalPages = Math.ceil((salesOrders?.length || 0) / salesLimit);
  const salesTotalItems = salesOrders?.length || 0;

  // 🆕 SWR carga automáticamente al montar - no necesita useEffect manual
  // El caché persiste entre navegaciones de tabs

  // Estado de carga combinado
  const isLoading = salesLoading || courtesyLoading;
  const handleViewOrder = (orderId: string, type: 'sales' | 'courtesies') => {
    // 👥 Usar vista administrativa apropiada para cada tipo
    if (type === 'sales') {
      // Nueva vista administrativa para ventas con eventId para navegación correcta
      window.location.href = `/dashboard/ventas/orden/${orderId}?eventId=${event.id}`;
    } else {
      window.location.href = `/dashboard/cortesias/orden/${orderId}?eventId=${event.id}`;
    }
  };

  // 📄 Handlers de paginación
  const handleSalesPageChange = (page: number) => {
    console.log('📄 Changing to page:', page, '(no query - paginating in memory)');
    setSalesPage(page);
    // NO llamar loadSalesOrders - solo cambiar estado para paginar en memoria
  };

  const handleSalesLimitChange = (limit: number) => {
    console.log('📄 Changing limit to:', limit, '(no query - paginating in memory)');
    setSalesPage(1); // Reset a página 1
    setSalesLimit(limit);
    // NO llamar loadSalesOrders - solo cambiar estado para paginar en memoria
  };

  // 🎁 Cortesías: paginación removida (se muestran todas)

  const handleOfflinePageChange = (page: number) => {
    setOfflinePage(page);
  };

  const handleOfflineLimitChange = (limit: number) => {
    setOfflinePage(1);
    setOfflineLimit(limit);
  };

  // 🔄 Handler unificado para refrescar según el tab activo
  const handleRefresh = useCallback(() => {
    switch (activeTab) {
      case 'sales':
        refreshSalesOrders();
        break;
      case 'courtesies':
        refreshCourtesyOrders();
        break;
      case 'offline':
        refreshOfflineSales();
        break;
    }
  }, [activeTab, refreshSalesOrders, refreshCourtesyOrders, refreshOfflineSales]);

  // 📊 Exportar datos a CSV
  const handleExportCSV = useCallback(async () => {
    try {
      setIsRefreshing(true);
      
      console.log('📥 Descargando TODOS los boletos vendidos del evento...');
      
      // 🔄 Llamada directa a la API para obtener TODOS los datos
      const response = await authenticatedGet(`/api/admin/events/${event.id}/sales?salesLimit=1000&courtesyLimit=1000`);
      const result = await response.json();
      
      console.log('✅ Datos obtenidos:', result);
      
      if (!response.ok) {
        throw new Error(result.error || 'Error cargando datos de ventas');
      }
      
      // Preparar CSV con todos los boletos individuales
      const csvData = [];
      
      // Headers para boletos individuales  
      csvData.push([
        'Tipo',
        'ID Boleto', 
        'ID Orden',
        'Cliente',
        'Email',
        'Nombre Asistente',
        'Tipo de Boleto',
        'Estado',
        'Monto Unitario',
        'Moneda',
        'Fecha Compra',
        'Fecha Uso',
        'Tipo Cortesía'
      ]);
      
      // 🎫 Procesar ventas - cada boleto en una fila
      if (result.sales?.orders) {
        console.log(`🎫 Procesando ${result.sales.orders.length} órdenes de venta...`);
        
        result.sales.orders.forEach((order: any) => {
          if (order.tickets?.length > 0) {
            // Usar tickets individuales si existen
            order.tickets.forEach((ticket: any) => {
              csvData.push([
                'Venta',
                ticket.id || `${order.id}-${Math.random().toString(36).substr(2, 9)}`,
                order.id,
                order.customer_name,
                order.customer_email,
                ticket.attendee_name || order.customer_name,
                ticket.ticket_type_name || 'Boleto',
                ticket.status || 'purchased',
                (order.total_amount / order.total_tickets).toFixed(2),
                order.currency || 'MXN',
                new Date(order.created_at).toLocaleDateString(),
                ticket.used_at ? new Date(ticket.used_at).toLocaleDateString() : '',
                ''
              ]);
            });
          } else {
            // Crear filas individuales basadas en total_tickets
            for (let i = 0; i < (order.total_tickets || 1); i++) {
              csvData.push([
                'Venta',
                `${order.id}-${i + 1}`,
                order.id,
                order.customer_name,
                order.customer_email,
                order.customer_name,
                'Boleto',
                'purchased',
                (order.total_amount / (order.total_tickets || 1)).toFixed(2),
                order.currency || 'MXN',
                new Date(order.created_at).toLocaleDateString(),
                '',
                ''
              ]);
            }
          }
        });
      }
      
      // 🎁 Procesar cortesías
      if (result.courtesies?.orders) {
        console.log(`🎁 Procesando ${result.courtesies.orders.length} cortesías...`);
        
        result.courtesies.orders.forEach((courtesy: any) => {
          if (courtesy.tickets?.length > 0) {
            // Usar tickets individuales si existen
            courtesy.tickets.forEach((ticket: any) => {
              csvData.push([
                'Cortesía',
                ticket.id || `${courtesy.id}-${Math.random().toString(36).substr(2, 9)}`,
                courtesy.id,
                courtesy.customer_name,
                courtesy.customer_email,
                ticket.attendee_name || courtesy.customer_name,
                ticket.ticket_type_name || 'Cortesía',
                ticket.status || 'generated',
                '0.00',
                'MXN',
                new Date(courtesy.created_at).toLocaleDateString(),
                ticket.used_at ? new Date(ticket.used_at).toLocaleDateString() : '',
                courtesy.courtesy_type || 'General'
              ]);
            });
          } else {
            // Crear filas individuales basadas en total_tickets
            for (let i = 0; i < (courtesy.total_tickets || 1); i++) {
              csvData.push([
                'Cortesía',
                `${courtesy.id}-${i + 1}`,
                courtesy.id,
                courtesy.customer_name,
                courtesy.customer_email,
                courtesy.customer_name,
                'Cortesía',
                'generated',
                '0.00',
                'MXN',
                new Date(courtesy.created_at).toLocaleDateString(),
                '',
                courtesy.courtesy_type || 'General'
              ]);
            }
          }
        });
      }
      
      console.log(`📋 Total boletos exportados: ${csvData.length - 1}`);
      
      if (csvData.length <= 1) {
        toast({
          variant: "destructive",
          title: "Sin datos",
          description: "No hay boletos para exportar en este evento",
        });
        return;
      }
      
      // Convertir a CSV y descargar
      const csvContent = csvData.map(row => 
        row.map(field => `"${field}"`).join(',')
      ).join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `boletos-vendidos-${event.name}-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      toast({
        title: "✅ Exportación completada",
        description: `Se han exportado ${csvData.length - 1} boletos al archivo CSV`,
      });
      
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast({
        variant: "destructive",
        title: "Error en exportación",
        description: error instanceof Error ? error.message : "Error desconocido",
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [event.id, event.name, toast]);

  // Configurar acciones para el header (DESPUÉS de handleExportCSV)
  useEffect(() => {
    setSalesActions({
      onRefresh: handleRefresh,
      onExport: handleExportCSV,
      isRefreshing
    });
    return () => setSalesActions(null);
  }, [handleRefresh, handleExportCSV, isRefreshing, setSalesActions]);

  // Filtrar y paginar órdenes en memoria
  const filteredSalesOrders = useMemo(() => {
    // 1. Filtrar por búsqueda si hay
    let filtered = salesOrders || [];
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        order.customer_name.toLowerCase().includes(searchLower) ||
        order.customer_email.toLowerCase().includes(searchLower) ||
        order.id.toLowerCase().includes(searchLower)
      );
    }
    
    // 2. Paginar en memoria (slice)
    const startIndex = (salesPage - 1) * salesLimit;
    const endIndex = startIndex + salesLimit;
    return filtered.slice(startIndex, endIndex);
  }, [salesOrders, searchTerm, salesPage, salesLimit]);

  // 🎁 Mostrar TODAS las cortesías (ya vienen completas de Firestore, no paginar)
  const filteredCourtesyOrders = useMemo(() => {
    // Usar courtesyOrders directamente (tiene TODAS las 243 cortesías)
    const allCourtesies = courtesyOrders.map(courtesy => ({
      id: courtesy.id,
      customer_name: courtesy.customer_name,
      customer_email: courtesy.customer_email,
      total_tickets: courtesy.total_tickets,
      configured_tickets: courtesy.configured_tickets,
      pending_tickets: courtesy.pending_tickets,
      courtesy_type: courtesy.courtesy_type,
      created_at: courtesy.created_at,
      tickets: courtesy.tickets
    }));
    
    if (!searchTerm) return allCourtesies;
    
    const searchLower = searchTerm.toLowerCase();
    return allCourtesies.filter(order => 
      order.customer_name.toLowerCase().includes(searchLower) ||
      order.customer_email.toLowerCase().includes(searchLower) ||
      order.courtesy_type.toLowerCase().includes(searchLower)
    );
  }, [courtesyOrders, searchTerm]);

  const filteredOfflineSales = useMemo(() => {
    if (!offlineSales || !searchTerm) return offlineSales;
    
    const searchLower = searchTerm.toLowerCase();
    return offlineSales.filter(order => 
      order.customer_name.toLowerCase().includes(searchLower) ||
      order.customer_email.toLowerCase().includes(searchLower) ||
      (order.payment_reference && order.payment_reference.toLowerCase().includes(searchLower))
    );
  }, [offlineSales, searchTerm]);

  // Estados de carga
  if (isLoading || offlineLoading) {
    return (
      <>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4, 5].map(i => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="space-y-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* 🔒 STATS CARDS OCULTADOS - Requieren múltiples queries al cargar página
          Descomentar solo si se implementa query agregada separada y ligera */}
      {/* <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-full">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency((data.sales.stats?.total_revenue || 0) + (offlineStats?.total_revenue || 0), 'MXN')}
                  </p>
                  <p className="text-sm text-gray-600">Ingresos totales</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-full">
                  <TicketIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">
                    {(data.sales.stats?.total_tickets || 0) + (offlineStats?.total_tickets || 0)}
                  </p>
                  <p className="text-sm text-gray-600">Boletos vendidos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-full">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(data.sales.stats?.avg_order_value || 0, 'MXN')}
                  </p>
                  <p className="text-sm text-gray-600">Orden promedio</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-full">
                  <Gift className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">
                    {courtesyStatsSummary.total_courtesy_tickets}
                  </p>
                  <p className="text-sm text-gray-600">Cortesías</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-full">
                  <Banknote className="w-6 h-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(offlineStats?.total_revenue || 0, 'MXN')}
                  </p>
                  <p className="text-sm text-gray-600">Offline</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div> */}

      {/* 🔒 ESTADO DE VENTAS Y CORTESÍAS OCULTADO - Requiere queries adicionales
          Descomentar si se necesita visibilidad de stats por pestaña */}
      {/* <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Estado de Ventas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-xl font-bold text-green-600">
                  {salesStats?.configured_tickets || 0}
                </p>
                <p className="text-xs text-gray-600">Configurados</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-yellow-600">
                  {salesStats?.pending_tickets || 0}
                </p>
                <p className="text-xs text-gray-600">Pendientes</p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total de órdenes:</span>
                <Badge variant="outline">{salesStats?.total_orders || 0}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5" />
              Estado de Cortesías
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-xl font-bold text-green-600">
                  {courtesyStatsSummary.configured_courtesy}
                </p>
                <p className="text-xs text-gray-600">Configuradas</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-yellow-600">
                  {courtesyStatsSummary.pending_courtesy}
                </p>
                <p className="text-xs text-gray-600">Pendientes</p>
              </div>
            </div>

            {Object.keys(courtesyStatsSummary.by_courtesy_type).length > 0 && (
              <div className="pt-4 border-t">
                <p className="text-sm font-medium text-gray-700 mb-2">Por tipo:</p>
                <div className="space-y-1">
                  {Object.entries(courtesyStatsSummary.by_courtesy_type).map(([type, count]) => (
                    <div key={type} className="flex justify-between text-sm">
                      <span className="capitalize">{type}:</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div> */}

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: "sales", name: "Ventas", count: salesOrders.length || 0 },
            { id: "courtesies", name: "Cortesías", count: courtesyOrders.length || 0 },
            { id: "offline", name: "Ventas Offline", count: offlineSales.length || 0, icon: Banknote }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.icon && <tab.icon className="w-4 h-4 mr-2" />}
              {tab.name}
              {tab.count > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {tab.count}
                </Badge>
              )}
            </button>
          ))}
        </nav>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar por cliente, email o ID de orden..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Can do="create" on="ticketTypes">
          <Button 
            onClick={() => setShowOfflineDialog(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Registrar Venta Offline
          </Button>
        </Can>
      </div>
      </div>

      {/* Orders Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8">
        <div className="space-y-6">
        {activeTab === "sales" && (
          <div className="space-y-4">
            
            {filteredSalesOrders.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Sin ventas aún
                  </h3>
                  <p className="text-gray-600">
                    Cuando se realicen compras de boletos, aparecerán aquí.
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredSalesOrders.map((order) => (
                <OrderCard 
                  key={order.id}
                  order={{
                    id: order.id,
                    createdAt: order.created_at,
                    ticketCount: order.total_tickets,
                    configuredTickets: order.configured_tickets,
                    pendingTickets: order.pending_tickets,
                    totalAmount: order.total_amount,
                    currency: order.currency,
                    tickets: order.tickets
                  }}
                  onAction={(orderId) => handleViewOrder(orderId, 'sales')}
                  actionButton={{
                    text: "Ver boletos",
                    variant: "outline" as const,
                    icon: <ArrowRight className="w-4 h-4" />
                  }}
                  borderColor="border-blue-500"
                  additionalInfo={
                    <p className="text-xs text-gray-500">
                      Cliente: {order.customer_name} ({order.customer_email})
                    </p>
                  }
                />
              ))
            )}
            {/* 📄 Paginación para Ventas - REMOVIDA DEL SCROLL */}
            {/* Moved outside scroll area */}
          </div>
        )}

        {activeTab === "courtesies" && (
          <div className="space-y-4">
            
            {filteredCourtesyOrders.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Gift className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Sin cortesías aún
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Las cortesías asignadas para este evento aparecerán aquí.
                  </p>
                  <Can do="create" on="ticketTypes">
                    <Button 
                      onClick={() => window.location.href = '/dashboard/cortesias'}
                      className="flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Crear cortesías
                    </Button>
                  </Can>
                </CardContent>
              </Card>
            ) : (
              filteredCourtesyOrders.map((order) => (
                <OrderCard 
                  key={order.id}
                  order={{
                    id: order.id,
                    createdAt: order.created_at,
                    ticketCount: order.total_tickets,
                    configuredTickets: order.configured_tickets,
                    pendingTickets: order.pending_tickets,
                    totalAmount: 0,
                    currency: 'MXN',
                    tickets: order.tickets
                  }}
                  onAction={(orderId) => handleViewOrder(orderId, 'courtesies')}
                  actionButton={{
                    text: "Ver boletos",
                    variant: "outline" as const,
                    icon: <ArrowRight className="w-4 h-4" />
                  }}
                  borderColor="border-green-500"
                  additionalInfo={
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500">
                        Cliente: {order.customer_name} ({order.customer_email})
                      </p>
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                        {order.courtesy_type}
                      </Badge>
                    </div>
                  }
                />
              ))
            )}
            {/* 📄 Paginación para Cortesías - REMOVIDA DEL SCROLL */}
            {/* Moved outside scroll area */}
          </div>
        )}

        {activeTab === "offline" && (
          <OfflineSalesTab 
            eventId={event.id} 
            searchTerm={searchTerm}
            currentPage={offlinePage}
            itemsPerPage={offlineLimit}
            offlineSales={offlineSales}
            loading={offlineLoading}
          />
        )}
        
        {/* Mensaje cuando no hay resultados - DENTRO DEL SCROLL */}
        {searchTerm && (
          (activeTab === "sales" && filteredSalesOrders.length === 0) ||
          (activeTab === "courtesies" && filteredCourtesyOrders.length === 0)
        ) && (
          <Card>
            <CardContent className="p-8 text-center">
              <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Sin resultados
              </h3>
              <p className="text-gray-600">
                No se encontraron órdenes que coincidan con &quot;{searchTerm}&quot;
              </p>
              <Button
                variant="outline"
                onClick={() => setSearchTerm("")}
                className="mt-4"
              >
                Limpiar búsqueda
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      </div>
      
      {/* 📄 PAGINACIÓN */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="border-t bg-white pt-4 space-y-4">
          {/* Paginación para Ventas - Solo en tab "sales" */}
          {activeTab === "sales" && salesOrders.length > 0 && (
            <PaginationControls
              currentPage={salesPage}
              totalPages={Math.ceil(salesOrders.length / salesLimit)}
              totalItems={salesOrders.length}
              itemsPerPage={salesLimit}
              onPageChange={handleSalesPageChange}
              onItemsPerPageChange={handleSalesLimitChange}
              label="ventas"
            />
          )}
          
          {/* 🎁 Cortesías: SIN PAGINACIÓN (ya vienen todas de Firestore) */}
          {activeTab === "courtesies" && filteredCourtesyOrders.length > 0 && (
            <div className="text-sm text-gray-600 text-center">
              Mostrando {filteredCourtesyOrders.length} cortesías
            </div>
          )}

          {/* Paginación para Ventas Offline - Solo en tab "offline" */}
          {activeTab === "offline" && filteredOfflineSales.length > 0 && (
            <PaginationControls
              currentPage={offlinePage}
              totalPages={Math.ceil(filteredOfflineSales.length / offlineLimit)}
              totalItems={filteredOfflineSales.length}
              itemsPerPage={offlineLimit}
              onPageChange={handleOfflinePageChange}
              onItemsPerPageChange={handleOfflineLimitChange}
              label="ventas offline"
            />
          )}
        </div>
      </div>

      {/* Dialog para crear venta offline */}
      <CreateOfflineSaleDialog 
        eventId={event.id}
        isOpen={showOfflineDialog}
        onClose={() => setShowOfflineDialog(false)}
        onSuccess={() => {
          refreshOfflineSales();
          setShowOfflineDialog(false);
        }}
      />
    </>
  );
}
