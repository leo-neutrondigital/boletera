import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { generateBadgeQRCode } from '@/lib/pdf/pdf-generator';
import jsPDF from 'jspdf';

interface AttendeeData {
  attendee_name: string;
  ticket_type_name: string;
  courtesy_type?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params;
    
    console.log('🎫 Generating badge QRs for event:', eventId);

    // 1. Obtener todos los tickets del evento con attendee_name configurado
    const ticketsSnapshot = await adminDb
      .collection('tickets')
      .where('event_id', '==', eventId)
      .get();

    console.log('📊 Tickets found:', ticketsSnapshot.size);

    if (ticketsSnapshot.empty) {
      console.log('❌ No tickets found for event');
      return NextResponse.json(
        { error: 'No se encontraron tickets para este evento' },
        { status: 404 }
      );
    }

    // 2. Incluir TODOS los tickets (configurados o no)
    const attendees: AttendeeData[] = [];
    
    ticketsSnapshot.forEach((doc: any) => {
      const ticket = doc.data();
      // Usar attendee_name si existe, si no usar customer_name (campo "Cliente")
      const displayName = ticket.attendee_name || ticket.customer_name || 'Sin nombre';
      
      attendees.push({
        attendee_name: displayName,
        ticket_type_name: ticket.ticket_type_name || 'General',
        courtesy_type: ticket.courtesy_type || (ticket.is_courtesy ? 'Cortesía' : undefined)
      });
    });

    console.log(`📝 Total tickets to generate badges: ${attendees.length}`);

    if (attendees.length === 0) {
      console.log('❌ No tickets found');
      return NextResponse.json(
        { error: 'No hay tickets para este evento' },
        { status: 404 }
      );
    }

    console.log(`📋 Generating ${attendees.length} badges (including unconfigured tickets)`);    

    // 3. Generar PDF con badges
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    let isFirstPage = true;

    for (const attendee of attendees) {
      // Agregar nueva página (excepto la primera)
      if (!isFirstPage) {
        pdf.addPage();
      }
      isFirstPage = false;

      // Generar QR badge con datos del asistente
      const qrDataUrl = await generateBadgeQRCode(
        attendee.ticket_type_name,
        attendee.attendee_name,
        attendee.courtesy_type
      );

      // Diseño minimalista: solo nombre y QR centrado
      const pageWidth = pdf.internal.pageSize.getWidth();

      // Nombre en la parte superior (32pt, bold, centrado)
      pdf.setFontSize(32);
      pdf.setFont('helvetica', 'bold');
      const nameY = 30;
      pdf.text(attendee.attendee_name, pageWidth / 2, nameY, {
        align: 'center'
      });

      // Tipo de cortesía debajo del nombre (si existe)
      let qrStartY = nameY + 20;
      if (attendee.courtesy_type) {
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(100, 100, 100);
        pdf.text(attendee.courtesy_type, pageWidth / 2, nameY + 12, {
          align: 'center'
        });
        pdf.setTextColor(0, 0, 0); // Reset color
        qrStartY = nameY + 25; // Más espacio para el QR
      }

      // QR centrado (120mm de ancho)
      const qrSize = 120;
      const qrX = (pageWidth - qrSize) / 2;
      const qrY = qrStartY;
      
      pdf.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
    }

    // 4. Convertir PDF a buffer y enviar
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));

    console.log(`✅ Badge PDF generated: ${attendees.length} pages`);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="badges-event-${eventId}.pdf"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    });

  } catch (error) {
    console.error('❌ Error generating badge PDF:', error);
    return NextResponse.json(
      { error: 'Error al generar badges' },
      { status: 500 }
    );
  }
}
