// src/components/auth/PermissionWrapper.tsx
"use client";

import { usePermissions } from "@/hooks/use-permissions";
import { hasPermission } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/auth/permissions";

interface PermissionWrapperProps {
  children: React.ReactNode;
  resource: keyof typeof import("@/lib/auth/permissions").PERMISSIONS_MATRIX;
  action: string;
  fallback?: React.ReactNode;
  roles?: UserRole[]; // Alternativa directa por roles
}

export function PermissionWrapper({ 
  children, 
  resource, 
  action, 
  fallback = null,
  roles 
}: PermissionWrapperProps) {
  const { permissions, loading } = usePermissions();

  if (loading) {
    return <>{fallback}</>;
  }

  if (!permissions) {
    return <>{fallback}</>;
  }

  // Verificar por roles directos si se proporcionan
  if (roles) {
    const hasDirectPermission = permissions.roles.some(userRole => 
      roles.includes(userRole)
    );
    return hasDirectPermission ? <>{children}</> : <>{fallback}</>;
  }

  // Verificar por recurso y acción
  const hasResourcePermission = hasPermission(permissions.roles, resource, action);
  
  return hasResourcePermission ? <>{children}</> : <>{fallback}</>;
}
