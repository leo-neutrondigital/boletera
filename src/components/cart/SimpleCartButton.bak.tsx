'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Event } from '@/types';

interface SimpleCartButtonProps {
  event: Event;
}

export function SimpleCartButton({ event }: SimpleCartButtonProps) {
  const [mounted, setMounted] = useState(false);
  const [cartItems, setCartItems] = useState(0);

  useEffect(() => {
    setMounted(true);
    
    // Simular algunos items en el carrito para testing
    const simulatedItems = Math.floor(Math.random() * 3) + 1;
    setCartItems(simulatedItems);
  }, []);

  if (!mounted || cartItems === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <Button
        size="lg"
        className="relative h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
        onClick={() => {
          console.log('🛒 Cart clicked - would navigate to checkout');
          // router.push(`/events/${event.slug}/checkout`);
        }}
      >
        <ShoppingCart className="h-6 w-6" />
        <Badge 
          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs bg-red-500 hover:bg-red-500"
        >
          {cartItems}
        </Badge>
      </Button>
    </div>
  );
}
