import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getAuthFromRequest, requireRoles } from '@/lib/auth/server-auth';

/**
 * 🔍 API para obtener boletos huérfanos
 * Solo accesible por administradores
 */
export async function GET(request: NextRequest) {
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

    console.log('🔍 Loading orphan tickets...');

    // Buscar todos los boletos con user_id = null (sin orderBy para evitar problemas de índice)
    // Excluir cortesías standalone que no necesitan soporte
    const orphanTicketsSnapshot = await adminDb
      .collection('tickets')
      .where('user_id', '==', null)
      .limit(100) // Limitar a los 100 más recientes
      .get();

    // Filtrar cortesías standalone en el código
    const orphanTickets = orphanTicketsSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Array<any>;
    const filteredOrphanTickets = orphanTickets.filter(ticket => {
      // Excluir cortesías independientes (que están bien así)
      return ticket.created_via !== 'admin_courtesy_standalone';
    });
    
    // Ordenar manualmente por purchase_date
    filteredOrphanTickets.sort((a, b) => {
      const dateA = a.purchase_date?.toDate?.() || new Date(a.purchase_date);
      const dateB = b.purchase_date?.toDate?.() || new Date(b.purchase_date);
      return dateB.getTime() - dateA.getTime(); // Más recientes primero
    });

    console.log(`✅ Found ${filteredOrphanTickets.length} orphan tickets`);
    
    // Log de algunos detalles para debugging
    if (filteredOrphanTickets.length > 0) {
      console.log('Sample orphan ticket:', {
        id: filteredOrphanTickets[0].id,
        user_id: filteredOrphanTickets[0].user_id,
        customer_email: filteredOrphanTickets[0].customer_email,
        order_id: filteredOrphanTickets[0].order_id,
        has_recovery_data: !!filteredOrphanTickets[0].orphan_recovery_data
      });
    }

    // Estadísticas básicas
    const stats = {
      total: filteredOrphanTickets.length,
      pending: filteredOrphanTickets.filter(t => t.orphan_recovery_data?.recovery_status === 'pending').length,
      recovered: filteredOrphanTickets.filter(t => t.orphan_recovery_data?.recovery_status === 'recovered').length,
      expired: filteredOrphanTickets.filter(t => t.orphan_recovery_data?.recovery_status === 'expired').length,
    };

    return NextResponse.json({
      success: true,
      tickets: filteredOrphanTickets,
      stats,
      message: `Found ${filteredOrphanTickets.length} orphan tickets`
    });

  } catch (error) {
    console.error('❌ Error loading orphan tickets:', error);
    return NextResponse.json(
      { 
        error: 'Failed to load orphan tickets',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
