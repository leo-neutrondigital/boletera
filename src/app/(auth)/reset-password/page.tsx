'use client';

import { useState, useEffect } from 'react';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Eye, EyeOff, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [resetComplete, setResetComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const oobCode = searchParams?.get('oobCode');
  const mode = searchParams?.get('mode');

  useEffect(() => {
    const verifyResetCode = async () => {
      if (!oobCode || mode !== 'resetPassword') {
        setError('Enlace inválido o expirado. Solicita un nuevo enlace de restablecimiento.');
        setVerifying(false);
        return;
      }

      try {
        // Verificar que el código sea válido y obtener el email
        const email = await verifyPasswordResetCode(auth, oobCode);
        setUserEmail(email);
        setVerifying(false);
      } catch (err: any) {
        console.error('Reset code verification error:', err);
        
        const errorMessage = getErrorMessage(err.code);
        setError(errorMessage);
        setVerifying(false);
      }
    };

    verifyResetCode();
  }, [oobCode, mode]);

  const getErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case 'auth/expired-action-code':
        return 'El enlace ha expirado. Solicita un nuevo enlace de restablecimiento.';
      case 'auth/invalid-action-code':
        return 'El enlace no es válido. Solicita un nuevo enlace de restablecimiento.';
      case 'auth/user-disabled':
        return 'La cuenta ha sido deshabilitada.';
      case 'auth/user-not-found':
        return 'No se encontró la cuenta asociada.';
      case 'auth/weak-password':
        return 'La contraseña debe tener al menos 6 caracteres.';
      default:
        return 'Error al restablecer la contraseña. Inténtalo nuevamente.';
    }
  };

  const validatePasswords = () => {
    if (!newPassword.trim()) {
      return 'Ingresa una nueva contraseña.';
    }
    
    if (newPassword.length < 6) {
      return 'La contraseña debe tener al menos 6 caracteres.';
    }
    
    if (newPassword !== confirmPassword) {
      return 'Las contraseñas no coinciden.';
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validatePasswords();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!oobCode) {
      setError('Código de restablecimiento no válido.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await confirmPasswordReset(auth, oobCode, newPassword.trim());
      
      setResetComplete(true);
      
      toast({
        title: "✅ Contraseña actualizada",
        description: "Tu contraseña se ha cambiado exitosamente.",
      });

    } catch (err: any) {
      console.error('Password reset error:', err);
      const errorMessage = getErrorMessage(err.code);
      setError(errorMessage);
      
      toast({
        variant: "destructive",
        title: "Error al cambiar contraseña",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  // Estado de verificación inicial
  if (verifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-xl border-0">
            <CardContent className="p-8">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-gray-900">Verificando enlace...</h2>
                  <p className="text-gray-600">Un momento por favor</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Estado de éxito - contraseña cambiada
  if (resetComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          
          {/* Header de éxito */}
          <div className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">¡Contraseña Actualizada!</h1>
            <p className="text-gray-600">Ya puedes iniciar sesión con tu nueva contraseña</p>
          </div>

          {/* Card de confirmación */}
          <Card className="shadow-xl border-0">
            <CardHeader>
              <CardTitle className="text-center text-green-700">
                🔒 Cambio Exitoso
              </CardTitle>
              <CardDescription className="text-center">
                Tu contraseña se ha actualizado correctamente
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              
              {/* Info de la cuenta */}
              {userEmail && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-center">
                    <p className="font-medium text-green-900">Cuenta actualizada:</p>
                    <p className="text-sm text-green-700 break-all">{userEmail}</p>
                  </div>
                </div>
              )}

              {/* Próximos pasos */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">¿Qué sigue?</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>Tu contraseña anterior ya no es válida</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>Usa tu nueva contraseña para iniciar sesión</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>Guarda tu contraseña en un lugar seguro</span>
                  </li>
                </ul>
              </div>

              {/* Botón de acción */}
              <Button
                onClick={() => router.push('/login')}
                className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                <Lock className="w-4 h-4 mr-2" />
                Iniciar Sesión
              </Button>

            </CardContent>
          </Card>

          {/* Consejos de seguridad */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">💡 Consejos de seguridad:</h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Usa una contraseña única para esta cuenta</li>
              <li>• No compartas tu contraseña con nadie</li>
              <li>• Considera usar un gestor de contraseñas</li>
            </ul>
          </div>

        </div>
      </div>
    );
  }

  // Estado de error - enlace inválido o expirado
  if (error && !oobCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          
          {/* Header de error */}
          <div className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-red-600 to-rose-600 rounded-2xl flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Enlace no válido</h1>
            <p className="text-gray-600">El enlace ha expirado o no es válido</p>
          </div>

          {/* Card de error */}
          <Card className="shadow-xl border-0">
            <CardContent className="p-6 text-center space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>

              <div className="space-y-3">
                <Button
                  onClick={() => router.push('/forgot-password')}
                  className="w-full"
                >
                  Solicitar nuevo enlace
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => router.push('/login')}
                  className="w-full"
                >
                  Volver al login
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    );
  }

  // Formulario principal - cambio de contraseña
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Nueva Contraseña</h1>
          <p className="text-gray-600">Crea una contraseña segura para tu cuenta</p>
        </div>

        {/* Formulario */}
        <Card className="shadow-xl border-0">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-center">Restablecer Contraseña</CardTitle>
            {userEmail && (
              <CardDescription className="text-center">
                Para la cuenta: <span className="font-medium">{userEmail}</span>
              </CardDescription>
            )}
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

              {/* Nueva contraseña */}
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-sm font-medium">
                  Nueva contraseña
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Ingresa tu nueva contraseña"
                    className="pl-10 pr-10 h-12"
                    disabled={loading}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </button>
                </div>
                {newPassword && (
                  <div className="text-xs space-y-1">
                    <div className={`flex items-center gap-2 ${newPassword.length >= 6 ? 'text-green-600' : 'text-gray-500'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${newPassword.length >= 6 ? 'bg-green-600' : 'bg-gray-300'}`} />
                      <span>Al menos 6 caracteres</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirmar contraseña */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirmar contraseña
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Confirma tu nueva contraseña"
                    className="pl-10 pr-10 h-12"
                    disabled={loading}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff /> : <Eye />}
                  </button>
                </div>
                {confirmPassword && (
                  <div className="text-xs">
                    <div className={`flex items-center gap-2 ${newPassword === confirmPassword && confirmPassword ? 'text-green-600' : 'text-gray-500'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${newPassword === confirmPassword && confirmPassword ? 'bg-green-600' : 'bg-gray-300'}`} />
                      <span>Las contraseñas coinciden</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 text-base font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
                disabled={loading || !newPassword.trim() || !confirmPassword.trim()}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Actualizando...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Actualizar Contraseña
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            ¿Recordaste tu contraseña?{' '}
            <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Iniciar sesión
            </Link>
          </p>
        </div>

        {/* Botón de volver */}
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => router.push('/login')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al login
          </Button>
        </div>

      </div>
    </div>
  );
}
