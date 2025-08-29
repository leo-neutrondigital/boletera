import { useState } from 'react';
import { 
  Package,
  Calendar,
  MapPin,
  Gift,
  Eye,
  Trash2
  // 🆕 Quitar ChevronDown, ChevronUp ya que no expandimos
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DeleteOrderDialog } from './DeleteOrderDialog';
import type { CourtesyOrder } from './types';

interface GroupedCourtesyCardProps {
  eventName: string;
  eventDate: Date;
  eventLocation: string;
  customerName: string;
  customerEmail: string;
  orders: CourtesyOrder[]; // 🆕 Lista de órdenes reales
  onViewOrder: (orderId: string) => void;
  onDeleteOrder?: (orderId: string) => Promise<void>;
}

export function GroupedCourtesyCard({ 
  eventName,
  eventDate, 
  eventLocation,
  customerName,
 // customerEmail,
  orders,
  onViewOrder, 
  onDeleteOrder 
}: GroupedCourtesyCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  // 🆕 Quitar estado de expandir - siempre mostrar

  // Calcular totales
  const totalTickets = orders.reduce((sum, order) => sum + order.total_tickets, 0);
  const configuredTickets = orders.reduce((sum, order) => sum + order.configured_tickets, 0);
  const pendingTickets = orders.reduce((sum, order) => sum + order.pending_tickets, 0);

  const handleDeleteClick = (orderId: string) => {
    setOrderToDelete(orderId);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (orderToDelete && onDeleteOrder) {
      await onDeleteOrder(orderToDelete);
    }
  };

  return (
    <>
      <Card className="overflow-auto border-l-4 border-green-500">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
          {/* Header del evento */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-xl mb-2 flex items-center gap-2">
                <Gift className="w-5 h-5 text-green-600" />
                {eventName}
              </CardTitle>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{format(eventDate, "d 'de' MMMM, yyyy", { locale: es })}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{eventLocation}</span>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {totalTickets}
              </p>
              <p className="text-sm text-gray-600">cortesías</p>
              <Badge className="mt-1 bg-green-100 text-green-700 border-green-300">
                {customerName}
              </Badge>
            </div>
          </div>
          
          {/* Estadísticas del grupo */}
          <div className="grid grid-cols-3 gap-4 mt-4 p-3 bg-white/70 rounded-lg">
            <div className="text-center">
              <p className="text-lg font-semibold text-green-600">
                {configuredTickets}
              </p>
              <p className="text-xs text-gray-600">Configurados</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-yellow-600">
                {pendingTickets}
              </p>
              <p className="text-xs text-gray-600">Pendientes</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-purple-600">
                GRATIS
              </p>
              <p className="text-xs text-gray-600">Cortesías</p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {/* 🆕 Header de órdenes (sin botón expandir) */}
          <div className="px-6 py-3 border-b bg-gray-50">
            <div className="text-sm text-gray-700">
              {orders.length} orden{orders.length > 1 ? 'es' : ''} de cortesía
            </div>
          </div>

          {/* 🆕 Lista de órdenes (siempre visible) */}
          <div className="space-y-0">
              {orders.map((order) => (
                <div key={order.order_id} className="border-b last:border-b-0">
                  <div className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="w-4 h-4 text-gray-500" />
                          <p className="font-medium text-gray-900">
                            Orden #{order.order_id.slice(-8).toUpperCase()}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {format(order.created_at, "d MMM yyyy", { locale: es })}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-gray-600">Boletos</p>
                            <p className="font-semibold">{order.total_tickets}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Configurados</p>
                            <p className="font-semibold text-green-600">{order.configured_tickets}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Pendientes</p>
                            <p className="font-semibold text-yellow-600">{order.pending_tickets}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Tipo</p>
                            <p className="font-semibold">{order.courtesy_type}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="ml-4 flex gap-2">
                        <Button
                          onClick={() => onViewOrder(order.order_id)}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          Ver
                        </Button>
                        
                        {onDeleteOrder && (
                          <Button
                            onClick={() => handleDeleteClick(order.order_id)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
      </Card>
      
      {/* Dialog de confirmación para eliminar */}
      {onDeleteOrder && orderToDelete && (
        <DeleteOrderDialog
          isOpen={showDeleteDialog}
          onClose={() => {
            setShowDeleteDialog(false);
            setOrderToDelete(null);
          }}
          onConfirm={handleConfirmDelete}
          orderInfo={{
            order_id: orderToDelete,
            total_tickets: orders.find(o => o.order_id === orderToDelete)?.total_tickets || 0,
            customer_name: customerName,
            event_name: eventName
          }}
        />
      )}
    </>
  );
}
