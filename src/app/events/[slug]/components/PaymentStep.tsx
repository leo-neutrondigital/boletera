'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, User, Mail, Phone, Building, ShoppingCart, CheckCircle, UserPlus, Send } from 'lucide-react';
import { useEventFlow, useCurrentStepInfo } from '@/components/event/EventFlowProvider';
import { useAuth } from '@/contexts/AuthContext';
import PaymentButton from './PaymentButton';
import { FlowNavigation } from './FlowNavigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatCurrency } from '@/lib/utils/currency';
import { useToast } from '@/hooks/use-toast';
// 🗑️ Ya no se importan las funciones de preregistro - se usa API route

export function PaymentStep() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const { 
    event, 
    method,
    selectedTickets, 
    customerData, 
    totalAmount,
    goBack 
  } = useEventFlow();
  const stepInfo = useCurrentStepInfo();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);
  // 🆕 Estados para preregistro
  const [preregistroSuccess, setPreregistroSuccess] = useState(false);
  const [preregistroResult, setPreregistroResult] = useState<any>(null);
  // 🤖 ALTCHA state
  const [captchaValid, setCaptchaValid] = useState(false);
  const [altchaLoaded, setAltchaLoaded] = useState(false);
  const altchaWidgetRef = useRef<HTMLDivElement>(null);

  // 🆕 Detectar si es preregistro
  const isPreregistration = method === 'preregister';

  // 🤖 Cargar ALTCHA script
  useEffect(() => {
    if (isPreregistration && !altchaLoaded) {
      // 🤖 Setup listener para evento personalizado
      const handleAltchaVerified = (event: any) => {
        console.log('🤖 React received ALTCHA verification:', event.detail.verified);
        setCaptchaValid(event.detail.verified);
      };
      
      window.addEventListener('altcha-verified', handleAltchaVerified);
      
      const script = document.createElement('script');
      script.type = 'module';
      script.src = 'https://cdn.jsdelivr.net/npm/altcha/dist/altcha.min.js';
      script.onload = () => {
        console.log('🤖 ALTCHA script loaded');
        setAltchaLoaded(true);
      };
      document.head.appendChild(script);
      
      return () => {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
        window.removeEventListener('altcha-verified', handleAltchaVerified);
      };
    }
  }, [isPreregistration, altchaLoaded]);

  // 🤖 Setup ALTCHA widget cuando esté cargado
  useEffect(() => {
    if (altchaLoaded && altchaWidgetRef.current && isPreregistration) {
      console.log('🤖 Setting up ALTCHA widget');
      
      // Crear el elemento ALTCHA
      altchaWidgetRef.current.innerHTML = '<altcha-widget challengeurl="/api/altcha" style="width: 100%; max-width: 400px;"></altcha-widget>';
      
      // Buscar el widget con timeout
      const setupWidget = () => {
        const widget = altchaWidgetRef.current?.querySelector('altcha-widget');
        if (widget) {
          console.log('🤖 ALTCHA widget found, adding listener');
          
          widget.addEventListener('statechange', (ev: any) => {
            console.log('🤖 ALTCHA state event:', ev.detail);
            const isVerified = ev.detail && ev.detail.state === 'verified';
            console.log('🤖 Is verified:', isVerified);
            setCaptchaValid(isVerified);
          });
        } else {
          console.log('🤖 Widget not ready yet, retrying...');
          setTimeout(setupWidget, 500);
        }
      };
      
      // Dar tiempo para que el custom element se registre
      setTimeout(setupWidget, 100);
    }
  }, [altchaLoaded, isPreregistration]);

  // 🔧 ARREGLO: Validación ajustada para permitir compras sin login
  // Para preregistros NO requiere usuario
  // Para compras SÍ requiere customerData (no necesariamente user loggeado)
  if (!event || !selectedTickets.length || !customerData) {
    console.log('❌ PaymentStep - Validation failed:', {
      hasEvent: !!event,
      ticketsCount: selectedTickets.length,
      hasCustomerData: !!customerData,
      method,
      hasUser: !!user
    });
    return (
      <div className="text-center py-8">
        <div className="bg-red-100 border border-red-300 rounded-lg p-4">
          <h3 className="font-bold text-red-800 mb-2">❌ ERROR</h3>
          <p className="text-red-700">
            {method === 'preregister' 
              ? 'Datos incompletos para proceder al preregistro'
              : 'Datos incompletos para proceder al pago'
            }
          </p>
          <button onClick={goBack} className="text-blue-600 underline mt-2">
            ← Volver al paso anterior
          </button>
        </div>
      </div>
    );
  }

  const totalItems = selectedTickets.reduce((sum, ticket) => sum + ticket.quantity, 0);
  const currency = selectedTickets[0]?.currency || 'MXN';

  // 🔧 Función para procesar preregistro usando API route del servidor
  const handlePreregistro = async () => {
    if (!event || !customerData) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Datos incompletos para el preregistro",
      });
      return;
    }

    // 🤖 ALTCHA validation
    if (!captchaValid) {
      toast({
        variant: "destructive",
        title: "Verificación requerida",
        description: "Por favor completa la verificación anti-bot.",
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      console.log('📋 Procesando preregistro vía API route (servidor):', {
        eventId: event.id,
        customerName: customerData.name,
        customerEmail: customerData.email,
        selectedTickets: selectedTickets.length
      });

      // 🔧 USAR API ROUTE DEL SERVIDOR (no llamadas directas desde cliente)
      const response = await fetch('/api/preregistrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_id: event.id,
          customer_data: {
            name: customerData.name,
            email: customerData.email,
            phone: customerData.phone,
            company: customerData.company,
            user_id: customerData.userId || null,
          },
          interested_tickets: selectedTickets.map(ticket => ({
            ticket_type_id: ticket.ticket_type_id,
            ticket_type_name: ticket.ticket_type_name,
            quantity: ticket.quantity,
            unit_price: ticket.unit_price,
            currency: ticket.currency,
            total_price: ticket.total_price,
          })),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error procesando preregistro');
      }

      console.log('✅ Preregistro procesado exitosamente vía API:', result);

      // 🔧 Usar datos de la respuesta de la API
      setPreregistroResult({
        preregistroId: result.preregistration_id,
        eventName: result.details.event_name,
        customerName: customerData.name,
        customerEmail: customerData.email,
        selectedTickets: selectedTickets.map(t => ({ name: t.ticket_type_name, quantity: t.quantity }))
      });
      
      setPreregistroSuccess(true);
      setIsProcessing(false);

      toast({
        title: "¡Preregistro exitoso!",
        description: "Te hemos registrado exitosamente. Te contactaremos pronto.",
      });

    } catch (error) {
      console.error('❌ Error en preregistro:', error);
      setIsProcessing(false);

      toast({
        variant: "destructive",
        title: "Error en el preregistro",
        description: "Hubo un problema registrando tu interés. Inténtalo de nuevo.",
      });
    }
  };

  const handlePaymentSuccess = (details: any) => {
    console.log('✅ Payment successful in PaymentStep:', details);
    
    // 🆕 NORMALIZACIÓN: Detectar formato y extraer datos correctamente
    let normalizedData;
    
    if (details.captureResult) {
      // Formato PayPal: datos anidados
      console.log('📋 Processing PayPal format response');
      normalizedData = {
        orderID: details.orderID || details.orderId, // PayPal usa orderID
        orderId: details.orderID || details.orderId, // Nuestro sistema usa orderId
        payerID: details.payerID,
        paymentId: details.captureResult.paymentId || 'N/A',
        ticketsCreated: details.captureResult.ticketsCreated || 0,
        status: details.captureResult.status || 'COMPLETED',
        userAccount: details.captureResult.userAccount,
        provider: 'paypal',
        ...details.captureResult
      };
    } else {
      // Formato Stripe: datos directos (API response)
      console.log('📋 Processing Stripe format response');
      normalizedData = {
        orderID: details.orderID || details.orderId,
        orderId: details.orderID || details.orderId,
        payerID: details.payerID, // Puede no existir en Stripe
        paymentId: details.paymentId || 'N/A',
        ticketsCreated: details.ticketsCreated || 0,
        status: details.status || 'COMPLETED',
        userAccount: details.userAccount,
        provider: 'stripe',
        ...details
      };
    }
    
    console.log('📋 Normalized payment data:', {
      orderId: normalizedData.orderId,
      ticketsCreated: normalizedData.ticketsCreated,
      status: normalizedData.status,
      provider: normalizedData.provider
    });
    
    setPaymentResult(normalizedData);
    setPaymentSuccess(true);
    setIsProcessing(false);

    toast({
      title: "¡Pago exitoso!",
      description: `Se han creado ${normalizedData.ticketsCreated || 0} boletos. Te enviamos un correo de confirmación.`,
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

  // 🆕 Vista de éxito para preregistro
  if (preregistroSuccess && preregistroResult) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            ¡Preregistro exitoso!
          </h2>
          <p className="text-gray-600">
            Te hemos registrado para el evento
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Detalles de tu preregistro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Evento:</span>
                <p className="font-medium">{preregistroResult.eventName}</p>
              </div>
              <div>
                <span className="text-gray-600">Nombre:</span>
                <p className="font-medium">{preregistroResult.customerName}</p>
              </div>
              <div>
                <span className="text-gray-600">Email:</span>
                <p className="font-medium">{preregistroResult.customerEmail}</p>
              </div>
              <div>
                <span className="text-gray-600">Estado:</span>
                <Badge className="bg-blue-100 text-blue-800">
                  Preregistrado
                </Badge>
              </div>
            </div>

            {preregistroResult.selectedTickets.length > 0 && (
              <div>
                <span className="text-gray-600 block mb-2">Boletos de interés:</span>
                <div className="space-y-1">
                  {preregistroResult.selectedTickets.map((ticket: any, index: number) => (
                    <div key={index} className="text-sm bg-gray-50 p-2 rounded">
                      {ticket.quantity}x {ticket.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">¿Qué sigue ahora?</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-3 p-2 bg-blue-50 rounded">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-xs font-semibold">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-blue-900">Email de confirmación enviado</p>
                    <p className="text-blue-700">Revisa tu bandeja de entrada para la confirmación</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-2 bg-green-50 rounded">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-green-600 text-xs font-semibold">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-green-900">Te contactaremos pronto</p>
                    <p className="text-green-700">En 24-48 horas te escribiremos con más información</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-2 bg-yellow-50 rounded">
                  <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-yellow-600 text-xs font-semibold">3</span>
                  </div>
                  <div>
                    <p className="font-medium text-yellow-900">Acceso prioritario</p>
                    <p className="text-yellow-700">Recibirás información antes que otros interesados</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button
            onClick={() => router.push(`/events/${event.slug || event.id}`)}
            className="px-6 py-3"
          >
            Volver al evento
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/eventos')}
            className="px-6 py-3"
          >
            Ver otros eventos
          </Button>
        </div>

        {/* Debug info en desarrollo */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-gray-100 p-4 rounded text-xs">
            <div><strong>Debug Preregistro Result:</strong></div>
            <pre className="mt-2 whitespace-pre-wrap">
              {JSON.stringify(preregistroResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  }

  // Vista de éxito para compra
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
                  {formatCurrency(totalAmount, currency as 'MXN' | 'USD' | 'EUR' | 'GBP' | undefined)}
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

            {/* Cuenta creada o fallo */}
            {paymentResult.userAccount?.created && (
            <div className="flex items-center gap-2">
            <span className="text-gray-600">Cuenta:</span>
            <Badge className="bg-blue-100 text-blue-800">
            👤 Cuenta creada y sesión iniciada
            </Badge>
            </div>
            )}
            
            {paymentResult.userAccount?.failed && (
            <div className="flex items-center gap-2">
            <span className="text-gray-600">Cuenta:</span>
            <Badge className="bg-yellow-100 text-yellow-800">
            ⚠️ Error al crear cuenta
            </Badge>
            </div>
            )}
              
              {/* 🆕 NUEVO: Caso de email duplicado */}
              {paymentResult.userAccount?.emailExisted && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Cuenta:</span>
                  <Badge className="bg-green-100 text-green-800">
                    🔄 Boletos asociados a cuenta existente
                  </Badge>
                </div>
              )}

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Próximos pasos:</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-3 p-2 bg-blue-50 rounded">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-xs font-semibold">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-blue-900">Email de confirmación enviado</p>
                    <p className="text-blue-700">
                      {paymentResult.userAccount?.failed 
                        ? 'Incluye instrucciones para acceder a tus boletos'
                        : 'Revisa tu bandeja de entrada'
                      }
                    </p>
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
                
                {/* Mensaje especial si falló la creación de cuenta */}
                {paymentResult.userAccount?.failed && (
                  <div className="flex items-start gap-3 p-3 bg-orange-50 rounded border border-orange-200">
                    <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-orange-600 text-xs font-semibold">⚠️</span>
                    </div>
                    <div>
                      <p className="font-medium text-orange-900">Problema con la cuenta</p>
                      <p className="text-orange-700">Tu pago fue exitoso, pero hubo un error al crear tu cuenta. Te enviaremos instrucciones por email para acceder a tus boletos.</p>
                    </div>
                  </div>
                )}
                
                {/* 🆕 NUEVO: Mensaje especial para email duplicado */}
                {paymentResult.userAccount?.emailExisted && (
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded border border-blue-200">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-600 text-xs font-semibold">🔑</span>
                    </div>
                    <div>
                      <p className="font-medium text-blue-900">Boletos asociados a tu cuenta existente</p>
                      <p className="text-blue-700">Detectamos que ya tenías una cuenta con este email. Tus boletos se asociaron automáticamente. <strong>Inicia sesión para verlos.</strong></p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          {/* 🆕 Botón condicional basado en el tipo de compra */}
          {paymentResult.userAccount?.emailExisted ? (
            /* Email duplicado - Botón de Login */
            <button
              onClick={() => router.push('/login')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              🔑 Iniciar Sesión para ver boletos
            </button>
          ) : (
            /* Flujo normal - Botón de configurar */
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
          )}
          
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

  // Vista principal - Detectar si es preregistro o pago
  return (
    <div className="space-y-6">
      {/* Header del paso */}
      <div className="text-center">
        <div className="text-sm text-gray-500 mb-2">
          PASO {stepInfo.step} DE {stepInfo.total}
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {isPreregistration ? 'Confirmar preregistro' : 'Pago seguro'}
        </h2>
        <p className="text-gray-600">
          {isPreregistration 
            ? 'Revisa tus datos y confirma tu preregistro'
            : 'Completa tu compra de forma segura con PayPal'
          }
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* COLUMNA IZQUIERDA - Resumen */}
        <div className="space-y-4">
          {/* Resumen de boletos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isPreregistration ? (
                  <UserPlus className="w-5 h-5" />
                ) : (
                  <ShoppingCart className="w-5 h-5" />
                )}
                {isPreregistration ? 'Resumen de preregistro' : 'Resumen de compra'}
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
                      {isPreregistration 
                        ? `${ticket.quantity} boleto${ticket.quantity !== 1 ? 's' : ''}`
                        : formatCurrency(ticket.total_price, ticket.currency as 'MXN' | 'USD' | 'EUR' | 'GBP' | undefined)
                      }
                    </Badge>
                  </div>
                ))}
              </div>

              {!isPreregistration && (
                <div className="border-t pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total:</span>
                    <span className="text-xl font-bold text-green-600">
                      {formatCurrency(totalAmount, currency as 'MXN' | 'USD' | 'EUR' | 'GBP' | undefined)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {totalItems} boleto{totalItems !== 1 ? 's' : ''} para {event.name}
                  </p>
                </div>
              )}
              
              {isPreregistration && (
                <div className="border-t pt-3">
                  <div className="bg-blue-50 p-3 rounded">
                    <p className="text-sm text-blue-800">
                      <strong>Preregistro sin costo.</strong> Te contactaremos con información sobre precios y disponibilidad.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Datos del cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                {isPreregistration ? 'Datos de contacto' : 'Datos del comprador'}
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
                  ✅ Se creará tu cuenta automáticamente y se iniciará sesión
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* COLUMNA DERECHA - Preregistro o PayPal */}
        <div>
          {isPreregistration ? (
            /* Interfaz de Preregistro */
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Confirmar preregistro
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isProcessing && (
                  <Alert className="bg-blue-50 border-blue-200 mb-4">
                    <AlertDescription className="text-blue-800">
                      Procesando preregistro... No cierres esta ventana.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">¿Qué incluye tu preregistro?</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Contacto personalizado en 24-48 horas</li>
                      <li>• Información sobre precios y disponibilidad</li>
                      <li>• Acceso prioritario cuando abra la venta</li>
                      <li>• Sin compromiso de compra</li>
                    </ul>
                  </div>

                  {/* 🤖 ALTCHA Component */}
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Verificación anti-bot</h4>
                    {altchaLoaded ? (
                      <div 
                        ref={altchaWidgetRef}
                        className="min-h-[60px] flex items-center justify-center"
                      />
                    ) : (
                      <div className="min-h-[60px] flex items-center justify-center">
                        <div className="text-sm text-gray-500">
                          🤖 Cargando verificación...
                        </div>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handlePreregistro}
                    disabled={isProcessing || !captchaValid} // 🤖 Disabled hasta verificar ALTCHA
                    className="w-full py-3 text-base"
                    size="lg"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Procesando preregistro...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        {captchaValid ? 'Confirmar preregistro' : 'Completa verificación anti-bot'}
                      </>
                    )}
                  </Button>

                  {/* 🆕 Mensaje informativo simple */}
                  <div className="mt-4 text-xs text-green-600 bg-green-50 p-3 rounded">
                    ✅ El preregistro es gratuito y no te compromete a nada
                  </div>
                </div>

                <div className="mt-4 text-xs text-gray-500">
                  <p><strong>Nota:</strong> Al confirmar tu preregistro:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Recibirás un correo de confirmación</li>
                    <li>Te contactaremos en máximo 48 horas</li>
                    <li>Tendrás acceso prioritario cuando abra la venta</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Interfaz de Pago PayPal */
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

                <PaymentButton
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
          )}
        </div>
      </div>

      {/* Navegación - Mantener botón Atrás pero ocultar Next (duplicado) */}
      <FlowNavigation
        showBack={event.allow_preregistration}    // Solo mostrar atrás si vino del paso method
        hideNext={true}                           // ❌ Ocultar botón Next (duplicado)
        nextLabel={isPreregistration ? "Confirmar Preregistros" : "Procesar Pago"}
        nextDisabled={isPreregistration ? isProcessing : true} // PayPal maneja su propio botón, preregistro debe estar habilitado
        customNextAction={isPreregistration ? handlePreregistro : undefined} // Preregistro usa botón de navegación
      />
    </div>
  );
}
