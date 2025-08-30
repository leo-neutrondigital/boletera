import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getAuthFromRequest } from '@/lib/auth/server-auth';

// ✅ Forzar modo dinámico para usar request.headers y request.json()
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface TicketResponse {
  success: boolean;
  ticket?: any;
  error?: string;
  details?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { ticketId: string } }
): Promise<NextResponse<TicketResponse>> {
  try {
    const { ticketId } = params;

    console.log('🎫 Fetching ticket data for:', ticketId);

    // 1. Verificar autenticación
    const authUser = await getAuthFromRequest(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Verificar permisos (solo roles autorizados)
    const canAccess = authUser.roles?.some(role => 
      ['admin', 'gestor', 'comprobador'].includes(role)
    );
    
    if (!canAccess) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Forbidden - Insufficient permissions' 
        },
        { status: 403 }
      );
    }

    // 3. Buscar ticket por ID
    const ticketDoc = await adminDb.collection('tickets').doc(ticketId).get();
    
    if (!ticketDoc.exists) {
      console.log('❌ Ticket not found:', ticketId);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Ticket not found',
          details: 'The requested ticket does not exist'
        },
        { status: 404 }
      );
    }

    const ticketData = ticketDoc.data()!;
    
    console.log('🎫 Ticket found:', {
      id: ticketId,
      status: ticketData.status,
      attendee: ticketData.attendee_name,
      event_id: ticketData.event_id
    });

    // 4. Obtener información del evento
    const eventDoc = await adminDb.collection('events').doc(ticketData.event_id).get();
    if (!eventDoc.exists) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Event not found',
          details: 'The event associated with this ticket no longer exists'
        },
        { status: 404 }
      );
    }

    const eventData = eventDoc.data()!;
    
    // 5. Obtener información del tipo de boleto
    const ticketTypeDoc = await adminDb.collection('ticket_types').doc(ticketData.ticket_type_id).get();
    if (!ticketTypeDoc.exists) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Ticket type not found',
          details: 'The ticket type associated with this ticket no longer exists'
        },
        { status: 404 }
      );
    }

    const ticketTypeData = ticketTypeDoc.data()!;

    // 6. Preparar respuesta completa con todas las relaciones
    const completeTicket = {
      id: ticketId,
      ...ticketData,
      event: {
        id: ticketData.event_id,
        name: eventData.name,
        start_date: eventData.start_date?.toDate() || new Date(),
        end_date: eventData.end_date?.toDate() || new Date(),
        location: eventData.location || 'Ubicación no especificada',
        description: eventData.description,
        internal_notes: eventData.internal_notes
      },
      ticket_type: {
        id: ticketData.ticket_type_id,
        name: ticketTypeData.name,
        description: ticketTypeData.description,
        access_type: ticketTypeData.access_type,
        price: ticketTypeData.price,
        currency: ticketTypeData.currency
      },
      // Procesar fechas de days usados
      used_days: (ticketData.used_days || []).map((day: any) => {
        if (day?.toDate) {
          return day.toDate().toISOString().split('T')[0];
        }
        return new Date(day).toISOString().split('T')[0];
      }),
      // Procesar fechas de days autorizados
      authorized_days: (ticketData.authorized_days || []).map((day: any) => {
        if (day?.toDate) {
          return day.toDate().toISOString().split('T')[0];
        }
        return new Date(day).toISOString().split('T')[0];
      }),
      // Check-in info
      last_checkin: ticketData.last_checkin?.toDate(),
      can_undo_until: ticketData.can_undo_until?.toDate(),
      created_at: ticketData.created_at?.toDate(),
      updated_at: ticketData.updated_at?.toDate()
    };

    console.log('✅ Complete ticket data prepared for:', ticketId);

    return NextResponse.json({
      success: true,
      ticket: completeTicket
    });

  } catch (error) {
    console.error('❌ Error fetching ticket:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT method for updating ticket data
export async function PUT(
  request: NextRequest,
  { params }: { params: { ticketId: string } }
): Promise<NextResponse<TicketResponse>> {
  try {
    const { ticketId } = params;
    const updates = await request.json();

    console.log('🔄 Updating ticket:', ticketId, 'with data:', updates);

    // 1. Verificar autenticación
    const authUser = await getAuthFromRequest(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Verificar que el ticket existe
    const ticketDoc = await adminDb.collection('tickets').doc(ticketId).get();
    
    if (!ticketDoc.exists) {
      console.log('❌ Ticket not found:', ticketId);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Ticket not found',
          details: 'The requested ticket does not exist'
        },
        { status: 404 }
      );
    }

    const ticketData = ticketDoc.data()!;

    // 3. Verificar permisos
    const isAdmin = authUser.roles?.includes('admin') || authUser.roles?.includes('gestor');
    const isOwner = ticketData.user_id === authUser.uid || 
                   ticketData.customer_email === authUser.email;

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Forbidden - You can only update your own tickets' 
        },
        { status: 403 }
      );
    }

    // 4. Preparar campos actualizables
    const allowedFields = [
      'attendee_name',
      'attendee_email', 
      'attendee_phone',
      'special_requirements',
      'status',
      'pdf_url',
      'pdf_path',
      'qr_id'
    ];

    // Filtrar solo campos permitidos
    const updateData: any = {};
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateData[key] = value;
      }
    }

    // Siempre actualizar la fecha de modificación
    updateData.updated_at = new Date();

    // 5. Validaciones específicas
    if (updateData.attendee_name !== undefined && !updateData.attendee_name?.trim()) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Attendee name cannot be empty' 
        },
        { status: 400 }
      );
    }

    if (updateData.attendee_email !== undefined && updateData.attendee_email && 
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updateData.attendee_email)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid email format' 
        },
        { status: 400 }
      );
    }

    // 6. Actualizar en Firestore
    await adminDb.collection('tickets').doc(ticketId).update(updateData);

    console.log('✅ Ticket updated successfully:', {
      ticketId,
      updatedFields: Object.keys(updateData),
      updatedBy: authUser.uid
    });

    // 7. Respuesta exitosa
    return NextResponse.json({
      success: true,
      message: 'Ticket updated successfully',
      updatedFields: Object.keys(updateData)
    });

  } catch (error) {
    console.error('❌ Error updating ticket:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE method for deleting tickets
export async function DELETE(
  request: NextRequest,
  { params }: { params: { ticketId: string } }
): Promise<NextResponse<TicketResponse>> {
  try {
    const { ticketId } = params;

    console.log('🗑️ Deleting ticket:', ticketId);

    // 1. Verificar autenticación
    const authUser = await getAuthFromRequest(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Solo admin puede borrar tickets
    if (!authUser.roles?.includes('admin')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Forbidden - Only admins can delete tickets' 
        },
        { status: 403 }
      );
    }

    // 3. Verificar que el ticket existe
    const ticketDoc = await adminDb.collection('tickets').doc(ticketId).get();
    
    if (!ticketDoc.exists) {
      console.log('❌ Ticket not found:', ticketId);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Ticket not found',
          details: 'The requested ticket does not exist'
        },
        { status: 404 }
      );
    }

    const ticketData = ticketDoc.data()!;

    console.log('🎫 Found ticket to delete:', {
      id: ticketId,
      status: ticketData.status,
      attendee: ticketData.attendee_name,
      is_courtesy: ticketData.is_courtesy,
      user_id: ticketData.user_id
    });

    // 4. Eliminar el ticket
    await adminDb.collection('tickets').doc(ticketId).delete();

    console.log('✅ Ticket deleted successfully:', {
      ticketId,
      deletedBy: authUser.uid,
      wasCourtesy: ticketData.is_courtesy
    });

    // 5. Respuesta exitosa
    return NextResponse.json({
      success: true,
      message: 'Ticket deleted successfully',
      deletedTicket: {
        id: ticketId,
        attendee_name: ticketData.attendee_name,
        is_courtesy: ticketData.is_courtesy
      }
    });

  } catch (error) {
    console.error('❌ Error deleting ticket:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
