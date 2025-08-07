'use client';

import { useState } from 'react';
import { X, ShoppingCart, Plus, Minus, CreditCard, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useCart, useCartSummary } from '@/contexts/CartContext';
import { formatCurrency } from '@/lib/utils/currency';
import { useRouter } from 'next/navigation';
import type { Event } from '@/types';

interface CartWidgetProps {
  event: Event;
}

export function CartWidget({ event }: CartWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  
  // Usar try-catch para capturar errores del hook
  let cartData = {
    items: [],
    updateItemQuantity: () => {},
    removeItem: () => {},
    totalAmount: 0,
    currency: 'MXN' as const,
    isLoading: false,
    hasItems: false,
    totalItems: 0,
    formattedTotal: '$0'
  };

  try {
    const { items, updateItemQuantity, removeItem, totalAmount, currency, isLoading } = useCart();
    const { hasItems, totalItems, formattedTotal } = useCartSummary();
    
    cartData = {
      items,
      updateItemQuantity,
      removeItem,
      totalAmount,
      currency,
      isLoading,
      hasItems,
      totalItems,
      formattedTotal,
    };
  } catch (error) {
    console.error('❌ Error accessing cart:', error);
    // Retornar null si no hay carrito disponible
    return null;
  }

  if (!cartData.hasItems) {
    return null; // No mostrar si no hay items
  }

  const handleCheckout = () => {
    setIsOpen(false);
    router.push(`/events/${event.slug}/checkout`);
  };

  return (
    <>
      {/* Botón flotante */}
      <div className="fixed bottom-6 right-6 z-40">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              size="lg"
              className="relative h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <ShoppingCart className="h-6 w-6" />
              {cartData.totalItems > 0 && (
                <Badge 
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs bg-red-500 hover:bg-red-500"
                >
                  {cartData.totalItems > 99 ? '99+' : cartData.totalItems}
                </Badge>
              )}
            </Button>
          </SheetTrigger>

          <SheetContent side="right" className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Tu Carrito
              </SheetTitle>
            </SheetHeader>

            <div className="flex flex-col h-full">
              {/* Items del carrito */}
              <div className="flex-1 py-4 space-y-4 overflow-y-auto">
                {cartData.items.map((item) => (
                  <div key={item.ticket_type_id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-sm">{item.ticket_type_name}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cartData.removeItem(item.ticket_type_id)}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => cartData.updateItemQuantity(item.ticket_type_id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="h-7 w-7 p-0"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        
                        <span className="font-medium text-sm w-8 text-center">
                          {item.quantity}
                        </span>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => cartData.updateItemQuantity(item.ticket_type_id, item.quantity + 1)}
                          className="h-7 w-7 p-0"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="text-right">
                        <div className="text-sm text-gray-600">
                          {formatCurrency(item.unit_price, item.currency)} c/u
                        </div>
                        <div className="font-semibold">
                          {formatCurrency(item.total_price, item.currency)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Resumen y checkout */}
              <div className="border-t pt-4 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total:</span>
                  <span className="text-xl font-bold text-green-600">
                    {formatCurrency(cartData.totalAmount, cartData.currency)}
                  </span>
                </div>

                <Button 
                  onClick={handleCheckout}
                  disabled={cartData.isLoading}
                  className="w-full h-12 text-base"
                  size="lg"
                >
                  {cartData.isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Proceder al Pago
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-gray-500">
                  Tu carrito se guardará por 30 minutos
                </p>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Notificación toast en móvil */}
      {cartData.hasItems && (
        <div className="fixed bottom-6 left-6 right-20 sm:hidden z-30">
          <div 
            className="bg-white border rounded-lg shadow-lg p-3 cursor-pointer"
            onClick={() => setIsOpen(true)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {cartData.totalItems} item{cartData.totalItems !== 1 ? 's' : ''}
                </span>
              </div>
              <span className="text-sm font-semibold text-green-600">
                {cartData.formattedTotal}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
