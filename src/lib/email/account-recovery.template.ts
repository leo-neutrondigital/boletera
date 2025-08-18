import { formatEventDates } from '@/lib/utils/event-dates';
import { formatCurrency } from '@/lib/utils/currency';

// 🆕 Template para email de recuperación de cuenta
export interface AccountRecoveryEmailData {
  customer_name: string;
  customer_email: string;
  event: {
    name: string;
    start_date: Date;
    end_date: Date;
    location: string;
  };
  order_id: string;
  payment_amount: number;
  currency: string;
  tickets_count: number;
  support_email?: string;
  app_url: string;
}

export function generateAccountRecoveryEmailHTML(data: AccountRecoveryEmailData): string {
  const { customer_name, event, order_id, payment_amount, currency, tickets_count, support_email, app_url } = data;
  const eventDatesText = formatEventDates(event.start_date, event.end_date);
  const amountFormatted = formatCurrency(payment_amount, currency);
  
  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Acceso a tus boletos</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px;">
        <div style="background-color: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 24px;">Acceso a tus boletos</h1>
            <p style="margin: 10px 0 0 0;">Tu pago fue exitoso, aquí tienes la información de acceso</p>
        </div>
        
        <h2 style="color: #333;">¡Hola ${customer_name}!</h2>
        
        <p style="color: #666; line-height: 1.5;">
            Te confirmamos que <strong>tu pago fue procesado exitosamente</strong> por <strong>${amountFormatted}</strong> 
            para <strong>${tickets_count} boleto${tickets_count > 1 ? 's' : ''}</strong> de <strong>${event.name}</strong>.
        </p>

        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <h3 style="margin: 0 0 15px 0; color: #92400e;">Problema con la creación de cuenta</h3>
            <p style="color: #78350f; margin: 0 0 15px 0; line-height: 1.5;">
                Hubo un problema técnico al crear tu cuenta automáticamente, pero 
                <strong>no te preocupes</strong> - tus boletos están seguros y listos.
            </p>
            <p style="color: #78350f; margin: 0; line-height: 1.5;">
                Nuestro equipo de soporte te contactará pronto para ayudarte a acceder 
                a tus boletos o puedes contactarnos directamente.
            </p>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #333;">Detalles de tu compra</h3>
            <p style="margin: 5px 0;"><strong>Evento:</strong> ${event.name}</p>
            <p style="margin: 5px 0;"><strong>Fecha:</strong> ${eventDatesText}</p>
            <p style="margin: 5px 0;"><strong>Ubicación:</strong> ${event.location}</p>
            <p style="margin: 5px 0;"><strong>Número de orden:</strong> ${order_id}</p>
            <p style="margin: 5px 0;"><strong>Boletos:</strong> ${tickets_count} boleto${tickets_count > 1 ? 's' : ''}</p>
            <p style="margin: 5px 0;"><strong>Total pagado:</strong> ${amountFormatted}</p>
        </div>

        <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #047857;">Cómo acceder a tus boletos</h3>
            
            <div style="margin-bottom: 20px;">
                <h4 style="margin: 0 0 10px 0; color: #065f46;">Opción 1: Crear cuenta ahora (Recomendado)</h4>
                <ul style="color: #065f46; margin: 0; padding-left: 20px; line-height: 1.5;">
                    <li>Ve a <a href="${app_url}/register" style="color: #047857;">crear cuenta</a> con este email: <strong>${data.customer_email}</strong></li>
                    <li><strong>Tus boletos se vincularán automáticamente</strong> al crear la cuenta</li>
                    <li>Usarás la misma contraseña que elegiste durante la compra</li>
                    <li>Acceso inmediato a todos tus boletos</li>
                </ul>
            </div>
            
            <div>
                <h4 style="margin: 0 0 10px 0; color: #065f46;">Opción 2: Contacta a soporte</h4>
                <ul style="color: #065f46; margin: 0; padding-left: 20px; line-height: 1.5;">
                    <li>Envía un email con tu <strong>número de orden: ${order_id}</strong></li>
                    <li>Nuestro equipo te enviará los boletos en menos de 24 horas</li>
                    <li>Incluye tu nombre completo: <strong>${customer_name}</strong></li>
                </ul>
            </div>
        </div>

        ${support_email ? `<div style="text-align: center; margin: 30px 0;">
            <a href="mailto:${support_email}?subject=Acceso a boletos - Orden ${order_id}&body=Hola,%0A%0ANecesito acceso a mis boletos.%0A%0ANombre: ${customer_name}%0AEmail: ${data.customer_email}%0ANúmero de orden: ${order_id}%0AEvento: ${event.name}%0A%0AGracias" 
               style="background-color: #f59e0b; color: white; text-decoration: none; 
                      padding: 12px 24px; border-radius: 6px; display: inline-block;">
                Contactar Soporte
            </a>
        </div>` : `<div style="text-align: center; margin: 30px 0;">
            <a href="${app_url}/contact" 
               style="background-color: #f59e0b; color: white; text-decoration: none; 
                      padding: 12px 24px; border-radius: 6px; display: inline-block;">
                Contactar Soporte
            </a>
        </div>`}

        <div style="background-color: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #0c4a6e;">Importante</h3>
            <ul style="color: #075985; margin: 0; padding-left: 20px;">
                <li><strong>Tu pago fue procesado exitosamente</strong> - no necesitas pagar de nuevo</li>
                <li>Tus boletos están guardados de forma segura en nuestro sistema</li>
                <li>Guarda este email como comprobante de compra</li>
                <li>Te ayudaremos a resolver este inconveniente rápidamente</li>
            </ul>
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #999; margin: 0;">¿Dudas adicionales? Visita ${app_url}</p>
        </div>

        <div style="background-color: #374151; color: #d1d5db; padding: 15px; text-align: center; border-radius: 8px; margin-top: 20px;">
            <p style="margin: 0;">Gracias por tu compra. Lamentamos el inconveniente y lo resolveremos pronto.</p>
        </div>
    </div>
</body>
</html>`;
}

// Versión texto plano para email de recuperación
export function generateAccountRecoveryEmailText(data: AccountRecoveryEmailData): string {
  const { customer_name, event, order_id, payment_amount, currency, tickets_count, support_email, app_url } = data;
  const eventDatesText = formatEventDates(event.start_date, event.end_date);
  const amountFormatted = formatCurrency(payment_amount, currency);
  
  return `Acceso a tus boletos - ${event.name}

¡Hola ${customer_name}!

Te confirmamos que tu pago fue procesado exitosamente por ${amountFormatted} para ${tickets_count} boleto${tickets_count > 1 ? 's' : ''} de "${event.name}".

PROBLEMA CON LA CREACIÓN DE CUENTA:
Hubo un problema técnico al crear tu cuenta automáticamente, pero no te preocupes - tus boletos están seguros y listos.

DETALLES DE TU COMPRA:
- Evento: ${event.name}
- Fecha: ${eventDatesText}
- Ubicación: ${event.location}
- Número de orden: ${order_id}
- Boletos: ${tickets_count} boleto${tickets_count > 1 ? 's' : ''}
- Total pagado: ${amountFormatted}

CÓMO ACCEDER A TUS BOLETOS:

Opción 1: Crear cuenta ahora (Recomendado)
- Ve a ${app_url}/register con este email: ${data.customer_email}
- Tus boletos se vincularán automáticamente al crear la cuenta
- Usarás la misma contraseña que elegiste durante la compra
- Acceso inmediato a todos tus boletos

Opción 2: Contacta a soporte
- Envía un email con tu número de orden: ${order_id}
- Nuestro equipo te enviará los boletos en menos de 24 horas
- Incluye tu nombre completo: ${customer_name}

IMPORTANTE:
- Tu pago fue procesado exitosamente - no necesitas pagar de nuevo
- Tus boletos están guardados de forma segura en nuestro sistema
- Guarda este email como comprobante de compra
- Te ayudaremos a resolver este inconveniente rápidamente

${support_email ? `Contacto de soporte: ${support_email}` : ''}
Sitio web: ${app_url}

Gracias por tu compra. Lamentamos el inconveniente y lo resolveremos pronto.`;
}
