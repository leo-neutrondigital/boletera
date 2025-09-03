import { formatEventDates } from '@/lib/utils/event-dates';

// 🎯 Template para email de MARKETING de preregistro
export interface PreregistroMarketingEmailData {
  customer_name: string;
  customer_email: string;
  event_name: string;
  event_start_date: Date;
  event_end_date: Date;
  event_location: string;
  event_description?: string;
  interested_tickets?: {
    ticket_type_name: string;
    quantity: number;
    unit_price: number;
    currency: string;
  }[];
  app_url: string;
  event_slug: string; // Para generar la URL directa al evento
}

export function generatePreregistroMarketingEmailHTML(data: PreregistroMarketingEmailData): string {
  const { 
    customer_name, 
    event_name, 
    event_start_date, 
    event_end_date, 
    event_location, 
    interested_tickets,
    app_url,
    event_slug 
  } = data;
  
  // 🔧 ARREGLO: Manejo seguro de fechas
  let eventDatesText;
  try {
    // Asegurar que las fechas sean objetos Date
    const startDate = event_start_date instanceof Date ? event_start_date : new Date(event_start_date);
    const endDate = event_end_date instanceof Date ? event_end_date : new Date(event_end_date);
    eventDatesText = formatEventDates(startDate, endDate);
  } catch (error) {
    console.error('❌ Error formatting event dates in preregistro email:', error);
    eventDatesText = 'Fecha a confirmar';
  }
  
  const eventUrl = `${app_url}/events/${event_slug}`;
  
  return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>¡Tu interés en ${event_name} fue registrado!</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        
        <!-- Header con color corporativo verde sólido -->
        <div style="background: #0B6946; padding: 40px 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700;">
                🎉 ¡Gracias por tu interés!
            </h1>
            <p style="color: #ffffff; margin: 15px 0 0 0; font-size: 18px; font-weight: 500;">
                Te contactaremos en 24-48 horas con información personalizada
            </p>
        </div>

        <!-- Contenido principal -->
        <div style="padding: 40px 30px;">
            
            <!-- Saludo personalizado -->
            <h2 style="color: #1a202c; margin: 0 0 20px 0; font-size: 26px; font-weight: 600;">
                ¡Hola ${customer_name}! 👋
            </h2>
            
            <p style="color: #4a5568; line-height: 1.6; margin: 0 0 30px 0; font-size: 18px;">
                <strong>¡Excelente noticia!</strong> Tu interés en <strong style="color: #d97706;">${event_name}</strong> ha sido registrado exitosamente. 
                Nuestro equipo te contactará próximamente con información exclusiva sobre precios y disponibilidad.
            </p>

            <!-- Tu información registrada - Card prominente con colores sólidos -->
            <div style="background: #fffbeb; border: 2px solid #fbbf24; border-radius: 16px; padding: 30px; margin: 0 0 30px 0;">
                <h3 style="color: #92400e; margin: 0 0 20px 0; font-size: 22px; font-weight: 700;">
                    📋 Tu información registrada
                </h3>
                
                <div style="margin-bottom: 15px;">
                    <strong style="color: #78350f;">Evento:</strong>
                    <span style="color: #92400e; margin-left: 8px; font-weight: 600;">${event_name}</span>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <strong style="color: #78350f;">Fecha:</strong>
                    <span style="color: #92400e; margin-left: 8px; font-weight: 600;">${eventDatesText}</span>
                </div>
                
                <div style="margin-bottom: ${interested_tickets?.length ? '15px' : '0'};">
                    <strong style="color: #78350f;">Ubicación:</strong>
                    <span style="color: #92400e; margin-left: 8px; font-weight: 600;">${event_location}</span>
                </div>

                ${interested_tickets?.length ? `
                <div style="margin-bottom: 0;">
                    <strong style="color: #78350f;">Boletos de interés:</strong>
                    <div style="margin-top: 10px;">
                        ${interested_tickets.map(ticket => `
                        <div style="background: #ffffff; border-radius: 8px; padding: 12px; margin-bottom: 8px; border-left: 4px solid #fbbf24;">
                            <span style="color: #1a202c; font-weight: 600;">${ticket.quantity}x ${ticket.ticket_type_name}</span>
                        </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            </div>

            <!-- Próximos pasos - Card de acción -->
            <div style="background: #ecfdf5; border: 2px solid #10b981; border-radius: 16px; padding: 30px; margin: 0 0 35px 0;">
                <h3 style="color: #047857; margin: 0 0 20px 0; font-size: 22px; font-weight: 700;">
                    📞 PRÓXIMOS PASOS
                </h3>
                
                <div style="display: flex; align-items: flex-start; margin-bottom: 15px;">
                    <div style="background: #10b981; color: #ffffff; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; flex-shrink: 0;">1</div>
                    <div>
                        <strong style="color: #047857; display: block; margin-bottom: 5px;">Nuestro equipo te contactará en 24-48 horas</strong>
                        <p style="color: #065f46; margin: 0; line-height: 1.5;">Te escribiremos para confirmar tu interés y proporcionarte información personalizada sobre precios</p>
                    </div>
                </div>
                
                <div style="display: flex; align-items: flex-start; margin-bottom: 15px;">
                    <div style="background: #10b981; color: #ffffff; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; flex-shrink: 0;">2</div>
                    <div>
                        <strong style="color: #047857; display: block; margin-bottom: 5px;">Recibirás información sobre precios y disponibilidad</strong>
                        <p style="color: #065f46; margin: 0; line-height: 1.5;">Te enviaremos detalles exclusivos sobre los boletos que te interesan</p>
                    </div>
                </div>
                
                <div style="display: flex; align-items: flex-start; margin-bottom: 0;">
                    <div style="background: #10b981; color: #ffffff; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; flex-shrink: 0;">3</div>
                    <div>
                        <strong style="color: #047857; display: block; margin-bottom: 5px;">Tendrás acceso prioritario cuando abra la venta</strong>
                        <p style="color: #065f46; margin: 0; line-height: 1.5;">Te avisaremos antes que al público general para que puedas asegurar tu lugar</p>
                    </div>
                </div>
            </div>

            <!-- CTA Principal - Botón rojo sólido con texto blanco -->
            <div style="background: #E30613; border-radius: 16px; padding: 30px; text-align: center; margin: 0 0 30px 0;">
                <h3 style="color: #ffffff; margin: 0 0 15px 0; font-size: 24px; font-weight: 700;">
                    🎫 ¿NO QUIERES ESPERAR?
                </h3>
                
                <p style="color: #ffffff; margin: 0 0 25px 0; font-size: 16px; line-height: 1.5; opacity: 0.9;">
                    Si prefieres asegurar tu lugar ahora mismo, puedes comprar directamente
                </p>
                
                <a href="${eventUrl}" style="display: inline-block; background: #ffffff; color: #E30613; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 18px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    ¡COMPRAR AHORA!
                </a>
                
                <p style="color: #ffffff; margin: 15px 0 0 0; font-size: 14px; opacity: 0.9;">
                    ⚡ Acceso inmediato • 🔒 Pago seguro con PayPal
                </p>
            </div>

            <!-- Mensaje de tranquilidad -->
            <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 12px; padding: 25px; margin: 0 0 30px 0; text-align: center;">
                <h4 style="color: #0c4a6e; margin: 0 0 10px 0; font-size: 18px; font-weight: 600;">
                    😊 Sin compromiso de compra
                </h4>
                <p style="color: #075985; margin: 0; line-height: 1.6;">
                    Este preregistro no te compromete a nada. Simplemente nos permite ofrecerte la mejor atención personalizada y acceso prioritario.
                </p>
            </div>

            <!-- Información de contacto -->
            <div style="border-top: 1px solid #e2e8f0; padding-top: 25px; text-align: center;">
                <p style="color: #718096; margin: 0 0 10px 0; font-size: 14px;">
                    ¿Tienes preguntas sobre el evento? Responde este email o visita nuestra página
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
            <p style="margin: 0 0 10px 0; font-size: 16px; font-weight: 600; color: #ffffff;">
                ¡Gracias por confiar en nosotros! 🙌
            </p>
            <p style="margin: 0; font-size: 14px;">
                Te contactaremos pronto con información exclusiva sobre ${event_name}
            </p>
        </div>
    </div>
</body>
</html>
  `.trim();
}

// Versión texto plano como fallback
export function generatePreregistroMarketingEmailText(data: PreregistroMarketingEmailData): string {
  const { 
    customer_name, 
    event_name, 
    event_start_date, 
    event_end_date, 
    event_location, 
    interested_tickets,
    app_url,
    event_slug 
  } = data;
  
  // 🔧 ARREGLO: Manejo seguro de fechas
  let eventDatesText;
  try {
    const startDate = event_start_date instanceof Date ? event_start_date : new Date(event_start_date);
    const endDate = event_end_date instanceof Date ? event_end_date : new Date(event_end_date);
    eventDatesText = formatEventDates(startDate, endDate);
  } catch (error) {
    console.error('❌ Error formatting event dates in preregistro email text:', error);
    eventDatesText = 'Fecha a confirmar';
  }
  
  const eventUrl = `${app_url}/events/${event_slug}`;
  
  return `
¡Tu interés en ${event_name} fue registrado! 🎉

¡Hola ${customer_name}!

¡Excelente noticia! Tu interés en ${event_name} ha sido registrado exitosamente. 
Nuestro equipo te contactará próximamente con información exclusiva sobre precios y disponibilidad.

TU INFORMACIÓN REGISTRADA:
- Evento: ${event_name}
- Fecha: ${eventDatesText}  
- Ubicación: ${event_location}

${interested_tickets?.length ? `
BOLETOS DE INTERÉS:
${interested_tickets.map(ticket => `- ${ticket.quantity}x ${ticket.ticket_type_name}`).join('\n')}
` : ''}

PRÓXIMOS PASOS:
1. Nuestro equipo te contactará en 24-48 horas
   Te escribiremos para confirmar tu interés y proporcionarte información personalizada sobre precios

2. Recibirás información sobre precios y disponibilidad  
   Te enviaremos detalles exclusivos sobre los boletos que te interesan

3. Tendrás acceso prioritario cuando abra la venta
   Te avisaremos antes que al público general para que puedas asegurar tu lugar

¿NO QUIERES ESPERAR? 🎫
Si prefieres asegurar tu lugar ahora mismo, puedes comprar directamente:
${eventUrl}

⚡ Acceso inmediato • 🔒 Pago seguro con PayPal

SIN COMPROMISO DE COMPRA 😊
Este preregistro no te compromete a nada. Simplemente nos permite ofrecerte la mejor atención personalizada y acceso prioritario.

¿Tienes preguntas sobre el evento? Responde este email o visita ${app_url}

¡Gracias por confiar en nosotros! 🙌
Te contactaremos pronto con información exclusiva sobre ${event_name}
  `.trim();
}
