import { ReactNode } from 'react';
import { Package, Settings, Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils/currency';

// Tipos base que funcionan para ambos casos
interface BaseOrder {
  id: string;
  createdAt: Date;
  ticketCount: number;
  configuredTickets: number;
  pendingTickets: number;
  totalAmount: number;
  currency: string;
  tickets: Array<{
    id: string;
    ticket_type_name: string;
    attendee_name?: string;
  }>;
}

interface OrderCardProps {
  order: BaseOrder;
  onAction: (orderId: string) => void;
  actionButton: {
    text: string;
    variant: "default" | "outline" | "secondary";
    icon: ReactNode;
  };
  showDeleteButton?: boolean;
  onDelete?: (orderId: string) => void;
  showTicketPreview?: boolean;
  borderColor?: string;
  additionalInfo?: ReactNode;
}

export function OrderCard({
  order,
  onAction,
  actionButton,
  showDeleteButton = false,
  onDelete,
  showTicketPreview = true,
  borderColor = "border-blue-500",
  additionalInfo
}: OrderCardProps) {
  return (
    <div className={`border-l-4 ${borderColor} pl-4 py-3 bg-gray-50 rounded-r-lg`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-gray-500" />
            <p className="font-medium text-gray-900">
              Orden #{order.id.slice(-8).toUpperCase()}
            </p>
            <Badge variant="outline" className="text-xs">
              {format(order.createdAt, "d MMM yyyy", { locale: es })}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-gray-600">Boletos</p>
              <p className="font-semibold">{order.ticketCount}</p>
            </div>
            <div>
              <p className="text-gray-600">Configurados</p>
              <p className="font-semibold text-green-600">{order.configuredTickets}</p>
            </div>
            <div>
              <p className="text-gray-600">Pendientes</p>
              <p className="font-semibold text-yellow-600">{order.pendingTickets}</p>
            </div>
            <div>
              <p className="text-gray-600">Total</p>
              <p className="font-semibold">{formatCurrency(order.totalAmount, order.currency)}</p>
            </div>
          </div>
          
          {/* Información adicional */}
          {additionalInfo && (
            <div className="mt-2">
              {additionalInfo}
            </div>
          )}
          
          {/* Vista previa de boletos */}
          {showTicketPreview && order.tickets.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-2">Boletos en esta orden:</p>
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
        
        <div className="ml-4 flex gap-2">
          <Button
            onClick={() => onAction(order.id)}
            variant={actionButton.variant}
            size="sm"
            className="flex items-center gap-2"
          >
            {actionButton.icon}
            {actionButton.text}
          </Button>
          
          {showDeleteButton && onDelete && (
            <Button
              onClick={() => onDelete(order.id)}
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
  );
}

// Funciones helper exportadas para reutilizar
export function getOrderButtonText(order: BaseOrder): string {
  const { configuredTickets, ticketCount } = order;
  
  if (configuredTickets === 0) return 'Configurar boletos';
  if (configuredTickets === ticketCount) return 'Ver boletos';
  return `Configurar (${ticketCount - configuredTickets} pendientes)`;
}

export function getOrderButtonVariant(order: BaseOrder): "default" | "outline" | "secondary" {
  const { configuredTickets, ticketCount } = order;
  
  if (configuredTickets === 0) return 'default';  // Azul
  if (configuredTickets === ticketCount) return 'outline';  // Gris
  return 'secondary';  // Amarillo/naranja
}
