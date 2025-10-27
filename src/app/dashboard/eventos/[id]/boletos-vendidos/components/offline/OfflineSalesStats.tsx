import { Card } from '@/components/ui/card';
import { DollarSign, Ticket, ShoppingCart, Banknote } from 'lucide-react';
import type { OfflineSalesStats as StatsType, PaymentMethod } from '@/types';

interface OfflineSalesStatsProps {
  stats: StatsType;
  isLoading?: boolean;
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, { label: string; icon: string }> = {
  cash: { label: 'Efectivo', icon: '💵' },
  transfer: { label: 'Transferencia', icon: '🏦' },
  card: { label: 'Tarjeta', icon: '💳' },
  other: { label: 'Otro', icon: '📋' }
};

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  iconColor, 
  subtitle 
}: { 
  title: string; 
  value: string | number; 
  icon: React.ElementType; 
  iconColor: string;
  subtitle?: string;
}) {
  return (
    <Card className="p-4 border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-2 rounded-lg ${iconColor}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </Card>
  );
}

function PaymentMethodCard({ 
  method, 
  amount, 
  currency 
}: { 
  method: PaymentMethod; 
  amount: number; 
  currency: string;
}) {
  const methodInfo = PAYMENT_METHOD_LABELS[method];
  
  return (
    <Card className="p-4 border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
            <span>{methodInfo.icon}</span>
            {methodInfo.label}
          </p>
          <p className="text-2xl font-bold text-gray-900">
            ${amount.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 mt-1">{currency}</p>
        </div>
        <div className="p-2 rounded-lg bg-gray-700">
          <Banknote className="w-5 h-5 text-white" />
        </div>
      </div>
    </Card>
  );
}

export function OfflineSalesStats({ stats, isLoading }: OfflineSalesStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4 border border-gray-200 animate-pulse">
            <div className="h-16 bg-gray-200 rounded"></div>
          </Card>
        ))}
      </div>
    );
  }

  // Filtrar métodos de pago con monto > 0
  const nonZeroPaymentMethods = (Object.entries(stats.by_payment_method) as [PaymentMethod, number][])
    .filter(([, amount]) => amount > 0);

  return (
    <div className="space-y-4">
      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Ingresos Totales"
          value={`$${stats.total_revenue.toFixed(2)}`}
          subtitle={`${stats.total_orders} orden${stats.total_orders !== 1 ? 'es' : ''}`}
          icon={DollarSign}
          iconColor="bg-green-500"
        />
        
        <StatCard
          title="Boletos Vendidos"
          value={stats.total_tickets}
          subtitle="ventas offline"
          icon={Ticket}
          iconColor="bg-blue-500"
        />
        
        <StatCard
          title="Órdenes Registradas"
          value={stats.total_orders}
          subtitle="transacciones"
          icon={ShoppingCart}
          iconColor="bg-purple-500"
        />
      </div>

      {/* Desglose por método de pago */}
      {nonZeroPaymentMethods.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Desglose por Método de Pago</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {nonZeroPaymentMethods.map(([method, amount]) => (
              <PaymentMethodCard 
                key={method}
                method={method}
                amount={amount}
                currency={stats.currency}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
