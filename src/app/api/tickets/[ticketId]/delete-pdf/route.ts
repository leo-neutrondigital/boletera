import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getAuthFromRequest } from '@/lib/auth/server-auth';
import { StorageFactory } from '@/lib/storage/storage-factory';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { ticketId: string } }
) {
  try {
    const { ticketId } = params;

    console.log('🗑️ Deleting PDF for ticket:', ticketId);

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
        error: 'Forbidden - You can only delete your own ticket PDFs' 
      }, { status: 403 });
    }

    // 4. Verificar que existe PDF para borrar
    if (!ticketData.pdf_path && !ticketData.pdf_url) {
      return NextResponse.json({ 
        error: 'No PDF found for this ticket' 
      }, { status: 404 });
    }

    // 5. Borrar archivo usando storage factory
    const storage = await StorageFactory.create();
    
    if (ticketData.pdf_path) {
      await storage.deleteFile(ticketData.pdf_path);
    }

    // 6. Actualizar ticket en base de datos (limpiar referencias al PDF)
    await adminDb.collection('tickets').doc(ticketId).update({
      pdf_url: null,
      pdf_path: null,
      updated_at: new Date()
    });

    console.log('✅ PDF deleted successfully for ticket:', ticketId);

    return NextResponse.json({
      success: true,
      message: 'PDF deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting PDF:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to delete PDF',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
