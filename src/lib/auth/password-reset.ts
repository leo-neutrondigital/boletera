import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';

/**
 * Envía un email de restablecimiento de contraseña a un usuario
 * Útil para uso administrativo desde el dashboard de usuarios
 */
export async function sendPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
  try {
    await sendPasswordResetEmail(auth, email);
    
    return {
      success: true,
      message: `Email de restablecimiento enviado a ${email}`
    };
  } catch (error: any) {
    console.error('Error sending password reset:', error);
    
    const errorMessage = getPasswordResetErrorMessage(error.code);
    
    return {
      success: false,
      message: errorMessage
    };
  }
}

/**
 * Traduce los códigos de error de Firebase a mensajes legibles
 */
function getPasswordResetErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'auth/user-not-found':
      return 'No existe una cuenta con este email.';
    case 'auth/invalid-email':
      return 'El formato del email no es válido.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Inténtalo más tarde.';
    case 'auth/user-disabled':
      return 'Esta cuenta ha sido deshabilitada.';
    default:
      return 'Error al enviar el email. Inténtalo nuevamente.';
  }
}

/**
 * Verifica si un email es válido antes de enviar reset
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
