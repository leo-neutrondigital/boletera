"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  RefreshCw,
  Download,
  Search,
  Gift,
  TicketIcon,
  AlertCircle,
  Plus,
  ArrowRight,
  ShoppingCart
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Can } from "@/components/auth/Can";
import { OrderCard } from "@/components/shared/OrderCard";
import { PaginationControls } from "@/components/shared/PaginationControls";
import { useSalesPage } from "@/contexts/SalesPageContext";
import { formatCurrency } from "@/lib/utils/currency";
import { authenticatedGet } from "@/lib/utils/api";
import type { Event } from "@/types";

// Tipos específicos para esta página
interface SalesStats {
  total_revenue: number;
  total_tickets: number;
  configured_tickets: number;
  pending_tickets: number;
  used_tickets: number;
  avg_order_value: number;
  total_orders: number;
  currency: string;
  by_ticket_type: Record<string, {
    sold: number;
    revenue: number;
    avg_price: number;
  }>;
}

interface CourtesyStats {
  total_courtesy_tickets: number;
  configured_courtesy: number;
  pending_courtesy: number;
  by_courtesy_type: Record<string, number>;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface EventSalesData {
  // Datos de ventas
  sales: {
    orders: Array<{
      id: string;
      customer_name: string;
      customer_email: string;
      total_tickets: number;
      configured_tickets: number;
      pending_tickets: number;
      used_tickets: number;
      total_amount: number;
      currency: string;
      created_at: Date;
      tickets: Array<{
        id: string;
        ticket_type_name: string;
        attendee_name?: string;
        status: string;
      }>;
    }>;
    stats: SalesStats;
    pagination: PaginationInfo;
  };
  
  // Datos de cortesías (resumen)
  courtesies: {
    orders: Array<{
      id: string;
      customer_name: string;
      customer_email: string;
      total_tickets: number;
      configured_tickets: number;
      pending_tickets: number;
      courtesy_type: string;
      created_at: Date;
      tickets: Array<{
        id: string;
        ticket_type_name: string;
        attendee_name?: string;
      }>;
    }>;
    stats: CourtesyStats;
    pagination: PaginationInfo;
  };
}

interface EventSalesPageClientProps {
  event: Event;
}

export function EventSalesPageClient({ event }: EventSalesPageClientProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { setSalesActions } = useSalesPage();
  
  const [data, setData] = useState<EventSalesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"sales" | "courtesies" | "all">("sales");
  
  // 📄 Estados de paginación
  const [salesPage, setSalesPage] = useState(1);
  const [salesLimit, setSalesLimit] = useState(10);
  const [courtesyPage, setCourtesyPage] = useState(1);
  const [courtesyLimit, setCourtesyLimit] = useState(10);

  // Cargar datos del evento con paginación
  const loadEventSalesData = async (showLoader = true) => {
    if (!user) return;

    if (showLoader) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      // 📄 Construir URL con parámetros de paginación
      const params = new URLSearchParams({
        salesPage: salesPage.toString(),
        salesLimit: salesLimit.toString(),
        courtesyPage: courtesyPage.toString(),
        courtesyLimit: courtesyLimit.toString()
      });
      
      const response = await authenticatedGet(`/api/admin/events/${event.id}/sales?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error cargando datos de ventas');
      }

      console.log('✅ Event sales data loaded:', result);
      setData(result);

    } catch (error) {
      console.error('❌ Error loading event sales data:', error);
      toast({
        variant: "destructive",
        title: "Error cargando datos",
        description: error instanceof Error ? error.message : "Error desconocido",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Cargar datos iniciales y cuando cambien parámetros de paginación
  useEffect(() => {
    loadEventSalesData();
  }, [user, event.id, salesPage, salesLimit, courtesyPage, courtesyLimit]);

  // Configurar acciones para el header
  useEffect(() => {
    setSalesActions({
      onRefresh: () => loadEventSalesData(false),
      onExport: handleExportCSV,
      isRefreshing
    });

    // Cleanup: quitar acciones cuando el componente se desmonta
    return () => setSalesActions(null);
  }, [isRefreshing, setSalesActions]);

  // Manejar navegación a orden
  const handleViewOrder = (orderId: string, type: 'sales' | 'courtesies') => {
    // 👥 Usar vista administrativa apropiada para cada tipo
    if (type === 'sales') {
      // Nueva vista administrativa para ventas
      window.location.href = `/dashboard/ventas/orden/${orderId}`;
    } else {
      window.location.href = `/dashboard/cortesias/orden/${orderId}`;
    }
  };

  // 📄 Handlers de paginación
  const handleSalesPageChange = (page: number) => {
    setSalesPage(page);
  };

  const handleSalesLimitChange = (limit: number) => {
    setSalesPage(1); // Reset a página 1
    setSalesLimit(limit);
  };

  const handleCourtesyPageChange = (page: number) => {
    setCourtesyPage(page);
  };

  const handleCourtesyLimitChange = (limit: number) => {
    setCourtesyPage(1);
    setCourtesyLimit(limit);
  };

  // 📊 Exportar datos a CSV
  const handleExportCSV = async () => {
    try {
      setIsRefreshing(true);
      
      // Obtener TODOS los datos sin paginación
      const allDataParams = new URLSearchParams({
        salesPage: '1',
        salesLimit: '999999',
        courtesyPage: '1',
        courtesyLimit: '999999'
      });
      
      const response = await authenticatedGet(`/api/admin/events/${event.id}/sales?${allDataParams}`);
      const allData = await response.json();
      
      if (!response.ok) {
        throw new Error(allData.error || 'Error obteniendo datos');
      }
      
      // Preparar datos CSV
      const csvData = [];
      
      // Headers
      csvData.push([
        'Tipo',
        'ID Orden',
        'Cliente',
        'Email',
        'Boletos',
        'Configurados',
        'Pendientes',
        'Usados',
        'Monto Total',
        'Moneda',
        'Tipo Cortesía',
        'Fecha Creación'
      ]);
      
      // Ventas
      allData.sales.orders.forEach((order: any) => {
        csvData.push([
          'Venta',
          order.id,
          order.customer_name,
          order.customer_email,
          order.total_tickets,
          order.configured_tickets,
          order.pending_tickets,
          order.used_tickets,
          order.total_amount,
          order.currency,
          '',
          new Date(order.created_at).toLocaleDateString()
        ]);
      });
      
      // Cortesías
      allData.courtesies.orders.forEach((order: any) => {
        csvData.push([
          'Cortesía',
          order.id,
          order.customer_name,
          order.customer_email,
          order.total_tickets,
          order.configured_tickets,
          order.pending_tickets,
          0,
          0,
          'MXN',
          order.courtesy_type,
          new Date(order.created_at).toLocaleDateString()
        ]);
      });
      
      // Convertir a CSV y descargar
      const csvContent = csvData.map(row => 
        row.map(field => `"${field}"`).join(',')
      ).join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `ventas-${event.name}-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      toast({
        title: "Exportación completada",
        description: "El archivo CSV se ha descargado correctamente",
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
  };

  // Filtrar órdenes según búsqueda
  const filteredSalesOrders = useMemo(() => {
    if (!data?.sales.orders || !searchTerm) return data?.sales.orders || [];
    
    const searchLower = searchTerm.toLowerCase();
    return data.sales.orders.filter(order => 
      order.customer_name.toLowerCase().includes(searchLower) ||
      order.customer_email.toLowerCase().includes(searchLower) ||
      order.id.toLowerCase().includes(searchLower)
    );
  }, [data?.sales.orders, searchTerm]);

  const filteredCourtesyOrders = useMemo(() => {
    if (!data?.courtesies.orders || !searchTerm) return data?.courtesies.orders || [];
    
    const searchLower = searchTerm.toLowerCase();
    return data.courtesies.orders.filter(order => 
      order.customer_name.toLowerCase().includes(searchLower) ||
      order.customer_email.toLowerCase().includes(searchLower) ||
      order.courtesy_type.toLowerCase().includes(searchLower)
    );
  }, [data?.courtesies.orders, searchTerm]);

  // Estados de carga
  if (isLoading) {
    return (
      <>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
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

  const salesStats = data?.sales.stats;
  const courtesyStats = data?.courtesies.stats;

  return (
    <>
      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-full">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(salesStats?.total_revenue || 0, salesStats?.currency || 'MXN')}
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
                    {salesStats?.total_tickets || 0}
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
                    {formatCurrency(salesStats?.avg_order_value || 0, salesStats?.currency || 'MXN')}
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
                    {courtesyStats?.total_courtesy_tickets || 0}
                  </p>
                  <p className="text-sm text-gray-600">Cortesías</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Estado de Ventas y Cortesías */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
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
              {/* Usados oculto por complejidad de múltiples días */}
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
                  {courtesyStats?.configured_courtesy || 0}
                </p>
                <p className="text-xs text-gray-600">Configuradas</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-yellow-600">
                  {courtesyStats?.pending_courtesy || 0}
                </p>
                <p className="text-xs text-gray-600">Pendientes</p>
              </div>
            </div>

            {courtesyStats?.by_courtesy_type && Object.keys(courtesyStats.by_courtesy_type).length > 0 && (
              <div className="pt-4 border-t">
                <p className="text-sm font-medium text-gray-700 mb-2">Por tipo:</p>
                <div className="space-y-1">
                  {Object.entries(courtesyStats.by_courtesy_type).map(([type, count]) => (
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
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: "sales", name: "Ventas", count: data?.sales.orders.length || 0 },
            { id: "courtesies", name: "Cortesías", count: data?.courtesies.orders.length || 0 },
            { id: "all", name: "Todos", count: (data?.sales.orders.length || 0) + (data?.courtesies.orders.length || 0) }
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
      </div>
      </div>

      {/* Orders Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8">
        <div className="space-y-6">
        {(activeTab === "sales" || activeTab === "all") && (
          <div className="space-y-4">
            {activeTab === "all" && (
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Ventas ({filteredSalesOrders.length})
              </h3>
            )}
            
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

        {(activeTab === "courtesies" || activeTab === "all") && (
          <div className="space-y-4">
            {activeTab === "all" && (
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Gift className="w-5 h-5" />
                Cortesías ({filteredCourtesyOrders.length})
              </h3>
            )}
            
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
        
        {/* Mensaje cuando no hay resultados - DENTRO DEL SCROLL */}
        {searchTerm && (
          (activeTab === "sales" && filteredSalesOrders.length === 0) ||
          (activeTab === "courtesies" && filteredCourtesyOrders.length === 0) ||
          (activeTab === "all" && filteredSalesOrders.length === 0 && filteredCourtesyOrders.length === 0)
        ) && (
          <Card>
            <CardContent className="p-8 text-center">
              <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Sin resultados
              </h3>
              <p className="text-gray-600">
                No se encontraron órdenes que coincidan con "{searchTerm}"
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
          {/* Paginación para Ventas */}
          {(activeTab === "sales" || activeTab === "all") && filteredSalesOrders.length > 0 && data?.sales && (
            <PaginationControls
              currentPage={salesPage}
              totalPages={data.sales.pagination?.totalPages || 1}
              totalItems={data.sales.pagination?.totalItems || 0}
              itemsPerPage={salesLimit}
              onPageChange={handleSalesPageChange}
              onItemsPerPageChange={handleSalesLimitChange}
              label="ventas"
            />
          )}
          
          {/* Paginación para Cortesías */}
          {(activeTab === "courtesies" || activeTab === "all") && filteredCourtesyOrders.length > 0 && data?.courtesies && (
            <PaginationControls
              currentPage={courtesyPage}
              totalPages={data.courtesies.pagination?.totalPages || 1}
              totalItems={data.courtesies.pagination?.totalItems || 0}
              itemsPerPage={courtesyLimit}
              onPageChange={handleCourtesyPageChange}
              onItemsPerPageChange={handleCourtesyLimitChange}
              label="cortesías"
            />
          )}
        </div>
      </div>
    </>
  );
}
