'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
//import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils/currency';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { 
    items, 
    totalAmount, 
    totalItems, 
    currency,
    updateItemQuantity, 
    removeItem, 
    clearCart,
    saveForCheckout 
  } = useCart();
  
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCheckout = async () => {
    if (!user) {
      // Redirigir a login con redirección al checkout
      const checkoutUrl = `/checkout`;
      router.push(`/login?redirect=${encodeURIComponent(checkoutUrl)}`);
      onClose();
      return;
    }

    if (items.length === 0) return;

    setIsProcessing(true);
    try {
      const cartId = await saveForCheckout();
      router.push(`/checkout?cart=${cartId}`);
      onClose();
    } catch (error) {
      console.error('Error saving cart for checkout:', error);
      // TODO: Mostrar toast de error
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl z-50 transform transition-transform">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Tu Carrito ({totalItems})
            </h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Contenido */}
          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <ShoppingBag className="h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Tu carrito está vacío
                </h3>
                <p className="text-gray-500 mb-4">
                  Añade boletos para continuar
                </p>
                <Button onClick={onClose} variant="outline">
                  Continuar navegando
                </Button>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {items.map((item) => (
                  <CartItem
                    key={item.ticket_type_id}
                    item={item}
                    onUpdateQuantity={(quantity) => 
                      updateItemQuantity(item.ticket_type_id, quantity)
                    }
                    onRemove={() => removeItem(item.ticket_type_id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t p-4 space-y-4">
              {/* Total */}
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total:</span>
                <span className="text-xl font-bold">
                  {formatCurrency(totalAmount, currency)}
                </span>
              </div>

              {/* Botones de acción */}
              <div className="space-y-2">
                <Button
                  onClick={handleCheckout}
                  disabled={isProcessing}
                  className="w-full"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Procesando...
                    </>
                  ) : (
                    `Proceder al pago - ${formatCurrency(totalAmount, currency)}`
                  )}
                </Button>

                <Button
                  onClick={clearCart}
                  variant="outline"
                  className="w-full"
                  size="sm"
                >
                  Vaciar carrito
                </Button>
              </div>

              {/* Información adicional */}
              {!user && (
                <p className="text-xs text-center text-gray-500">
                  Necesitas iniciar sesión para continuar con la compra
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

interface CartItemProps {
  item: any; // CartItem type
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
}

function CartItem({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">{item.ticket_type_name}</h4>
            <p className="text-sm text-gray-600">
              {formatCurrency(item.unit_price, item.currency)} c/u
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center justify-between">
          {/* Controles de cantidad */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUpdateQuantity(Math.max(1, item.quantity - 1))}
              disabled={item.quantity <= 1}
              className="h-8 w-8 p-0"
            >
              <Minus className="h-3 w-3" />
            </Button>
            
            <span className="font-medium min-w-[2rem] text-center">
              {item.quantity}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUpdateQuantity(item.quantity + 1)}
              className="h-8 w-8 p-0"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>

          {/* Precio total del item */}
          <div className="text-right">
            <p className="font-semibold">
              {formatCurrency(item.total_price, item.currency)}
            </p>
          </div>
        </div>

        {/* Información adicional */}
        {item.selected_days && item.selected_days.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-gray-500">
              Días seleccionados: {item.selected_days.length}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
