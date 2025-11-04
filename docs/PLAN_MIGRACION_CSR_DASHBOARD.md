# Plan de Migración: Dashboard SSR → CSR (Client-Side Rendering)

**Fecha:** 2 de noviembre de 2025  
**Objetivo:** Eliminar brecha de seguridad en dashboard migrando de SSR a CSR puro  
**Rama:** `security/remove-sensitive-logs`  
**Tiempo estimado:** 3 horas  
**Complejidad:** 3.5/10 ⭐⭐⭐

---

## 📋 Problema Identificado

### Brecha de Seguridad Actual

**Flujo problemático:**
```
Usuario crea cuenta → roles: ["usuario"]
  ↓
Navega a /dashboard
  ↓
SSR carga datos sensibles ANTES de validar permisos (getAllEventsAdmin, orders, revenue)
  ↓
HTML con datos llega al cliente
  ↓
AuthGuard valida permisos en cliente → ❌ Acceso denegado
  ↓
Usuario hace logout
  ↓
⚠️ Durante 100-500ms: datos sensibles visibles en pantalla
```

**Causa raíz:**
- Server Components ejecutan **antes** de validación de permisos cliente
- `AuthGuard` es Client Component → solo controla si muestra children, no evita SSR
- Durante transiciones (logout), hay fugas visuales de datos sensibles

---

## ✅ Solución: Migrar a CSR Puro

### Principio
**Nunca cargar datos sensibles sin validar autenticación primero**

```typescript
// ❌ ANTES (SSR):
async function DashboardPage() {
  const stats = await getAllEventsAdmin(); // ← Sin validar permisos
  return <Client initialStats={stats} />;
}

// ✅ DESPUÉS (CSR):
'use client';
function DashboardPage() {
  const { userData } = useAuth(); // ← Validar primero
  const { stats } = useDashboardStats(); // ← Solo si tiene permisos
  
  if (loading) return <LoadingScreen />;
  return <Client stats={stats} />;
}
```

---

## 📊 Inventario del Sistema

### Páginas con SSR que requieren migración

| # | Archivo | Función SSR | Datos sensibles | Prioridad | API existe |
|---|---------|-------------|-----------------|-----------|------------|
| 1 | `/dashboard/page.tsx` | `async DashboardPage()` | ✅ Stats, ventas, revenue | 🔴 CRÍTICA | ✅ Sí |
| 2 | `/dashboard/eventos/page.tsx` | `async EventPage()` | ⚠️ Lista eventos | 🟡 Media | ✅ Sí |
| 3 | `/dashboard/eventos/[id]/page.tsx` | `async EventDetailPage()` | ⚠️ Evento específico | 🟡 Media | ❌ No |
| 4 | `/dashboard/eventos/[id]/layout.tsx` | `async EventLayout()` | ⚠️ Evento (sidebar) | 🟡 Media | ❌ No |
| 5 | `/dashboard/eventos/[id]/boletos/page.tsx` | `async TicketTypesPage()` | ⚠️ Tipos boletos | 🟢 Baja | ✅ Sí |
| 6 | `/dashboard/eventos/[id]/boletos-vendidos/page.tsx` | `async EventSalesPage()` | ⚠️ Evento | 🟢 Baja | ❌ No |
| 7 | `/dashboard/eventos/[id]/preregistros/page.tsx` | `async PreregistrosV2Page()` | ✅ Preregistros | 🔴 CRÍTICA | ⚠️ Verificar |

**Total: 7 páginas**

---

## 🏗️ Infraestructura Existente

### ✅ Ya implementado (NO crear):

| Componente | Archivo | Estado |
|------------|---------|--------|
| API dashboard stats | `/api/dashboard/stats/route.ts` | ✅ Con validación permisos |
| Hook dashboard stats | `/hooks/use-dashboard-stats.ts` | ✅ Funcional |
| API eventos | `/api/admin/events/route.ts` | ✅ Con validación permisos |
| Hook eventos | `/hooks/use-events.ts` | ✅ Con CRUD completo |
| Hook ticket types | `/hooks/use-event-ticket-types.ts` | ✅ Funcional |
| Hook preregistros | `/hooks/use-preregistrations.ts` | ✅ Funcional |
| AuthContext | `/contexts/AuthContext.tsx` | ✅ Sistema completo |
| Server auth | `/lib/auth/server-auth.ts` | ✅ `getAuthFromRequest` |

