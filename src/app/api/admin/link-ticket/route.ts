import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { getAuthFromRequest, requireRoles } from '@/lib/auth/server-auth';

// ✅ Forzar modo dinámico para usar request.headers y request.json()
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface LinkTicketRequest {
  ticketId: string;
  userId: string;
}

/**
 * 🔗 API para vincular manualmente un boleto huérfano a un usuario
 * Solo accesible por administradores
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación y permisos de admin
    const user = await getAuthFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - No valid token' },
        { status: 401 }
      );
    }
    
    if (!requireRoles(user.roles, ['admin'])) {
      return NextResponse.json(
        { 
          error: 'Forbidden - Admin access required',
          required: ['admin'],
          current: user.roles
        },
        { status: 403 }
      );
    }

    const body: LinkTicketRequest = await request.json();
    const { ticketId, userId } = body;

    // Validaciones
    if (!ticketId || !userId) {
      return NextResponse.json(
        { error: 'ticketId and userId are required' },
        { status: 400 }
      );
    }

    console.log('🔗 Manual linking ticket to user:', { ticketId, userId });

    // Verificar que el boleto existe y es huérfano
    const ticketRef = adminDb.collection('tickets').doc(ticketId);
    const ticketDoc = await ticketRef.get();

    if (!ticketDoc.exists) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    const ticketData = ticketDoc.data()!;
    if (ticketData.user_id !== null) {
      return NextResponse.json(
        { error: 'Ticket is already linked to a user' },
        { status: 400 }
      );
    }

    // Verificar que el usuario existe
    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data()!;

    // Actualizar el boleto para vincularlo al usuario
    const updateData: any = {
      user_id: userId,
      linked_at: FieldValue.serverTimestamp(),
      linked_via: 'manual_admin',
      linked_by: user.uid, // ID del admin que hizo la vinculación
      updated_at: FieldValue.serverTimestamp()
    };

    // Si el boleto tiene datos de recuperación, marcar como recuperado
    if (ticketData.orphan_recovery_data) {
      updateData['orphan_recovery_data.recovery_status'] = 'recovered';
      updateData['orphan_recovery_data.recovered_at'] = FieldValue.serverTimestamp();
      updateData['orphan_recovery_data.linked_to_user'] = userId;
      updateData['orphan_recovery_data.recovery_method'] = 'manual_admin';
    }

    await ticketRef.update(updateData);

    console.log(`✅ Successfully linked ticket ${ticketId} to user ${userId}`);

    // Opcional: Enviar email de notificación al usuario
    try {
      console.log('📧 Sending ticket linked notification email...');
      
      const { EmailApiClient } = await import('@/lib/email/email-client');
      const emailClient = new EmailApiClient();
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head><title>Boleto Vinculado</title></head>
        <body style="font-family: Arial, sans-serif; margin: 20px;">
          <div style="max-width: 600px; margin: 0 auto;">
            <h2 style="color: #22c55e;">🎉 ¡Boleto Vinculado a tu Cuenta!</h2>
            <p>Hemos vinculado manualmente un boleto a tu cuenta.</p>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p><strong>Boleto:</strong> ${ticketData.ticket_type_name}</p>
              <p><strong>Orden:</strong> ${ticketData.order_id}</p>
              <p><strong>Email de compra:</strong> ${ticketData.customer_email}</p>
            </div>
            <p>Ya puedes acceder a tu boleto desde tu panel de usuario.</p>
            <p style="margin-top: 20px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/my-tickets" 
                 style="background-color: #3b82f6; color: white; text-decoration: none; 
                        padding: 12px 24px; border-radius: 6px; display: inline-block;">
                Ver Mis Boletos
              </a>
            </p>
          </div>
        </body>
        </html>
      `;

      await emailClient.sendEmail({
        to: userData.email,
        subject: 'Boleto vinculado a tu cuenta',
        html: htmlContent,
        text: `¡Boleto vinculado! Hemos vinculado manualmente un boleto a tu cuenta. Orden: ${ticketData.order_id}. Accede en: ${process.env.NEXT_PUBLIC_APP_URL}/my-tickets`
      });

      console.log('✅ Notification email sent successfully');
    } catch (emailError) {
      console.error('❌ Failed to send notification email:', emailError);
      // No fallar el proceso si falla el email
    }

    return NextResponse.json({
      success: true,
      message: `Ticket successfully linked to user ${userData.name} (${userData.email})`,
      details: {
        ticketId,
        userId,
        ticketType: ticketData.ticket_type_name,
        orderId: ticketData.order_id,
        linkedTo: {
          name: userData.name,
          email: userData.email
        }
      }
    });

  } catch (error) {
    console.error('❌ Error linking ticket manually:', error);
    return NextResponse.json(
      { 
        error: 'Failed to link ticket',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
