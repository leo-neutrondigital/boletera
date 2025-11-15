import { useMemo } from 'react';
import { OrderCard } from '@/components/shared/OrderCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Banknote, Plus, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Can } from '@/components/auth/Can';

interface OfflineSalesTabProps {
  eventId: string;
  searchTerm: string;
  currentPage: number;
  itemsPerPage: number;
  offlineSales: any[]; // 🆕 Recibir datos como prop
  loading: boolean; // 🆕 Recibir loading como prop
  onDelete?: (orderId: string, ticketIds: string[]) => void; // 🗑️ Handler para borrar
}

const PAYMENT_METHOD_LABELS: Record<string, { label: string; icon: string }> = {
  cash: { label: 'Efectivo', icon: '💵' },
  transfer: { label: 'Transferencia', icon: '🏦' },
  card: { label: 'Tarjeta', icon: '💳' },
  other: { label: 'Otro', icon: '📋' }
};

export function OfflineSalesTab({ eventId, searchTerm, currentPage, itemsPerPage, offlineSales, loading, onDelete }: OfflineSalesTabProps) {
  // 🔒 Ya no usa useOfflineSales aquí - recibe datos del padre

  // Filtrar por término de búsqueda
  const filteredSales = useMemo(() => {
    if (!searchTerm.trim()) return offlineSales;
    
    const term = searchTerm.toLowerCase();
    return offlineSales.filter(order => 
      order.customer_name.toLowerCase().includes(term) ||
      order.customer_email.toLowerCase().includes(term) ||
      (order.payment_reference && order.payment_reference.toLowerCase().includes(term))
    );
  }, [offlineSales, searchTerm]);

  // Aplicar paginación
  const paginatedSales = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredSales.slice(startIndex, endIndex);
  }, [filteredSales, currentPage, itemsPerPage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filteredSales.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Banknote className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No se encontraron ventas' : 'No hay ventas offline registradas'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm 
                ? 'Intenta con otro término de búsqueda' 
                : 'Las ventas offline que registres aparecerán aquí.'
              }
            </p>
            <Can do="create" on="ticketTypes">
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Registrar Venta Offline
              </Button>
            </Can>
          </CardContent>
        </Card>
      ) : (
        paginatedSales.map((order, index) => {
          const paymentMethodInfo = PAYMENT_METHOD_LABELS[order.payment_method] || PAYMENT_METHOD_LABELS.other;
          
          return (
            <OrderCard 
              key={order.order_id || `offline-${index}`}
              order={{
                id: order.order_id,
                createdAt: order.created_at,
                ticketCount: order.total_tickets,
                configuredTickets: order.tickets.filter((t: { status: string }) => t.status === 'configured').length,
                pendingTickets: order.tickets.filter((t: { status: string }) => t.status === 'purchased').length,
                totalAmount: order.total_amount,
                currency: order.currency,
                tickets: order.tickets
              }}
              onAction={(orderId) => {
                window.location.href = `/dashboard/ventas/orden/${orderId}?eventId=${eventId}`;
              }}
              actionButton={{
                text: "Ver boletos",
                variant: "outline" as const,
                icon: <ArrowRight className="w-4 h-4" />
              }}
              showDeleteButton={!!onDelete}
              onDelete={() => onDelete?.(order.id, order.tickets.map((t: any) => t.id))}
              borderColor="border-orange-500"
              additionalInfo={
                <div className="space-y-1" key={`info-${order.order_id}`}>
                  <p className="text-xs text-gray-500">
                    Cliente: {order.customer_name} ({order.customer_email})
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge key="offline-badge" variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-300">
                      <Banknote className="w-3 h-3 mr-1 inline" />
                      Venta Offline
                    </Badge>
                    <Badge key="payment-badge" variant="outline" className="text-xs">
                      {paymentMethodInfo.icon} {paymentMethodInfo.label}
                    </Badge>
                    {order.payment_reference && (
                      <span key="ref-badge" className="text-xs text-gray-500">
                        Ref: {order.payment_reference}
                      </span>
                    )}
                  </div>
                </div>
              }
            />
          );
        })
      )}
    </div>
  );
}
