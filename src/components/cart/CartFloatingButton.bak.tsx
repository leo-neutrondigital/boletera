'use client';

import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { /*useCart,*/ useCartSummary } from '@/contexts/CartContext';
import { CartDrawer } from './CartDrawer';

export function CartFloatingButton() {
  const { hasItems, totalItems, formattedTotal } = useCartSummary();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // No mostrar si el carrito está vacío
  if (!hasItems) {
    return null;
  }

  return (
    <>
      {/* Botón flotante */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsDrawerOpen(true)}
          size="lg"
          className="rounded-full shadow-lg hover:shadow-xl transition-all duration-200 pr-6 pl-4"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {totalItems > 9 ? '9+' : totalItems}
                </Badge>
              )}
            </div>
            
            <div className="text-left">
              <div className="text-sm font-medium">
                {totalItems} {totalItems === 1 ? 'boleto' : 'boletos'}
              </div>
              <div className="text-xs opacity-90">
                {formattedTotal}
              </div>
            </div>
          </div>
        </Button>
      </div>

      {/* Drawer del carrito */}
      <CartDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
      />
    </>
  );
}
