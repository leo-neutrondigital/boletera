// src/components/auth/Can.tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/lib/auth/permissions";
import type { UserPermissions } from "@/contexts/AuthContext";

interface CanProps {
  children: React.ReactNode;
  
  // Verificación por acción específica
  do?: string; // "create", "update", "delete", "read"
  on?: string; // "events", "users", "tickets", etc.
  
  // Verificación por roles
  roles?: UserRole[];
  role?: UserRole; // Shorthand para un solo rol
  minRole?: UserRole; // Rol mínimo requerido
  
  // Verificación por permisos específicos
  permission?: keyof UserPermissions;
  
  // Comportamiento
  fallback?: React.ReactNode;
  invert?: boolean; // Mostrar solo si NO tiene permisos
}

const ROLE_HIERARCHY: Record<UserRole, number> = {
  usuario: 1,
  comprobador: 2,
  gestor: 3,
  admin: 4,
};

export function Can({
  children,
  do: action,
  on: resource,
  roles,
  role,
  minRole,
  permission,
  fallback = null,
  invert = false,
}: CanProps) {
  const { userData, permissions, hasPermission: hasPermissionFn, hasRole, loading } = useAuth();

  // No mostrar nada mientras carga
  if (loading) {
    return <>{fallback}</>;
  }

  // No mostrar nada si no hay usuario
  if (!userData || !permissions) {
    return invert ? <>{children}</> : <>{fallback}</>;
  }

  let hasAccess = false;

  // Verificación por acción específica
  if (action && resource) {
    hasAccess = hasPermissionFn(resource, action);
  }
  // Verificación por roles específicos
  else if (roles) {
    hasAccess = roles.some(r => hasRole(r));
  }
  // Verificación por rol único
  else if (role) {
    hasAccess = hasRole(role);
  }
  // Verificación por rol mínimo
  else if (minRole) {
    const userLevel = Math.max(...userData.roles.map(r => ROLE_HIERARCHY[r] || 0));
    const requiredLevel = ROLE_HIERARCHY[minRole] || 0;
    hasAccess = userLevel >= requiredLevel;
  }
  // Verificación por permiso específico
  else if (permission && permissions) {
    // Verificación de tipo segura para indexar UserPermissions
    hasAccess = Boolean(permissions[permission as keyof UserPermissions]);
  }
  // Sin criterios específicos, permitir acceso
  else {
    hasAccess = true;
  }

  // Aplicar inversión si se especifica
  if (invert) {
    hasAccess = !hasAccess;
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

// Componente de conveniencia para casos comunes
export function CanNot(props: Omit<CanProps, 'invert'>) {
  return <Can {...props} invert />;
}

// Hooks de conveniencia
export function useCan(
  action?: string,
  resource?: string,
  roles?: UserRole[],
  permission?: keyof UserPermissions
) {
  const { userData, permissions, hasPermission: hasPermissionFn, hasRole } = useAuth();

  if (!userData || !permissions) return false;

  if (action && resource) {
    return hasPermissionFn(resource, action);
  }
  if (roles) {
    return roles.some(r => hasRole(r));
  }
  if (permission) {
    return Boolean(permissions[permission as keyof UserPermissions]);
  }

  return false;
}
