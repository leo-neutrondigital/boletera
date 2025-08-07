import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getAuthFromRequest } from '@/lib/auth/server-auth';
import { generateTicketPDF } from '@/lib/pdf/pdf-generator';
import { FirebaseStorageService } from '@/lib/storage/firebase-storage';
import { v4 as uuidv4 } from 'uuid';

export async function POST(
  request: NextRequest,
  { params }: { params: { ticketId: string } }
) {
  try {
    const { ticketId } = params;

    console.log('🎫 Generating PDF for ticket:', ticketId);

    // 1. Verificar autenticación
    const authUser = await getAuthFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Obtener ticket de la base de datos
    const ticketDoc = await adminDb.collection('tickets').doc(ticketId).get();
    
    if (!ticketDoc.exists) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const ticketData = ticketDoc.data()!;

    // 3. Verificar permisos (dueño del ticket o admin)
    const isAdmin = authUser.roles?.includes('admin') || false;
    const isOwner = ticketData.user_id === authUser.uid || 
                   ticketData.customer_email === authUser.email;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ 
        error: 'Forbidden - You can only generate PDFs for your own tickets' 
      }, { status: 403 });
    }

    // 4. Verificar que el ticket esté configurado
    if (ticketData.status !== 'configured' || !ticketData.attendee_name) {
      return NextResponse.json({ 
        error: 'Ticket must be configured with attendee information before generating PDF' 
      }, { status: 400 });
    }

    // 5. Obtener información del evento
    let eventData = null;
    if (ticketData.event_id) {
      const eventDoc = await adminDb.collection('events').doc(ticketData.event_id).get();
      if (eventDoc.exists) {
        eventData = eventDoc.data();
      }
    }

    // 6. Preparar objeto ticket completo
    const ticket = {
      id: ticketDoc.id,
      ...ticketData,
      event: eventData ? {
        id: ticketData.event_id,
        name: eventData.name,
        start_date: eventData.start_date?.toDate() || new Date(),
        end_date: eventData.end_date?.toDate() || new Date(),
        location: eventData.location,
        description: eventData.description
      } : null,
      // Generar QR ID si no existe
      qr_id: ticketData.qr_id || uuidv4(),
      // Convertir fechas
      authorized_days: (ticketData.authorized_days || []).map((day: any) => 
        day?.toDate ? day.toDate() : new Date(day)
      ),
      used_days: (ticketData.used_days || []).map((day: any) => 
        day?.toDate ? day.toDate() : new Date(day)
      ),
      created_at: ticketData.created_at?.toDate() || new Date(),
      purchase_date: ticketData.purchase_date?.toDate() || new Date(),
    };

    console.log('📋 Ticket data prepared:', {
      id: ticket.id,
      attendee: ticket.attendee_name,
      event: ticket.event?.name,
      qr_id: ticket.qr_id
    });

    // 7. Generar PDF
    const pdfBuffer = await generateTicketPDF(ticket);
    
    console.log('✅ PDF generated, size:', pdfBuffer.length, 'bytes');

    // 8. Guardar en storage usando factory
    const { StorageFactory } = await import('@/lib/storage/storage-factory');
    const storage = await StorageFactory.create();
    const { url, path } = await storage.saveTicketPDF(ticket, pdfBuffer);

    // 9. Actualizar ticket en base de datos
    await adminDb.collection('tickets').doc(ticketId).update({
      pdf_url: url,
      pdf_path: path,
      qr_id: ticket.qr_id, // Asegurar que se guarde el QR ID
      updated_at: new Date()
    });

    console.log('✅ Ticket updated with PDF info:', { pdf_url: url, pdf_path: path });

    return NextResponse.json({
      success: true,
      pdf_url: url,
      pdf_path: path,
      qr_id: ticket.qr_id,
      message: 'PDF generated and saved successfully'
    });

  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate PDF',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET para descargar PDF existente
export async function GET(
  request: NextRequest,
  { params }: { params: { ticketId: string } }
) {
  try {
    const { ticketId } = params;

    // 1. Verificar autenticación
    const authUser = await getAuthFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Obtener ticket
    const ticketDoc = await adminDb.collection('tickets').doc(ticketId).get();
    
    if (!ticketDoc.exists) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const ticketData = ticketDoc.data()!;

    // 3. Verificar permisos
    const isAdmin = authUser.roles?.includes('admin') || false;
    const isOwner = ticketData.user_id === authUser.uid || 
                   ticketData.customer_email === authUser.email;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ 
        error: 'Forbidden - You can only access your own tickets' 
      }, { status: 403 });
    }

    // 4. Verificar que existe PDF
    if (!ticketData.pdf_url) {
      return NextResponse.json({ 
        error: 'PDF not generated yet. Please generate first.' 
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      pdf_url: ticketData.pdf_url,
      pdf_path: ticketData.pdf_path,
      qr_id: ticketData.qr_id,
      generated_at: ticketData.updated_at
    });

  } catch (error) {
    console.error('❌ Error getting PDF:', error);
    
    return NextResponse.json(
      { error: 'Failed to get PDF' },
      { status: 500 }
    );
  }
}
