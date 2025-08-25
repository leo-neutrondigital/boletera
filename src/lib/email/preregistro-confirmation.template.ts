import { formatEventDates } from '@/lib/utils/event-dates';

// 🆕 Template para email de confirmación de preregistro
export interface PreregistroConfirmationEmailData {
  customer_name: string;
  customer_email: string;
  event_name: string;
  event_start_date: Date;
  event_end_date: Date;
  event_location: string;
  event_description?: string;
  app_url: string;
}

export function generatePreregistroConfirmationEmailHTML(data: PreregistroConfirmationEmailData): string {
  const { customer_name, event_name, event_start_date, event_end_date, event_location, event_description, app_url } = data;
  
  // Usar utilidad existente para fechas
  const eventDatesText = formatEventDates(event_start_date, event_end_date);
  
  return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Preregistro confirmado - ${event_name}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        
        <!-- Header con gradiente azul -->
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">
                📋 ¡Preregistro confirmado!
            </h1>
            <p style="color: #bfdbfe; margin: 10px 0 0 0; font-size: 16px;">
                Te contactaremos pronto con más información
            </p>
        </div>

        <!-- Contenido principal -->
        <div style="padding: 40px 30px;">
            
            <!-- Saludo personalizado -->
            <h2 style="color: #1a202c; margin: 0 0 20px 0; font-size: 24px;">
                ¡Hola ${customer_name}! 👋
            </h2>
            
            <p style="color: #4a5568; line-height: 1.6; margin: 0 0 30px 0; font-size: 16px;">
                Te confirmamos que tu <strong>preregistro para ${event_name}</strong> fue exitoso. 
                Hemos registrado tu interés y te contactaremos próximamente con información sobre la disponibilidad de boletos.
            </p>

            <!-- Información del evento - Card -->
            <div style="background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; margin: 0 0 30px 0;">
                <h3 style="color: #2d3748; margin: 0 0 15px 0; font-size: 20px; font-weight: 600;">
                    📅 Evento de Interés
                </h3>
                
                <div style="margin-bottom: 12px;">
                    <strong style="color: #4a5568;">Evento:</strong>
                    <span style="color: #2d3748; margin-left: 8px;">${event_name}</span>
                </div>
                
                <div style="margin-bottom: 12px;">
                    <strong style="color: #4a5568;">Fecha:</strong>
                    <span style="color: #2d3748; margin-left: 8px;">${eventDatesText}</span>
                </div>
                
                <div style="margin-bottom: ${event_description ? '12px' : '0'};">
                    <strong style="color: #4a5568;">Ubicación:</strong>
                    <span style="color: #2d3748; margin-left: 8px;">${event_location}</span>
                </div>
                
                ${event_description ? `
                <div style="margin-bottom: 0;">
                    <strong style="color: #4a5568;">Descripción:</strong>
                    <span style="color: #2d3748; margin-left: 8px;">${event_description}</span>
                </div>
                ` : ''}
            </div>

            <!-- Qué sigue - Card importante -->
            <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 12px; padding: 25px; margin: 0 0 30px 0;">
                <h3 style="color: #047857; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">
                    📞 ¿Qué sigue ahora?
                </h3>
                
                <ul style="color: #065f46; margin: 0; padding-left: 20px; line-height: 1.6;">
                    <li style="margin-bottom: 8px;">
                        <strong>Te contactaremos personalmente</strong> para confirmar tu interés
                    </li>
                    <li style="margin-bottom: 8px;">
                        <strong>Te informaremos sobre precios</strong> y tipos de boletos disponibles
                    </li>
                    <li style="margin-bottom: 8px;">
                        <strong>Recibirás acceso prioritario</strong> cuando abra la venta oficial
                    </li>
                    <li style="margin-bottom: 0;">
                        <strong>Sin compromiso de compra</strong> - puedes decidir después
                    </li>
                </ul>
            </div>

            <!-- Información de contacto -->
            <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 12px; padding: 25px; margin: 0 0 30px 0;">
                <h3 style="color: #0c4a6e; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">
                    📧 Información Importante
                </h3>
                
                <p style="color: #075985; margin: 0 0 12px 0; line-height: 1.6;">
                    <strong>Email de contacto:</strong> ${data.customer_email}
                </p>
                
                <p style="color: #075985; margin: 0 0 12px 0; line-height: 1.6;">
                    <strong>Estado:</strong> Preregistrado exitosamente
                </p>
                
                <p style="color: #075985; margin: 0; line-height: 1.6;">
                    <strong>Tiempo estimado de contacto:</strong> 24-48 horas hábiles
                </p>
            </div>

            <!-- Información de soporte -->
            <div style="border-top: 1px solid #e2e8f0; padding-top: 25px; text-align: center;">
                <p style="color: #718096; margin: 0 0 10px 0; font-size: 14px;">
                    ¿Tienes dudas sobre tu preregistro? Contáctanos o visita nuestro sitio web
                </p>
                
                <p style="color: #718096; margin: 0; font-size: 14px;">
                    <a href="${app_url}" style="color: #3b82f6; text-decoration: none;">
                        ${app_url.replace('https://', '').replace('http://', '')}
                    </a>
                </p>
            </div>
        </div>

        <!-- Footer -->
        <div style="background: #2d3748; color: #a0aec0; padding: 20px 30px; text-align: center;">
            <p style="margin: 0; font-size: 14px;">
                Este preregistro no constituye una compra. Te contactaremos para el siguiente paso.
            </p>
        </div>
    </div>
</body>
</html>
  `.trim();
}

// Versión texto plano como fallback
export function generatePreregistroConfirmationEmailText(data: PreregistroConfirmationEmailData): string {
  const { customer_name, event_name, event_start_date, event_end_date, event_location, event_description, app_url } = data;
  const eventDatesText = formatEventDates(event_start_date, event_end_date);
  
  return `
¡Preregistro confirmado!

¡Hola ${customer_name}!

Te confirmamos que tu preregistro para "${event_name}" fue exitoso. 
Hemos registrado tu interés y te contactaremos próximamente con información sobre la disponibilidad de boletos.

EVENTO DE INTERÉS:
- Evento: ${event_name}
- Fecha: ${eventDatesText}  
- Ubicación: ${event_location}
${event_description ? `- Descripción: ${event_description}` : ''}

¿QUÉ SIGUE AHORA?
1. Te contactaremos personalmente para confirmar tu interés
2. Te informaremos sobre precios y tipos de boletos disponibles
3. Recibirás acceso prioritario cuando abra la venta oficial
4. Sin compromiso de compra - puedes decidir después

INFORMACIÓN IMPORTANTE:
- Email de contacto: ${data.customer_email}
- Estado: Preregistrado exitosamente
- Tiempo estimado de contacto: 24-48 horas hábiles

¿Tienes dudas sobre tu preregistro? Visita ${app_url}

Este preregistro no constituye una compra. Te contactaremos para el siguiente paso.
  `.trim();
}
