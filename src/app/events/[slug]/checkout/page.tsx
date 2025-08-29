'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { getPublicEventBySlug } from '@/lib/api/public-events';
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import { ArrowLeft, Clock, CreditCard, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/currency';
import Link from 'next/link';
import type { Event } from '@/types';

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { items, totalAmount, currency, eventId, saveForCheckout, clearCart } = useCart();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar evento
  useEffect(() => {
    async function loadEvent() {
      try {
        const slug = params.slug as string;
        const eventData = await getPublicEventBySlug(slug);
        
        if (!eventData) {
          setError('Evento no encontrado');
          return;
        }
        
        setEvent(eventData);
      } catch (err) {
        console.error('Error loading event:', err);
        setError('Error al cargar el evento');
      } finally {
        setLoading(false);
      }
    }

    loadEvent();
  }, [params.slug]);

  // Verificar autenticación
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push(`/login?redirect=/events/${params.slug}/checkout`);
    }
  }, [isAuthenticated, loading, router, params.slug]);

  // Verificar que haya items en el carrito
  useEffect(() => {
    if (!loading && items.length === 0) {
      router.push(`/events/${params.slug}`);
    }
  }, [items.length, loading, router, params.slug]);

  const handlePayPalApprove = async (data: any) => {
    setProcessing(true);
    try {
      // Guardar carrito y procesar pago
      const cartId = await saveForCheckout();
      
      // Llamar API para confirmar pago
      const response = await fetch('/api/payments/paypal/capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user?.getIdToken()}`,
        },
        body: JSON.stringify({
          orderID: data.orderID || data.id,
          cartId,
          eventId,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Limpiar carrito y redirigir a éxito
        clearCart();
        router.push(`/events/${params.slug}/checkout/success?order=${result.orderId}`);
      } else {
        throw new Error(result.error || 'Error al procesar el pago');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err instanceof Error ? err.message : 'Error al procesar el pago');
    } finally {
      setProcessing(false);
    }
  };

  const handlePayPalError = (err: any) => {
    console.error('PayPal error:', err);
    setError('Error en el procesamiento de PayPal');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error}</div>
          <Link href={`/events/${params.slug}`}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Evento
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!event || !isAuthenticated || items.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href={`/events/${event.slug}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Finalizar Compra</h1>
            <p className="text-gray-600">{event.name}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Resumen del Pedido */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Resumen del Pedido
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item) => (
                  <div key={item.ticket_type_id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                    <div>
                      <h4 className="font-medium">{item.ticket_type_name}</h4>
                      <p className="text-sm text-gray-600">
                        {formatCurrency(item.unit_price, item.currency as 'MXN' | 'USD' | 'EUR' | 'GBP' | undefined)} × {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold">
                        {formatCurrency(item.total_price, item.currency as 'MXN' | 'USD' | 'EUR' | 'GBP' | undefined)}
                      </span>
                    </div>
                  </div>
                ))}
                
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-green-600">
                      {formatCurrency(totalAmount, currency as 'MXN' | 'USD' | 'EUR' | 'GBP' | undefined)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Información del Evento */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Información del Evento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <strong>Evento:</strong> {event.name}
                </div>
                <div>
                  <strong>Fecha:</strong> {new Date(event.start_date).toLocaleDateString()}
                </div>
                <div>
                  <strong>Ubicación:</strong> {event.location}
                </div>
                {event.contact_email && (
                  <div>
                    <strong>Contacto:</strong> {event.contact_email}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Pago */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Método de Pago
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {processing && (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p>Procesando tu pago...</p>
                  </div>
                )}

                {!processing && (
                  <PayPalScriptProvider
                    options={{
                      clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '',
                      currency: currency,
                      intent: 'capture',
                    }}
                  >
                    <PayPalButtons
                      style={{
                        layout: 'vertical',
                        color: 'blue',
                        shape: 'rect',
                        label: 'paypal',
                      }}
                      createOrder={(data, actions) => {
                        return actions.order.create({
                          intent: 'CAPTURE',
                          purchase_units: [
                            {
                              amount: {
                                currency_code: currency,
                                value: totalAmount.toFixed(2),
                              },
                              description: `Boletos para ${event.name}`,
                            },
                          ],
                        });
                      }}
                      onApprove={handlePayPalApprove}
                      onError={handlePayPalError}
                      onCancel={() => {
                        console.log('Payment cancelled');
                      }}
                    />
                  </PayPalScriptProvider>
                )}
              </CardContent>
            </Card>

            {/* Información de Seguridad */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm">
                    <h4 className="font-medium text-blue-800 mb-1">Pago Seguro</h4>
                    <p className="text-blue-700">
                      Tu información de pago está protegida con encriptación SSL de 256 bits. 
                      Procesamos pagos a través de PayPal para garantizar la máxima seguridad.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tiempo límite */}
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div className="text-sm">
                    <h4 className="font-medium text-yellow-800 mb-1">Tiempo Límite</h4>
                    <p className="text-yellow-700">
                      Tu carrito se mantendrá reservado por 30 minutos. 
                      Completa tu compra antes de que expire.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
