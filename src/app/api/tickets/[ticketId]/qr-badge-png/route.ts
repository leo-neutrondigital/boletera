import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import QRCode from 'qrcode';

export async function GET(
  request: NextRequest,
  { params }: { params: { ticketId: string } }
) {
  try {
    const { ticketId } = params;
    
    console.log('🎫 Generating badge QR PNG for ticket:', ticketId);

    // 1. Obtener ticket de Firestore
    const ticketDoc = await adminDb
      .collection('tickets')
      .doc(ticketId)
      .get();

    if (!ticketDoc.exists) {
      console.log('❌ Ticket not found:', ticketId);
      return NextResponse.json(
        { error: 'Ticket no encontrado' },
        { status: 404 }
      );
    }

    const ticket = ticketDoc.data();

    // 2. Validar que tenga datos necesarios
    const displayName = ticket?.attendee_name || ticket?.customer_name || 'Sin nombre';
    const ticketType = ticket?.ticket_type_name || 'General';
    const courtesyType = ticket?.courtesy_type || (ticket?.is_courtesy ? 'Cortesía' : undefined);

    // 3. Construir datos del badge (MISMO formato que badges masivos)
    const badgeData = `${ticketType}---${displayName}---${courtesyType || 'General'}`;
    
    console.log('🔲 Badge QR data:', badgeData);

    // 4. Construir nombre de archivo usando el formato completo del badge
    const fileName = `badge-qr-${badgeData.replace(/\s+/g, '-')}.png`;

    // 5. Generar QR como PNG buffer
    const pngBuffer = await QRCode.toBuffer(badgeData, {
      type: 'png',
      width: 800,  // Alta resolución para impresión
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    console.log('✅ Badge QR PNG generated successfully');

    // 6. Retornar como imagen PNG
    return new NextResponse(new Uint8Array(pngBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': pngBuffer.length.toString()
      }
    });

  } catch (error) {
    console.error('❌ Error generating badge QR PNG:', error);
    return NextResponse.json(
      { error: 'Error al generar QR badge' },
      { status: 500 }
    );
  }
}
