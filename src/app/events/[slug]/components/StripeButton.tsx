'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, CheckCircle, CreditCard } from 'lucide-react';
import { useEventFlow } from '@/components/event/EventFlowProvider';
// import { useRouter } from 'next/navigation'; // 🔧 Comentado mientras se decide si usar redirección automática
import { getStripePublicKey } from '@/lib/payments/providers';

// Configurar Stripe
const stripePromise = loadStripe(getStripePublicKey());

interface StripeButtonProps {
  onSuccess: (details: any) => void;
  onError: (error: any) => void;
  disabled?: boolean;
}

// Componente interno que usa Stripe Elements
function StripeCheckoutForm({ onSuccess, onError, disabled = false }: StripeButtonProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // const router = useRouter(); // 🔧 Comentado mientras se decide si usar redirección automática
  
  const { 
    selectedTickets, 
    customerData, 
    event, 
    totalAmount 
  } = useEventFlow();

  // Validaciones (mismas que PayPalButton)
  if (!selectedTickets.length) {
    return (
      <Alert className="bg-red-50 border-red-200">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-red-800">
          No hay boletos seleccionados
        </AlertDescription>
      </Alert>
    );
  }

  if (!customerData) {
    return (
      <Alert className="bg-yellow-50 border-yellow-200">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-yellow-800">
          Completa tus datos antes de proceder al pago
        </AlertDescription>
      </Alert>
    );
  }

  if (!event) {
    return (
      <Alert className="bg-red-50 border-red-200">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-red-800">
          Error: Información del evento no disponible
        </AlertDescription>
      </Alert>
    );
  }

  // Crear Payment Intent
  const createPaymentIntent = async () => {
    try {
      setError(null);

      const currency = selectedTickets[0]?.currency || 'MXN';
      
      const intentData = {
        tickets: selectedTickets,
        customer: customerData,
        eventId: event.id,
        totalAmount,
        currency: currency.toLowerCase() // Stripe requiere lowercase
      };

      const response = await fetch('/api/payments/stripe/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(intentData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error creando payment intent');
      }

      return result.client_secret;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      onError(err);
      throw err;
    }
  };

  // Procesar pago
  const handleSubmit = async (formEvent: React.FormEvent) => {
    formEvent.preventDefault();

    if (!stripe || !elements) {
      setError('Stripe no está disponible');
      return;
    }

    const card = elements.getElement(CardElement);
    if (!card) {
      setError('Elemento de tarjeta no disponible');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Crear Payment Intent
      const clientSecret = await createPaymentIntent();

      // Confirmar pago
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: card,
          billing_details: {
            name: customerData.name,
            email: customerData.email,
            phone: customerData.phone,
          },
        },
      });

      if (confirmError) {
        throw new Error(confirmError.message || 'Error confirmando el pago');
      }

      if (paymentIntent.status === 'succeeded') {
        // Procesar en el backend (similar a PayPal capture)
        const captureResponse = await fetch('/api/payments/capture', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderID: paymentIntent.id,
            customerData,
            tickets: selectedTickets,
            eventId: event.id,
            provider: 'stripe',
            paymentIntent: paymentIntent
          }),
        });

        const captureResult = await captureResponse.json();

        if (!captureResponse.ok) {
          throw new Error(captureResult.error || 'Error procesando la compra');
        }

        // Éxito - llamar callback
        onSuccess(captureResult);
        
        // 🔧 REDIRECCIÓN AUTOMÁTICA (comentado para testing)
        // Descomenta la siguiente línea si prefieres redirección automática a my-tickets
        // router.push(`/my-tickets/${paymentIntent.id}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error procesando el pago';
      setError(errorMessage);
      onError(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Mostrar error si existe */}
      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Resumen del pago */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-2">Resumen del pago</h3>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">
            {selectedTickets.reduce((sum, ticket) => sum + ticket.quantity, 0)} boleto(s)
          </span>
          <span className="font-bold text-lg">
            ${totalAmount.toFixed(2)} {selectedTickets[0]?.currency || 'MXN'}
          </span>
        </div>
      </div>

      {/* Formulario de pago */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Información de la tarjeta
          </label>
          <div className="p-3 border rounded-md bg-white">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                },
                hidePostalCode: false,
              }}
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={!stripe || disabled || isProcessing}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Procesando pago...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Pagar ${totalAmount.toFixed(2)} {selectedTickets[0]?.currency || 'MXN'}
            </>
          )}
        </Button>
      </form>

      {/* Info de seguridad */}
      <div className="text-xs text-gray-500 text-center">
        <CheckCircle className="w-3 h-3 inline mr-1" />
        Pago seguro procesado por Stripe
      </div>
    </div>
  );
}

// Componente principal que envuelve con Elements
export function StripeButton(props: StripeButtonProps) {
  const [isStripeLoaded, setIsStripeLoaded] = useState(false);

  useEffect(() => {
    // Verificar que Stripe se cargue
    stripePromise.then((stripe) => {
      setIsStripeLoaded(!!stripe);
    });
  }, []);

  if (!isStripeLoaded) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Cargando Stripe...</span>
      </div>
    );
  }

  return (
    <Elements 
      stripe={stripePromise}
      options={{
        appearance: {
          theme: 'stripe',
        },
      }}
    >
      <StripeCheckoutForm {...props} />
    </Elements>
  );
}
