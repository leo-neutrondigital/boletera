import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

interface LinkOrphanTicketsRequest {
  userEmail: string;
  userId: string;
}

/**
 * 🔗 API para vincular boletos huérfanos cuando un usuario crea su cuenta
 * 
 * Se ejecuta automáticamente cuando:
 * 1. Un usuario se registra con el mismo email que usó para una compra fallida
 * 2. Un usuario hace login y detectamos boletos huérfanos
 * 
 * Busca boletos con:
 * - user_id: null
 * - customer_email: matching user email
 * - orphan_recovery_data.recovery_status: 'pending'
 */
export async function POST(request: NextRequest) {
  try {
    const body: LinkOrphanTicketsRequest = await request.json();
    const { userEmail, userId } = body;

    console.log('🔗 Linking orphan tickets for user:', {
      userEmail,
      userId
    });

    // Validaciones básicas
    if (!userEmail || !userId) {
      return NextResponse.json(
        { error: 'userEmail and userId are required' },
        { status: 400 }
      );
    }

    // Buscar boletos huérfanos para este email
    const orphanTicketsQuery = adminDb.collection('tickets')
      .where('user_id', '==', null)
      .where('customer_email', '==', userEmail.toLowerCase())
      .where('orphan_recovery_data.recovery_status', '==', 'pending');

    const orphanTicketsSnapshot = await orphanTicketsQuery.get();

    if (orphanTicketsSnapshot.empty) {
      console.log('ℹ️ No orphan tickets found for email:', userEmail);
      return NextResponse.json({
        success: true,
        linkedTickets: 0,
        message: 'No orphan tickets found to link'
      });
    }

    console.log(`🎫 Found ${orphanTicketsSnapshot.size} orphan tickets to link`);

    // Crear batch para actualizar todos los boletos huérfanos
    const batch = adminDb.batch();
    const linkedTicketIds: string[] = [];

    orphanTicketsSnapshot.forEach((doc) => {
      const ticketData = doc.data();
      
      console.log('🔗 Linking ticket:', {
        ticketId: doc.id,
        orderId: ticketData.order_id,
        captureId: ticketData.capture_id,
        originalEmail: ticketData.customer_email
      });

      // Actualizar el boleto para vincularlo al usuario
      batch.update(doc.ref, {
        user_id: userId,
        'orphan_recovery_data.recovery_status': 'recovered',
        'orphan_recovery_data.recovered_at': FieldValue.serverTimestamp(),
        'orphan_recovery_data.linked_to_user': userId,
        updated_at: FieldValue.serverTimestamp(),
        recovery_notes: `Auto-linked to user ${userId} on account creation/login`
      });

      linkedTicketIds.push(doc.id);
    });

    // Ejecutar todas las actualizaciones
    await batch.commit();

    console.log(`✅ Successfully linked ${linkedTicketIds.length} orphan tickets to user ${userId}`);

    // Opcional: Enviar email de notificación sobre boletos recuperados
    try {
      console.log('📧 Sending ticket recovery notification email...');
      
      const { EmailApiClient } = await import('@/lib/email/email-client');
      const emailClient = new EmailApiClient();
      
      // Email simple informando que sus boletos han sido vinculados
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head><title>Boletos Vinculados</title></head>
        <body style="font-family: Arial, sans-serif; margin: 20px;">
          <div style="max-width: 600px; margin: 0 auto;">
            <h2 style="color: #22c55e;">🎉 ¡Boletos Vinculados Exitosamente!</h2>
            <p>Hemos encontrado y vinculado <strong>${linkedTicketIds.length} boleto${linkedTicketIds.length > 1 ? 's' : ''}</strong> a tu cuenta.</p>
            <p>Ya puedes acceder a tus boletos desde tu panel de usuario.</p>
            <p style="margin-top: 20px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" 
                 style="background-color: #3b82f6; color: white; text-decoration: none; 
                        padding: 12px 24px; border-radius: 6px; display: inline-block;">
                Ver Mis Boletos
              </a>
            </p>
            <p style="color: #666; margin-top: 20px; font-size: 14px;">
              Si tienes dudas, contáctanos en cualquier momento.
            </p>
          </div>
        </body>
        </html>
      `;

      await emailClient.sendEmail({
        to: userEmail,
        subject: 'Boletos vinculados a tu cuenta',
        html: htmlContent,
        text: `¡Boletos vinculados! Hemos encontrado y vinculado ${linkedTicketIds.length} boleto${linkedTicketIds.length > 1 ? 's' : ''} a tu cuenta. Accede en: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
      });

      console.log('✅ Recovery notification email sent');
    } catch (emailError) {
      console.error('❌ Failed to send recovery notification email:', emailError);
      // No fallar el proceso si falla el email
    }

    return NextResponse.json({
      success: true,
      linkedTickets: linkedTicketIds.length,
      ticketIds: linkedTicketIds,
      message: `Successfully linked ${linkedTicketIds.length} orphan ticket${linkedTicketIds.length > 1 ? 's' : ''} to user account`
    });

  } catch (error) {
    console.error('❌ Error linking orphan tickets:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to link orphan tickets',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * 🔍 GET: Verificar si un usuario tiene boletos huérfanos pendientes
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('email');

    if (!userEmail) {
      return NextResponse.json(
        { error: 'email parameter required' },
        { status: 400 }
      );
    }

    // Buscar boletos huérfanos para este email
    const orphanTicketsQuery = adminDb.collection('tickets')
      .where('user_id', '==', null)
      .where('customer_email', '==', userEmail.toLowerCase())
      .where('orphan_recovery_data.recovery_status', '==', 'pending');

    const orphanTicketsSnapshot = await orphanTicketsQuery.get();
    const orphanTickets = orphanTicketsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Solo datos relevantes para el frontend
      order_id: doc.data().order_id,
      event_id: doc.data().event_id,
      ticket_type_name: doc.data().ticket_type_name,
      amount_paid: doc.data().amount_paid,
      currency: doc.data().currency,
      purchase_date: doc.data().purchase_date,
    }));

    return NextResponse.json({
      hasOrphanTickets: !orphanTicketsSnapshot.empty,
      orphanTicketsCount: orphanTicketsSnapshot.size,
      orphanTickets: orphanTickets,
      message: orphanTicketsSnapshot.empty 
        ? 'No orphan tickets found' 
        : `Found ${orphanTicketsSnapshot.size} orphan ticket${orphanTicketsSnapshot.size > 1 ? 's' : ''}`
    });

  } catch (error) {
    console.error('❌ Error checking orphan tickets:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to check orphan tickets',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
