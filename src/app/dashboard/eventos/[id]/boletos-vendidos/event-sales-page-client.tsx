"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSoldTickets } from "@/hooks/use-sold-tickets";
import { useCourtesyTickets } from "@/hooks/use-courtesy-tickets"; // 🆕 Hook unificado
import {
  
  Search,
  Plus,
  
  DollarSign,
  TicketIcon,
  TrendingUp,
  Gift,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
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
import type { Event } from "@/types";

interface EventSalesPageClientProps {
  event: Event;
}

export function EventSalesPageClient({ event }: EventSalesPageClientProps) {
  const { toast } = useToast();
  const { setSalesActions } = useSalesPage();
  
  // Hooks con cache especializado unificado
  const { 
    soldTickets, 
    loading: salesLoading, 
    stats: soldStats, 
    refreshSoldTickets 
  } = useSoldTickets();
  
  const {
    courtesyTickets,
    loading: courtesyLoading,
    stats: courtesyStats,
    refreshCourtesyTickets
  } = useCourtesyTickets();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"sales" | "courtesies" | "all">("sales");
  
  // 📄 Estados de paginación (mantener para cortesias)
  const [salesPage, setSalesPage] = useState(1);
  const [salesLimit, setSalesLimit] = useState(10);
  const [courtesyPage, setCourtesyPage] = useState(1);
  const [courtesyLimit, setCourtesyLimit] = useState(10);

  // Los datos se cargan automÃ¡ticamente por los hooks con cache

  // 📈 Datos unificados del cache
  const data = useMemo(() => {
    // Transformar boletos vendidos para compatibilidad con UI
    const salesOrders = soldTickets.map(ticket => ({
      id: ticket.id,
      customer_name: ticket.customer_name,
      customer_email: ticket.customer_email,
      total_tickets: 1,
      configured_tickets: ticket.status === 'generated' ? 1 : 0,
      pending_tickets: ticket.status === 'purchased' ? 1 : 0,
      used_tickets: ticket.status === 'used' ? 1 : 0,
      total_amount: ticket.amount_paid || 0,
      currency: ticket.currency || 'MXN',
      created_at: ticket.purchase_date || new Date(),
      tickets: [{
        id: ticket.id,
        ticket_type_name: ticket.ticket_type_name,
        attendee_name: ticket.customer_name,
        status: ticket.status
      }]
    }));

    // Transformar cortesías para compatibilidad con UI
    const courtesyOrders = courtesyTickets.map(courtesy => ({
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

    return {
      sales: {
        orders: salesOrders,
        stats: {
          total_revenue: soldStats?.totalAmount || 0,
          total_tickets: soldStats?.total || 0,
          configured_tickets: soldStats?.generated || 0,
          pending_tickets: soldStats?.purchased || 0,
          used_tickets: soldStats?.used || 0,
          avg_order_value: soldStats?.totalAmount && soldStats?.total 
            ? soldStats.totalAmount / soldStats.total 
            : 0,
          total_orders: soldStats?.total || 0,
          currency: 'MXN',
          by_ticket_type: {}
        },
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: soldStats?.total || 0,
          itemsPerPage: soldStats?.total || 0,
          hasNextPage: false,
          hasPrevPage: false
        }
      },
      courtesies: {
        orders: courtesyOrders,
        stats: {
          total_courtesy_tickets: courtesyStats?.totalTickets || 0,
          configured_courtesy: courtesyStats?.configured || 0,
          pending_courtesy: courtesyStats?.pending || 0,
          by_courtesy_type: courtesyStats?.byType || {}
        },
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: courtesyStats?.total || 0,
          itemsPerPage: courtesyStats?.total || 0,
          hasNextPage: false,
          hasPrevPage: false
        }
      }
    };
  }, [soldTickets, soldStats, courtesyTickets, courtesyStats]);

  // Estado de carga combinado
  const isLoading = salesLoading || courtesyLoading;
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
  const handleExportCSV = useCallback(async () => {
    if (!data) {
      toast({
        variant: "destructive",
        title: "Sin datos",
        description: "No hay datos para exportar",
      });
      return;
    }

    try {
      setIsRefreshing(true);
      
      // Preparar datos CSV combinando ventas y cortesías
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
      soldTickets.forEach((ticket) => {
        csvData.push([
          'Venta',
          ticket.id,
          ticket.customer_name,
          ticket.customer_email,
          1, // Un boleto por fila
          ticket.status === 'generated' ? 1 : 0,
          ticket.status === 'purchased' ? 1 : 0,
          ticket.status === 'used' ? 1 : 0,
          ticket.amount_paid || 0,
          ticket.currency || 'MXN',
          '',
          ticket.purchase_date ? new Date(ticket.purchase_date).toLocaleDateString() : ''
        ]);
      });
      
      // Cortesías
      courtesyTickets.forEach((courtesy) => {
        csvData.push([
          'Cortesía',
          courtesy.id,
          courtesy.customer_name,
          courtesy.customer_email,
          courtesy.total_tickets,
          courtesy.configured_tickets,
          courtesy.pending_tickets,
          0, // No hay "usados" para cortesías aún
          0, // Sin monto para cortesías
          'MXN',
          courtesy.courtesy_type,
          new Date(courtesy.created_at).toLocaleDateString()
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
  }, [soldTickets, courtesyTickets, event.name, toast]);

  // Configurar acciones para el header (DESPUÉS de handleExportCSV)
  useEffect(() => {
    setSalesActions({
      onRefresh: async () => {
        setIsRefreshing(true);
        await refreshSoldTickets(); // Cache de ventas
        await refreshCourtesyTickets(); // Cache de cortesías
        setIsRefreshing(false);
      },
      onExport: handleExportCSV,
      isRefreshing
    });

    // Cleanup: quitar acciones cuando el componente se desmonta
    return () => setSalesActions(null);
  }, [isRefreshing]); // Solo depender de isRefreshing

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

  // Stats directos del cache unificado
  const salesStats = {
    total_revenue: soldStats?.totalAmount || 0,
    total_tickets: soldStats?.total || 0,
    configured_tickets: soldStats?.generated || 0,
    pending_tickets: soldStats?.purchased || 0,
    used_tickets: soldStats?.used || 0,
    avg_order_value: soldStats?.totalAmount && soldStats?.total 
      ? soldStats.totalAmount / soldStats.total 
      : 0,
    total_orders: soldStats?.total || 0,
    currency: 'MXN'
  };
  
  const courtesyStatsSummary = {
    total_courtesy_tickets: courtesyStats?.totalTickets || 0,
    configured_courtesy: courtesyStats?.configured || 0,
    pending_courtesy: courtesyStats?.pending || 0,
    by_courtesy_type: courtesyStats?.byType || {}
  };

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
                    {formatCurrency(salesStats?.total_revenue || 0, (salesStats?.currency || 'MXN') as 'MXN' | 'USD' | 'EUR' | 'GBP')}
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
                    {formatCurrency(salesStats?.avg_order_value || 0, (salesStats?.currency || 'MXN') as 'MXN' | 'USD' | 'EUR' | 'GBP')}
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
