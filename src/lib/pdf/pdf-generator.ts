import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import { formatCurrency } from '@/lib/utils/currency';
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
  const primaryColor = [102, 126, 234] as const; // #667eea
  const grayColor = [100, 116, 139] as const;    // #64748b
  const darkColor = [30, 41, 59] as const;       // #1e293b
  
  // Header con gradiente simulado
  pdf.setFillColor(...primaryColor);
  pdf.rect(0, 0, 210, 40, 'F');
  
  // Título del evento
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  const eventName = ticket.event?.name || 'Evento';
  pdf.text(eventName, 105, 20, { align: 'center' });
  
  // Subtítulo - tipo de boleto
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.text(ticket.ticket_type_name, 105, 30, { align: 'center' });
  
  // Resetear color de texto
  pdf.setTextColor(...darkColor);
  
  // Información del boleto en 2 columnas
  let yPos = 60;
  
  // Columna izquierda
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...grayColor);
  pdf.text('ASISTENTE', 20, yPos);
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...darkColor);
  pdf.text(ticket.attendee_name || 'Por asignar', 20, yPos + 8);
  
  // Columna derecha
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...grayColor);
  pdf.text('FECHA DEL EVENTO', 110, yPos);
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...darkColor);
  const eventDate = ticket.event?.start_date ? 
    format(ticket.event.start_date, "d 'de' MMM, yyyy", { locale: es }) : 
    'Por confirmar';
  pdf.text(eventDate, 110, yPos + 8);
  
  yPos += 25;
  
  // Segunda fila
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...grayColor);
  pdf.text('UBICACIÓN', 20, yPos);
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...darkColor);
  const location = ticket.event?.location || 'Por confirmar';
  // Truncar ubicación si es muy larga
  const truncatedLocation = location.length > 30 ? location.substring(0, 30) + '...' : location;
  pdf.text(truncatedLocation, 20, yPos + 8);
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...grayColor);
  pdf.text('PRECIO', 110, yPos);
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...darkColor);
  pdf.text(formatCurrency(ticket.amount_paid, (ticket.currency || 'MXN') as 'MXN' | 'USD' | 'EUR' | 'GBP'), 110, yPos + 8);
  
  yPos += 25;
  
  // Requerimientos especiales (si existen)
  if (ticket.special_requirements) {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...grayColor);
    pdf.text('REQUERIMIENTOS ESPECIALES', 20, yPos);
    
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...darkColor);
    
    // Split text en múltiples líneas si es necesario
    const splitText = pdf.splitTextToSize(ticket.special_requirements, 170);
    pdf.text(splitText, 20, yPos + 8);
    
    yPos += splitText.length * 5 + 15;
  }
  
  // Línea separadora punteada
  yPos += 10;
  pdf.setDrawColor(...grayColor);
  pdf.setLineDashPattern([2, 2], 0);
  pdf.line(20, yPos, 190, yPos);
  pdf.setLineDashPattern([], 0);
  
  yPos += 20;
  
  // Sección del QR
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkColor);
  pdf.text('Código de acceso', 105, yPos, { align: 'center' });
  
  yPos += 10;
  
  // Agregar QR code
  try {
    const qrDataUrl = `data:image/png;base64,${qrCodeBuffer.toString('base64')}`;
    pdf.addImage(qrDataUrl, 'PNG', 80, yPos, 50, 50);
    yPos += 55;
  } catch (error) {
    console.error('Error adding QR to PDF:', error);
    // Fallback: mostrar texto
    pdf.setFontSize(12);
    pdf.setTextColor(...grayColor);
    pdf.text('QR Code no disponible', 105, yPos + 25, { align: 'center' });
    yPos += 35;
  }
  
  // Instrucciones
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...grayColor);
  const instructions = [
    'Presenta este código QR en el evento para ingresar.',
    'Puedes mostrar este PDF desde tu teléfono o imprimirlo.'
  ];
  
  instructions.forEach((instruction, index) => {
    pdf.text(instruction, 105, yPos + (index * 6), { align: 'center' });
  });
  
  yPos += 20;
  
  // ID del boleto
  pdf.setFillColor(226, 232, 240); // bg-gray-200
  pdf.rect(70, yPos, 70, 8, 'F');
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...grayColor);
  pdf.text(`ID: ${ticket.id}`, 105, yPos + 5, { align: 'center' });
  
  yPos += 15;
  
  // Footer
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...grayColor);
  const generatedAt = format(new Date(), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es });
  const footerText = [
    `Generado el ${generatedAt}`,
    `Orden: ${ticket.order_id}`
  ];
  
  footerText.forEach((text, index) => {
    pdf.text(text, 105, yPos + (index * 5), { align: 'center' });
  });
}

// Función para obtener URL de validación
export function getValidationUrl(ticket: Ticket): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/validate/${ticket.qr_id || ticket.id}`;
}

export { generateQRCode };
