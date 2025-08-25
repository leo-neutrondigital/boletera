# 🔐 Guía de Seguridad: Sistema de Roles y Permisos

## 🎯 Objetivo
Sistema de seguridad multi-capa con roles jerárquicos y permisos granulares para proteger rutas, componentes y acciones específicas.

## 🏗️ Arquitectura de Seguridad

### **Jerarquía de Roles**
```
admin > gestor > comprobador > usuario
```

### **Matriz de Permisos**
```typescript
PERMISSIONS_MATRIX = {
  events: {
    create: ["admin", "gestor"],
    read: ["admin", "gestor", "comprobador"],
    update: ["admin", "gestor"],
    delete: ["admin"]
  },
  ticketTypes: {
    create: ["admin", "gestor"],
    read: ["admin", "gestor", "comprobador"],
    update: ["admin", "gestor"],
    delete: ["admin"],
    manageCourtesy: ["admin"]
  },
  users: {
    create: ["admin"],
    read: ["admin"],
    update: ["admin"],
    delete: ["admin"]
  }
}
```

## 🧩 Componentes de Seguridad

### 1. **AuthProvider** (`src/contexts/AuthContext.tsx`)
Fuente única de verdad para autenticación y permisos.

```tsx
const { userData, permissions, isAuthenticated } = useAuth();

// userData.roles = ['admin'] 
// permissions.canCreateEvents = true
```

### 2. **AuthGuard** (`src/components/auth/AuthGuard.tsx`)
Protección de páginas completas por roles mínimos.

```tsx
<AuthGuard minRole="gestor">
  <EventManagementPage />
</AuthGuard>
```

### 3. **Can** (`src/components/auth/Can.tsx`)
Protección granular de elementos UI por permisos específicos.

```tsx
<Can do="create" on="events">
  <Button>Crear Evento</Button>
</Can>

<Can do="delete" on="events" fallback={<p>No autorizado</p>}>
  <DeleteButton />
</Can>
```

### 4. **Server Auth** (`src/lib/auth/server-auth.ts`)
Validación server-side en APIs.

```tsx
// En API routes
const { user, hasPermission } = await validateServerAuth(req);
if (!hasPermission("events", "create")) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

## 🔧 Implementación por Casos de Uso

### **Caso 1: Proteger Página Completa**
```tsx
// src/app/dashboard/eventos/page.tsx
import { AuthGuard } from "@/components/auth/AuthGuard";

export default function EventsPage() {
  return (
    <AuthGuard minRole="gestor">
      <EventsPageContent />
    </AuthGuard>
  );
}
```

### **Caso 2: Proteger Botón/Componente**
```tsx
// Mostrar/ocultar elementos
<Can do="create" on="ticketTypes">
  <Button onClick={handleCreateTicket}>
    Nuevo Tipo
  </Button>
</Can>

// Con fallback personalizado
<Can do="update" on="events" fallback={<ReadOnlyView />}>
  <EditableForm />
</Can>
```

### **Caso 3: Proteger API Route**
```tsx
// src/app/api/admin/events/route.ts
import { validateServerAuth } from "@/lib/auth/server-auth";

