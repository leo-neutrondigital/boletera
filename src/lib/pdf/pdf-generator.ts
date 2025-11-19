import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import { readFileSync } from 'fs';
import { join } from 'path';
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

// Helper para cargar imágenes desde el filesystem y convertir a base64
function loadImageAsBase64(imageName: string): string {
  try {
    // Ruta absoluta al directorio public/img
    const imagePath = join(process.cwd(), 'public', 'img', imageName);
    const imageBuffer = readFileSync(imagePath);
    const base64 = imageBuffer.toString('base64');
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error(`❌ Error loading image ${imageName}:`, error);
    throw new Error(`Failed to load image: ${imageName}`);
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

/**
 * Genera QR con datos de identificación (formato texto legible)
 * Para badges/gafetes con información del asistente
 */
export async function generateBadgeQRCode(
  ticketType: string,
  attendeeName: string,
  company?: string
): Promise<string> {
  try {
    // Formato simple: cadena con guiones (más compatible con scanners)
    const parts = [
      ticketType,
      attendeeName,
      company || 'SIN-EMPRESA'
    ];
    
    const badgeData = parts.join('---');
    
    console.log('🔲 Badge QR data:', badgeData);
    
    // Generar QR como Data URL (base64) para insertar directo en PDF
    const qrDataUrl = await QRCode.toDataURL(badgeData, {
      width: 400,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    return qrDataUrl;
    
  } catch (error) {
    console.error('Error generating badge QR code:', error);
    throw error;
  }
}

async function designTicketPDF(pdf: jsPDF, ticket: Ticket, qrCodeBuffer: Buffer) {
  // Configuración de colores como tuplas constantes
  const accessCodeColor = [227, 6, 19] as const; // #E30613 - Rojo solicitado
  const grayColor = [100, 116, 139] as const;    // #64748b
  const darkColor = [30, 41, 59] as const;       // #1e293b
  
  // ========================================
  // SECCIÓN 1: GAFETE (Cuadrante superior izquierdo) - 105mm × 148.5mm
  // ========================================
  const BADGE = {
    x: 0,
    y: 0,
    width: 105,
    height: 148.5,
    margin: 4
  };
  
  // Dibujar borde del gafete
  pdf.setDrawColor(...grayColor);
  pdf.setLineWidth(0.3);
  pdf.rect(BADGE.x, BADGE.y, BADGE.width, BADGE.height);
  
  // 🆕 IMAGEN DE CABECERA (105mm × 17.8mm)
  const headerImageBase64 = loadImageAsBase64('boleto_cabeza_cidth.jpg');
  const headerHeight = 17.8;
  pdf.addImage(headerImageBase64, 'JPEG', BADGE.x, BADGE.y, BADGE.width, headerHeight);
  
  let yPos = BADGE.y + headerHeight + 3;
  const centerX = BADGE.width / 2;
  const contentWidth = BADGE.width - (BADGE.margin * 2);
  
  // 🆕 TIPO DE BOLETO (debajo de la cabecera, centrado)
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkColor);
  let ticketType = ticket.ticket_type_name;
  while (pdf.getTextWidth(ticketType) > contentWidth && ticketType.length > 0) {
    ticketType = ticketType.slice(0, -1);
  }
  if (ticketType.length < ticket.ticket_type_name.length) {
    ticketType = ticketType.trim() + '...';
  }
  pdf.text(ticketType, centerX, yPos, { align: 'center' });
  
  yPos += 8;
  
  // ASISTENTE (centrado)
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...grayColor);
  pdf.text('ASISTENTE', centerX, yPos, { align: 'center' });
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkColor);
  let attendeeName = ticket.attendee_name || 'Por asignar';
  while (pdf.getTextWidth(attendeeName) > contentWidth && attendeeName.length > 0) {
    attendeeName = attendeeName.slice(0, -1);
  }
  if (attendeeName.length < (ticket.attendee_name || '').length) {
    attendeeName = attendeeName.trim() + '...';
  }
  pdf.text(attendeeName, centerX, yPos + 5, { align: 'center' });
  
  yPos += 12;
  
  // FECHA DEL EVENTO
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...grayColor);
  pdf.text('FECHA', centerX, yPos, { align: 'center' });
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...darkColor);
  
  let eventDateRange = 'Por confirmar';
  if (ticket.event?.start_date && ticket.event?.end_date) {
    if (format(ticket.event.start_date, 'yyyy-MM-dd') === format(ticket.event.end_date, 'yyyy-MM-dd')) {
      eventDateRange = format(ticket.event.start_date, "d 'de' MMM, yyyy", { locale: es });
    } else {
      const startDate = format(ticket.event.start_date, "d 'de' MMM", { locale: es });
      const endDate = format(ticket.event.end_date, "d 'de' MMM, yyyy", { locale: es });
      eventDateRange = `${startDate} al ${endDate}`;
    }
  } else if (ticket.event?.start_date) {
    eventDateRange = format(ticket.event.start_date, "d 'de' MMM, yyyy", { locale: es });
  }
  pdf.text(eventDateRange, centerX, yPos + 4.5, { align: 'center' });
  
  yPos += 10;
  
  // UBICACIÓN
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...grayColor);
  pdf.text('UBICACIÓN', centerX, yPos, { align: 'center' });
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...darkColor);
  let location = ticket.event?.location || 'Por confirmar';
  while (pdf.getTextWidth(location) > contentWidth && location.length > 0) {
    location = location.slice(0, -1);
  }
  if (location.length < (ticket.event?.location || '').length) {
    location = location.trim() + '...';
  }
  pdf.text(location, centerX, yPos + 4.5, { align: 'center' });
  
  yPos += 10;
  
  // CORREO
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...grayColor);
  pdf.text('CORREO', centerX, yPos, { align: 'center' });
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...darkColor);
  let email = ticket.attendee_email || 'No especificado';
  while (pdf.getTextWidth(email) > contentWidth && email.length > 0) {
    email = email.slice(0, -1);
  }
  if (email.length < (ticket.attendee_email || '').length) {
    email = email.trim() + '...';
  }
  pdf.text(email, centerX, yPos + 4.5, { align: 'center' });
  
  yPos += 10;
  

  
  // QR CODE
  yPos += 2;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...accessCodeColor);
  pdf.text('Código de acceso', centerX, yPos, { align: 'center' });
  
  yPos += 4;
  
  const qrSize = 38;
  const qrX = (BADGE.width - qrSize) / 2;
  
  try {
    const qrDataUrl = `data:image/png;base64,${qrCodeBuffer.toString('base64')}`;
    pdf.addImage(qrDataUrl, 'PNG', qrX, yPos, qrSize, qrSize);
    yPos += qrSize + 3;
  } catch (error) {
    console.error('Error adding QR to PDF:', error);
    pdf.setFontSize(9);
    pdf.setTextColor(...grayColor);
    pdf.text('QR no disponible', centerX, yPos + 20, { align: 'center' });
    yPos += 40;
  }
  
  // ID del boleto
  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...grayColor);
  pdf.text(`ID: ${ticket.id}`, centerX, yPos, { align: 'center' });
  
  // 🆕 IMAGEN DE PIE (105mm × 17.8mm al final del gafete)
  const footerImageBase64 = loadImageAsBase64('boleto_pie_cidth.jpg');
  const footerHeight = 17.8;
  const footerY = BADGE.height - footerHeight;
  pdf.addImage(footerImageBase64, 'JPEG', BADGE.x, footerY, BADGE.width, footerHeight);
  
  // ========================================
  // SECCIÓN 2: LÍNEAS DE DOBLEZ
  // ========================================
  const foldLineColor = [180, 180, 180] as const;
  pdf.setDrawColor(...foldLineColor);
  pdf.setLineDashPattern([3, 2], 0);
  pdf.setLineWidth(0.5);
  
  // Línea vertical (mitad de ancho)
  pdf.line(105, 0, 105, 297);
  
  // Línea horizontal (mitad de altura)
  pdf.line(0, 148.5, 210, 148.5);
  
  pdf.setLineDashPattern([], 0);
  
  // ========================================
  // SECCIÓN 3: INSTRUCCIONES (Lado derecho)
  // ========================================
  const instrX = 115;
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
