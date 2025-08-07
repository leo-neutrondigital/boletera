'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { CheckCircle, Download, Mail, Calendar, MapPin, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { getPublicEventBySlug } from '@/lib/api/public-events';
import Link from 'next/link';
import type { Event } from '@/types';

export default function CheckoutSuccessPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  
  const orderId = searchParams.get('order');

  // Cargar evento y detalles de la orden
  useEffect(() => {
    async function loadData() {
      try {
        const slug = params.slug as string;
        const eventData = await getPublicEventBySlug(slug);
        setEvent(eventData);

        // Cargar detalles de la orden si tenemos el ID
        if (orderId && user) {
          const response = await fetch(`/api/orders/${orderId}`, {
            headers: {
              'Authorization': `Bearer ${await user.getIdToken()}`,
            },
          });
          
          if (response.ok) {
            const orderData = await response.json();
            setOrderDetails(orderData);
          }
        }
      } catch (error) {
        console.error('Error loading success page data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params.slug, orderId, user]);

  const handleDownloadTickets = async () => {
    if (!orderId || !user) return;

    try {
      const response = await fetch(`/api/orders/${orderId}/tickets/download`, {
        headers: {
          'Authorization': `Bearer ${await user.getIdToken()}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `boletos-${event?.name || 'evento'}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading tickets:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">Evento no encontrado</div>
          <Link href="/">
            <Button variant="outline">Ir al Inicio</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Éxito */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ¡Compra Exitosa!
          </h1>
          <p className="text-gray-600">
            Tu pago ha sido procesado correctamente y recibirás tus boletos por email.
          </p>
        </div>

        {/* Detalles de la Orden */}
        {orderDetails && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Detalles de tu Compra
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Número de Orden:</span>
                  <div className="font-mono font-medium">{orderId}</div>
                </div>
                <div>
                  <span className="text-gray-600">Total Pagado:</span>
                  <div className="font-semibold text-green-600">
                    ${orderDetails.total_amount} {orderDetails.currency}
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Boletos Comprados:</h4>
                <div className="space-y-2">
                  {orderDetails.cart_snapshot?.items?.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm">{item.ticket_type_name} × {item.quantity}</span>
                      <Badge variant="outline">${item.total_price} {item.currency}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Información del Evento */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {event.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>
                {new Date(event.start_date).toLocaleDateString('es-MX', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="w-4 h-4" />
              <span>{event.location}</span>
            </div>
            {event.contact_email && (
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="w-4 h-4" />
                <span>{event.contact_email}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Acciones */}
        <div className="space-y-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-800 mb-1">
                    Revisa tu Correo Electrónico
                  </h4>
                  <p className="text-blue-700 text-sm mb-3">
                    Te hemos enviado tus boletos a <strong>{user?.email}</strong>. 
                    Si no los encuentras, revisa tu carpeta de spam.
                  </p>
                  {orderDetails && (
                    <Button 
                      onClick={handleDownloadTickets}
                      variant="outline" 
                      size="sm"
                      className="border-blue-300 text-blue-700 hover:bg-blue-100"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Descargar Boletos
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Botones de navegación */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href={`/events/${event.slug}`} className="flex-1">
              <Button variant="outline" className="w-full">
                Ver Evento
              </Button>
            </Link>
            <Link href="/dashboard" className="flex-1">
              <Button variant="outline" className="w-full">
                Mis Boletos
              </Button>
            </Link>
            <Link href="/" className="flex-1">
              <Button className="w-full">
                <Home className="w-4 h-4 mr-2" />
                Ir al Inicio
              </Button>
            </Link>
          </div>
        </div>

        {/* Información adicional */}
        <Card className="mt-8 bg-gray-50">
          <CardContent className="pt-6">
            <h4 className="font-medium mb-2">¿Qué sigue?</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Guarda este email como comprobante de compra</li>
              <li>• Presenta tu boleto QR el día del evento</li>
              <li>• Llega con 15 minutos de anticipación</li>
              {event.terms_and_conditions && (
                <li>• Revisa los términos y condiciones del evento</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
