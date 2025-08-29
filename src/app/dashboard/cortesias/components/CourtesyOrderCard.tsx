import { 
  Package,
  Calendar,
  MapPin,
  Gift,
  Eye,
  Trash2 // 🆕 Para botón eliminar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DeleteOrderDialog } from './DeleteOrderDialog'; // 🆕 Dialog de confirmación
import { useState } from 'react'; // 🆕 Para estado del dialog
import type { CourtesyOrder } from './types';

interface CourtesyOrderCardProps {
  order: CourtesyOrder;
  onViewOrder: (orderId: string) => void;
  onDeleteOrder?: (orderId: string) => Promise<void>; // 🆕 Función de eliminación
}

// Función para obtener el texto del botón según el estado
function getOrderButtonText(order: CourtesyOrder): string {
  const { configured_tickets, total_tickets } = order;
  
  if (configured_tickets === 0) return 'Ver boletos';
  if (configured_tickets === total_tickets) return 'Ver configurados';
  return `Ver (${total_tickets - configured_tickets} pendientes)`;
}

// Función para obtener la variante del botón según el estado
function getOrderButtonVariant(order: CourtesyOrder): "default" | "outline" | "secondary" {
  const { configured_tickets, total_tickets } = order;
  
  if (configured_tickets === 0) return 'default';  // Azul
  if (configured_tickets === total_tickets) return 'outline';  // Gris
  return 'secondary';  // Amarillo/naranja
}

export function CourtesyOrderCard({ order, onViewOrder, onDeleteOrder }: CourtesyOrderCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false); // 🆕 Estado del dialog
  
  return (
    <>
      <Card className="overflow-auto border-l-4 border-green-500">
      <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl mb-2 flex items-center gap-2">
              <Gift className="w-5 h-5 text-green-600" />
              {order.event_name}
            </CardTitle>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{format(order.event_start_date, "d 'de' MMMM, yyyy", { locale: es })}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{order.event_location}</span>
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">
              {order.total_tickets}
            </p>
            <p className="text-sm text-gray-600">cortesías</p>
            <Badge className="mt-1 bg-green-100 text-green-700 border-green-300">
              {order.courtesy_type}
            </Badge>
          </div>
        </div>
        
        {/* Estadísticas rápidas de la orden */}
        <div className="grid grid-cols-3 gap-4 mt-4 p-3 bg-white/70 rounded-lg">
          <div className="text-center">
            <p className="text-lg font-semibold text-green-600">
              {order.configured_tickets}
            </p>
            <p className="text-xs text-gray-600">Configurados</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-yellow-600">
              {order.pending_tickets}
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
      
      <CardContent className="p-6">
        <div className="border-l-4 border-blue-500 pl-4 py-3 bg-gray-50 rounded-r-lg">
          <div className="flex justify-between items-start">
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
                  <p className="text-gray-600">Solicitante</p>
                  <p className="font-semibold">{order.customer_name}</p>
                </div>
              </div>
              
              {/* Vista previa de boletos de esta orden */}
              {order.tickets.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500 mb-2">Cortesías en esta orden:</p>
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
              <div className="flex gap-2">
                <Button
                  onClick={() => onViewOrder(order.order_id)}
                  variant={getOrderButtonVariant(order)}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  {getOrderButtonText(order)}
                </Button>
                
                {/* 🆕 Botón eliminar (solo si se pasa la función) */}
                {onDeleteOrder && (
                  <Button
                    onClick={() => setShowDeleteDialog(true)} // 🆕 Abrir dialog
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
      </CardContent>
    </Card>
    
    {/* 🆕 Dialog de confirmación para eliminar */}
    {onDeleteOrder && (
      <DeleteOrderDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={() => onDeleteOrder(order.order_id)}
        orderInfo={{
          order_id: order.order_id,
          total_tickets: order.total_tickets,
          customer_name: order.customer_name,
          event_name: order.event_name
        }}
      />
    )}
    </>
  );
}
