import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Ticket } from '@/types';

export async function generateTicketPDF(ticket: Ticket): Promise<Buffer> {
  try {
    console.log('🎫 Generating PDF for ticket:', ticket.id);
    
    // 1. Generar código QR como buffer
    const qrCodeBuffer = await generateQRCode(ticket);
    
    // 2. Crear PDF con jsPDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // 3. Diseñar el boleto
    await designTicketPDF(pdf, ticket, qrCodeBuffer);
    
    // 4. Convertir a buffer
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));
    
    console.log('✅ PDF generated successfully for ticket:', ticket.id);
    return pdfBuffer;
    
  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    throw new Error('Failed to generate PDF');
  }
}

async function generateQRCode(ticket: Ticket): Promise<Buffer> {
  try {
    // URL de validación del QR
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const validationUrl = `${baseUrl}/validate/${ticket.qr_id || ticket.id}`;
    
    console.log('🔲 Generating QR for URL:', validationUrl);
    
    // Generar QR como buffer PNG
    const qrBuffer = await QRCode.toBuffer(validationUrl, {
      type: 'png',
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    return qrBuffer;
    
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
}

async function designTicketPDF(pdf: jsPDF, ticket: Ticket, qrCodeBuffer: Buffer) {
  // Configuración de colores como tuplas constantes
  const headerColor = [11, 105, 70] as const;    // #0B6946 - Verde solicitado
  const accessCodeColor = [227, 6, 19] as const; // #E30613 - Rojo solicitado
  const grayColor = [100, 116, 139] as const;    // #64748b
  const darkColor = [30, 41, 59] as const;       // #1e293b
  
  // ========================================
  // SECCIÓN 1: GAFETE (Cuadrante superior izquierdo)
  // ========================================
  const BADGE = {
    x: 0,
    y: 0,
    width: 105,
    height: 148.5,
    margin: 4  // Margen interno reducido
  };
  
  // Dibujar borde del gafete (opcional, para visualizar área)
  pdf.setDrawColor(...grayColor);
  pdf.setLineWidth(0.3);
  pdf.rect(BADGE.x, BADGE.y, BADGE.width, BADGE.height);
  
  // Header compacto con color verde
  pdf.setFillColor(...headerColor);
  pdf.rect(BADGE.x, BADGE.y, BADGE.width, 18, 'F');
  
  // Título del evento (compacto)
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  const eventName = ticket.event?.name || 'Evento';
  // Truncar nombre si es muy largo
  const maxEventNameWidth = BADGE.width - (BADGE.margin * 2);
  let truncatedEventName = eventName;
  pdf.setFontSize(14);
  while (pdf.getTextWidth(truncatedEventName) > maxEventNameWidth && truncatedEventName.length > 0) {
    truncatedEventName = truncatedEventName.slice(0, -1);
  }
  if (truncatedEventName.length < eventName.length) {
    truncatedEventName = truncatedEventName.trim() + '...';
  }
  pdf.text(truncatedEventName, BADGE.width / 2, 8, { align: 'center' });
  
  // Subtítulo - tipo de boleto (compacto)
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  let truncatedTicketType = ticket.ticket_type_name;
  while (pdf.getTextWidth(truncatedTicketType) > maxEventNameWidth && truncatedTicketType.length > 0) {
    truncatedTicketType = truncatedTicketType.slice(0, -1);
  }
  if (truncatedTicketType.length < ticket.ticket_type_name.length) {
    truncatedTicketType = truncatedTicketType.trim() + '...';
  }
  pdf.text(truncatedTicketType, BADGE.width / 2, 14, { align: 'center' });
  
  // Resetear color de texto
  pdf.setTextColor(...darkColor);
  
  // Contenido del gafete (layout compacto y centrado)
  let yPos = BADGE.y + 22; // Después del header
  const centerX = BADGE.width / 2;
  const contentWidth = BADGE.width - (BADGE.margin * 2);
  
  // ASISTENTE (centrado)
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...grayColor);
  pdf.text('ASISTENTE', centerX, yPos, { align: 'center' });
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkColor);
  let attendeeName = ticket.attendee_name || 'Por asignar';
  // Truncar nombre si es muy largo
  while (pdf.getTextWidth(attendeeName) > contentWidth && attendeeName.length > 0) {
    attendeeName = attendeeName.slice(0, -1);
  }
  if (attendeeName.length < (ticket.attendee_name || '').length) {
    attendeeName = attendeeName.trim() + '...';
  }
  pdf.text(attendeeName, centerX, yPos + 5, { align: 'center' });
  
  yPos += 12;
  
  // FECHA DEL EVENTO (formato completo: "25 de oct al 4 de nov, 2025")
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...grayColor);
  pdf.text('FECHA', centerX, yPos, { align: 'center' });
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...darkColor);
  
  let eventDateRange = 'Por confirmar';
  if (ticket.event?.start_date && ticket.event?.end_date) {
    // Si es el mismo día
    if (format(ticket.event.start_date, 'yyyy-MM-dd') === format(ticket.event.end_date, 'yyyy-MM-dd')) {
      eventDateRange = format(ticket.event.start_date, "d 'de' MMM, yyyy", { locale: es });
    } else {
      // Formato: "25 de oct al 4 de nov, 2025"
      const startDate = format(ticket.event.start_date, "d 'de' MMM", { locale: es });
      const endDate = format(ticket.event.end_date, "d 'de' MMM, yyyy", { locale: es });
      eventDateRange = `${startDate} al ${endDate}`;
    }
  } else if (ticket.event?.start_date) {
    eventDateRange = format(ticket.event.start_date, "d 'de' MMM, yyyy", { locale: es });
  }
  pdf.text(eventDateRange, centerX, yPos + 4.5, { align: 'center' });
  
  yPos += 10;
  
  // UBICACIÓN (centrada)
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...grayColor);
  pdf.text('UBICACIÓN', centerX, yPos, { align: 'center' });
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...darkColor);
  let location = ticket.event?.location || 'Por confirmar';
  // Truncar ubicación
  while (pdf.getTextWidth(location) > contentWidth && location.length > 0) {
    location = location.slice(0, -1);
  }
  if (location.length < (ticket.event?.location || '').length) {
    location = location.trim() + '...';
  }
  pdf.text(location, centerX, yPos + 4.5, { align: 'center' });
  
  yPos += 10;
  
  // CORREO (centrado)
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...grayColor);
  pdf.text('CORREO', centerX, yPos, { align: 'center' });
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...darkColor);
  let email = ticket.attendee_email || 'No especificado';
  // Truncar email si es muy largo
  while (pdf.getTextWidth(email) > contentWidth && email.length > 0) {
    email = email.slice(0, -1);
  }
  if (email.length < (ticket.attendee_email || '').length) {
    email = email.trim() + '...';
  }
  pdf.text(email, centerX, yPos + 4.5, { align: 'center' });
  
  yPos += 10;
  
  // TIPO DE CORTESÍA (si aplica - CRÍTICO, centrado)
  if (ticket.is_courtesy && ticket.courtesy_type) {
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...grayColor);
    pdf.text('TIPO CORTESÍA', centerX, yPos, { align: 'center' });
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...darkColor);
    
    const courtesyType = ticket.courtesy_type;
    // Truncar en 2 líneas si es necesario
    const lines = pdf.splitTextToSize(courtesyType, contentWidth);
    const maxLines = 2;
    for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
      let line = lines[i];
      if (i === maxLines - 1 && lines.length > maxLines) {
        line = line.substring(0, line.length - 3) + '...';
      }
      pdf.text(line, centerX, yPos + 4.5 + (i * 4), { align: 'center' });
    }
    
    yPos += 10 + (Math.min(lines.length, maxLines) * 4);
  }
  
  // QR CODE (reducido para dejar espacio a instrucciones)
  yPos += 2;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...accessCodeColor);
  pdf.text('Código de acceso', BADGE.width / 2, yPos, { align: 'center' });
  
  yPos += 4;
  
  // QR reducido para dejar espacio a instrucciones
  const qrSize = 38; // 38mm para dejar espacio
  const qrX = (BADGE.width - qrSize) / 2;
  
  try {
    const qrDataUrl = `data:image/png;base64,${qrCodeBuffer.toString('base64')}`;
    pdf.addImage(qrDataUrl, 'PNG', qrX, yPos, qrSize, qrSize);
    yPos += qrSize + 3;
  } catch (error) {
    console.error('Error adding QR to PDF:', error);
    pdf.setFontSize(9);
    pdf.setTextColor(...grayColor);
    pdf.text('QR no disponible', BADGE.width / 2, yPos + 20, { align: 'center' });
    yPos += 40;
  }
  
  // ID del boleto (compacto)
  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...grayColor);
  pdf.text(`ID: ${ticket.id}`, BADGE.width / 2, yPos, { align: 'center' });
  
  // ========================================
  // SECCIÓN 2: LÍNEAS DE DOBLEZ
  // ========================================
  const foldLineColor = [180, 180, 180] as const; // Gris medio
  pdf.setDrawColor(...foldLineColor);
  pdf.setLineDashPattern([3, 2], 0);
  pdf.setLineWidth(0.5);
  
  // Línea vertical (mitad de ancho)
  pdf.line(105, 0, 105, 297);
  
  // Línea horizontal (mitad de altura)
  pdf.line(0, 148.5, 210, 148.5);
  
  // Resetear
  pdf.setLineDashPattern([], 0);
  
  // ========================================
  // SECCIÓN 3: INSTRUCCIONES (Lado derecho)
  // ========================================
  const instrX = 115; // Lado derecho
  const instrY = 30;
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkColor);
  pdf.text('Instrucciones de uso:', instrX, instrY);
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...grayColor);
  
  const instructions = [
    '',
    '1. Dobla la hoja por las líneas',
    '   punteadas (vertical y horizontal).',
    '',
    '2. El gafete quedará en formato',
    '   compacto y fácil de portar.',
    '',
    '3. Presenta el código QR en cada',
    '   día del evento para acceso.',
    '',
    '4. Puedes imprimir o mostrar',
    '   desde tu teléfono.'
  ];
  
  instructions.forEach((instruction, index) => {
    pdf.text(instruction, instrX, instrY + 6 + (index * 5));
  });
  
  // Nota adicional
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'italic');
  pdf.text('Generado el ' + format(new Date(), "d MMM yyyy", { locale: es }), instrX, instrY + 80);
  pdf.text('Orden: ' + ticket.order_id, instrX, instrY + 85);
}

// Función para obtener URL de validación
export function getValidationUrl(ticket: Ticket): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/validate/${ticket.qr_id || ticket.id}`;
}

export { generateQRCode };
