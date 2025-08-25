'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Mail, Lock, AlertTriangle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const { user, userData, loading: authLoading } = useAuth();

  // Redirigir si ya está autenticado - Lógica simple
  useEffect(() => {
    if (!authLoading && user && userData) {
      const redirectPath = userData.roles.some(role => ['admin', 'gestor', 'comprobador'].includes(role))
        ? '/dashboard'
        : '/my-tickets';
      console.log('🔄 Login: Redirecting authenticated user to:', redirectPath);
      router.replace(redirectPath);
    }
  }, [user, userData, authLoading, router]);

  // Si aún está cargando el estado de auth, mostrar loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-gray-600">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // Si ya está autenticado, no mostrar el formulario (evita parpadeo)
  if (user && userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-green-600 mb-4" />
          <p className="text-gray-600">Redirigiendo al dashboard...</p>
        </div>
      </div>
    );
  }

  const getErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Credenciales incorrectas. Verifica tu email y contraseña.';
      case 'auth/user-not-found':
        return 'No existe una cuenta con este email.';
      case 'auth/invalid-email':
        return 'El formato del email no es válido.';
      case 'auth/user-disabled':
        return 'Esta cuenta ha sido deshabilitada.';
      case 'auth/too-many-requests':
        return 'Demasiados intentos fallidos. Inténtalo más tarde.';
      default:
        return 'Error al iniciar sesión. Inténtalo nuevamente.';
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Por favor, completa todos los campos.');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      toast({
        title: "¡Bienvenido!",
        description: `Hola ${userCredential.user.email}, iniciando sesión...`,
      });
      
      // No redirigir aquí - dejar que AuthContext maneje la redirección
      
    } catch (err: any) {
      console.error('Login error:', err);
      const errorMessage = getErrorMessage(err.code);
      setError(errorMessage);
      
      toast({
        variant: "destructive",
        title: "Error al iniciar sesión",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleLogin(e as any);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-4">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <span className="text-blue-600 font-bold text-lg">🎫</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Iniciar Sesión</h1>
          <p className="text-gray-600">Accede a tu panel de administración</p>
        </div>

        {/* Formulario */}
        <Card className="shadow-xl border-0">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-center">Bienvenido</CardTitle>
            <CardDescription className="text-center">
              Ingresa tus credenciales para continuar
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
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
                      if (error) setError(null); // Limpiar error al empezar a escribir
                    }}
                    onKeyPress={handleKeyPress}
                    placeholder="tu@email.com"
                    className="pl-10 h-12"
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Contraseña
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null); // Limpiar error al empezar a escribir
                    }}
                    onKeyPress={handleKeyPress}
                    placeholder="Tu contraseña"
                    className="pl-10 pr-10 h-12"
                    disabled={loading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                className="w-full h-12 text-base font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  'Iniciar Sesión'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-600">
            ¿Olvidaste tu contraseña?{' '}
            <Link href="/forgot-password" className="text-blue-600 hover:text-blue-700 font-medium">
              Restablecer contraseña
            </Link>
          </p>
          <p className="text-xs text-gray-500">
            ¿Necesitas ayuda?{' '}
            <Link href="mailto:soporte@boletera.com" className="text-blue-600 hover:text-blue-700">
              Contacta soporte
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}