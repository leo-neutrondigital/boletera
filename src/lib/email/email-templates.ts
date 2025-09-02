import { formatEventDates } from '@/lib/utils/event-dates';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils/currency';

export interface EmailTemplateData {
  // Datos del asistente
  attendee_name: string;
  attendee_email: string;
  
  // Datos del evento (ya optimizado - usar estructura existente)
  event: {
    name: string;
    start_date: Date;
    end_date: Date;
    location: string;
    description?: string;
  };
  
  // Datos del boleto
  ticket: {
    id: string;
    order_id: string;
    ticket_type_name: string;
    price: number;
    currency: string;
    pdf_url: string;
    qr_id: string;
  };
  
  // URLs
  app_url: string;
  qr_validation_url: string;
}

export function generateTicketEmailHTML(data: EmailTemplateData): string {
  const { attendee_name, event, ticket, app_url, qr_validation_url } = data;
  
  // Usar utilidad existente para fechas
  const eventDatesText = formatEventDates(event.start_date, event.end_date);
  const eventDateFormatted = format(event.start_date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
  
  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tu boleto para ${event.name}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        
        <!-- Header con color corporativo -->
        <div style="background: #0B6946; padding: 40px 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">
                🎫 ¡Tu boleto está listo!
            </h1>
            <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px;">
                Gracias por registrarte a nuestro evento
            </p>
        </div>

        <!-- Contenido principal -->
        <div style="padding: 40px 30px;">
            
            <!-- Saludo personalizado -->
            <h2 style="color: #1a202c; margin: 0 0 20px 0; font-size: 24px;">
                ¡Hola ${attendee_name}! 👋
            </h2>
            
            <p style="color: #4a5568; line-height: 1.6; margin: 0 0 30px 0; font-size: 16px;">
                Te confirmamos tu registro exitoso para <strong>${event.name}</strong>. 
                Tu boleto ha sido generado y está listo para usar.
            </p>

            <!-- Información del evento - Card -->
            <div style="background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; margin: 0 0 30px 0;">
                <h3 style="color: #2d3748; margin: 0 0 15px 0; font-size: 20px; font-weight: 600;">
                    📅 Detalles del Evento
                </h3>
                
                <div style="margin-bottom: 12px;">
                    <strong style="color: #4a5568;">Evento:</strong>
                    <span style="color: #2d3748; margin-left: 8px;">${event.name}</span>
                </div>
                
                <div style="margin-bottom: 12px;">
                    <strong style="color: #4a5568;">Fecha:</strong>
                    <span style="color: #2d3748; margin-left: 8px;">${eventDatesText}</span>
                </div>
                
                <div style="margin-bottom: 12px;">
                    <strong style="color: #4a5568;">Ubicación:</strong>
                    <span style="color: #2d3748; margin-left: 8px;">${event.location}</span>
                </div>
                
                <div style="margin-bottom: 0;">
                    <strong style="color: #4a5568;">Tipo de boleto:</strong>
                    <span style="color: #2d3748; margin-left: 8px;">${ticket.ticket_type_name}</span>
                </div>
            </div>

            <!-- Información del boleto -->
            <div style="background: #fffbeb; border: 1px solid #fbbf24; border-radius: 12px; padding: 25px; margin: 0 0 30px 0;">
                <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">
                    🎫 Tu Boleto
                </h3>
                
                <div style="margin-bottom: 12px;">
                    <strong style="color: #92400e;">Titular:</strong>
                    <span style="color: #451a03; margin-left: 8px;">${attendee_name}</span>
                </div>
                
                <div style="margin-bottom: 12px;">
                    <strong style="color: #92400e;">Número de orden:</strong>
                    <span style="color: #451a03; margin-left: 8px; font-family: monospace;">${ticket.order_id}</span>
                </div>
                
                <div style="margin-bottom: 0;">
                    <strong style="color: #92400e;">ID de boleto:</strong>
                    <span style="color: #451a03; margin-left: 8px; font-family: monospace;">${ticket.id}</span>
                </div>
            </div>

            <!-- Instrucciones importantes -->
            <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 12px; padding: 25px; margin: 0 0 30px 0;">
                <h3 style="color: #047857; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">
                    📱 Cómo usar tu boleto
                </h3>
                
                <ul style="color: #065f46; margin: 0; padding-left: 20px; line-height: 1.6;">
                    <li style="margin-bottom: 8px;">
                        <strong>Descarga tu boleto</strong> usando el botón de abajo
                    </li>
                    <li style="margin-bottom: 8px;">
                        <strong>Imprímelo</strong> o guárdalo en tu teléfono
                    </li>
                    <li style="margin-bottom: 8px;">
                        <strong>Presenta el código QR</strong> en la entrada del evento
                    </li>
                    <li style="margin-bottom: 0;">
                        <strong>Llega temprano</strong> para evitar filas y disfrutar mejor
                    </li>
                </ul>
            </div>

            <!-- Botón de descarga destacado -->
            <div style="text-align: center; margin: 0 0 30px 0;">
                <a href="${ticket.pdf_url}" 
                   style="display: inline-block; background: #E30613; 
                          color: #ffffff; text-decoration: none; padding: 16px 32px; 
                          border-radius: 8px; font-weight: 600; font-size: 16px;
                          box-shadow: 0 4px 12px rgba(227, 6, 19, 0.4);">
                    📄 Descargar Mi Boleto PDF
                </a>
            </div>

            <!-- Preparación para el evento -->
            <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 12px; padding: 25px; margin: 0 0 30px 0;">
                <h3 style="color: #0c4a6e; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">
                    🎒 Prepárate para el evento
                </h3>
                
                <p style="color: #075985; margin: 0 0 12px 0; line-height: 1.6;">
                    Te recomendamos llegar con <strong>15-30 minutos de anticipación</strong> 
                    para validar tu entrada sin prisas.
                </p>
                
                ${event.description ? `
                <p style="color: #075985; margin: 0; line-height: 1.6;">
                    <strong>Información adicional:</strong> ${event.description}
                </p>
                ` : ''}
            </div>

            <!-- Información de soporte -->
            <div style="border-top: 1px solid #e2e8f0; padding-top: 25px; text-align: center;">
                <p style="color: #718096; margin: 0 0 10px 0; font-size: 14px;">
                    ¿Tienes dudas? Contáctanos o visita nuestro sitio web
                </p>
                
                <p style="color: #718096; margin: 0; font-size: 14px;">
                    <a href="${app_url}" style="color: #667eea; text-decoration: none;">
                        ${app_url.replace('https://', '').replace('http://', '')}
                    </a>
                </p>
            </div>
        </div>

        <!-- Footer -->
        <div style="background: #2d3748; color: #a0aec0; padding: 20px 30px; text-align: center;">
            <p style="margin: 0; font-size: 14px;">
                Este boleto es personal e intransferible. Guárdalo en un lugar seguro.
            </p>
        </div>
    </div>
</body>
</html>
  `.trim();
}

// Versión texto plano como fallback
export function generateTicketEmailText(data: EmailTemplateData): string {
  const { attendee_name, event, ticket } = data;
  const eventDatesText = formatEventDates(event.start_date, event.end_date);
  
  return `
¡Tu boleto está listo!

Hola ${attendee_name},

Te confirmamos tu registro exitoso para "${event.name}". 
Tu boleto ha sido generado y está listo para usar.

DETALLES DEL EVENTO:
- Evento: ${event.name}
- Fecha: ${eventDatesText}  
- Ubicación: ${event.location}
- Tipo de boleto: ${ticket.ticket_type_name}

TU BOLETO:
- Titular: ${attendee_name}
- Número de orden: ${ticket.order_id}
- ID de boleto: ${ticket.id}

CÓMO USAR TU BOLETO:
1. Descarga tu boleto PDF: ${ticket.pdf_url}
2. Imprímelo o guárdalo en tu teléfono
3. Presenta el código QR en la entrada del evento
4. Llega temprano para evitar filas

PREPÁRATE PARA EL EVENTO:
Te recomendamos llegar con 15-30 minutos de anticipación para validar tu entrada sin prisas.

${event.description ? `Información adicional: ${event.description}` : ''}

Este boleto es personal e intransferible. Guárdalo en un lugar seguro.

¿Tienes dudas? Visita ${data.app_url}
  `.trim();
}