### ⚠️ Falta crear:

| Componente | Propósito | Prioridad |
|------------|-----------|-----------|
| `/api/admin/events/[id]/route.ts` | GET evento específico | 🔴 Alta |
| Hook `use-event.ts` | Hook para evento individual | 🔴 Alta |
| LoadingScreen component | Skeleton para estados de carga | 🟢 Baja |

---

## 🚀 Plan de Implementación

### FASE 1: Quick Wins (30 minutos)

**Objetivo:** Resolver problema crítico del dashboard principal y lista de eventos.

#### Tarea 1.1: Migrar Dashboard Principal (10 min)
**Archivo:** `/src/app/dashboard/page.tsx`

```typescript
// ❌ ELIMINAR código SSR completo (líneas 1-111)

// ✅ REEMPLAZAR con:
'use client';

import { useDashboardStats } from '@/hooks/use-dashboard-stats';
import DashboardPageClient from './dashboard-page-client';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { stats, isLoading, error } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-lg font-medium">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-600">Error al cargar estadísticas</p>
        </div>
      </div>
    );
  }

  return <DashboardPageClient initialStats={stats} />;
}
```

**Cambios en `use-dashboard-stats.ts` (línea 16):**
```typescript
// ❌ ANTES:
export function useDashboardStats(initialStats: DashboardStats) {
  const [stats, setStats] = useState<DashboardStats>(initialStats);

// ✅ DESPUÉS:
export function useDashboardStats(initialStats?: DashboardStats) {
  const [stats, setStats] = useState<DashboardStats | null>(initialStats || null);
  const [error, setError] = useState<string | null>(null);
  
  // Cargar stats si no hay initialStats
  useEffect(() => {
    if (!initialStats) {
      refreshStats();
    }
  }, [initialStats]);
```

**Testing:**
- [ ] Cargar `/dashboard` como admin → Ver stats
- [ ] Cargar `/dashboard` como usuario → Ver "Acceso Restringido"
- [ ] Hacer logout → NO ver datos durante transición
- [ ] Verificar consola sin errores

---

#### Tarea 1.2: Migrar Lista de Eventos (10 min)
**Archivo:** `/src/app/dashboard/eventos/page.tsx`

```typescript
// ❌ ELIMINAR código SSR (líneas 1-9)

// ✅ REEMPLAZAR con:
'use client';

import { useEvents } from '@/hooks/use-events';
import EventPageClient from './event-page-client';
import { Loader2 } from 'lucide-react';

export default function EventPage() {
  const { events, isLoading } = useEvents([]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-lg font-medium">Cargando eventos...</p>
        </div>
      </div>
    );
  }

  return <EventPageClient events={events} />;
}
```

**Cambios en `use-events.ts` (línea 24):**
```typescript
// ✅ AGREGAR useEffect para carga inicial:
export function useEvents(initialEvents: Event[]) {
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // 🆕 Cargar eventos si array vacío
  useEffect(() => {
    if (initialEvents.length === 0) {
      refreshEvents();
    }
  }, []);
  
  // ... resto del código sin cambios
}
```

**Testing:**
- [ ] Cargar `/dashboard/eventos` → Ver lista
- [ ] Crear evento → Actualización optimista
- [ ] Eliminar evento → Actualización optimista
- [ ] Verificar permisos (usuario sin acceso)

---

#### Tarea 1.3: Testing de Seguridad (10 min)

**Casos de prueba:**

1. **Usuario normal intenta acceder a dashboard:**
   - Crear cuenta con rol "usuario"
   - Navegar a `/dashboard`
   - ✅ Debe ver "Acceso Restringido" sin datos sensibles
   - Hacer clic en "Cerrar Sesión"
   - ✅ NO debe ver datos durante transición
   - ✅ Debe redirigir a `/login`

2. **Admin accede a dashboard:**
   - Login como admin
   - Navegar a `/dashboard`
   - ✅ Debe ver loading screen primero
   - ✅ Después ver stats completas
   - ✅ Stats deben ser actuales (no cacheadas)

