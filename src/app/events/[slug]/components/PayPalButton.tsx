'use client';

import { useState } from 'react';
import { PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useEventFlow } from '@/components/event/EventFlowProvider';
import { useRouter } from 'next/navigation';

interface PayPalButtonProps {
  onSuccess: (details: any) => void;
  onError: (error: any) => void;
  disabled?: boolean;
}

export function PayPalButton({ onSuccess, onError, disabled = false }: PayPalButtonProps) {
  const [{ isResolved, isPending, options }] = usePayPalScriptReducer();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  const { 
    selectedTickets, 
    customerData, 
    event, 
    totalAmount 
  } = useEventFlow();

  // Verificar si PayPal está disponible
  const isPayPalAvailable = options?.clientId && isResolved;

  // Validaciones
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

  // Crear orden
  const createOrder = async () => {
    try {
      setError(null);
      setIsProcessing(true);

      console.log('🔄 Creating PayPal order...');

      const currency = selectedTickets[0]?.currency || 'MXN';
      
      const orderData = {
        tickets: selectedTickets,
        customer: customerData,
        eventId: event.id,
        totalAmount,
        currency
      };

      console.log('📤 Sending order data:', {
        ...orderData,
        customer: {
          ...customerData,
          passwordLength: customerData.password?.length || 0
        }
      });

      const response = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create order');
      }

      console.log('✅ Order created:', result.orderID);

      return result.orderID;

    } catch (error) {
      console.error('❌ Create order error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error creating order';
      setError(errorMessage);
      onError(error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  // 🆕 NUEVA FUNCIÓN: Aprobar y capturar inmediatamente
  const onApprove = async (data: any) => {
    try {
      setIsProcessing(true);
      setError(null);
      
      console.log('✅ Payment approved by user:', data);
      console.log('🔄 Starting immediate capture...');
      
      // Preparar datos para captura
      const captureData = {
        orderID: data.orderID,
        customerData,
        tickets: selectedTickets,
        eventId: event.id
      };

      console.log('📤 Sending capture data:', {
        orderID: captureData.orderID,
        customerEmail: captureData.customerData.email,
        ticketsCount: captureData.tickets.length
      });

      // Capturar inmediatamente
      const captureResponse = await fetch('/api/payments/capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(captureData),
      });

      const captureResult = await captureResponse.json();

      if (!captureResponse.ok) {
        console.error('❌ Capture failed:', captureResult);
        throw new Error(captureResult.error || 'Error capturing payment');
      }

      console.log('✅ Payment captured successfully:', captureResult);

      // 🆕 AUTOLOGIN si se creó cuenta
      if (captureResult.userAccount?.created && captureResult.userAccount.customToken) {
        console.log('🔄 Performing autologin for new account...');
        try {
          const { signInWithCustomToken } = await import('firebase/auth');
          const { auth } = await import('@/lib/firebase/client');
          
          const userCredential = await signInWithCustomToken(auth, captureResult.userAccount.customToken);
          console.log('✅ Autologin successful:', userCredential.user.uid);
          
          // Mostrar mensaje de éxito con cuenta creada
          console.log('👤 New account created and logged in automatically');
        } catch (loginError) {
          console.error('❌ Autologin failed:', loginError);
          // No fallar todo el proceso si falla el autologin
        }
      } else if (captureResult.userAccount?.failed) {
        // 🚨 CASO: Pago exitoso pero creación de cuenta falló
        console.log('⚠️ Payment successful but account creation failed');
        console.log('📧 User will receive recovery instructions via email');
        // El usuario verá un mensaje especial en la UI
      }

      // Llamar callback de éxito con datos completos
      onSuccess({
        orderID: data.orderID,
        payerID: data.payerID,
        captureResult: captureResult,
        // Datos para mostrar en UI
        paymentId: captureResult.paymentId,
        ticketsCreated: captureResult.ticketsCreated,
        status: captureResult.status
      });

    } catch (error) {
      console.error('❌ Payment capture error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Payment capture failed';
      setError(errorMessage);
      onError(error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Cancelar pago
  const onCancel = (data: any) => {
    console.log('⚠️ Payment cancelled:', data);
    setError('Pago cancelado por el usuario');
    router.push('/payment/cancel');
  };

  // Error de PayPal
  const onPayPalError = (err: any) => {
    console.error('❌ PayPal error:', err);
    setError('Error del sistema de pagos. Intenta de nuevo.');
    onError(err);
  };

  // PayPal no disponible
  if (!options?.clientId) {
    return (
      <Alert className="bg-yellow-50 border-yellow-200">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-yellow-800">
          PayPal no está configurado. Verifica las credenciales.
        </AlertDescription>
      </Alert>
    );
  }

  // Loading state
  if (isPending || !isPayPalAvailable) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando PayPal...</p>
          <p className="text-xs text-gray-500 mt-1">
            Esto puede tomar unos segundos
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error display */}
      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Processing overlay */}
      {isProcessing && (
        <Alert className="bg-blue-50 border-blue-200">
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription className="text-blue-800">
            {isProcessing ? 'Procesando pago... No cierres esta ventana.' : 'Creando orden de pago...'}
          </AlertDescription>
        </Alert>
      )}

      {/* PayPal Buttons */}
      <div className={`${isProcessing || disabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <PayPalButtons
          style={{
            layout: 'vertical',
            color: 'blue',
            shape: 'rect',
            label: 'pay',
            height: 45,
            tagline: false
          }}
          createOrder={createOrder}
          onApprove={onApprove}
          onCancel={onCancel}
          onError={onPayPalError}
          disabled={disabled || isProcessing}
          forceReRender={[totalAmount, selectedTickets.length]}
        />
      </div>

      {/* Información de seguridad */}
      <div className="text-xs text-gray-500 text-center mt-4">
        <div className="flex items-center justify-center gap-1 mb-1">
          <CheckCircle className="h-3 w-3 text-green-600" />
          <span>Pago seguro con PayPal</span>
        </div>
        <p>El pago se procesará inmediatamente al confirmar</p>
        
        {/* Debug info en desarrollo */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
            <div><strong>Debug PayPal:</strong></div>
            <div>Client ID: {options?.clientId ? 'Configured' : 'Missing'}</div>
            <div>Is Resolved: {isResolved ? 'Yes' : 'No'}</div>
            <div>Is Pending: {isPending ? 'Yes' : 'No'}</div>
            <div>Total: ${totalAmount} {selectedTickets[0]?.currency}</div>
            <div>Processing: {isProcessing ? 'Yes' : 'No'}</div>
          </div>
        )}
      </div>
    </div>
  );
}
