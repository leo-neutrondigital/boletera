import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getAuthFromRequest } from '@/lib/auth/server-auth';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: { ticketId: string } }
) {
  try {
    const { ticketId } = params;
    const body = await request.json();
    
    console.log('💾 Updating ticket data:', ticketId);

    // 1. Verificar autenticación
    const authUser = await getAuthFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Obtener ticket actual
    const ticketDoc = await adminDb.collection('tickets').doc(ticketId).get();
    
    if (!ticketDoc.exists) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const ticketData = ticketDoc.data()!;

    // 3. Verificar permisos
    const isAdmin = authUser.roles?.includes('admin') || authUser.roles?.includes('gestor');
    const isOwner = ticketData.user_id === authUser.uid || 
                   ticketData.customer_email === authUser.email;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ 
        error: 'Forbidden - You can only update your own tickets' 
      }, { status: 403 });
    }

    // 4. Preparar datos para actualizar
    const updateData: any = {
      updated_at: FieldValue.serverTimestamp()
    };

    // Solo actualizar campos proporcionados
    if (body.attendee_name !== undefined) {
      updateData.attendee_name = body.attendee_name;
    }
    if (body.attendee_email !== undefined) {
      updateData.attendee_email = body.attendee_email;
    }
    if (body.attendee_phone !== undefined) {
      updateData.attendee_phone = body.attendee_phone;
    }
    if (body.special_requirements !== undefined) {
      updateData.special_requirements = body.special_requirements;
    }

    // 5. Actualizar status a 'configured' si tiene nombre y email
    if (updateData.attendee_name && updateData.attendee_email) {
      updateData.status = 'configured';
      console.log('✅ Ticket configured with attendee data');
    }

    // 6. Guardar en Firestore
    await adminDb.collection('tickets').doc(ticketId).update(updateData);

    console.log('✅ Ticket data updated successfully');

    return NextResponse.json({
      success: true,
      message: 'Ticket data updated successfully',
      ticket: {
        id: ticketId,
        ...updateData
      }
    });

  } catch (error) {
    console.error('❌ Error updating ticket:', error);
    return NextResponse.json(
      { error: 'Error updating ticket data' },
      { status: 500 }
    );
  }
}
