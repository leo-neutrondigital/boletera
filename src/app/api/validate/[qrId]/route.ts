import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getAuthFromRequest } from '@/lib/auth/server-auth';
import { FieldValue } from 'firebase-admin/firestore';

// ✅ Forzar modo dinámico para usar request.headers y request.json()
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ValidationRequest {
  action: 'checkin' | 'undo';
  timestamp?: string;
}

interface ValidationResponse {
  success: boolean;
  ticket?: any;
  action_performed?: string;
  can_undo?: boolean;
  undo_deadline?: string;
  error?: string;
  details?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { qrId: string } }
): Promise<NextResponse<ValidationResponse>> {
  try {
    const { qrId } = params;
    const { action, timestamp }: ValidationRequest = await request.json();

    console.log('🔍 QR Validation request:', {
      qrId,
      action,
      timestamp,
      userAgent: request.headers.get('user-agent')?.substring(0, 50)
    });

    // 1. Verificar autenticación
    const authUser = await getAuthFromRequest(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Verificar permisos (solo roles autorizados pueden validar)
    const canValidate = authUser.roles?.some(role => 
      ['admin', 'gestor', 'comprobador'].includes(role)
    );
    
    if (!canValidate) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Forbidden - Only admin, gestor, and comprobador can validate tickets' 
        },
        { status: 403 }
      );
    }

    // 3. Buscar ticket por QR ID
    const ticketsQuery = await adminDb
      .collection('tickets')
      .where('qr_id', '==', qrId)
      .limit(1)
      .get();

    if (ticketsQuery.empty) {
      console.log('❌ QR not found:', qrId);
      return NextResponse.json(
        { 
          success: false, 
          error: 'QR code not found',
          details: 'This QR code is not registered in our system'
        },
        { status: 404 }
      );
    }

    const ticketDoc = ticketsQuery.docs[0];
    const ticketData = ticketDoc.data();
    const ticketId = ticketDoc.id;

    console.log('🎫 Ticket found:', {
    id: ticketId,
    status: ticketData.status,
    attendee_name: ticketData.attendee_name,
    attendee: ticketData.attendee,
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
    const eventStartDate = eventData.start_date?.toDate() || new Date();
    const eventEndDate = eventData.end_date?.toDate() || new Date();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

    // 5. Validaciones según la acción
    if (action === 'checkin') {
      return await handleCheckIn({
        ticketDoc,
        ticketData,
        ticketId,
        eventData,
        eventStartDate,
        eventEndDate,
        today,
        todayStr,
        authUser,
        qrId
      });
    } else if (action === 'undo') {
      return await handleUndo({
        ticketDoc,
        ticketData,
        ticketId,
        authUser,
        todayStr
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('❌ Validation error:', error);
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

async function handleCheckIn({
  ticketDoc,
  ticketData,
  ticketId,
  eventData,
  eventStartDate,
  eventEndDate,
  todayStr,
  authUser,
  qrId
}: any): Promise<NextResponse<ValidationResponse>> {
  
  // 1. Verificar que el ticket esté configurado y listo para usar
  // Estados válidos: 'generated' (con QR) y 'configured'
  // Estados inválidos: 'purchased' (sin configurar) y 'pending'
  const validStatuses = ['generated', 'configured'];
  
  console.log('🔍 Validation check:', {
    status: ticketData.status,
    isValidStatus: validStatuses.includes(ticketData.status),
    attendee_name: ticketData.attendee_name,
    attendee: ticketData.attendee,
    hasAttendee: !!(ticketData.attendee_name || ticketData.attendee)
  });
  
  if (!validStatuses.includes(ticketData.status) || (!ticketData.attendee_name && !ticketData.attendee)) {
    return NextResponse.json({
      success: false,
      error: 'Ticket not configured',
      details: `This ticket has status '${ticketData.status}' and needs to be configured with attendee information first`
    }, { status: 400 });
  }

  // 2. Verificar fechas del evento
  const eventStartStr = eventStartDate.toISOString().split('T')[0];
  const eventEndStr = eventEndDate.toISOString().split('T')[0];
  
  console.log('🗓️ Event date validation:', {
    today: todayStr,
    eventStart: eventStartStr,
    eventEnd: eventEndStr,
    isAfterStart: todayStr >= eventStartStr,
    isBeforeEnd: todayStr <= eventEndStr
  });
  
  if (todayStr < eventStartStr) {
    console.error('❌ Event not started yet');
    return NextResponse.json({
      success: false,
      error: 'Event not started',
      details: `This event starts on ${eventStartDate.toLocaleDateString()}`
    }, { status: 400 });
  }
  
  if (todayStr > eventEndStr) {
    console.error('❌ Event already ended');
    return NextResponse.json({
      success: false,
      error: 'Event ended',
      details: `This event ended on ${eventEndDate.toLocaleDateString()}`
    }, { status: 400 });
  }

  // 3. Obtener tipo de boleto para validaciones específicas
  console.log('🔍 Looking for ticket type:', ticketData.ticket_type_id);
  const ticketTypeDoc = await adminDb.collection('ticket_types').doc(ticketData.ticket_type_id).get();
  if (!ticketTypeDoc.exists) {
    console.error('❌ Ticket type not found:', ticketData.ticket_type_id);
    return NextResponse.json({
      success: false,
      error: 'Ticket type not found'
    }, { status: 404 });
  }
  
  const ticketTypeData = ticketTypeDoc.data()!;
  console.log('🎫 Ticket type found:', {
    id: ticketData.ticket_type_id,
    name: ticketTypeData.name,
    access_type: ticketTypeData.access_type
  });
  
  // 4. Validar según tipo de acceso
  const authorizedDays = ticketData.authorized_days || [];
  const usedDays = ticketData.used_days || [];
  
  // Convertir fechas de Firestore a strings para comparación
  const authorizedDayStrs = authorizedDays.map((day: any) => {
    const date = day?.toDate ? day.toDate() : new Date(day);
    return date.toISOString().split('T')[0];
  });
  
  const usedDayStrs = usedDays.map((day: any) => {
    const date = day?.toDate ? day.toDate() : new Date(day);
    return date.toISOString().split('T')[0];
  });

  console.log('📅 Days validation:', {
    ticketType: ticketTypeData.access_type,
    today: todayStr,
    authorizedDays: authorizedDayStrs,
    usedDays: usedDayStrs,
    authorizedCount: authorizedDayStrs.length,
    usedCount: usedDayStrs.length
  });

  // 5. Validaciones específicas por tipo de acceso
  if (ticketTypeData.access_type === 'specific_days') {
    console.log('🔍 Checking specific_days validation...');
    if (!authorizedDayStrs.includes(todayStr)) {
      console.error('❌ Not authorized for today - specific_days');
      return NextResponse.json({
        success: false,
        error: 'Not authorized for today',
        details: `This ticket is only valid for: ${authorizedDayStrs.join(', ')}`
      }, { status: 400 });
    }
  } else if (ticketTypeData.access_type === 'any_single_day') {
    console.log('🔍 Checking any_single_day validation...');
    if (usedDayStrs.length > 0) {
      console.error('❌ Already used - any_single_day');
      return NextResponse.json({
        success: false,
        error: 'Already used',
        details: `This single-use ticket was already used on ${usedDayStrs[0]}`
      }, { status: 400 });
    }
  }
  // 'all_days' no requiere validaciones adicionales
  console.log('✅ Access type validation passed');

  // 6. Verificar si ya fue usado hoy
  console.log('🔍 Checking if already used today...');
  if (usedDayStrs.includes(todayStr)) {
    console.error('❌ Already checked in today');
    return NextResponse.json({
      success: false,
      error: 'Already checked in today',
      details: `This ticket was already used today (${todayStr})`
    }, { status: 400 });
  }
  console.log('✅ Not used today - proceeding with check-in');

  // 7. Realizar check-in
  const checkInTime = new Date();
  const undoDeadline = new Date(checkInTime.getTime() + 5 * 60 * 1000); // 5 minutos
  
  const updateData = {
    used_days: FieldValue.arrayUnion(checkInTime),
    last_checkin: checkInTime,
    last_checkin_by: authUser.uid,
    updated_at: checkInTime,
    // Datos para undo
    last_checkin_day: todayStr,
    can_undo_until: undoDeadline
  };

  await ticketDoc.ref.update(updateData);

  // 8. Log de auditoría
  await adminDb.collection('ticket_logs').add({
    ticket_id: ticketId,
    qr_id: qrId,
    action: 'checkin',
    performed_by: authUser.uid,
    performed_at: checkInTime,
    day: todayStr,
    event_id: ticketData.event_id,
    attendee_name: ticketData.attendee_name,
    scanner_ip: authUser.ip || 'unknown'
  });

  console.log('✅ Check-in successful:', {
    ticket_id: ticketId,
    attendee: ticketData.attendee_name,
    day: todayStr,
    scanner: authUser.uid
  });

  // 9. Preparar respuesta con datos completos
  const responseTicket = {
    id: ticketId,
    ...ticketData,
    event: {
      id: ticketData.event_id,
      name: eventData.name,
      start_date: eventStartDate,
      end_date: eventEndDate,
      location: eventData.location
    },
    ticket_type: {
      id: ticketData.ticket_type_id,
      name: ticketTypeData.name,
      access_type: ticketTypeData.access_type
    },
    checkin_time: checkInTime,
    used_days: [...usedDayStrs, todayStr]
  };

  return NextResponse.json({
    success: true,
    ticket: responseTicket,
    action_performed: 'checked_in',
    can_undo: true,
    undo_deadline: undoDeadline.toISOString()
  });
}

async function handleUndo({
  ticketDoc,
  ticketData,
  ticketId,
  authUser,
  todayStr
}: any): Promise<NextResponse<ValidationResponse>> {
  
  // 1. Verificar que puede hacer undo
  const canUndoUntil = ticketData.can_undo_until?.toDate();
  const now = new Date();
  
  if (!canUndoUntil || now > canUndoUntil) {
    return NextResponse.json({
      success: false,
      error: 'Undo time expired',
      details: 'You can only undo check-ins within 5 minutes'
    }, { status: 400 });
  }

  // 2. Verificar que fue el mismo usuario que hizo check-in
  if (ticketData.last_checkin_by !== authUser.uid) {
    return NextResponse.json({
      success: false,
      error: 'Unauthorized undo',
      details: 'You can only undo your own check-ins'
    }, { status: 403 });
  }

  // 3. Verificar que hay un check-in de hoy para deshacer
  if (ticketData.last_checkin_day !== todayStr) {
    return NextResponse.json({
      success: false,
      error: 'No check-in to undo',
      details: 'No check-in found for today'
    }, { status: 400 });
  }

  // 4. Realizar undo
  const usedDays = ticketData.used_days || [];
  const updatedUsedDays = usedDays.filter((day: any) => {
    const dayStr = (day?.toDate ? day.toDate() : new Date(day)).toISOString().split('T')[0];
    return dayStr !== todayStr;
  });

  await ticketDoc.ref.update({
    used_days: updatedUsedDays,
    last_checkin: null,
    last_checkin_by: null,
    last_checkin_day: null,
    can_undo_until: null,
    updated_at: new Date()
  });

  // 5. Log de auditoría
  await adminDb.collection('ticket_logs').add({
    ticket_id: ticketId,
    qr_id: ticketData.qr_id,
    action: 'undo_checkin',
    performed_by: authUser.uid,
    performed_at: new Date(),
    day: todayStr,
    event_id: ticketData.event_id,
    attendee_name: ticketData.attendee_name,
    scanner_ip: authUser.ip || 'unknown'
  });

  console.log('↩️ Check-in undone:', {
    ticket_id: ticketId,
    attendee: ticketData.attendee_name,
    day: todayStr,
    undone_by: authUser.uid
  });

  return NextResponse.json({
    success: true,
    action_performed: 'undo_checkin',
    can_undo: false
  });
}

// GET para validación pública (sin auth) - solo para verificar si QR existe
export async function GET(
  request: NextRequest,
  { params }: { params: { qrId: string } }
): Promise<NextResponse> {
  try {
    const { qrId } = params;
    
    // Buscar ticket básico (sin datos sensibles)
    const ticketsQuery = await adminDb
      .collection('tickets')
      .where('qr_id', '==', qrId)
      .limit(1)
      .get();

    if (ticketsQuery.empty) {
      return NextResponse.json(
        { valid: false, error: 'QR code not found' },
        { status: 404 }
      );
    }

    const ticketData = ticketsQuery.docs[0].data();
    
    // Obtener info básica del evento
    const eventDoc = await adminDb.collection('events').doc(ticketData.event_id).get();
    const eventData = eventDoc.exists ? eventDoc.data() : null;

    return NextResponse.json({
      valid: true,
      event_name: eventData?.name || 'Unknown Event',
      attendee_name: ticketData.attendee_name || 'Not configured',
      status: ticketData.status
    });

  } catch (error) {
    console.error('❌ QR validation error:', error);
    return NextResponse.json(
      { valid: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
