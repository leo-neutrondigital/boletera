import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getAuthFromRequest, requireRoles } from '@/lib/auth/server-auth';

// ✅ Forzar modo dinámico para usar request.headers
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * 🔍 API para buscar usuarios por email
 * Solo accesible por administradores y gestores
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación y permisos
    const user = await getAuthFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - No valid token' },
        { status: 401 }
      );
    }
    
    if (!requireRoles(user.roles, ['admin', 'gestor'])) {
      return NextResponse.json(
        { 
          error: 'Forbidden - Admin or Gestor access required',
          required: ['admin', 'gestor'],
          current: user.roles
        },
        { status: 403 }
      );
    }

    // Obtener email del query parameter
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      );
    }

    if (!email.includes('@')) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    console.log('🔍 Searching for user with email:', email);

    // Buscar usuario por email en Firestore
    const userQuery = await adminDb
      .collection('users')
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();

    if (userQuery.empty) {
      console.log('ℹ️ User not found for email:', email);
      return NextResponse.json({
        found: false,
        user: null,
        message: 'User not found'
      });
    }

    const userDoc = userQuery.docs[0];
    const userData = userDoc.data();

    console.log('✅ User found:', {
      uid: userDoc.id,
      email: userData.email,
      name: userData.name
    });

    // Retornar datos básicos del usuario (sin información sensible)
    return NextResponse.json({
      found: true,
      user: {
        uid: userDoc.id,
        email: userData.email,
        name: userData.name || 'Usuario sin nombre',
        created_at: userData.created_at?.toDate() || null
      },
      message: 'User found successfully'
    });

  } catch (error) {
    console.error('❌ Error searching user:', error);
    return NextResponse.json(
      { 
        error: 'Failed to search user',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
