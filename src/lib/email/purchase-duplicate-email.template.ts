import { formatCurrency } from '@/lib/utils/currency';
import { formatEventDates } from '@/lib/utils/event-dates';

// 🆕 Template para email de compra con EMAIL DUPLICADO
export interface PurchaseDuplicateEmailData {
  customer_name: string;
  customer_email: string;
  event_name: string;
  event_date: string; // Ya formateado
  event_location: string;
  order_id: string;
  total_amount: string; // Ya formateado con currency
  tickets_count: number;
  app_url: string;
}

export function generatePurchaseDuplicateEmailHTML(data: PurchaseDuplicateEmailData): string {
  const { 
    customer_name, 
    event_name, 
    event_date, 
    event_location, 
    order_id, 
    total_amount, 
    tickets_count, 
    app_url 
  } = data;
  
  const loginUrl = `${app_url}/login`;
  
  return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>¡Compra exitosa! Inicia sesión para ver tus boletos</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        
        <!-- Header con gradiente verde éxito -->
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700;">
                🎉 ¡Compra exitosa!
            </h1>
            <p style="color: #a7f3d0; margin: 15px 0 0 0; font-size: 18px; font-weight: 500;">
                Tu pago fue procesado correctamente
            </p>
        </div>

        <!-- Contenido principal -->
        <div style="padding: 40px 30px;">
            
            <!-- Saludo personalizado -->
            <h2 style="color: #1a202c; margin: 0 0 20px 0; font-size: 26px; font-weight: 600;">
                ¡Hola ${customer_name}! 👋
            </h2>
            
            <p style="color: #4a5568; line-height: 1.6; margin: 0 0 30px 0; font-size: 18px;">
                <strong>¡Excelente noticia!</strong> Tu compra para <strong style="color: #059669;">${event_name}</strong> fue procesada exitosamente. 
                Tus boletos están seguros y listos para ser utilizados.
            </p>

            <!-- Detalles de la compra - Card prominente -->
            <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 2px solid #10b981; border-radius: 16px; padding: 30px; margin: 0 0 30px 0;">
                <h3 style="color: #047857; margin: 0 0 20px 0; font-size: 22px; font-weight: 700;">
                    📋 Detalles de tu compra
                </h3>
                
                <div style="margin-bottom: 15px;">
                    <strong style="color: #065f46;">Evento:</strong>
                    <span style="color: #047857; margin-left: 8px; font-weight: 600;">${event_name}</span>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <strong style="color: #065f46;">Fecha:</strong>
                    <span style="color: #047857; margin-left: 8px; font-weight: 600;">${event_date}</span>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <strong style="color: #065f46;">Ubicación:</strong>
                    <span style="color: #047857; margin-left: 8px; font-weight: 600;">${event_location}</span>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <strong style="color: #065f46;">Boletos:</strong>
                    <span style="color: #047857; margin-left: 8px; font-weight: 600;">${tickets_count} boleto${tickets_count !== 1 ? 's' : ''}</span>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <strong style="color: #065f46;">Total pagado:</strong>
                    <span style="color: #047857; margin-left: 8px; font-weight: 600;">${total_amount}</span>
                </div>
                
                <div style="margin-bottom: 0;">
                    <strong style="color: #065f46;">ID de orden:</strong>
                    <span style="color: #047857; margin-left: 8px; font-family: monospace; background: #ffffff; padding: 4px 8px; border-radius: 4px; font-size: 14px;">${order_id}</span>
                </div>
            </div>

            <!-- Mensaje importante sobre acceso -->            
            <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 16px; padding: 30px; margin: 0 0 35px 0; text-align: center;">
                <h3 style="color: #92400e; margin: 0 0 20px 0; font-size: 24px; font-weight: 700;">
                    🔐 ACCESO A TUS BOLETOS
                </h3>
                
                <p style="color: #78350f; margin: 0 0 25px 0; font-size: 16px; line-height: 1.5;">
                    Detectamos que ya tienes una cuenta con este email. 
                    <strong>Tus boletos han sido asociados automáticamente a tu cuenta existente.</strong>
                </p>
                
                <p style="color: #78350f; margin: 0 0 25px 0; font-size: 16px; line-height: 1.5;">
                    Para ver y gestionar tus boletos:
                </p>
                
                <a href="${loginUrl}" style="display: inline-block; background: #dc2626; color: #ffffff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 18px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    🔑 INICIAR SESIÓN
                </a>
                
                <p style="color: #78350f; margin: 15px 0 0 0; font-size: 14px;">
                    ⚡ Acceso inmediato a tus boletos • 🎫 Descargar PDFs
                </p>
            </div>

            <!-- ¿Olvidaste tu contraseña? -->
            <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 12px; padding: 25px; margin: 0 0 30px 0; text-align: center;">
                <h4 style="color: #0c4a6e; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">
                    🔑 ¿Olvidaste tu contraseña?
                </h4>
                <p style="color: #075985; margin: 0 0 15px 0; line-height: 1.6;">
                    No te preocupes, puedes recuperar el acceso fácilmente desde la página de inicio de sesión.
                </p>
                <a href="${loginUrl}" style="color: #0ea5e9; text-decoration: underline; font-weight: 600;">
                    Ir a recuperar contraseña
                </a>
            </div>

            <!-- Próximos pasos -->            
            <div style="background: #f3f4f6; border-radius: 12px; padding: 25px; margin: 0 0 30px 0;">
                <h4 style="color: #374151; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">
                    📋 Próximos pasos
                </h4>
                
                <div style="display: flex; align-items: flex-start; margin-bottom: 15px;">
                    <div style="background: #10b981; color: #ffffff; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; flex-shrink: 0;">1</div>
                    <div>
                        <strong style="color: #374151; display: block; margin-bottom: 5px;">Inicia sesión en tu cuenta</strong>
                        <p style="color: #6b7280; margin: 0; line-height: 1.5;">Accede con tu email y contraseña para ver tus boletos</p>
                    </div>
                </div>
                
                <div style="display: flex; align-items: flex-start; margin-bottom: 15px;">
                    <div style="background: #10b981; color: #ffffff; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; flex-shrink: 0;">2</div>
                    <div>
                        <strong style="color: #374151; display: block; margin-bottom: 5px;">Configura los datos de los asistentes</strong>
                        <p style="color: #6b7280; margin: 0; line-height: 1.5;">Asigna nombres a cada boleto para generar los PDFs finales</p>
                    </div>
                </div>
                
                <div style="display: flex; align-items: flex-start; margin-bottom: 0;">
                    <div style="background: #10b981; color: #ffffff; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; flex-shrink: 0;">3</div>
                    <div>
                        <strong style="color: #374151; display: block; margin-bottom: 5px;">Descarga tus boletos con códigos QR</strong>
                        <p style="color: #6b7280; margin: 0; line-height: 1.5;">Listos para usar en el evento</p>
                    </div>
                </div>
            </div>

            <!-- Información de contacto -->
            <div style="border-top: 1px solid #e2e8f0; padding-top: 25px; text-align: center;">
                <p style="color: #718096; margin: 0 0 10px 0; font-size: 14px;">
                    ¿Tienes problemas para acceder? Contáctanos o visita nuestra página de ayuda
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
                ¡Tu compra está segura! 🛡️
            </p>
            <p style="margin: 0; font-size: 14px;">
                Los boletos están guardados en tu cuenta y listos para el evento
            </p>
        </div>
    </div>
</body>
</html>
  `.trim();
}

// Versión texto plano como fallback
export function generatePurchaseDuplicateEmailText(data: PurchaseDuplicateEmailData): string {
  const { 
    customer_name, 
    event_name, 
    event_date, 
    event_location, 
    order_id, 
    total_amount, 
    tickets_count, 
    app_url 
  } = data;
  
  const loginUrl = `${app_url}/login`;
  
  return `
¡Compra exitosa! Inicia sesión para ver tus boletos 🎉

¡Hola ${customer_name}!

¡Excelente noticia! Tu compra para "${event_name}" fue procesada exitosamente.
Tus boletos están seguros y listos para ser utilizados.

DETALLES DE TU COMPRA:
- Evento: ${event_name}
- Fecha: ${event_date}
- Ubicación: ${event_location}
- Boletos: ${tickets_count} boleto${tickets_count !== 1 ? 's' : ''}
- Total pagado: ${total_amount}
- ID de orden: ${order_id}

ACCESO A TUS BOLETOS 🔐
Detectamos que ya tienes una cuenta con este email.
Tus boletos han sido asociados automáticamente a tu cuenta existente.

Para ver y gestionar tus boletos:
${loginUrl}

¿OLVIDASTE TU CONTRASEÑA? 🔑
No te preocupes, puedes recuperar el acceso fácilmente desde la página de inicio de sesión.

PRÓXIMOS PASOS:
1. Inicia sesión en tu cuenta
   Accede con tu email y contraseña para ver tus boletos

2. Configura los datos de los asistentes
   Asigna nombres a cada boleto para generar los PDFs finales

3. Descarga tus boletos con códigos QR
   Listos para usar en el evento

¿Tienes problemas para acceder? Visita ${app_url}

¡Tu compra está segura! 🛡️
Los boletos están guardados en tu cuenta y listos para el evento
  `.trim();
}
