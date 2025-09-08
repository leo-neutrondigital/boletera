# 📋 Plan de Implementación - Sistema Dual de Pagos (PayPal + Stripe)

## 🎯 Objetivo
Implementar Stripe como segunda opción de pago sin romper la integración actual de PayPal, controlado por variable de entorno.

## 📁 Archivos del Proyecto

### 🆕 NUEVOS ARCHIVOS A CREAR

#### 1. `src/app/events/[slug]/components/StripeButton.tsx`
- Componente similar a PayPalButton pero para Stripe
- Debe mantener la misma interfaz hacia el componente padre
- Usar Stripe Elements para el checkout

#### 2. `src/app/api/payments/stripe/create-intent/route.ts`
- Equivalente a create-order pero para Stripe
- Crear PaymentIntent en lugar de Order
- Mantener estructura de datos consistente

#### 3. `src/app/api/payments/stripe/confirm/route.ts`
- Confirmar el payment intent de Stripe
- Equivalente al capture de PayPal
- Redirigir al capture unificado

#### 4. `src/lib/payments/adapters.ts`
- Adaptadores para unificar respuestas de ambos providers
- PayPal response → Unified format
- Stripe response → Unified format

#### 5. `src/lib/payments/providers.ts`
- Factory pattern para seleccionar provider
- Configuración centralizada
- Funciones helper para detectar provider activo

#### 6. `src/app/events/[slug]/components/PaymentButton.tsx`
- Componente unificado que decide qué provider renderizar
- Switch basado en variable de entorno

### 🔧 ARCHIVOS A MODIFICAR

#### 7. `src/app/events/[slug]/components/CustomerForm.tsx`
- Cambiar `<PayPalButton>` por `<PaymentButton>`
- PaymentButton decidirá cuál provider renderizar

#### 8. `src/app/api/payments/capture/route.ts`
- Agregar lógica para detectar si viene de PayPal o Stripe
- Usar adaptadores para unificar respuestas
- **MANTENER todo el flujo actual intacto**

#### 9. `.env.local`
- Nueva variable para controlar el provider activo
- Variables de configuración de Stripe

## 🏗️ Implementación Paso a Paso

### **FASE 1: Configuración y Dependencias (15 min)**

```bash
npm install @stripe/stripe-js @stripe/react-stripe-js stripe
```

**Variables de entorno en `.env.local`:**
```bash
# Control del provider activo
NEXT_PUBLIC_PAYMENT_PROVIDER=paypal # o stripe

# Configuración de Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# PayPal existente (mantener)
NEXT_PUBLIC_PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
```

### **FASE 2: Crear Adaptadores (30 min)**

**Archivo:** `src/lib/payments/adapters.ts`

```typescript
export interface UnifiedPaymentResponse {
  orderId: string
  status: 'completed' | 'failed' | 'pending'
  amount: number
  currency: string
  provider: 'paypal' | 'stripe'
  providerData: any
}

export const adaptPayPalResponse = (paypalData: any): UnifiedPaymentResponse => ({
  orderId: paypalData.id,
  status: paypalData.status === 'COMPLETED' ? 'completed' : 'failed',
  amount: parseFloat(paypalData.purchase_units[0].amount.value),
  currency: paypalData.purchase_units[0].amount.currency_code,
  provider: 'paypal',
  providerData: paypalData
})

export const adaptStripeResponse = (stripeData: any): UnifiedPaymentResponse => ({
  orderId: stripeData.id,
  status: stripeData.status === 'succeeded' ? 'completed' : 'failed',
  amount: stripeData.amount / 100, // Stripe usa centavos
  currency: stripeData.currency.toUpperCase(),
  provider: 'stripe',
  providerData: stripeData
})
```

### **FASE 3: Provider Factory (20 min)**

**Archivo:** `src/lib/payments/providers.ts`

```typescript
export const getPaymentProvider = (): 'paypal' | 'stripe' => {
  return (process.env.NEXT_PUBLIC_PAYMENT_PROVIDER as 'paypal' | 'stripe') || 'paypal'
}

export const isPayPalEnabled = (): boolean => getPaymentProvider() === 'paypal'
export const isStripeEnabled = (): boolean => getPaymentProvider() === 'stripe'

export const getStripePublicKey = (): string => {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
}
```

### **FASE 4: Crear StripeButton (2 horas)**

**Archivo:** `src/app/events/[slug]/components/StripeButton.tsx`

**Interfaz (debe ser idéntica a PayPalButton):**
```typescript
interface StripeButtonProps {
  total: number
  currency: string
  eventSlug: string
  tickets: any[]
  customerData: any
  onSuccess: () => void
  onError: (error: string) => void
}
```

**Funcionalidad:**
- Usar Stripe Elements para el checkout
- Llamar a `/api/payments/stripe/create-intent`
- Procesar con `/api/payments/stripe/confirm`
- Mantener la misma experiencia de usuario

### **FASE 5: APIs de Stripe (1.5 horas)**

#### `src/app/api/payments/stripe/create-intent/route.ts`
- Crear PaymentIntent con Stripe
- Mantener la misma estructura de datos que create-order
- Incluir metadata necesaria para el capture

