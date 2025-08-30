import { NextRequest, NextResponse } from 'next/server';

// ✅ Forzar modo dinámico para usar request.json()
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// 🆕 API para verificar si un email existe (sin crear nada)
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    
    console.log('🔍 Checking if email exists:', normalizedEmail);

    // Usar Firebase Admin para verificar si el email existe
    const { getAuth } = await import('firebase-admin/auth');
    const auth = getAuth();

    try {
      // Intentar obtener usuario por email
      const firebaseUser = await auth.getUserByEmail(normalizedEmail);
      
      console.log('✅ Email exists:', {
        email: normalizedEmail,
        uid: firebaseUser.uid,
        emailVerified: firebaseUser.emailVerified
      });

      return NextResponse.json({
        exists: true,
        verified: firebaseUser.emailVerified || false
      });

    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        console.log('🔍 Email does not exist:', normalizedEmail);
        
        return NextResponse.json({
          exists: false
        });
      }
      
      // Otros errores de Firebase Auth
      console.error('❌ Firebase Auth error:', error);
      return NextResponse.json(
        { error: 'Error verificando email' }, 
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Check email API error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
