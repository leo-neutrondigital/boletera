'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShoppingBag, Trash2, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CartProvider, useCart } from '@/contexts/CartContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils/currency';

function CartPageContent() {
  const router = useRouter();
  const { user } = useAuthContext();
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

  const handleCheckout = async () => {
    if (!user) {
      router.push('/login?redirect=/cart');
      return;
    }

    if (items.length === 0) return;

    try {
      const cartId = await saveForCheckout();
      router.push(`/checkout?cart=${cartId}`);
    } catch (error) {
      console.error('Error saving cart for checkout:', error);
    }
  };

  const handleContinueShopping = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button
              variant="ghost"
              onClick={handleContinueShopping}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Continuar navegando
            </Button>
            
            <h1 className="text-lg font-semibold">Carrito de Compras</h1>
            
            <div className="w-20"></div> {/* Spacer para centrar el título */}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {items.length === 0 ? (
          <EmptyCart onContinueShopping={handleContinueShopping} />
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Lista de items */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5" />
                    Boletos Seleccionados ({totalItems})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {items.map((item) => (
                    <CartItemCard
                      key={item.ticket_type_id}
                      item={item}
                      onUpdateQuantity={(quantity) => 
                        updateItemQuantity(item.ticket_type_id, quantity)
                      }
                      onRemove={() => removeItem(item.ticket_type_id)}
                    />
                  ))}
                </CardContent>
              </Card>

              <Button
                variant="outline"
                onClick={clearCart}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Vaciar carrito
              </Button>
            </div>

            {/* Resumen */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Resumen de Compra</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(totalAmount, currency)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Boletos ({totalItems}):</span>
                      <span>{totalItems}</span>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Total:</span>
                      <span>{formatCurrency(totalAmount, currency)}</span>
                    </div>
                  </div>

                  <Button
                    onClick={handleCheckout}
                    className="w-full"
                    size="lg"
                  >
                    Proceder al pago
                  </Button>

                  {!user && (
                    <p className="text-xs text-center text-gray-500">
                      Necesitas iniciar sesión para continuar
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Información adicional */}
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-3 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Pago seguro con PayPal</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Boletos enviados por email</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span>Códigos QR únicos</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

interface CartItemCardProps {
  item: any; // CartItem type
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
}

function CartItemCard({ item, onUpdateQuantity, onRemove }: CartItemCardProps) {
  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg">
      <div className="flex-1">
        <h3 className="font-medium text-gray-900">{item.ticket_type_name}</h3>
        <p className="text-sm text-gray-600">
          {formatCurrency(item.unit_price, item.currency)} por boleto
        </p>
        {item.selected_days && item.selected_days.length > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            Días seleccionados: {item.selected_days.length}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
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

        {/* Precio total */}
        <div className="text-right min-w-[80px]">
          <p className="font-semibold">
            {formatCurrency(item.total_price, item.currency)}
          </p>
        </div>

        {/* Botón eliminar */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="text-red-500 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function EmptyCart({ onContinueShopping }: { onContinueShopping: () => void }) {
  return (
    <Card className="text-center py-12">
      <CardContent>
        <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Tu carrito está vacío
        </h2>
        <p className="text-gray-600 mb-6">
          Explora nuestros eventos y añade boletos para continuar
        </p>
        <Button onClick={onContinueShopping}>
          Explorar eventos
        </Button>
      </CardContent>
    </Card>
  );
}

export function CartPageClient() {
  return (
    <CartProvider>
      <CartPageContent />
    </CartProvider>
  );
}
