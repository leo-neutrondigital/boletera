// src/components/auth/AuthGuard.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AlertCircle, Loader2, ShieldAlert } from "lucide-react";
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
      console.log("🔒 AuthGuard: Redirecting to dashboard - insufficient permissions");
      router.push("/dashboard");
      return;
    }
  }, [loading, isAuthenticated, hasPermission, requireAuth, redirectTo, router]);

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
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Reintentar
          </button>
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

    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-md">
          <ShieldAlert className="h-12 w-12 mx-auto text-yellow-500" />
          <div className="space-y-2">
            <h1 className="text-xl font-semibold">Acceso Restringido</h1>
            <p className="text-muted-foreground">
              No tienes permisos para acceder a esta sección.
            </p>
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <p><strong>Tus roles:</strong> {userData?.roles.join(", ") || "Ninguno"}</p>
            <p><strong>Roles requeridos:</strong> {effectiveAllowedRoles.join(", ")}</p>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Ir al Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Acceso permitido
  return <>{children}</>;
}
