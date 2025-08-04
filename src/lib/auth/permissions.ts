// src/lib/auth/permissions.ts

export type UserRole = "admin" | "gestor" | "comprobador" | "usuario";

export const PERMISSIONS_MATRIX = {
  // 🎫 Gestión de Eventos
  events: {
    create: ["admin", "gestor"] as UserRole[],
    read: ["admin", "gestor", "comprobador"] as UserRole[], // Comprobador puede ver eventos para validación
    update: ["admin", "gestor"] as UserRole[],
    delete: ["admin"] as UserRole[], // Solo admin puede eliminar
    publish: ["admin", "gestor"] as UserRole[],
  },

  // 🎟️ Gestión de Tipos de Boletos
  ticketTypes: {
    create: ["admin", "gestor"] as UserRole[],
    read: ["admin", "gestor", "comprobador"] as UserRole[], // Comprobador puede ver tipos para validación
    update: ["admin", "gestor"] as UserRole[],
    delete: ["admin"] as UserRole[], // Solo admin puede eliminar
    manageCourtesy: ["admin"] as UserRole[], // Solo admin puede gestionar cortesías
  },

  // 🎫 Gestión de Boletos (Ventas)
  tickets: {
    create: ["admin", "gestor"] as UserRole[], // Crear boletos manualmente
    read: ["admin", "gestor", "comprobador"] as UserRole[],
    update: ["admin", "gestor"] as UserRole[],
    delete: ["admin"] as UserRole[],
    assign: ["admin", "gestor"] as UserRole[], // Asignar cortesías
    validate: ["admin", "gestor", "comprobador"] as UserRole[], // Validar QR
  },

  // 👥 Gestión de Usuarios
  users: {
    create: ["admin"] as UserRole[],
    read: ["admin"] as UserRole[],
    update: ["admin"] as UserRole[],
    delete: ["admin"] as UserRole[],
    manageRoles: ["admin"] as UserRole[],
  },

  // 📊 Reportes y Estadísticas
  reports: {
    sales: ["admin", "gestor"] as UserRole[],
    attendance: ["admin", "gestor", "comprobador"] as UserRole[],
    financial: ["admin"] as UserRole[], // Solo admin ve información financiera
    export: ["admin", "gestor"] as UserRole[],
  },

  // ⚙️ Configuración del Sistema
  system: {
    settings: ["admin"] as UserRole[],
    backup: ["admin"] as UserRole[],
    logs: ["admin"] as UserRole[],
  },
} as const;

/**
 * Verifica si un usuario tiene permisos para realizar una acción
 */
export function hasPermission(
  userRoles: UserRole[],
  resource: keyof typeof PERMISSIONS_MATRIX,
  action: string
): boolean {
  const resourcePermissions = PERMISSIONS_MATRIX[resource];
  if (!resourcePermissions) return false;

  const allowedRoles = resourcePermissions[action as keyof typeof resourcePermissions];
  if (!allowedRoles) return false;

  return userRoles.some(role => allowedRoles.includes(role));
}

/**
 * Middleware de permisos para APIs
 */
export function requirePermission(
  resource: keyof typeof PERMISSIONS_MATRIX,
  action: string
) {
  return (userRoles: UserRole[]): boolean => {
    return hasPermission(userRoles, resource, action);
  };
}

/**
 * Obtener lista de rutas accesibles por rol
 */
export function getAccessibleRoutes(userRoles: UserRole[]): string[] {
  const routes: string[] = ["/dashboard"]; // Ruta base siempre accesible

  // Eventos
  if (hasPermission(userRoles, "events", "read")) {
    routes.push("/dashboard/eventos");
  }

  // Usuarios (solo admin)
  if (hasPermission(userRoles, "users", "read")) {
    routes.push("/dashboard/usuarios");
  }

  // Validación (comprobadores)
  if (hasPermission(userRoles, "tickets", "validate")) {
    routes.push("/dashboard/validacion");
  }

  // Reportes
  if (hasPermission(userRoles, "reports", "sales")) {
    routes.push("/dashboard/reportes");
  }

  // Configuración (solo admin)
  if (hasPermission(userRoles, "system", "settings")) {
    routes.push("/dashboard/configuracion");
  }

  return routes;
}
