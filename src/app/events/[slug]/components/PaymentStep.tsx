'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, User, Mail, Phone, Building, ShoppingCart, CheckCircle, ArrowLeft } from 'lucide-react';
import { useEventFlow, useCurrentStepInfo } from '@/components/event/EventFlowProvider';
import { useAuth } from '@/contexts/AuthContext';
import { PayPalButton } from './PayPalButton';
import { FlowNavigation } from './FlowNavigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatCurrency } from '@/lib/utils/currency';
import { useToast } from '@/hooks/use-toast';

export function PaymentStep() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const { 
    event, 
    selectedTickets, 
    customerData, 
    totalAmount,
    goBack 
  } = useEventFlow();
  const stepInfo = useCurrentStepInfo();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);

  if (!event || !selectedTickets.length || !customerData) {
    return (
      <div className="text-center py-8">
        <div className="bg-red-100 border border-red-300 rounded-lg p-4">
          <h3 className="font-bold text-red-800 mb-2">❌ ERROR</h3>
          <p className="text-red-700">Datos incompletos para proceder al pago</p>
          <button onClick={goBack} className="text-blue-600 underline mt-2">
            ← Volver al paso anterior
          </button>
        </div>
      </div>
    );
  }

  const totalItems = selectedTickets.reduce((sum, ticket) => sum + ticket.quantity, 0);
  const currency = selectedTickets[0]?.currency || 'MXN';

  const handlePaymentSuccess = (details: any) => {
    console.log('✅ Payment successful in PaymentStep:', details);
    
    // Asegurar que tenemos el orderId correcto
    const orderId = details.orderID || details.orderId || details.captureResult?.orderId;
    const captureResult = details.captureResult;
    
    console.log('📋 Processing success with orderId:', orderId);
    
    setPaymentResult({
      orderID: orderId, // PayPal usa orderID
      orderId: orderId, // Nuestro sistema usa orderId
      payerID: details.payerID,
      paymentId: captureResult?.paymentId || 'N/A',
      ticketsCreated: captureResult?.ticketsCreated || 0,
      status: captureResult?.status || 'COMPLETED',
      ...captureResult
    });
    
    setPaymentSuccess(true);
    setIsProcessing(false);

    toast({
      title: "¡Pago exitoso!",
      description: `Se han creado ${captureResult?.ticketsCreated || 0} boletos. Te enviamos un correo de confirmación.`,
    });
  };

  const handlePaymentError = (error: any) => {
    console.error('❌ Payment error:', error);
    setIsProcessing(false);

    toast({
      variant: "destructive",
      title: "Error en el pago",
      description: "Hubo un problema procesando tu pago. Intenta de nuevo.",
    });
  };

  // Vista de éxito
  if (paymentSuccess && paymentResult) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            ¡Pago exitoso!
          </h2>
          <p className="text-gray-600">
            Tu compra se ha procesado correctamente
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Resumen de tu compra
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Orden PayPal:</span>
                <p className="font-mono text-xs break-all bg-gray-50 p-1 rounded">
                  {paymentResult.orderId || paymentResult.orderID || 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Pago ID:</span>
                <p className="font-mono text-xs break-all bg-gray-50 p-1 rounded">
                  {paymentResult.paymentId || 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Boletos creados:</span>
                <p className="font-semibold text-lg">{paymentResult.ticketsCreated || 0}</p>
              </div>
              <div>
                <span className="text-gray-600">Total pagado:</span>
                <p className="font-semibold text-green-600">
                  {formatCurrency(totalAmount, currency)}
                </p>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Estado:</span>
              <Badge className="bg-green-100 text-green-800">
                {paymentResult.status || 'COMPLETED'}
              </Badge>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Próximos pasos:</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-3 p-2 bg-blue-50 rounded">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-xs font-semibold">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-blue-900">Email de confirmación enviado</p>
                    <p className="text-blue-700">Revisa tu bandeja de entrada</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-2 bg-yellow-50 rounded">
                  <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-yellow-600 text-xs font-semibold">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-yellow-900">Configura los asistentes</p>
                    <p className="text-yellow-700">Asigna nombres a cada boleto para generar los PDFs</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={() => {
              const orderId = paymentResult.orderId || paymentResult.orderID;
              console.log('🔄 Navigating to my-tickets with orderId:', orderId);
              if (orderId && orderId !== 'undefined') {
                router.push(`/my-tickets/${orderId}`);
              } else {
                console.error('❌ No valid orderId for navigation');
                toast({
                  variant: "destructive",
                  title: "Error",
                  description: "No se pudo obtener el ID de la orden"
                });
              }
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Configurar asistentes
          </button>
          <button
            onClick={() => router.push(`/events/${event.slug || event.id}`)}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Volver al evento
          </button>
        </div>

        {/* Debug info en desarrollo */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-gray-100 p-4 rounded text-xs">
            <div><strong>Debug Payment Result:</strong></div>
            <pre className="mt-2 whitespace-pre-wrap">
              {JSON.stringify(paymentResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  }

  // Vista principal de pago
  return (
    <div className="space-y-6">
      {/* Header del paso */}
      <div className="text-center">
        <div className="text-sm text-gray-500 mb-2">
          PASO {stepInfo.step} DE {stepInfo.total}
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Pago seguro
        </h2>
        <p className="text-gray-600">
          Completa tu compra de forma segura con PayPal
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* COLUMNA IZQUIERDA - Resumen */}
        <div className="space-y-4">
          {/* Resumen de boletos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Resumen de compra
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {selectedTickets.map((ticket) => (
                  <div key={ticket.ticket_type_id} className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">{ticket.ticket_type_name}</span>
                      <span className="text-gray-500 ml-2">× {ticket.quantity}</span>
                    </div>
                    <Badge variant="outline">
                      {formatCurrency(ticket.total_price, ticket.currency)}
                    </Badge>
                  </div>
                ))}
              </div>

              <div className="border-t pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total:</span>
                  <span className="text-xl font-bold text-green-600">
                    {formatCurrency(totalAmount, currency)}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {totalItems} boleto{totalItems !== 1 ? 's' : ''} para {event.name}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Datos del cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Datos del comprador
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-gray-500" />
                <span>{customerData.name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-gray-500" />
                <span>{customerData.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-gray-500" />
                <span>{customerData.phone}</span>
              </div>
              {customerData.company && (
                <div className="flex items-center gap-2 text-sm">
                  <Building className="w-4 h-4 text-gray-500" />
                  <span>{customerData.company}</span>
                </div>
              )}
              {customerData.password && (
                <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                  ✅ Se creará tu cuenta automáticamente
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* COLUMNA DERECHA - PayPal */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Método de pago
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isProcessing && (
                <Alert className="bg-blue-50 border-blue-200 mb-4">
                  <AlertDescription className="text-blue-800">
                    Procesando pago... No cierres esta ventana.
                  </AlertDescription>
                </Alert>
              )}

              <PayPalButton
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                disabled={isProcessing}
              />

              <div className="mt-4 text-xs text-gray-500">
                <p><strong>Nota:</strong> Al completar el pago:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Recibirás un correo de confirmación</li>
                  <li>Podrás configurar los datos de cada asistente</li>
                  <li>Se generarán los boletos finales con códigos QR</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Navegación */}
      <FlowNavigation
        nextLabel="Procesar Pago"
        nextDisabled={true} // El pago se maneja con PayPal
        customNextAction={() => {
          // No hacer nada, el pago se maneja con PayPal
        }}
      />
    </div>
  );
}
