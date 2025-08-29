'use client';

import { Calendar, TrendingUp, Users, DollarSign, Plus, Eye, Scan, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useDashboardStats } from '@/hooks/use-dashboard-stats';
import type { Event, Order } from '@/types';

interface DashboardStats {
  totalEvents: number;
  totalTicketsSold: number;
  totalRevenue: number;
  totalPreregistrations: number;
  recentEvents: Event[];
  recentOrders: Order[];
}

interface DashboardPageClientProps {
  initialStats: DashboardStats;
}

export default function DashboardPageClient({ initialStats }: DashboardPageClientProps) {
  const { stats, isLoading, refreshStats } = useDashboardStats(initialStats);
  const { userData } = useAuth();
  const router = useRouter();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(date));
  };

  const getEventStatus = (event: Event) => {
    const now = new Date();
    const startDate = new Date(event.start_date);
    const endDate = new Date(event.end_date);
    
    if (now > endDate) {
      return { label: 'Finalizado', color: 'bg-gray-100 text-gray-600' };
    } else if (now >= startDate && now <= endDate) {
      return { label: 'En curso', color: 'bg-green-100 text-green-700' };
    } else {
      return { label: 'Próximo', color: 'bg-blue-100 text-blue-700' };
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        icon={TrendingUp}
        title="Dashboard"
        description="Resumen general de eventos, ventas y estadísticas"
        iconColor="blue"
        actions={
          <Button 
          onClick={refreshStats}
          variant="outline"
          disabled={isLoading}
          >
          {isLoading ? (
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
          ) : (
          <TrendingUp className="w-4 h-4 mr-2" />
          )}
          {isLoading ? "Actualizando..." : "Actualizar"}
          </Button>
        }
      />

      {/* Estadísticas principales */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Eventos */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Eventos</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEvents}</div>
              <p className="text-xs text-muted-foreground">
                Eventos publicados
              </p>
            </CardContent>
          </Card>

          {/* Boletos Vendidos */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Boletos Vendidos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTicketsSold}</div>
              <p className="text-xs text-muted-foreground">
                En este mes
              </p>
            </CardContent>
          </Card>

          {/* Ingresos */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                En este mes
              </p>
            </CardContent>
          </Card>

          {/* Preregistros */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Preregistros</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPreregistrations}</div>
              <p className="text-xs text-muted-foreground">
                Activos (por contactar)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Contenido principal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Eventos recientes */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Próximos Eventos</CardTitle>
                  <CardDescription>
                    Eventos programados para las próximas fechas
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => router.push('/dashboard/eventos')}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Ver todos
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {stats.recentEvents.length > 0 ? (
                <div className="space-y-4">
                  {stats.recentEvents.slice(0, 5).map((event) => {
                    const status = getEventStatus(event);
                    return (
                      <div 
                        key={event.id} 
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => router.push(`/dashboard/eventos/${event.id}/configuracion`)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {event.name}
                            </h4>
                            <Badge className={`text-xs px-2 py-0.5 ${status.color}`}>
                              {status.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>📅 {formatDate(event.start_date)}</span>
                            <span>📍 {event.location}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No hay eventos programados</p>
                  <Button 
                    className="mt-4"
                    onClick={() => router.push('/dashboard/eventos')}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Crear primer evento
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actividad reciente */}
          <Card>
            <CardHeader>
              <CardTitle>Actividad Reciente</CardTitle>
              <CardDescription>
                Últimas transacciones y preregistros
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.recentOrders.length > 0 ? (
                <div className="space-y-4">
                  {stats.recentOrders.slice(0, 5).map((order, index) => (
                    <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <DollarSign className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Venta realizada
                          </p>
                          <p className="text-xs text-gray-500">
                            {order.cart_snapshot.items.reduce((sum, item) => sum + item.quantity, 0)} boletos vendidos
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(order.total_amount)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(order.paid_at || order.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No hay actividad reciente</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Acciones rápidas */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Acciones Rápidas</CardTitle>
            <CardDescription>
              Accesos directos a las funciones más utilizadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <Button 
                onClick={() => router.push('/dashboard/eventos')}
                className="h-20 flex flex-col items-center justify-center gap-2"
                variant="outline"
              >
                <Plus className="w-6 h-6" />
                <span>Crear Evento</span>
              </Button>

              <Button 
                onClick={() => router.push('/dashboard/eventos')}
                className="h-20 flex flex-col items-center justify-center gap-2"
                variant="outline"
              >
                <Calendar className="w-6 h-6" />
                <span>Ver Eventos</span>
              </Button>

              {userData?.roles?.includes('admin') && (
                <Button 
                  onClick={() => router.push('/dashboard/usuarios')}
                  className="h-20 flex flex-col items-center justify-center gap-2"
                  variant="outline"
                >
                  <Users className="w-6 h-6" />
                  <span>Gestionar Usuarios</span>
                </Button>
              )}

              <Button 
                onClick={() => router.push('/scanner')}
                className="h-20 flex flex-col items-center justify-center gap-2"
                variant="outline"
              >
                <Scan className="w-6 h-6" />
                <span>Abrir Scanner</span>
              </Button>

            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}