export async function POST(req: Request) {
  const { user, hasPermission } = await validateServerAuth(req);
  
  if (!hasPermission("events", "create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  
  // Procesar creación de evento
}
```

### **Caso 4: Lógica Condicional por Rol**
```tsx
// En componentes
const { userData } = useAuth();

if (userData?.roles?.includes('admin')) {
  // Mostrar opciones de administrador
} else if (userData?.roles?.includes('gestor')) {
  // Mostrar opciones de gestor
}

// O usando permisos
const { permissions } = useAuth();
if (permissions?.canDeleteEvents) {
  // Mostrar botón eliminar
}
```

### **Caso 5: Navegación Condicional**
```tsx
// En sidebar/navigation
<Can do="read" on="users">
  <NavLink href="/dashboard/usuarios">
    Usuarios
  </NavLink>
</Can>

<Can do="read" on="reports">
  <NavLink href="/dashboard/reportes">
    Reportes
  </NavLink>
</Can>
```

## 📊 Roles y Capacidades

### **🔴 Admin (Máximo Control)**
```tsx
// Puede hacer TODO
permissions: {
  canCreateEvents: true,
  canDeleteEvents: true,
  canManageUsers: true,
  canViewReports: true,
  canManageCourtesy: true,
  // ... todos los permisos
}
```

### **🟡 Gestor (Operación Diaria)**
```tsx
// Gestión de eventos y boletos (no usuarios)
permissions: {
  canCreateEvents: true,
  canUpdateEvents: true,
  canDeleteEvents: false,     // ❌
  canManageUsers: false,      // ❌
  canManageCourtesy: false,   // ❌
}
```

### **🟢 Comprobador (Solo Validación)**
```tsx
// Solo lectura y validación
permissions: {
  canCreateEvents: false,     // ❌
  canUpdateEvents: false,     // ❌
  canViewEvents: true,
  canValidateTickets: true,
}
```

### **🔵 Usuario (Cliente Final)**
```tsx
// Acceso mínimo
permissions: {
  canViewPublicEvents: true,
  canPurchaseTickets: true,
  // Resto false
}
```

## 🛡️ Patrones de Seguridad

### **1. Validación en Múltiples Capas**
```tsx
// 1. Route Guard (página)
<AuthGuard minRole="gestor">
  // 2. Component Guard (elemento)
  <Can do="create" on="events">
    // 3. Server Validation (API)
    <CreateButton onClick={callProtectedAPI} />
  </Can>
</AuthGuard>
```

### **2. Fallbacks Seguros**
```tsx
// Siempre proporcionar alternativas
<Can do="update" on="events" fallback={<ReadOnlyView />}>
  <EditableForm />
</Can>

// O mensajes informativos
<Can do="delete" on="events" fallback={
  <p className="text-gray-500">Solo administradores pueden eliminar</p>
}>
  <DeleteButton />
</Can>
```

### **3. Estados de Carga Seguros**
```tsx
const { userData, loading } = useAuth();

if (loading) {
  return <LoadingSpinner />; // No mostrar contenido sensible
}

if (!userData) {
  return <LoginPrompt />;
}

// Solo entonces mostrar contenido protegido
```

## 📝 Checklist de Implementación

### **✅ Para Nuevas Páginas:**
- [ ] Envolver en `<AuthGuard minRole="...">`
- [ ] Usar `<Can>` para elementos específicos
- [ ] Proteger APIs correspondientes
- [ ] Agregar fallbacks apropiados
- [ ] Testear con diferentes roles

### **✅ Para Nuevos Componentes:**
- [ ] Verificar si necesita protección
- [ ] Usar `<Can>` en lugar de lógica manual
- [ ] Considerar estados de loading
- [ ] Proporcionar fallbacks
- [ ] Documentar permisos requeridos

### **✅ Para Nuevas APIs:**
- [ ] Importar `validateServerAuth`
- [ ] Verificar permisos específicos
- [ ] Retornar errores 403 apropiados
- [ ] Validar datos del usuario
- [ ] Logging de accesos

## 🚫 Errores Comunes

1. **Solo proteger frontend**: Siempre proteger APIs también
2. **Roles hardcodeados**: Usar matriz de permisos
3. **No usar fallbacks**: Siempre proporcionar alternativas
4. **Verificaciones manuales**: Usar componentes `<Can>`
5. **Estados de loading**: No mostrar contenido mientras carga auth

## 🔗 Archivos Clave

- `src/contexts/AuthContext.tsx` - Estado global de auth
- `src/components/auth/AuthGuard.tsx` - Protección de páginas
- `src/components/auth/Can.tsx` - Protección granular
- `src/lib/auth/permissions.ts` - Matriz de permisos
- `src/lib/auth/server-auth.ts` - Validación server-side

## 📖 Ejemplos de Uso Real

### **Dashboard Sidebar**
```tsx
<Can do="read" on="events">
  <SidebarItem href="/dashboard/eventos" icon={Calendar}>
    Eventos
  </SidebarItem>
</Can>

<Can do="read" on="users">
  <SidebarItem href="/dashboard/usuarios" icon={Users}>
    Usuarios
  </SidebarItem>
</Can>
```

### **Página de Evento**
```tsx
<AuthGuard minRole="comprobador">
  <div>
    <h1>{event.name}</h1>
    
    <Can do="update" on="events">
      <EditEventButton />
    </Can>
    
    <Can do="delete" on="events" fallback={
      <p>Solo administradores pueden eliminar eventos</p>
    }>
      <DeleteEventButton />
    </Can>
  </div>
</AuthGuard>
```

### **API Route**
```tsx
export async function DELETE(req: Request) {
  const { user, hasPermission } = await validateServerAuth(req);
  
  if (!hasPermission("events", "delete")) {
    return NextResponse.json(
      { error: "Solo administradores pueden eliminar eventos" }, 
      { status: 403 }
    );
  }
  
  // Proceder con eliminación
}
```

## 🎯 Principios de Seguridad

1. **Menos privilegios**: Dar solo los permisos mínimos necesarios
2. **Defensa en profundidad**: Múltiples capas de protección
3. **Fail secure**: En caso de duda, denegar acceso
4. **Transparencia**: Explicar por qué se deniega acceso
5. **Auditabilidad**: Registrar acciones sensibles

Mejoras futuras (cuando escales):

Audit logging para acciones críticas
Rate limiting en APIs sensibles
Métricas de seguridad (intentos fallidos, etc.)
Posiblemente 2FA para administradores