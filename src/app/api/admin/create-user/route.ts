// src/app/api/admin/create-user/route.ts

import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { adminDb } from '@/lib/firebase/admin';
import { getAuthFromRequest } from '@/lib/auth/server-auth';

export async function POST(req: Request) {
  try {
    // Verificar autorización
    const user = await getAuthFromRequest(req);
    if (!user || !user.roles.includes("admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { 
      email, 
      name, 
      role,
      // 🆕 Nuevos campos opcionales
      phone,
      company,
      city,
      country,
      marketing_consent
    } = body;

    // Validaciones básicas
    if (!email || !name || !role) {
      return NextResponse.json({ 
        error: "Campos requeridos: email, name, role" 
      }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ 
        error: "Correo electrónico inválido" 
      }, { status: 400 });
    }

    // Validar rol válido
    const validRoles = ['admin', 'gestor', 'comprobador', 'usuario'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ 
        error: `Rol inválido. Debe ser uno de: ${validRoles.join(', ')}` 
      }, { status: 400 });
    }

    // Validar teléfono si se proporciona
    if (phone && !/^[\+]?[1-9][\d]{0,15}$/.test(phone.replace(/\s/g, ''))) {
      return NextResponse.json({ 
        error: "Número de teléfono inválido" 
      }, { status: 400 });
    }

    // Generar contraseña temporal segura
    const generateSecurePassword = () => {
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';
      return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    };

    const password = generateSecurePassword();

    // 1. Crear usuario en Firebase Auth
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });

    // 2. Guardar en Firestore con todos los campos
    const userData = {
      uid: userRecord.uid,
      email,
      name,
      roles: [role],
      
      // 🆕 Nuevos campos
      phone: phone || '',
      company: company || '',
      address: {
        city: city || '',
        country: country || 'México'
      },
      marketing_consent: marketing_consent ?? false,
      created_via: 'admin' as const,
      
      created_at: new Date(),
    };

    await adminDb.doc(`users/${userRecord.uid}`).set(userData);

    // 3. Generar link para establecer contraseña
    const resetLink = await adminAuth.generatePasswordResetLink(email);

    console.log('✅ User created successfully:', {
      uid: userRecord.uid,
      email,
      name,
      role
    });

    return NextResponse.json({ 
      success: true, 
      user: {
        uid: userRecord.uid,
        email,
        name,
        role
      },
      resetLink, // Para enviar por email
      // En desarrollo, retornar la contraseña temporal
      ...(process.env.NODE_ENV === 'development' && { generatedPassword: password })
    });

  } catch (error: unknown) {
    console.error('❌ Error creating user:', error);
    
    if (error instanceof Error) {
      // Manejar errores específicos de Firebase
      if (error.message.includes('email-already-exists')) {
        return NextResponse.json({ 
          error: "Ya existe un usuario con este email" 
        }, { status: 409 });
      }
      
      if (error.message.includes('invalid-email')) {
        return NextResponse.json({ 
          error: "Email inválido" 
        }, { status: 400 });
      }
      
      return NextResponse.json({ 
        error: error.message 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      error: "Error interno del servidor" 
    }, { status: 500 });
  }
}