#### `src/app/api/payments/stripe/confirm/route.ts`
- Confirmar payment intent
- Agregar metadata para identificar como Stripe
- Redirigir al capture unificado

### **FASE 6: Modificar Capture Unificado (1 hora)**

**Archivo:** `src/app/api/payments/capture/route.ts`

**Cambios mínimos:**
```typescript
// Detectar provider
const provider = req.body.provider || 'paypal'

// Usar adaptadores
const unified = provider === 'stripe' ? 
  adaptStripeResponse(paymentData) : 
  adaptPayPalResponse(paymentData)

// TODO EL RESTO DEL CÓDIGO PERMANECE IGUAL
// - Creación de tickets
// - Creación de usuarios  
// - Envío de emails
// - etc.
```

### **FASE 7: Componente Unificado (30 min)**

**Archivo:** `src/app/events/[slug]/components/PaymentButton.tsx`

```typescript
import { getPaymentProvider } from '@/lib/payments/providers'
import PayPalButton from './PayPalButton'
import StripeButton from './StripeButton'

const PaymentButton = (props: PaymentButtonProps) => {
  const provider = getPaymentProvider()
  
  return provider === 'stripe' ? 
    <StripeButton {...props} /> : 
    <PayPalButton {...props} />
}

export default PaymentButton
```

### **FASE 8: Actualizar CustomerForm (10 min)**

**Cambio en:** `src/app/events/[slug]/components/CustomerForm.tsx`

```typescript
// Cambiar:
import PayPalButton from './PayPalButton'
<PayPalButton {...props} />

// Por:
import PaymentButton from './PaymentButton'
<PaymentButton {...props} />
```

## 🔍 Puntos Críticos de Integración

### 1. **Unificación en Capture**
- El archivo `capture/route.ts` debe detectar el provider
- Usar adaptadores para normalizar respuestas
- Mantener toda la lógica existente intacta

### 2. **Manejo de URLs de Retorno**
- PayPal: `/payment/success?token=...`
- Stripe: `/payment/success?payment_intent=...`
- Ambos deben terminar llamando a `/api/payments/capture`

### 3. **Estructura de Datos Consistente**
```typescript
// Ambos providers deben enviar a capture:
{
  customerData: { /* igual para ambos */ },
  tickets: [ /* igual para ambos */ ],
  provider: 'paypal' | 'stripe',
  paymentData: { /* específico del provider */ }
}
```

### 4. **Preservar Funcionalidad Existente**
- ✅ PayPal debe seguir funcionando exactamente igual
- ✅ Todas las validaciones actuales se mantienen
- ✅ Creación de tickets permanece igual
- ✅ Creación de usuarios permanece igual
- ✅ Envío de emails permanece igual

## ⏱️ Timeline Estimado

| Fase | Tiempo | Prioridad | Estado |
|------|--------|-----------|--------|
| Setup & Dependencias | 15 min | Alta | ⏳ |
| Adaptadores | 30 min | Alta | ⏳ |
| Provider Factory | 20 min | Media | ⏳ |
| StripeButton | 2 horas | Alta | ⏳ |
| Stripe APIs | 1.5 horas | Alta | ⏳ |
| Capture Unificado | 1 hora | **Crítica** | ⏳ |
| Payment Button | 30 min | Media | ⏳ |
| Update CustomerForm | 10 min | Baja | ⏳ |
| Testing Completo | 1 hora | Alta | ⏳ |

**Total Estimado: ~6.5 horas**

## 🚦 Estrategia de Testing

### Checklist de Validación:
- [ ] PayPal sigue funcionando (no romper lo existente)
- [ ] Stripe funciona independientemente
- [ ] Switch entre providers con ENV funciona
- [ ] Ambos providers crean tickets correctamente
- [ ] Ambos providers crean usuarios correctamente
- [ ] Emails se envían correctamente en ambos casos
- [ ] Páginas de success/cancel funcionan para ambos

### Testing por Fases:
1. **Después de cada fase:** Verificar que PayPal sigue funcionando
2. **Después de Stripe APIs:** Probar Stripe independientemente
3. **Después de Capture:** Probar ambos providers end-to-end
4. **Final:** Testing de switch entre providers

## 🚨 Reglas Críticas

### ❌ NO ROMPER:
- Funcionalidad actual de PayPal
- Estructura de base de datos
- APIs existentes de tickets/usuarios
- Flujo de emails

### ✅ MANTENER:
- Misma interfaz de usuario
- Misma experiencia de compra
- Mismos datos en base de datos
- Mismos emails de confirmación

## 🔄 Plan de Rollback

Si algo sale mal:
1. Cambiar `NEXT_PUBLIC_PAYMENT_PROVIDER=paypal`
2. El sistema vuelve a funcionar como antes
3. Solo PayPal estará activo

## 📝 Notas de Implementación

- **Prioridad:** No romper la funcionalidad existente
- **Enfoque:** Aditivo, no sustitutivo
- **Testing:** Continuo en cada fase
- **Rollback:** Inmediato con variable de entorno

---

**Documento creado:** {fecha actual}
**Proyecto:** Boletera - Sistema Dual de Pagos
**Objetivo:** Agregar Stripe manteniendo PayPal funcional