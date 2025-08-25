import { NextRequest, NextResponse } from 'next/server';

// Implementación simple de ALTCHA challenge
export async function GET() {
  try {
    console.log('🎯 Creating simple ALTCHA challenge...');
    
    // Generar salt simple
    const salt = Math.random().toString(36).substring(2, 15);
    
    // Número aleatorio bajo para que sea fácil de resolver
    const number = Math.floor(Math.random() * 1000);
    
    // Crear el string que debe ser hasheado
    const testString = salt + number;
    
    // Generar el hash SHA-256
    const encoder = new TextEncoder();
    const data = encoder.encode(testString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // El challenge es el hash que ALTCHA debe encontrar
    const challenge = hash;
    
    console.log('✅ Simple ALTCHA challenge created:', {
      algorithm: 'SHA-256',
      salt,
      number,
      testString,
      challenge: challenge.substring(0, 16) + '...',
      challengeLength: challenge.length
    });

    // Respuesta en formato ALTCHA estándar
    return NextResponse.json({
      algorithm: 'SHA-256',
      challenge,
      salt,
      signature: null // Para puzzles simples
    });

  } catch (error) {
    console.error('❌ Error creating ALTCHA challenge:', error);
    return NextResponse.json(
      { error: 'Failed to create challenge' },
      { status: 500 }
    );
  }
}
