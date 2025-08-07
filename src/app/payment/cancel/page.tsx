'use client';

import { useRouter } from 'next/navigation';
import { XCircle, ArrowLeft, Home } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function PaymentCancelPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-yellow-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Pago cancelado
          </h1>
          <p className="text-gray-600">
            No se ha procesado ningún cargo
          </p>
        </div>

        {/* Información */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>¿Qué pasó?</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertDescription className="text-yellow-800">
                Cancelaste el pago en PayPal. No se ha realizado ningún cargo a tu cuenta.
              </AlertDescription>
            </Alert>

            <div className="mt-4 text-sm text-gray-600 space-y-2">
              <p>
                <strong>Tu carrito sigue disponible:</strong> Puedes regresar y completar la compra cuando estés listo.
              </p>
              <p>
                <strong>Los boletos no se han reservado:</strong> Están disponibles para otros compradores.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Acciones */}
        <div className="space-y-3">
          <Button 
            onClick={() => router.back()}
            className="w-full flex items-center justify-center gap-2"
            size="lg"
          >
            <ArrowLeft className="h-4 w-4" />
            Intentar de nuevo
          </Button>

          <Button 
            variant="outline"
            onClick={() => router.push('/')}
            className="w-full flex items-center justify-center gap-2"
            size="lg"
          >
            <Home className="h-4 w-4" />
            Ir al inicio
          </Button>
        </div>

        {/* Soporte */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            ¿Necesitas ayuda?{' '}
            <a href="mailto:soporte@boletera.com" className="text-blue-600 hover:underline">
              Contáctanos
            </a>
          </p>
        </div>

      </div>
    </div>
  );
}
