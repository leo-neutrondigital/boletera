// src/app/api/admin/create-user/route.ts

import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { adminDb } from '@/lib/firebase/admin';

export async function POST(req: Request) {
  const { email, name, role } = await req.json();

  if (!email || !name || !role) {
    return new NextResponse("Faltan campos obligatorios: email, name o role", { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return new NextResponse("Correo electrónico inválido", { status: 400 });
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const idToken = authHeader.split("Bearer ")[1];

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const userDoc = await adminDb.doc(`users/${decodedToken.uid}`).get();
    const userData = userDoc.exists ? userDoc.data() : null;

    if (!userData?.roles?.includes("admin")) {
      return new NextResponse("Permiso denegado: se requiere rol de administrador", { status: 403 });
    }
  } catch (error) {
    console.error("Error verificando token:", error);
    return new NextResponse("Token inválido o expirado", { status: 401 });
  }

  try {
    const generateSecurePassword = () => {
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';
      return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    };

    const password = generateSecurePassword();

    // 1. Crear usuario con contraseña temporal
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });

    // 2. Guardar en Firestore
    await adminDb.doc(`users/${userRecord.uid}`).set({
      uid: userRecord.uid,
      email,
      name,
      roles: [role],
      created_at: new Date(),
    });

    // 3. Enviar link para establecer contraseña
    // const resetLink = await adminAuth.generatePasswordResetLink(email);

    // (opcional) enviar por correo aquí con algún servicio SMTP

    return NextResponse.json({ success: true, generatedPassword: password });
  } catch (error: unknown) {
  console.error('Error al crear usuario:', error);
  if (error instanceof Error) {
    return new NextResponse(error.message, { status: 500 });
  }
  return new NextResponse("Error desconocido", { status: 500 });
}
}