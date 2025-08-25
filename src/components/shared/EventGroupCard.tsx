import { ReactNode } from 'react';
import { Calendar, MapPin, Gift, TicketIcon, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils/currency';
import { OrderCard, getOrderButtonText, getOrderButtonVariant } from './OrderCard';

// Tipos base flexibles
interface BaseEventGroup {
  event_id: string;
  event_name: string;
  event_start_date: Date;
  event_location: string;
  totalTickets: number;
  configuredTickets: number;
  pendingTickets: number;
  totalAmount: number;
  currency: string;
  totalOrders: number;
  orders: Array<{
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
  }>;
}

interface EventGroupCardProps {
  event: BaseEventGroup;
  mode: 'user' | 'admin';
  onOrderAction: (orderId: string) => void;
  onDeleteOrder?: (orderId: string) => void;
  onEventAction?: (eventId: string) => void;
  headerColor?: 'blue' | 'green';
  userInfo?: {
    name: string;
    email: string;
  };
  showEventAction?: boolean;
  eventActionText?: string;
}

export function EventGroupCard({
  event,
  mode,
  onOrderAction,
  onDeleteOrder,
  onEventAction,
  headerColor = 'blue',
  userInfo,
  showEventAction = true,
  eventActionText = 'Ver página del evento'
}: EventGroupCardProps) {
  
  const headerGradient = headerColor === 'green' 
    ? 'bg-gradient-to-r from-green-50 to-emerald-50'
    : 'bg-gradient-to-r from-blue-50 to-indigo-50';
  
  const headerIcon = headerColor === 'green' ? Gift : TicketIcon;
  const HeaderIcon = headerIcon;

  return (
    <Card className="overflow-hidden">
      <CardHeader className={headerGradient}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl mb-2 flex items-center gap-2">
              <HeaderIcon className={`w-5 h-5 ${headerColor === 'green' ? 'text-green-600' : 'text-blue-600'}`} />
              {event.event_name}
            </CardTitle>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{format(event.event_start_date, "d 'de' MMMM, yyyy", { locale: es })}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{event.event_location}</span>
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">
              {event.totalTickets}
            </p>
            <p className="text-sm text-gray-600">
              {mode === 'admin' ? 'cortesías' : 'boletos'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {event.totalOrders} orden{event.totalOrders !== 1 ? 'es' : ''}
            </p>
            {userInfo && (
              <Badge className={`mt-1 ${headerColor === 'green' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-blue-100 text-blue-700 border-blue-300'}`}>
                {userInfo.name}
              </Badge>
            )}
          </div>
        </div>
        
        {/* Estadísticas rápidas del evento */}
        <div className="grid grid-cols-3 gap-4 mt-4 p-3 bg-white/70 rounded-lg">
          <div className="text-center">
            <p className="text-lg font-semibold text-green-600">
              {event.configuredTickets}
            </p>
            <p className="text-xs text-gray-600">Configurados</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-yellow-600">
              {event.pendingTickets}
            </p>
            <p className="text-xs text-gray-600">Pendientes</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-purple-600">
              {mode === 'admin' ? 'GRATIS' : formatCurrency(event.totalAmount, event.currency)}
            </p>
            <p className="text-xs text-gray-600">
              {mode === 'admin' ? 'Cortesías' : 'Total'}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="space-y-4">
          
          {/* Header de órdenes */}
          <div className="text-sm text-gray-700">
            {event.orders.length} orden{event.orders.length > 1 ? 'es' : ''} {mode === 'admin' ? 'de cortesía' : ''}
          </div>
          
          {/* Órdenes individuales */}
          <div className="space-y-4">
            {event.orders.map((order) => {
              // Preparar botón de acción según el modo
              const actionButton = mode === 'admin' 
                ? {
                    text: 'Ver boletos',
                    variant: 'outline' as const,
                    icon: <ArrowRight className="w-4 h-4" />
                  }
                : {
                    text: getOrderButtonText(order),
                    variant: getOrderButtonVariant(order),
                    icon: <ArrowRight className="w-4 h-4" />
                  };

              // Información adicional para modo admin
              const additionalInfo = mode === 'admin' && userInfo ? (
                <p className="text-xs text-gray-500">
                  Solicitante: {userInfo.email}
                </p>
              ) : undefined;

              return (
                <OrderCard
                  key={order.id}
                  order={order}
                  onAction={onOrderAction}
                  actionButton={actionButton}
                  showDeleteButton={mode === 'admin'}
                  onDelete={onDeleteOrder}
                  borderColor={headerColor === 'green' ? 'border-green-500' : 'border-blue-500'}
                  additionalInfo={additionalInfo}
                />
              );
            })}
          </div>
          
          {/* Acción para ver el evento */}
          {showEventAction && onEventAction && (
            <div className="pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => onEventAction(event.event_id)}
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                {eventActionText}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
