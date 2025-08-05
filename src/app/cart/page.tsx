import { Metadata } from 'next';
import { CartPageClient } from './cart-page-client';

export const metadata: Metadata = {
  title: 'Carrito de Compras | Boletera',
  description: 'Revisa y confirma tu selección de boletos',
};

export default function CartPage() {
  return <CartPageClient />;
}
