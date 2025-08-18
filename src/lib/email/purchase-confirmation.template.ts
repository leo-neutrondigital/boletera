import { formatEventDates } from '@/lib/utils/event-dates';
import { formatCurrency } from '@/lib/utils/currency';

// 🆕 Template SIMPLIFICADO para email de confirmación de compra
export interface PurchaseConfirmationEmailData {
  customer_name: string;
  customer_email: string;
  event_name: string;
  event_date: string;
  event_location: string;
  order_id: string;
  total_amount: string;
  tickets_count: number;
  account_created: boolean;
  app_url: string;
}

export function generatePurchaseConfirmationEmailHTML(data: PurchaseConfirmationEmailData): string {
  const { customer_name, event_name, event_date, event_location, order_id, total_amount, tickets_count, account_created, app_url } = data;
  
  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Compra confirmada</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px;">
        <div style="background-color: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 24px;">¡Compra exitosa!</h1>
            <p style="margin: 10px 0 0 0;">Tu pago fue procesado correctamente</p>
        </div>
        <h2 style="color: #333;">¡Hola ${customer_name}!</h2>
        <p style="color: #666; line-height: 1.5;">
            Te confirmamos que tu compra de <strong>${tickets_count} boleto${tickets_count > 1 ? 's' : ''}</strong> 
            para <strong>${event_name}</strong> fue procesada exitosamente.
        </p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #333;">Detalles de tu compra</h3>
            <p style="margin: 5px 0;"><strong>Evento:</strong> ${event_name}</p>
            <p style="margin: 5px 0;"><strong>Fecha:</strong> ${event_date}</p>
            <p style="margin: 5px 0;"><strong>Ubicación:</strong> ${event_location}</p>
            <p style="margin: 5px 0;"><strong>Orden:</strong> ${order_id}</p>
            <p style="margin: 5px 0;"><strong>Boletos:</strong> ${tickets_count}</p>
            <p style="margin: 5px 0;"><strong>Total:</strong> ${total_amount}</p>
        </div>
        ${account_created ? `<div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #1e40af;">Cuenta creada</h3>
            <p style="margin: 0; color: #1e3a8a;">
                Se creó tu cuenta con el email ${data.customer_email} exitosamente.
            </p>
        </div>` : ''}
        <div style="background-color: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #047857;">Próximos pasos</h3>
            <ol style="color: #065f46; margin: 0; padding-left: 20px;">
                <li>Configura los asistentes de cada boleto</li>
                <li>Genera los boletos con códigos QR</li>
                <li>Descarga o imprime tus boletos</li>
                <li>Presenta el QR en la entrada del evento</li>
            </ol>
        </div>
        <div style="text-align: center; margin: 30px 0;">
            <a href="${app_url}/my-tickets/${order_id}" 
               style="background-color: #10b981; color: white; text-decoration: none; 
                      padding: 12px 24px; border-radius: 6px; display: inline-block;">
                Configurar mis boletos
            </a>
        </div>
        <div style="background-color: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #0c4a6e;">Información importante</h3>
            <ul style="color: #075985; margin: 0; padding-left: 20px;">
                <li>Guarda este email como comprobante</li>
                <li>Los boletos finales se enviarán una vez configurados</li>
                <li>Puedes modificar datos hasta el día del evento</li>
                <li>Contáctanos con tu número de orden para dudas</li>
            </ul>
        </div>
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #999; margin: 0;">¿Dudas? Visita ${app_url}</p>
        </div>
        <div style="background-color: #374151; color: #d1d5db; padding: 15px; text-align: center; border-radius: 8px; margin-top: 20px;">
            <p style="margin: 0;">Gracias por tu compra. ¡Nos vemos en el evento!</p>
        </div>
    </div>
</body>
</html>`;
}

// Versión texto simplificada
export function generatePurchaseConfirmationEmailText(data: PurchaseConfirmationEmailData): string {
  const { customer_name, event_name, event_date, event_location, order_id, total_amount, tickets_count, account_created, app_url } = data;
  
  return `¡Compra exitosa!

¡Hola ${customer_name}!

Te confirmamos que tu compra de ${tickets_count} boleto${tickets_count > 1 ? 's' : ''} para "${event_name}" fue procesada exitosamente.

DETALLES:
- Evento: ${event_name}
- Fecha: ${event_date}
- Ubicación: ${event_location}
- Orden: ${order_id}
- Boletos: ${tickets_count}
- Total: ${total_amount}

${account_created ? `CUENTA CREADA:
Se creó tu cuenta con el email ${data.customer_email} exitosamente.

` : ''}PRÓXIMOS PASOS:
1. Configura los asistentes de cada boleto
2. Genera los boletos con códigos QR
3. Descarga o imprime tus boletos
4. Presenta el QR en la entrada del evento

CONFIGURA TUS BOLETOS:
${app_url}/my-tickets/${order_id}

INFORMACIÓN IMPORTANTE:
- Guarda este email como comprobante
- Los boletos finales se enviarán una vez configurados
- Puedes modificar datos hasta el día del evento
- Contáctanos con tu número de orden para dudas

¿Dudas? Visita ${app_url}

Gracias por tu compra. ¡Nos vemos en el evento!`;
}
