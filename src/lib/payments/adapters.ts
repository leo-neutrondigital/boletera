/**
 * Adaptadores para unificar respuestas de diferentes providers de pago
 * Convierte las respuestas específicas de cada provider a un formato estándar
 */

export interface UnifiedPaymentResponse {
  orderId: string
  status: 'completed' | 'failed' | 'pending'
  amount: number
  currency: string
  provider: 'paypal' | 'stripe'
  providerData: any
  customerInfo?: {
    email?: string
    name?: string
  }
}

/**
 * Adapta la respuesta de PayPal al formato unificado
 */
export const adaptPayPalResponse = (paypalData: any): UnifiedPaymentResponse => {
  // PayPal structure: https://developer.paypal.com/docs/api/orders/v2/#orders_capture
  const purchaseUnit = paypalData.purchase_units?.[0]
  const payer = paypalData.payer
  
  return {
    orderId: paypalData.id,
    status: paypalData.status === 'COMPLETED' ? 'completed' : 
            paypalData.status === 'PENDING' ? 'pending' : 'failed',
    amount: parseFloat(purchaseUnit?.amount?.value || '0'),
    currency: purchaseUnit?.amount?.currency_code || 'USD',
    provider: 'paypal',
    providerData: paypalData,
    customerInfo: {
      email: payer?.email_address,
      name: payer?.name ? `${payer.name.given_name || ''} ${payer.name.surname || ''}`.trim() : undefined
    }
  }
}

/**
 * Adapta la respuesta de Stripe al formato unificado
 */
export const adaptStripeResponse = (stripeData: any): UnifiedPaymentResponse => {
  // Stripe structure: https://stripe.com/docs/api/payment_intents/object
  return {
    orderId: stripeData.id,
    status: stripeData.status === 'succeeded' ? 'completed' : 
            stripeData.status === 'processing' ? 'pending' : 'failed',
    amount: stripeData.amount / 100, // Stripe usa centavos
    currency: stripeData.currency.toUpperCase(),
    provider: 'stripe',
    providerData: stripeData,
    customerInfo: {
      email: stripeData.receipt_email || stripeData.customer?.email,
      name: stripeData.customer?.name
    }
  }
}

/**
 * Detecta el tipo de respuesta y aplica el adaptador correcto
 */
export const adaptPaymentResponse = (
  paymentData: any, 
  provider?: 'paypal' | 'stripe'
): UnifiedPaymentResponse => {
  // Si se especifica el provider, usar ese adaptador
  if (provider === 'stripe') {
    return adaptStripeResponse(paymentData)
  }
  if (provider === 'paypal') {
    return adaptPayPalResponse(paymentData)
  }
  
  // Auto-detectar basado en la estructura de datos
  if (paymentData.id && paymentData.id.startsWith('pi_')) {
    // Stripe Payment Intent ID starts with 'pi_'
    return adaptStripeResponse(paymentData)
  }
  
  if (paymentData.purchase_units) {
    // PayPal has purchase_units
    return adaptPayPalResponse(paymentData)
  }
  
  // Default a PayPal para backward compatibility
  return adaptPayPalResponse(paymentData)
}

/**
 * Valida que una respuesta unificada sea válida
 */
export const validateUnifiedResponse = (response: UnifiedPaymentResponse): boolean => {
  return !!(
    response.orderId &&
    response.status &&
    response.amount > 0 &&
    response.currency &&
    response.provider
  )
}

/**
 * Convierte una respuesta unificada al formato que espera el capture
 */
export const formatForCapture = (unified: UnifiedPaymentResponse) => {
  return {
    orderId: unified.orderId,
    status: unified.status,
    amount: unified.amount,
    currency: unified.currency,
    provider: unified.provider,
    // Mantener datos originales para debugging
    originalData: unified.providerData
  }
}
