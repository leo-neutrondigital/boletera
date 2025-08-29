'use client';

import { useState } from 'react';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { useAuth } from '@/contexts/AuthContext';
import { Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

export function PasswordChangeForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getErrorMessage = (errorCode: string, newPass?: string, currentPass?: string) => {
    // Primero verificar si las contraseñas son iguales (validación cliente)
    if (newPass && currentPass && newPass === currentPass) {
      return 'La nueva contraseña debe ser diferente a la contraseña actual.';
    }
    
    switch (errorCode) {
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
      case 'auth/user-mismatch':
        return 'La contraseña actual que ingresaste es incorrecta. Verifica e inténtalo nuevamente.';
      case 'auth/weak-password':
        return 'La nueva contraseña debe tener al menos 6 caracteres.';
      case 'auth/requires-recent-login':
        return 'Por seguridad, inicia sesión nuevamente antes de cambiar tu contraseña.';
      case 'auth/user-not-found':
        return 'No se encontró tu cuenta. Inicia sesión nuevamente.';
      case 'auth/too-many-requests':
        return 'Demasiados intentos fallidos. Espera unos minutos antes de intentar nuevamente.';
      case 'auth/network-request-failed':
        return 'Error de conexión. Verifica tu internet e inténtalo nuevamente.';
      default:
        return 'Error al actualizar la contraseña. Inténtalo nuevamente.';
    }
  };

  const validatePasswords = () => {
    if (!currentPassword.trim()) {
      return 'Ingresa tu contraseña actual.';
    }
    
    if (!newPassword.trim()) {
      return 'Ingresa una nueva contraseña.';
    }
    
    if (newPassword.length < 6) {
      return 'La nueva contraseña debe tener al menos 6 caracteres.';
    }
    
    if (newPassword === currentPassword) {
      return 'La nueva contraseña debe ser diferente a la contraseña actual.';
    }
    
    if (newPassword !== confirmPassword) {
      return 'Las contraseñas nuevas no coinciden.';
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !user.email) {
      setError('Usuario no autenticado.');
      return;
    }

    const validationError = validatePasswords();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Primero reautenticar al usuario
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Luego actualizar la contraseña
      await updatePassword(user, newPassword);

      // Limpiar formulario
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      toast({
        title: "✅ Contraseña actualizada",
        description: "Tu contraseña se ha cambiado exitosamente.",
      });

    } catch (err: any) {
      console.error('Password change error:', err);
      
      // Verificar primero si las contraseñas son iguales
      const errorMessage = getErrorMessage(err.code, newPassword, currentPassword);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-blue-600" />
          Cambiar contraseña
        </CardTitle>
        <CardDescription>
          Actualiza tu contraseña para mantener tu cuenta segura
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

          {/* Contraseña actual */}
          <div className="space-y-2">
            <Label htmlFor="currentPassword" className="text-sm font-medium">
              Contraseña actual
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Ingresa tu contraseña actual"
                className="pl-10 pr-10 h-12"
                disabled={loading}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600"
              >
                {showCurrentPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </div>

          {/* Nueva contraseña */}
          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-sm font-medium">
              Nueva contraseña
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
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
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
            {newPassword && (
              <div className="text-xs space-y-1">
                <div className={`flex items-center gap-2 ${newPassword.length >= 6 ? 'text-green-600' : 'text-gray-500'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${newPassword.length >= 6 ? 'bg-green-600' : 'bg-gray-300'}`} />
                  <span>Al menos 6 caracteres</span>
                </div>
                <div className={`flex items-center gap-2 ${newPassword !== currentPassword && currentPassword ? 'text-green-600' : 'text-gray-500'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${newPassword !== currentPassword && currentPassword ? 'bg-green-600' : 'bg-gray-300'}`} />
                  <span>Diferente a la contraseña actual</span>
                </div>
              </div>
            )}
          </div>

          {/* Confirmar nueva contraseña */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirmar nueva contraseña
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
          <div className="pt-4">
            <Button
              type="submit"
              className="w-full h-12 text-base font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
              disabled={loading || !currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Actualizando...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Actualizar contraseña
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Información adicional */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">💡 Consejos de seguridad:</h4>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• Usa una combinación de letras, números y símbolos</li>
            <li>• No reutilices contraseñas de otras cuentas</li>
            <li>• Cambia tu contraseña regularmente</li>
            <li>• Nunca compartas tu contraseña con nadie</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
