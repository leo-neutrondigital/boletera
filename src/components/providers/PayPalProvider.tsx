'use client';

import { PayPalScriptProvider } from "@paypal/react-paypal-js";

// PayPal configuration
const paypalOptions = {
  clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
  currency: "MXN",
  intent: "capture",
  components: "buttons,marks",
  enableFunding: "venmo,paylater",
  disableFunding: "credit,card",
  dataSdkIntegrationSource: "react-paypal-js"
};

interface PayPalProviderProps {
  children: React.ReactNode;
}

export function PayPalProvider({ children }: PayPalProviderProps) {
  // Solo renderizar PayPal en el cliente y si tenemos el client ID
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  
  if (!clientId) {
    console.warn('PayPal Client ID not found. PayPal functionality will be disabled.');
    return <>{children}</>;
  }

  return (
    <PayPalScriptProvider options={paypalOptions}>
      {children}
    </PayPalScriptProvider>
  );
}