3. **Performance:**
   - Medir tiempo de carga inicial
   - ✅ Debe ser < 2 segundos con conexión normal
   - ✅ Loading screen debe ser visible si > 500ms

**Checklist:**
- [ ] Caso 1: Usuario sin permisos
- [ ] Caso 2: Admin con permisos
- [ ] Caso 3: Performance aceptable
- [ ] No hay fugas visuales en logout
- [ ] Consola sin errores

---

### FASE 2: APIs Faltantes (40 minutos)

**Objetivo:** Crear endpoints para páginas de detalle de evento.

#### Tarea 2.1: Crear API de Evento Individual (20 min)

**Archivo nuevo:** `/src/app/api/admin/events/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, requireRoles } from '@/lib/auth/server-auth';
import { adminDb } from '@/lib/firebase/admin';
import type { Event } from '@/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validar autenticación
    const user = await getAuthFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }
    
    // Verificar permisos (admin, gestor, comprobador)
    if (!requireRoles(user.roles, ['admin', 'gestor', 'comprobador'])) {
      return NextResponse.json(
        { error: "No tienes permisos para ver eventos" },
        { status: 403 }
      );
    }
    
    // Obtener evento
    const eventDoc = await adminDb.collection('events').doc(params.id).get();
    
    if (!eventDoc.exists) {
      return NextResponse.json(
        { error: "Evento no encontrado" },
        { status: 404 }
      );
    }
    
    const eventData = eventDoc.data();
    const event: Event = {
      id: eventDoc.id,
      name: eventData!.name,
      start_date: eventData!.start_date?.toDate() ?? new Date(eventData!.start_date),
      end_date: eventData!.end_date?.toDate() ?? new Date(eventData!.end_date),
      location: eventData!.location,
      description: eventData!.description,
      internal_notes: eventData!.internal_notes,
      published: eventData!.published,
      created_at: eventData!.created_at?.toDate() ?? new Date(eventData!.created_at),
      updated_at: eventData!.updated_at?.toDate() ?? (eventData!.updated_at ? new Date(eventData!.updated_at) : undefined),
      slug: eventData!.slug || eventDoc.id,
      allow_preregistration: eventData!.allow_preregistration,
      preregistration_message: eventData!.preregistration_message,
      public_description: eventData!.public_description,
      featured_image_url: eventData!.featured_image_url,
      terms_and_conditions: eventData!.terms_and_conditions,
      contact_email: eventData!.contact_email,
    };
    
    return NextResponse.json(event);
    
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json(
      { error: "Error al obtener evento" },
      { status: 500 }
    );
  }
}
```

**Testing:**
```bash
# Con token de admin
curl -H "Authorization: Bearer <TOKEN>" \
  http://localhost:3000/api/admin/events/<EVENT_ID>

# Sin token (debe fallar con 401)
curl http://localhost:3000/api/admin/events/<EVENT_ID>
```

---

#### Tarea 2.2: Crear Hook use-event (20 min)

**Archivo nuevo:** `/src/hooks/use-event.ts`

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { auth } from '@/lib/firebase/client';
import { useToast } from '@/hooks/use-toast';
import type { Event } from '@/types';

function deserializeEvent(event: any): Event {
  return {
    ...event,
    start_date: new Date(event.start_date),
    end_date: new Date(event.end_date),
    created_at: event.created_at ? new Date(event.created_at) : undefined,
    updated_at: event.updated_at ? new Date(event.updated_at) : undefined,
  };
}

