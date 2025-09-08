/**
 * Factory y utilidades para manejar diferentes providers de pago
 * Centraliza la lógica de selección y configuración de providers
 */

export type PaymentProvider = 'paypal' | 'stripe'

/**
 * Obtiene el provider de pago activo desde las variables de entorno
 */
export const getPaymentProvider = (): PaymentProvider => {
  const provider = process.env.NEXT_PUBLIC_PAYMENT_PROVIDER as PaymentProvider
  
  // Validar que sea un provider válido
  if (provider === 'stripe' || provider === 'paypal') {
    return provider
  }
  
  // Default a PayPal para backward compatibility
  return 'paypal'
}

/**
 * Verifica si PayPal está habilitado
 */
export const isPayPalEnabled = (): boolean => {
  return getPaymentProvider() === 'paypal'
}

/**
 * Verifica si Stripe está habilitado
 */
export const isStripeEnabled = (): boolean => {
  return getPaymentProvider() === 'stripe'
}

/**
 * Obtiene la clave pública de Stripe
 */
export const getStripePublicKey = (): string => {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  if (!key && isStripeEnabled()) {
    console.warn('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY no está configurada pero Stripe está habilitado')
  }
  return key || ''
}

/**
 * Verifica si las credenciales de PayPal están configuradas
 */
export const isPayPalConfigured = (): boolean => {
  return !!(
    process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID &&
    process.env.PAYPAL_CLIENT_SECRET
  )
}

/**
 * Verifica si las credenciales de Stripe están configuradas
 * Nota: Solo puede verificar la clave pública en el cliente
 */
export const isStripeConfigured = (): boolean => {
  // En el cliente, solo podemos verificar la clave pública
  if (typeof window !== 'undefined') {
    return !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  }
  
  // En el servidor, podemos verificar ambas
  return !!(
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY &&
    process.env.STRIPE_SECRET_KEY
  )
}

/**
 * Obtiene información del provider actual
 */
export const getCurrentProviderInfo = () => {
  const provider = getPaymentProvider()
  
  return {
    provider,
    isEnabled: provider === 'paypal' ? isPayPalEnabled() : isStripeEnabled(),
    isConfigured: provider === 'paypal' ? isPayPalConfigured() : isStripeConfigured(),
    displayName: provider === 'paypal' ? 'PayPal' : 'Stripe',
    supportedCurrencies: provider === 'paypal' 
      ? ['USD', 'EUR', 'GBP', 'MXN', 'CAD', 'AUD'] 
      : ['USD', 'EUR', 'GBP', 'MXN', 'CAD', 'AUD', 'JPY'], // Stripe soporta más monedas
  }
}

/**
 * Valida que el provider actual esté correctamente configurado
 */
export const validateProviderConfiguration = (): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} => {
  const provider = getPaymentProvider()
  const errors: string[] = []
  const warnings: string[] = []
  
  if (provider === 'paypal') {
    if (!process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID) {
      errors.push('NEXT_PUBLIC_PAYPAL_CLIENT_ID no está configurada')
    }
    if (!process.env.PAYPAL_CLIENT_SECRET) {
      errors.push('PAYPAL_CLIENT_SECRET no está configurada')
    }
    if (!process.env.PAYPAL_SANDBOX_MODE) {
      warnings.push('PAYPAL_SANDBOX_MODE no está definida, se asume producción')
    }
  }
  
  if (provider === 'stripe') {
    if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      errors.push('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY no está configurada')
    }
    // Solo verificar la secret key en el servidor
    if (typeof window === 'undefined' && !process.env.STRIPE_SECRET_KEY) {
      errors.push('STRIPE_SECRET_KEY no está configurada')
    }
    if (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.includes('pk_live_')) {
      warnings.push('Usando claves de Stripe en PRODUCCIÓN')
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Genera las URLs de callback según el provider
 */
export const getProviderCallbackUrls = (baseUrl: string) => {
  const provider = getPaymentProvider()
  
  return {
    success: `${baseUrl}/payment/success`,
    cancel: `${baseUrl}/payment/cancel`,
    webhook: provider === 'stripe' 
      ? `${baseUrl}/api/webhooks/stripe`
      : `${baseUrl}/api/webhooks/paypal`
  }
}

/**
 * Hook para debugging - muestra info del provider en desarrollo
 */
export const logProviderInfo = () => {
  if (process.env.NODE_ENV === 'development') {
    const info = getCurrentProviderInfo()
    const validation = validateProviderConfiguration()
    
    console.log('🔧 Payment Provider Info:', {
      current: info,
      validation,
      env: {
        NODE_ENV: process.env.NODE_ENV,
        PAYMENT_PROVIDER: process.env.NEXT_PUBLIC_PAYMENT_PROVIDER,
      }
    })
  }
}
