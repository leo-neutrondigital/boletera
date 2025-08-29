'use client';

import { useState } from 'react';
import { Plus, Minus, ShoppingCart, Check, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCart, useTicketTypeInCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext'; // ✅ CORREGIDO
import { 
  isTicketTypeAvailableForSale, 
  getAvailableStock, 
  canUserBuyTicketType 
} from '@/lib/api/public-events';
import type { Event, TicketType } from '@/types';
import { formatCurrency } from '@/lib/utils/currency';

interface TicketTypesGridProps {
  ticketTypes: TicketType[];
  event: Event;
}

export function TicketTypesGrid({ ticketTypes, event }: TicketTypesGridProps) {
  return (
    <div id="tickets-section" className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          Tipos de Boletos
        </h2>
        <p className="text-gray-600">
          Selecciona el tipo de boleto que mejor se adapte a tus necesidades
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {ticketTypes.map((ticketType) => (
          <TicketTypeCard 
            key={ticketType.id} 
            ticketType={ticketType} 
            event={event}
          />
        ))}
      </div>
    </div>
  );
}

interface TicketTypeCardProps {
  ticketType: TicketType;
  event: Event;
}

function TicketTypeCard({ ticketType, event }: TicketTypeCardProps) {
  const { user } = useAuth(); // ✅ CORREGIDO
  const { addItem } = useCart();
  const { isInCart, quantity: cartQuantity } = useTicketTypeInCart(ticketType.id);
  const [localQuantity, setLocalQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  // Verificar disponibilidad
  const availability = isTicketTypeAvailableForSale(ticketType);
  const availableStock = getAvailableStock(ticketType);
  const userLimits = canUserBuyTicketType(ticketType, cartQuantity, 0); // TODO: obtener compras previas del usuario

  const canPurchase = availability.available && userLimits.canBuy;
  const maxQuantity = Math.min(
    availableStock || 999,
    userLimits.maxQuantity,
    5 // Límite máximo por transacción
  );

  const handleAddToCart = async () => {
    if (!canPurchase) return;

    setIsAdding(true);
    try {
      addItem({
        ticket_type_id: ticketType.id,
        ticket_type_name: ticketType.name,
        quantity: localQuantity,
        unit_price: ticketType.price,
        currency: ticketType.currency,
        event_id: event.id,
      });

      // Reset cantidad local después de añadir
      setLocalQuantity(1);
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const getStatusBadge = () => {
    if (!availability.available) {
      return (
        <Badge variant="destructive" className="mb-3">
          {availability.reason}
        </Badge>
      );
    }

    if (availableStock && availableStock <= 10) {
      return (
        <Badge variant="outline" className="mb-3 border-orange-300 text-orange-700">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Solo {availableStock} disponibles
        </Badge>
      );
    }

    if (isInCart) {
      return (
        <Badge variant="outline" className="mb-3 border-green-300 text-green-700">
          <Check className="h-3 w-3 mr-1" />
          {cartQuantity} en carrito
        </Badge>
      );
    }

    return null;
  };

  const getAccessDescription = () => {
    switch (ticketType.access_type) {
      case 'all_days':
        return 'Acceso todos los días del evento';
      case 'specific_days':
        return `Acceso días específicos (${ticketType.available_days?.length || 0} días)`;
      case 'any_single_day':
        return 'Acceso un día a elegir';
      default:
        return 'Acceso al evento';
    }
  };

  return (
    <Card className={`relative overflow-hidden transition-all duration-200 ${
      canPurchase ? 'hover:shadow-lg hover:scale-[1.02]' : 'opacity-75'
    }`}>
      {/* Destacar tipos populares o limitados */}
      {ticketType.name.toLowerCase().includes('vip') && (
        <div className="absolute top-0 right-0 bg-gradient-to-l from-yellow-500 to-orange-500 text-white px-3 py-1 text-xs font-medium">
          ⭐ Premium
        </div>
      )}

      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-xl mb-2">{ticketType.name}</CardTitle>
            {ticketType.public_description && (
              <p className="text-gray-600 text-sm leading-relaxed">
                {ticketType.public_description}
              </p>
            )}
          </div>
          <div className="text-right ml-4">
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(ticketType.price, ticketType.currency as 'MXN' | 'USD' | 'EUR' | 'GBP')}
            </div>
            {ticketType.currency === 'USD' && (
              <div className="text-xs text-gray-500">USD</div>
            )}
          </div>
        </div>

        {getStatusBadge()}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Información de acceso */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Info className="h-4 w-4" />
          <span>{getAccessDescription()}</span>
        </div>

        {/* Características incluidas */}
        {ticketType.features && ticketType.features.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Incluye:</h4>
            <ul className="space-y-1">
              {ticketType.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                  <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Límites y restricciones */}
        {ticketType.limit_per_user && (
          <div className="text-xs text-gray-500">
            Máximo {ticketType.limit_per_user} por persona
          </div>
        )}

        {/* Términos específicos */}
        {ticketType.terms && (
          <div className="text-xs text-gray-500 italic">
            {ticketType.terms}
          </div>
        )}

        {/* Selector de cantidad y botón de compra */}
        {canPurchase && (
          <div className="flex items-center gap-3 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocalQuantity(Math.max(1, localQuantity - 1))}
                disabled={localQuantity <= 1}
                className="h-8 w-8 p-0"
              >
                <Minus className="h-3 w-3" />
              </Button>
              
              <span className="font-medium min-w-[2rem] text-center">
                {localQuantity}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocalQuantity(Math.min(maxQuantity, localQuantity + 1))}
                disabled={localQuantity >= maxQuantity}
                className="h-8 w-8 p-0"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            <Button
              onClick={handleAddToCart}
              disabled={isAdding || !user}
              className="flex-1 flex items-center gap-2"
              size="sm"
            >
              {isAdding ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Añadiendo...
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4" />
                  Añadir al carrito
                </>
              )}
            </Button>
          </div>
        )}

        {/* Mensaje si no puede comprar */}
        {!canPurchase && (
          <div className="pt-4 border-t">
            <Button disabled className="w-full" variant="secondary">
              {!availability.available ? availability.reason : userLimits.reason}
            </Button>
          </div>
        )}

        {/* Mensaje si no está autenticado */}
        {canPurchase && !user && (
          <div className="pt-2">
            <p className="text-xs text-orange-600 text-center">
              Inicia sesión para añadir boletos al carrito
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
