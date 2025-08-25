'use client';

import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useRouter } from 'next/navigation';
import { Mail, ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const getErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'No existe una cuenta con este email.';
      case 'auth/invalid-email':
        return 'El formato del email no es válido.';
      case 'auth/too-many-requests':
        return 'Demasiados intentos. Inténtalo más tarde.';
      default:
        return 'Error al enviar el email. Inténtalo nuevamente.';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Por favor, ingresa tu email.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await sendPasswordResetEmail(auth, email.trim());
      
      setEmailSent(true);
      
      toast({
        title: "✅ Email enviado",
        description: "Revisa tu bandeja de entrada para restablecer tu contraseña.",
      });

    } catch (err: any) {
      console.error('Password reset error:', err);
      const errorMessage = getErrorMessage(err.code);
      setError(errorMessage);
      
      toast({
        variant: "destructive",
        title: "Error al enviar email",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      toast({
        title: "Email reenviado",
        description: "Revisa tu bandeja de entrada.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: getErrorMessage(err.code),
      });
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          
          {/* Header de éxito */}
          <div className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Email Enviado</h1>
            <p className="text-gray-600">Revisa tu bandeja de entrada</p>
          </div>

          {/* Card de confirmación */}
          <Card className="shadow-xl border-0">
            <CardHeader>
              <CardTitle className="text-center text-green-700">
                📧 Instrucciones Enviadas
              </CardTitle>
              <CardDescription className="text-center">
                Hemos enviado las instrucciones a tu email
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              
              {/* Email enviado */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Mail className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-green-900">Email enviado a:</p>
                    <p className="text-sm text-green-700 break-all">{email}</p>
                  </div>
                </div>
              </div>

              {/* Instrucciones */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">Próximos pasos:</h3>
                <ol className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">1</span>
                    <span>Revisa tu bandeja de entrada (y carpeta de spam)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">2</span>
                    <span>Haz clic en el enlace del email</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">3</span>
                    <span>Crea tu nueva contraseña</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">4</span>
                    <span>¡Inicia sesión con tu nueva contraseña!</span>
                  </li>
                </ol>
              </div>

              {/* Acciones */}
              <div className="space-y-3">
                <Button
                  onClick={handleResendEmail}
                  variant="outline"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? 'Reenviando...' : 'Reenviar Email'}
                </Button>

                <Button
                  onClick={() => router.push('/login')}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  Volver al Login
                </Button>
              </div>

            </CardContent>
          </Card>

          {/* Info adicional */}
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">
              ¿No recibiste el email?{' '}
              <button 
                onClick={handleResendEmail}
                className="text-green-600 hover:text-green-700 font-medium underline"
                disabled={loading}
              >
                Reenviar
              </button>
            </p>
            <p className="text-xs text-gray-500">
              El enlace expira en 24 horas por seguridad
            </p>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-4">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">¿Olvidaste tu contraseña?</h1>
          <p className="text-gray-600">Te enviaremos instrucciones por email</p>
        </div>

        {/* Formulario */}
        <Card className="shadow-xl border-0">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-center">Restablecer Contraseña</CardTitle>
            <CardDescription className="text-center">
              Ingresa tu email para recibir las instrucciones
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Error Alert */}
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Correo electrónico
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null); // Limpiar error al escribir
                    }}
                    placeholder="tu@email.com"
                    className="pl-10 h-12"
                    disabled={loading}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 text-base font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
                disabled={loading || !email.trim()}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Enviar Instrucciones
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-600">
            ¿Recordaste tu contraseña?{' '}
            <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Iniciar sesión
            </Link>
          </p>
          <p className="text-xs text-gray-500">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="text-blue-600 hover:text-blue-700">
              Crear cuenta
            </Link>
          </p>
        </div>

        {/* Botón de volver */}
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </div>

      </div>
    </div>
  );
}
