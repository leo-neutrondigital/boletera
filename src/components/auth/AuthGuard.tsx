"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AlertCircle, Loader2, ShieldAlert, LogOut, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import type { UserRole } from "@/lib/auth/permissions";

interface AuthGuardProps {
  children: React.ReactNode;
  
  // Opciones de protección
  requireAuth?: boolean;
  allowedRoles?: UserRole[];
  minRole?: UserRole; // Shorthand para roles jerárquicos
  
  // Opciones de comportamiento
  redirectTo?: string;
  fallback?: React.ReactNode;
  
  // Opciones de visualización
  showLoadingScreen?: boolean;
  showErrorScreen?: boolean;
}

const ROLE_HIERARCHY: Record<UserRole, number> = {
  usuario: 1,
  comprobador: 2,
  gestor: 3,
  admin: 4,
};

export function AuthGuard({
  children,
  requireAuth = true,
  allowedRoles,
  minRole,
  redirectTo = "/login",
  fallback = null,
  showLoadingScreen = true,
  showErrorScreen = true,
}: AuthGuardProps) {
  const { 
    isAuthenticated, 
    userData, 
    loading, 
    error
  } = useAuth();
  const router = useRouter();

  // Determinar roles permitidos
  const effectiveAllowedRoles = (() => {
    if (allowedRoles) return allowedRoles;
    if (minRole) {
      const minLevel = ROLE_HIERARCHY[minRole];
      return Object.entries(ROLE_HIERARCHY)
        .filter(([, level]) => level >= minLevel)
        .map(([role]) => role as UserRole);
    }
    return ["admin", "gestor", "comprobador", "usuario"] as UserRole[];
  })();

  // Verificar permisos
  const hasPermission = (() => {
    if (!requireAuth) return true;
    if (!isAuthenticated || !userData) return false;
    return userData.roles.some(role => effectiveAllowedRoles.includes(role));
  })();

  // Efectos de redirección
  useEffect(() => {
    if (loading) return; // Esperar a que termine de cargar

    if (requireAuth && !isAuthenticated) {
      console.log("🔒 AuthGuard: Redirecting to login - no auth");
      const loginUrl = `${redirectTo}${redirectTo.includes('?') ? '&' : '?'}redirect=${encodeURIComponent(window.location.pathname)}`;
      router.push(loginUrl);
      return;
    }

    if (requireAuth && isAuthenticated && !hasPermission) {
      console.log("🔒 AuthGuard: Access denied - insufficient permissions");
      // No redirigir automáticamente, mostrar pantalla de acceso denegado
      return;
    }
  }, [loading, isAuthenticated, hasPermission, requireAuth, redirectTo, router]);

  // Función para cerrar sesión
  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Estados de carga
  if (loading && showLoadingScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <div className="space-y-2">
            <p className="text-lg font-medium">Verificando acceso...</p>
            <p className="text-sm text-muted-foreground">
              Cargando información de usuario
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Estados de error
  if (error && showErrorScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="h-12 w-12 mx-auto text-red-500" />
          <div className="space-y-2">
            <h1 className="text-xl font-semibold">Error de Autenticación</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Reintentar
            </button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Sin autenticación requerida
  if (!requireAuth) {
    return <>{children}</>;
  }

  // Sin permisos
  if (requireAuth && isAuthenticated && !hasPermission) {
    if (fallback) {
      return <>{fallback}</>;
    }

    const userRoles = userData?.roles || [];
    const isUsuario = userRoles.includes('usuario') && !userRoles.some(role => ['admin', 'gestor', 'comprobador'].includes(role));
    
    // Lógica simple de redirección
    const getSimpleRedirectPath = () => {
      return userRoles.some(role => ['admin', 'gestor', 'comprobador'].includes(role))
        ? '/dashboard'
        : '/my-tickets';
    };
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50">
        <div className="text-center space-y-6 max-w-lg p-8">
          <div className="w-20 h-20 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="h-10 w-10 text-white" />
          </div>
          
          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-gray-900">Acceso Restringido</h1>
            <p className="text-lg text-gray-600">
              No tienes permisos para acceder a esta sección.
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border space-y-3">
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Tus roles:</span>
                <span className="text-gray-900">{userRoles.join(", ") || "Ninguno"}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Roles requeridos:</span>
                <span className="text-gray-900">{effectiveAllowedRoles.join(", ")}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {/* Botón principal según el tipo de usuario */}
            {isUsuario ? (
              <Button
                onClick={() => router.push('/my-tickets')}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                <Ticket className="w-4 h-4" />
                Ir a Mis Boletos
              </Button>
            ) : (
              <Button
                onClick={() => router.push(getSimpleRedirectPath())}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                Ir a mi Área
              </Button>
            )}
            
            {/* Botón secundario */}
            <Button
              variant="outline"
              onClick={handleLogout}
              className="flex items-center gap-2"
              size="lg"
            >
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </Button>
          </div>
          
          {/* Mensaje adicional para usuarios */}
          {isUsuario && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
              <p className="text-blue-800">
                <strong>Para usuarios:</strong> Puedes gestionar tus boletos desde "Mis Boletos" 
                o contactar al administrador si necesitas acceso a otras secciones.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Acceso permitido
  return <>{children}</>;
}
