'use client';

import { useEffect } from 'react';
import { getPaymentProvider, getCurrentProviderInfo, logProviderInfo } from '@/lib/payments/providers';
import { PayPalButton } from './PayPalButton';
import { StripeButton } from './StripeButton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CreditCard } from 'lucide-react';

interface PaymentButtonProps {
  onSuccess: (details: any) => void;
  onError: (error: any) => void;
  disabled?: boolean;
}

export default function PaymentButton(props: PaymentButtonProps) {
  const provider = getPaymentProvider();
  const providerInfo = getCurrentProviderInfo();

  // Debug en desarrollo
  useEffect(() => {
    logProviderInfo();
  }, []);

  // Verificar configuración
  if (!providerInfo.isConfigured) {
    return (
      <Alert className="bg-red-50 border-red-200">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-red-800">
          <div className="space-y-2">
            <p className="font-medium">Error de configuración de pagos</p>
            <p className="text-sm">
              El proveedor de pagos {providerInfo.displayName} no está configurado correctamente.
            </p>
            {process.env.NODE_ENV === 'development' && (
              <div className="text-xs bg-red-100 p-2 rounded mt-2">
                <p>Proveedor actual: {provider}</p>
                <p>Variables necesarias:</p>
                <ul className="ml-4">
                  {provider === 'paypal' ? (
                    <>
                      <li>• NEXT_PUBLIC_PAYPAL_CLIENT_ID</li>
                      <li>• PAYPAL_CLIENT_SECRET</li>
                    </>
                  ) : (
                    <>
                      <li>• NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</li>
                      <li>• STRIPE_SECRET_KEY</li>
                    </>
                  )}
                </ul>
              </div>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Renderizar el componente correspondiente
  if (provider === 'stripe') {
    return (
      <div className="space-y-2">
        {/* Header informativo */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <CreditCard className="w-4 h-4" />
          <span>Pago seguro con Stripe</span>
        </div>
        
        <StripeButton {...props} />
        
        {/* Footer informativo */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
            🔧 Dev: Usando Stripe como proveedor de pagos
          </div>
        )}
      </div>
    );
  }

  // Default: PayPal
  return (
    <div className="space-y-2">
      {/* Header informativo */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <div className="w-4 h-4 bg-blue-600 rounded-sm flex items-center justify-center">
          <span className="text-white text-xs font-bold">P</span>
        </div>
        <span>Pago seguro con PayPal</span>
      </div>
      
      <PayPalButton {...props} />
      
      {/* Footer informativo */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
          🔧 Dev: Usando PayPal como proveedor de pagos
        </div>
      )}
    </div>
  );
}

// Hook para componentes que necesiten saber el proveedor actual
export function usePaymentProvider() {
  const provider = getPaymentProvider();
  const providerInfo = getCurrentProviderInfo();
  
  return {
    provider,
    providerInfo,
    isPayPal: provider === 'paypal',
    isStripe: provider === 'stripe',
    isConfigured: providerInfo.isConfigured,
    displayName: providerInfo.displayName,
    supportedCurrencies: providerInfo.supportedCurrencies,
  };
}
