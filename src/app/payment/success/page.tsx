'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface PaymentResult {
  success: boolean;
  paymentId?: string;
  orderId?: string;
  status?: string;
  ticketsCreated?: number;
  ticketIds?: string[];
  message?: string;
  error?: string;
  nextSteps?: {
    configureTickets?: string;
    eventPage?: string;
  };
}

function PaymentSuccessForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const [debugInfo, setDebugInfo] = useState<any>({});

  // Obtener parámetros de PayPal
  const token = searchParams.get('token'); // PayPal order ID
  const PayerID = searchParams.get('PayerID');

  useEffect(() => {
    async function capturePayment() {
      console.log('🔄 PaymentSuccessPage mounted');
      console.log('📋 URL params:', { token, PayerID });

      if (!token || !PayerID) {
        console.error('❌ Missing required parameters');
        setResult({
          success: false,
          error: 'Parámetros de pago faltantes. La URL debe incluir token y PayerID.'
        });
        setIsProcessing(false);
        return;
      }

      try {
        console.log('🔍 Checking sessionStorage for payment data...');
        
        // Obtener datos del pago desde sessionStorage
        const storedPaymentData = sessionStorage.getItem('paymentData');
        console.log('📦 Stored payment data exists:', !!storedPaymentData);
        
        if (!storedPaymentData) {
          console.error('❌ No payment data in sessionStorage');
          
          // Intentar recuperar datos básicos para debugging
          setDebugInfo({
            hasSessionData: false,
            token,
            PayerID,
            sessionStorageKeys: Object.keys(sessionStorage)
          });
          
          throw new Error('Datos de pago no encontrados. La sesión puede haber expirado.');
        }

        const paymentData = JSON.parse(storedPaymentData);
        console.log('📦 Payment data retrieved:', {
          orderID: paymentData.orderID,
          customerEmail: paymentData.customerData?.email,
          ticketsCount: paymentData.tickets?.length,
          eventId: paymentData.eventId
        });

        setDebugInfo({
          hasSessionData: true,
          paymentDataKeys: Object.keys(paymentData),
          orderIDMatch: paymentData.orderID === token,
          ticketsCount: paymentData.tickets?.length
        });

        // Validar que los datos coincidan
        if (paymentData.orderID !== token) {
          console.warn('⚠️ Order ID mismatch:', {
            fromPayPal: token,
            fromSession: paymentData.orderID
          });
        }

        console.log('🔄 Starting payment capture...');
        
        // Capturar el pago con el backend
        const response = await fetch('/api/payments/capture', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderID: token, // Usar el token de PayPal, no el de session
            customerData: paymentData.customerData,
            tickets: paymentData.tickets,
            eventId: paymentData.eventId
          }),
        });

        console.log('📡 Capture API response status:', response.status);

        const captureResult = await response.json();
        console.log('📋 Capture result:', captureResult);

        if (!response.ok) {
          console.error('❌ Capture API error:', captureResult);
          throw new Error(captureResult.error || 'Error capturando el pago');
        }

        console.log('✅ Payment captured successfully:', captureResult.paymentId);

        // Limpiar datos de pago temporales
        sessionStorage.removeItem('paymentData');
        console.log('🧹 Session data cleaned');

        setResult({
          success: true,
          paymentId: captureResult.paymentId,
          orderId: captureResult.orderId || token,
          status: captureResult.status,
          ticketsCreated: captureResult.ticketsCreated,
          ticketIds: captureResult.ticketIds,
          message: captureResult.message,
          nextSteps: captureResult.nextSteps
        });

        // Mostrar toast de éxito
        toast({
          title: "¡Pago exitoso!",
          description: `Se crearon ${captureResult.ticketsCreated} boletos. Revisa tu email.`,
        });

      } catch (error) {
        console.error('❌ Error capturing payment:', error);
        
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        
        setResult({
          success: false,
          error: errorMessage,
          orderId: token
        });

        toast({
          variant: "destructive",
          title: "Error en el pago",
          description: errorMessage,
        });
      } finally {
        setIsProcessing(false);
      }
    }

    capturePayment();
  }, [token, PayerID, toast]);

  // Loading state
  if (isProcessing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Procesando tu pago...
          </h2>
          <p className="text-gray-600 mb-4">
            Estamos confirmando tu pago con PayPal y creando tus boletos.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <p><strong>Por favor no cierres esta ventana.</strong></p>
            <p>Este proceso puede tomar unos segundos.</p>
          </div>

          {/* Debug info en desarrollo */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 bg-gray-100 p-3 rounded text-xs text-left">
              <div><strong>Debug Info:</strong></div>
              <div>Token: {token || 'missing'}</div>
              <div>PayerID: {PayerID || 'missing'}</div>
              <div>Session Data: {debugInfo.hasSessionData ? 'Found' : 'Missing'}</div>
              {debugInfo.paymentDataKeys && (
                <div>Data Keys: {debugInfo.paymentDataKeys.join(', ')}</div>
              )}
              {debugInfo.orderIDMatch !== undefined && (
                <div>Order Match: {debugInfo.orderIDMatch ? 'Yes' : 'No'}</div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Error state
  if (!result || !result.success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                Error procesando el pago
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-red-50 border-red-200">
                <AlertDescription className="text-red-800">
                  {result?.error || 'Hubo un problema procesando tu pago.'}
                </AlertDescription>
              </Alert>

              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                <p className="font-medium mb-2">Información del pago:</p>
                <p><strong>Token PayPal:</strong> {token || 'No disponible'}</p>
                <p><strong>Payer ID:</strong> {PayerID || 'No disponible'}</p>
                {result?.orderId && (
                  <p><strong>Order ID:</strong> {result.orderId}</p>
                )}
              </div>

              {/* Debug info en desarrollo */}
              {process.env.NODE_ENV === 'development' && debugInfo && (
                <div className="text-xs bg-gray-100 p-3 rounded">
                  <div><strong>Debug Info:</strong></div>
                  <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
                <p><strong>¿Qué hacer ahora?</strong></p>
                <p>Si el pago se procesó en PayPal pero hay un error aquí, contáctanos con el Order ID mostrado arriba.</p>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => router.back()}
                  className="flex-1"
                >
                  Intentar de nuevo
                </Button>
                <Button 
                  onClick={() => router.push('/')}
                  className="flex-1"
                >
                  Ir al inicio
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Success state
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        
        {/* Header de éxito */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ¡Pago exitoso!
          </h1>
          <p className="text-gray-600">
            Tu compra se ha procesado correctamente
          </p>
        </div>

        {/* Detalles del pago */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Resumen de tu compra</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* IDs del pago */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Orden PayPal:</span>
                <p className="font-mono text-xs break-all bg-gray-50 p-2 rounded">
                  {result.orderId}
                </p>
              </div>
              <div>
                <span className="text-gray-600">ID de Pago:</span>
                <p className="font-mono text-xs break-all bg-gray-50 p-2 rounded">
                  {result.paymentId}
                </p>
              </div>
            </div>

            {/* Estado y boletos */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Estado:</span>
                <Badge className="bg-green-100 text-green-800">
                  {result.status}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Boletos creados:</span>
                <span className="font-semibold text-lg">{result.ticketsCreated}</span>
              </div>
            </div>

            {/* Mensaje de éxito */}
            {result.message && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription className="text-green-800">
                  {result.message}
                </AlertDescription>
              </Alert>
            )}

          </CardContent>
        </Card>

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row gap-4">
          
          {/* Configurar boletos */}
          <Button 
            size="lg" 
            className="flex-1 flex items-center justify-center gap-2"
            onClick={() => {
              if (result.nextSteps?.configureTickets) {
                router.push(result.nextSteps.configureTickets);
              } else {
                // Fallback: ir a página de tickets del order
                router.push(`/my-tickets/${result.orderId}`);
              }
            }}
          >
            Configurar asistentes
            <ArrowRight className="h-4 w-4" />
          </Button>

          {/* Volver al evento */}
          <Button 
            variant="outline" 
            size="lg"
            className="flex-1 flex items-center justify-center gap-2"
            onClick={() => {
              if (result.nextSteps?.eventPage) {
                router.push(result.nextSteps.eventPage);
              } else {
                router.push('/');
              }
            }}
          >
            Volver al evento
          </Button>

        </div>

        {/* Información de soporte */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <div className="bg-gray-100 rounded-lg p-4">
            <p className="font-medium text-gray-700 mb-1">¿Necesitas ayuda?</p>
            <p>
              Contáctanos en{' '}
              <a href="mailto:soporte@boletera.com" className="text-blue-600 hover:underline">
                soporte@boletera.com
              </a>
              {' '}o guarda tu Order ID: <code className="bg-white px-1 rounded">{result.orderId}</code>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl shadow-xl">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Cargando...</h1>
            <p className="text-gray-600">Preparando la información de pago</p>
          </CardContent>
        </Card>
      </div>
    }>
      <PaymentSuccessForm />
    </Suspense>
  );
}