export function useEvent(eventId: string) {
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchEvent = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setError('No autenticado');
        return;
      }

      const token = await currentUser.getIdToken();
      
      const response = await fetch(`/api/admin/events/${eventId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Evento no encontrado');
        }
        throw new Error('Error al cargar evento');
      }
      
      const rawEvent = await response.json();
      const deserializedEvent = deserializeEvent(rawEvent);
      
      setEvent(deserializedEvent);
    } catch (err: any) {
      console.error('Error fetching event:', err);
      setError(err.message || 'Error al cargar evento');
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "No se pudo cargar el evento",
      });
    } finally {
      setIsLoading(false);
    }
  }, [eventId, toast]);

  useEffect(() => {
    if (eventId) {
      fetchEvent();
    }
  }, [eventId, fetchEvent]);

  const refresh = useCallback(() => {
    fetchEvent();
  }, [fetchEvent]);

  const updateEventLocally = useCallback((updatedEvent: Event) => {
    setEvent(updatedEvent);
  }, []);

  return {
    event,
    isLoading,
    error,
    refresh,
    updateEventLocally,
  };
}
```

**Testing:**
```typescript
// En cualquier componente:
const { event, isLoading, error } = useEvent('event-id-123');

if (isLoading) return <Loading />;
if (error) return <Error message={error} />;
if (!event) return <NotFound />;

return <EventDetails event={event} />;
```

---

### FASE 3: Migrar Páginas de Evento (1.5 horas)

#### Tarea 3.1: Migrar Detalle de Evento (20 min)

**Archivo:** `/src/app/dashboard/eventos/[id]/page.tsx`

```typescript
// ❌ ELIMINAR todo el código SSR (líneas 1-55)

// ✅ REEMPLAZAR con:
'use client';

import { useEvent } from '@/hooks/use-event';
import { EventConfigurationClient } from './event-configuration-client';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface PageProps {
  params: { id: string };
}

export default function EventDetailPage({ params }: PageProps) {
  const { event, isLoading, error } = useEvent(params.id);
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-lg font-medium">Cargando evento...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-semibold text-gray-900">Error</h2>
          <p className="text-red-600">{error}</p>
          <Button onClick={() => router.push('/dashboard/eventos')}>
            Volver a Eventos
          </Button>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Evento no encontrado
          </h2>
          <Button onClick={() => router.push('/dashboard/eventos')}>
            Volver a Eventos
          </Button>
        </div>
      </div>
    );
  }

  return <EventConfigurationClient event={event} />;
}
```

**Testing:**
- [ ] Cargar evento existente → Ver detalles
- [ ] Cargar evento inexistente → Ver "No encontrado"
- [ ] Editar evento → Actualización local
- [ ] Verificar permisos

---

#### Tarea 3.2: Refactor Layout de Evento (20 min)

**Problema:** Layout necesita evento pero en Next.js 14+ los layouts no pueden ser async dinámicos.

**Solución:** Usar Context para compartir evento entre layout y páginas.

**Archivo nuevo:** `/src/contexts/EventContext.tsx`

```typescript
'use client';

import { createContext, useContext, ReactNode } from 'react';
import type { Event } from '@/types';

interface EventContextType {
  event: Event | null;
  isLoading: boolean;
  error: string | null;
}

const EventContext = createContext<EventContextType | null>(null);

export function useEventContext() {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error('useEventContext must be used within EventProvider');
  }
  return context;
}

interface EventProviderProps {
  children: ReactNode;
  event: Event | null;
  isLoading: boolean;
  error: string | null;
}

export function EventProvider({ children, event, isLoading, error }: EventProviderProps) {
  return (
    <EventContext.Provider value={{ event, isLoading, error }}>
      {children}
    </EventContext.Provider>
  );
}
```

**Archivo:** `/src/app/dashboard/eventos/[id]/layout.tsx`

```typescript
// ❌ ELIMINAR código SSR (líneas 1-46)

// ✅ REEMPLAZAR con:
'use client';

import { useEvent } from '@/hooks/use-event';
import { EventProvider } from '@/contexts/EventContext';
import { Loader2 } from 'lucide-react';

interface EventLayoutProps {
  children: React.ReactNode;
  params: { id: string };
}

export default function EventLayout({ children, params }: EventLayoutProps) {
  const { event, isLoading, error } = useEvent(params.id);

  // Propagar loading/error a través de Context
  return (
    <EventProvider event={event} isLoading={isLoading} error={error}>
      {children}
    </EventProvider>
  );
}
```

**Actualizar páginas hijas para usar Context:**

```typescript
// En cualquier página dentro de /eventos/[id]/*
import { useEventContext } from '@/contexts/EventContext';

export default function SomeEventPage() {
  const { event, isLoading } = useEventContext();
  
  if (isLoading) return <Loading />;
  if (!event) return <NotFound />;
  
  return <PageContent event={event} />;
}
```

**Testing:**
- [ ] Layout carga evento una vez
- [ ] Páginas hijas usan mismo evento (no recargan)
- [ ] Navegación entre tabs de evento no recarga
- [ ] Loading state consistente

---

#### Tarea 3.3: Migrar Tipos de Boletos (15 min)

**Archivo:** `/src/app/dashboard/eventos/[id]/boletos/page.tsx`

```typescript
// ❌ ELIMINAR código SSR (líneas 1-79)

// ✅ REEMPLAZAR con:
'use client';

import { useEventContext } from '@/contexts/EventContext';
import { useEventTicketTypes } from '@/hooks/use-event-ticket-types';
import TicketTypesPageClient from './ticket-types-page-client';
import { Loader2 } from 'lucide-react';

export default function TicketTypesPage() {
  const { event, isLoading: eventLoading } = useEventContext();
  const { ticketTypes, isLoading: typesLoading } = useEventTicketTypes(event?.id || '');

  const isLoading = eventLoading || typesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-lg font-medium">Cargando tipos de boletos...</p>
        </div>
      </div>
    );
  }

  if (!event) return null;

  return <TicketTypesPageClient event={event} initialTicketTypes={ticketTypes} />;
}
```

**Testing:**
- [ ] Cargar tipos de boletos → Ver lista
- [ ] Crear tipo → Actualización optimista
- [ ] Editar tipo → Actualización optimista
- [ ] Eliminar tipo → Actualización optimista

---

#### Tarea 3.4: Migrar Boletos Vendidos (15 min)

**Archivo:** `/src/app/dashboard/eventos/[id]/boletos-vendidos/page.tsx`

```typescript
// ❌ ELIMINAR código SSR (líneas 1-46)

// ✅ REEMPLAZAR con:
'use client';

import { useEventContext } from '@/contexts/EventContext';
import EventSalesPageClient from './event-sales-page-client';
import { Loader2 } from 'lucide-react';

export default function EventSalesPage() {
  const { event, isLoading } = useEventContext();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-lg font-medium">Cargando ventas...</p>
        </div>
      </div>
    );
  }

  if (!event) return null;

  return <EventSalesPageClient event={event} />;
}
```

**Testing:**
- [ ] Cargar boletos vendidos → Ver tabla
- [ ] Filtrar por fecha → Funciona
- [ ] Descargar PDF → Funciona
- [ ] Enviar email → Funciona

---

#### Tarea 3.5: Migrar Preregistros (20 min)

**Archivo:** `/src/app/dashboard/eventos/[id]/preregistros/page.tsx`

```typescript
// ❌ ELIMINAR código SSR (líneas 1-89)

// ✅ REEMPLAZAR con:
'use client';

import { useEventContext } from '@/contexts/EventContext';
import { usePreregistrations } from '@/hooks/use-preregistrations';
import PreregistrosPageClient from './preregistros-page-client';
import { Loader2 } from 'lucide-react';

export default function PreregistrosV2Page() {
  const { event, isLoading: eventLoading } = useEventContext();
  const { preregistrations, isLoading: preregLoading } = usePreregistrations(event?.id || '');

  const isLoading = eventLoading || preregLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-lg font-medium">Cargando preregistros...</p>
        </div>
      </div>
    );
  }

  if (!event) return null;

  return <PreregistrosPageClient event={event} initialPreregistrations={preregistrations} />;
}
```

**Verificar hook `use-preregistrations.ts`:**
- [ ] Tiene carga inicial automática
- [ ] Retorna `isLoading` state
- [ ] Maneja errores correctamente

**Testing:**
- [ ] Cargar preregistros → Ver tabla
- [ ] Filtrar por estado → Funciona
- [ ] Cambiar estado → Actualización optimista
- [ ] Enviar email → Funciona

---

### FASE 4: Testing Completo (30 minutos)

#### Test 1: Seguridad (15 min)

**Escenario 1: Usuario sin permisos**
```
1. Crear cuenta nueva (rol: usuario)
2. Navegar a /dashboard
   ✅ Ver pantalla "Acceso Restringido"
   ✅ NO ver datos sensibles
3. Click en "Cerrar Sesión"
   ✅ NO ver datos durante transición (0-500ms)
   ✅ Redirigir a /login limpiamente
4. Intentar acceder directo a /dashboard/eventos
   ✅ Redirigir a login
```

**Escenario 2: Admin con permisos**
```
1. Login como admin
2. Navegar a /dashboard
   ✅ Ver loading screen (< 2s)
   ✅ Cargar stats completas
   ✅ Stats actuales (no cache viejo)
3. Navegar a /dashboard/eventos
   ✅ Ver loading screen
   ✅ Cargar lista de eventos
4. Abrir evento específico
   ✅ Ver loading screen
   ✅ Cargar detalles del evento
5. Cerrar sesión
   ✅ NO ver datos durante transición
```

**Escenario 3: Cambio de roles en vivo**
```
1. Login como gestor (tiene acceso)
2. Cargar /dashboard → Ver datos
3. Admin cambia rol a "usuario" en Firebase
4. Hacer refresh de página
   ✅ AuthContext detecta cambio de roles
   ✅ AuthGuard bloquea acceso
   ✅ Ver "Acceso Restringido"
```

**Checklist de seguridad:**
- [ ] No hay fugas visuales en logout
- [ ] No hay datos en HTML antes de validar permisos
- [ ] AuthGuard funciona correctamente
- [ ] Middleware protege rutas API
- [ ] Tokens se validan en servidor

---

#### Test 2: Performance (10 min)

**Métricas a medir:**

| Página | Tiempo carga | Datos transferidos | Requests |
|--------|--------------|-------------------|----------|
| `/dashboard` | < 2s | < 50KB | 1-2 |
| `/dashboard/eventos` | < 2s | < 100KB | 1-2 |
| `/dashboard/eventos/[id]` | < 1.5s | < 20KB | 1 |

**Herramientas:**
- Chrome DevTools → Network tab
- Lighthouse → Performance score > 80

**Casos a probar:**
```
1. Primera carga (sin cache)
   - Medir tiempo de loading screen
   - Verificar que sea < 2s con conexión normal
   
2. Navegación entre páginas
   - Verificar cache de eventos (no recargar)
   - Verificar transiciones suaves
   
3. Refresh manual
   - Verificar que recargue datos
   - Verificar loading states consistentes
```

**Checklist:**
- [ ] Loading screens visibles si > 500ms
- [ ] Tiempo total carga < 2s
- [ ] Cache funciona (no recarga innecesaria)
- [ ] No hay flickering de UI
- [ ] Transiciones suaves

---

#### Test 3: Funcionalidad (5 min)

**Operaciones CRUD:**

Dashboard:
- [ ] Ver stats generales
- [ ] Botón "Actualizar" funciona
- [ ] Stats se actualizan correctamente

Eventos:
- [ ] Listar eventos
- [ ] Crear evento nuevo
- [ ] Editar evento existente
- [ ] Eliminar evento
- [ ] Actualización optimista funciona

Tipos de boletos:
- [ ] Listar tipos
- [ ] Crear tipo
- [ ] Editar tipo
- [ ] Eliminar tipo

Preregistros:
- [ ] Listar preregistros
- [ ] Filtrar por estado
- [ ] Cambiar estado
- [ ] Enviar email

**Checklist:**
- [ ] Todas las operaciones CRUD funcionan
- [ ] Actualización optimista funciona
- [ ] Refresh manual funciona
- [ ] Errores se manejan correctamente
- [ ] Toasts de confirmación aparecen

---

## 📝 Checklist de Implementación

### Pre-requisitos
- [ ] Backup de archivos a modificar
- [ ] Branch `security/remove-sensitive-logs` actualizado
- [ ] Servidor de desarrollo corriendo
- [ ] Firebase emulator corriendo (opcional)

### FASE 1: Quick Wins ✅
- [ ] Migrar `/dashboard/page.tsx` a CSR
- [ ] Modificar `use-dashboard-stats.ts` para carga inicial
- [ ] Migrar `/dashboard/eventos/page.tsx` a CSR
- [ ] Modificar `use-events.ts` para carga inicial
- [ ] Testing seguridad: Usuario sin permisos
- [ ] Testing seguridad: Admin con permisos
- [ ] Testing seguridad: No fugas en logout
- [ ] Commit: "feat: migrate dashboard and events list to CSR"

### FASE 2: APIs Faltantes ✅
- [ ] Crear `/api/admin/events/[id]/route.ts`
- [ ] Testing API: Con token válido (200)
- [ ] Testing API: Sin token (401)
- [ ] Testing API: Evento inexistente (404)
- [ ] Crear hook `use-event.ts`
- [ ] Testing hook: Cargar evento existente
- [ ] Testing hook: Manejar errores
- [ ] Commit: "feat: add event detail API and hook"

### FASE 3: Páginas de Evento ✅
- [ ] Crear `/contexts/EventContext.tsx`
- [ ] Migrar `/dashboard/eventos/[id]/layout.tsx`
- [ ] Migrar `/dashboard/eventos/[id]/page.tsx`
- [ ] Migrar `/dashboard/eventos/[id]/boletos/page.tsx`
- [ ] Migrar `/dashboard/eventos/[id]/boletos-vendidos/page.tsx`
- [ ] Migrar `/dashboard/eventos/[id]/preregistros/page.tsx`
- [ ] Testing: Navegación entre tabs no recarga evento
- [ ] Testing: Context comparte evento correctamente
- [ ] Commit: "feat: migrate event pages to CSR with context"

### FASE 4: Testing Completo ✅
- [ ] Test seguridad: 3 escenarios completos
- [ ] Test performance: Métricas < 2s
- [ ] Test funcionalidad: CRUD completo
- [ ] Fix de bugs encontrados
- [ ] Documentar cambios en CHANGELOG
- [ ] Commit: "test: complete security and performance testing"

### Post-implementación
- [ ] Push a rama `security/remove-sensitive-logs`
- [ ] Crear PR con descripción detallada
- [ ] Review de código
- [ ] Testing en staging
- [ ] Deploy a producción
- [ ] Monitoreo de errores (Sentry)

---

## 🔄 Plan de Rollback

### Si falla después de FASE 1:
```bash
git revert HEAD
npm run dev
# Verificar que dashboard funciona
```

### Si falla después de FASE 2:
```bash
# Revertir últimos 2 commits
git revert HEAD~1..HEAD
npm run dev
```

### Si falla después de FASE 3:
```bash
# Revertir últimos 3 commits
git revert HEAD~2..HEAD
npm run dev
```

### Rollback completo:
```bash
# Volver a commit antes de empezar
git log --oneline -n 10
git reset --hard <commit-hash-antes-de-cambios>
git push origin security/remove-sensitive-logs --force
```

---

## 📊 Métricas de Éxito

### Seguridad ✅
- ✅ No hay fugas visuales de datos sensibles
- ✅ Validación de permisos antes de cargar datos
- ✅ AuthGuard funciona correctamente
- ✅ APIs validan tokens en servidor

### Performance ✅
- ✅ Tiempo de carga < 2s
- ✅ Loading screens visibles
- ✅ Cache funciona correctamente
- ✅ Actualización optimista funciona

### Mantenibilidad ✅
- ✅ Código consistente (pattern CSR)
- ✅ Hooks reutilizables
- ✅ Context compartido para evento
- ✅ Fácil de extender

---

## 🎯 Próximos Pasos (Futuro)

Después de validar que funciona:

1. **Optimización de cache:**
   - Implementar SWR para cache automático
   - Revalidación en background
   - Deduplicación de requests

2. **Mejora de UX:**
   - Skeleton screens más detallados
   - Prefetch de páginas relacionadas
   - Transiciones animadas

3. **Monitoreo:**
   - Métricas de performance (Vercel Analytics)
   - Error tracking (Sentry)
   - User behavior (PostHog)

---

**Tiempo estimado total:** 3 horas  
**Complejidad:** 3.5/10 ⭐⭐⭐  
**Riesgo:** Bajo (infraestructura ya existe)  
**Beneficio:** Alto (elimina brecha de seguridad crítica)
