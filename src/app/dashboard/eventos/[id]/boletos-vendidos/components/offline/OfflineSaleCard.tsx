import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Banknote, User, Mail, Calendar, CreditCard, Hash } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { OfflineSaleOrder, PaymentMethod } from '@/types';

interface OfflineSaleCardProps {
  order: OfflineSaleOrder;
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, { label: string; icon: string }> = {
  cash: { label: 'Efectivo', icon: '💵' },
  transfer: { label: 'Transferencia', icon: '🏦' },
  card: { label: 'Tarjeta', icon: '💳' },
  other: { label: 'Otro', icon: '📋' }
};

export function OfflineSaleCard({ order }: OfflineSaleCardProps) {
  const methodInfo = PAYMENT_METHOD_LABELS[order.payment_method];
  
  const formatDate = (date: Date) => {
    try {
      return format(new Date(date), "dd MMM yyyy, HH:mm", { locale: es });
    } catch {
      return 'Fecha inválida';
    }
  };

  return (
    <Card className="p-4 border border-gray-200 hover:shadow-md transition-shadow">
      <div className="space-y-3">
        {/* Header: Badge y Total */}
        <div className="flex items-start justify-between">
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            <Banknote className="w-3 h-3 mr-1" />
            Venta Offline
          </Badge>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">
              ${order.total_amount.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500">{order.currency}</p>
          </div>
        </div>

        {/* Info del Cliente */}
        <div className="space-y-2 py-2 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-gray-400" />
            <span className="font-medium text-gray-900">{order.customer_name}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Mail className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">{order.customer_email}</span>
          </div>
        </div>

        {/* Detalles de la Venta */}
        <div className="space-y-2 py-2 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Boletos:</span>
            <span className="font-medium text-gray-900">{order.total_tickets}</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-gray-600">
              <CreditCard className="w-4 h-4" />
              <span>Método:</span>
            </div>
            <span className="font-medium text-gray-900 flex items-center gap-1">
              <span>{methodInfo.icon}</span>
              {methodInfo.label}
            </span>
          </div>

          {order.payment_reference && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1 text-gray-600">
                <Hash className="w-4 h-4" />
                <span>Referencia:</span>
              </div>
              <span className="font-mono text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded">
                {order.payment_reference}
              </span>
            </div>
          )}
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>Fecha:</span>
            </div>
            <span className="text-gray-700 text-xs">
              {formatDate(order.sale_date)}
            </span>
          </div>
        </div>

        {/* Footer: Botón Ver Detalles */}
        <div className="pt-2 border-t border-gray-100">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => {
              // TODO: Implementar navegación a detalle de orden
              console.log('Ver detalles de orden:', order.order_id);
            }}
          >
            Ver Detalles
          </Button>
        </div>
      </div>
    </Card>
  );
}
