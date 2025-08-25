// Utilidades para preregistros

// 🚀 Abrir WhatsApp con número formateado
export function openWhatsApp(phone: string, message?: string) {
  // Limpiar el número de espacios, guiones, paréntesis
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  // Si no empieza con +, agregar código de país México
  const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone : `+52${cleanPhone}`;
  
  // Mensaje por defecto
  const defaultMessage = message || 'Hola! Te contacto sobre tu preregistro para nuestro evento.';
  
  // Construir URL de WhatsApp
  const whatsappUrl = `https://wa.me/${formattedPhone.replace('+', '')}?text=${encodeURIComponent(defaultMessage)}`;
  
  // Abrir en nueva ventana
  window.open(whatsappUrl, '_blank');
}

// 📋 Copiar email al portapapeles
export async function copyEmailToClipboard(email: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(email);
    return true;
  } catch (error) {
    // Fallback para navegadores que no soportan clipboard API
    try {
      const textArea = document.createElement('textarea');
      textArea.value = email;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      textArea.remove();
      return true;
    } catch (fallbackError) {
      console.error('Error copying email:', fallbackError);
      return false;
    }
  }
}

// 💰 Formatear boletos de interés para mostrar
export function formatInterestedTickets(tickets: Array<{
  ticket_type_name: string;
  quantity: number;
  unit_price: number;
  currency: string;
}>) {
  if (!tickets || tickets.length === 0) return null;
  
  return tickets.map(ticket => ({
    ...ticket,
    formatted: `${ticket.quantity}x ${ticket.ticket_type_name}`,
    priceFormatted: new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: ticket.currency || 'MXN'
    }).format(ticket.unit_price)
  }));
}

// 📱 Generar mensaje de WhatsApp personalizado
export function generateWhatsAppMessage(preregistro: {
  name: string;
  event?: { name: string };
  interested_tickets?: Array<{
    ticket_type_name: string;
    quantity: number;
    unit_price: number;
    currency: string;
  }>;
}) {
  const eventName = preregistro.event?.name || 'nuestro evento';
  
  let message = `Hola ${preregistro.name}! 👋\n\nTe contacto sobre tu preregistro para ${eventName}.`;
  
  if (preregistro.interested_tickets && preregistro.interested_tickets.length > 0) {
    message += '\n\nVi que te interesaban estos boletos:';
    preregistro.interested_tickets.forEach(ticket => {
      const price = new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: ticket.currency || 'MXN'
      }).format(ticket.unit_price);
      message += `\n• ${ticket.quantity}x ${ticket.ticket_type_name} (${price} c/u)`;
    });
  }
  
  message += '\n\n¿Te gustaría que platiquemos sobre la disponibilidad y precios?';
  
  return message;
}
