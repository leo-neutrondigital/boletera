# Plan de Optimización: Sistema de Check-in

**Fecha:** 2 de noviembre de 2025  
**Objetivo:** Optimizar sistema de check-in para boletos `all_days` con actualización eficiente  
**Rama:** `security/remove-sensitive-logs`  
**Alcance:** SOLO boletos `all_days` (no se toca `specific_days` ni `any_single_day`)

---

## 📊 Diagnóstico del Problema

### Problema Principal
- API `/api/scanner/events/[eventId]` auto-corrige `authorized_days` de boletos `all_days` en CADA request
- Genera logs repetitivos molestos
- Procesa 38 boletos completos después de cada check-in manual (DOBLE recarga)
- Dependencia innecesaria de `authorized_days` para boletos `all_days`
- Cache manual custom en Context (reinventando la rueda)

### Causa Raíz
```typescript
// Lógica actual (INCORRECTA):
if (ticketType.access_type === 'all_days') {
  // Valida authorized_days aunque no es necesario
  if (validAuthorizedDays.length === 0) {
    authorizedDays = generateEventDays(...);
    console.log('[Scanner] Auto-corrected...'); // ← Logs repetitivos
  }
}

// Después de check-in:
invalidateEvent(eventId);  // ← Recarga 1
onSuccess();               // ← Recarga 2
```

### Revelación Clave
**Boletos `all_days` NO necesitan validar `authorized_days`:**
- Solo necesitan validar: evento activo + no usado hoy
- Pueden asistir CUALQUIER día del evento
- No importa qué fechas tenga `authorized_days` en Firestore
- **Scanner de cámara YA funciona así** (no valida `authorized_days` para `all_days`)

---

## ✅ Solución Propuesta

### Estrategia de Optimización

**1. Lógica:** Simplificar validación de `all_days` (no validar `authorized_days`)  
**2. Cache:** Migrar a SWR solo para scanner (gradual, sin romper lo existente)  
**3. Actualización:** Optimista local (UI instantánea sin recargas completas)

### Principio de Validación para `all_days`

```typescript
all_days:
  ✓ ¿Evento activo hoy? (start_date <= today <= end_date)
  ✓ ¿No hizo check-in hoy? (today not in used_days)
  → Permitir check-in
  
  ❌ NO validar authorized_days
  ❌ NO auto-corregir fechas
  ❌ NO generar logs repetitivos
```

### Flujo Optimizado de Check-in

```
ANTES:
  Check-in → invalidateEvent() → onSuccess() → refresh()
  → GET /api/scanner/events/[eventId] (38 boletos)
  → Procesar auto-correcciones × 7
  → Re-renderizar lista completa
  ⏱️ ~500ms, ~150KB

DESPUÉS:
  Check-in → updateAttendee(ticketId, updates)
  → Actualizar cache local (1 boleto)
  → Re-renderizar solo ese elemento
  → Background refresh (2min) trae cambios de otros
  ⏱️ ~50ms, ~5KB (10x más rápido)
```

---

## 🚀 Plan de Implementación

**IMPORTANTE:** Solo se modifican archivos relacionados con `all_days` y scanner.  
`specific_days` y `any_single_day` quedan sin cambios.

### FASE 1: Instalar SWR (2 min)

**Objetivo:** Agregar librería de cache eficiente

```bash
npm install swr
```

**¿Por qué SWR?**
- ✅ Librería oficial de Vercel (mismo equipo que Next.js)
- ✅ Cache automático con deduplicación
- ✅ Actualización optimista built-in
- ✅ Background refresh automático
- ✅ Solo 4KB (muy ligera)
- ✅ Coexiste sin conflictos con DataCacheContext

**Nota:** DataCacheContext NO se toca (sigue funcionando para dashboard, cortesías, etc.)

---

### FASE 2: Limpieza del API de Lista (15 min)

**Archivo:** `/src/app/api/scanner/events/[eventId]/route.ts`

**Cambios:**

1. **Eliminar auto-corrección con logs (líneas 164-182)**

```typescript
// ❌ ELIMINAR:
if (ticketType?.access_type === 'all_days') {
  const validAuthorizedDays = authorizedDays.filter(...);
  if (validAuthorizedDays.length === 0) {
    authorizedDays = generateEventDays(...);
    console.log('[Scanner] Auto-corrected...'); // ← Eliminar logs
  }
}

// ✅ REEMPLAZAR con:
if (ticketType?.access_type === 'all_days') {
  // Para UI: generar rango completo del evento (sin logs)
  authorizedDays = generateEventDays(eventStartStr, eventEndStr);
}
```

2. **Eliminar logs de "Filtered obsolete used_days" (líneas 189-195)**

```typescript
// ❌ ELIMINAR:
if (relevantUsedDays.length !== originalUsedDays.length) {
  console.log('[Scanner] Filtered obsolete used_days:', { ... });
}
```

**Resultado:**
- ✅ Consola limpia (sin logs repetitivos)
- ✅ API 20% más rápido (genera días 1 vez, no valida contra Firestore)
- ✅ Mismo comportamiento en UI (muestra días disponibles)
- ⚠️ `specific_days` y `any_single_day` NO se tocan

---

### FASE 3: Crear Hook con SWR (15 min)

**Archivo:** `/src/hooks/use-scanner-attendees.ts` (NUEVO)

**Crear hook personalizado para scanner:**

```typescript
'use client';

import useSWR from 'swr';
import { useAuth } from '@/contexts/AuthContext';

export function useScannerAttendees(eventId: string) {
  const { user } = useAuth();
  
  // Fetcher function
  const fetcher = async (url: string) => {
    if (!user) throw new Error('No authenticated user');
    
    const token = await user.getIdToken();
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  };
  
  // SWR hook
  const { data, error, mutate, isValidating } = useSWR(
    eventId && user ? `/api/scanner/events/${eventId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,      // No revalidar al cambiar de tab
      revalidateOnReconnect: true,   // Sí revalidar al reconectar
      dedupingInterval: 60000,       // Deduplicar requests por 60s
      refreshInterval: 120000,       // Background refresh cada 2 min
      
      onError: (err) => console.error('[Scanner] Error:', err),
      onSuccess: (data) => console.log(`✅ ${data?.attendees?.length || 0} attendees loaded`)
    }
  );
  
  // Actualizar UN boleto localmente (optimista)
  const updateAttendee = (ticketId: string, updates: any) => {
    mutate(
      (currentData: any) => {
        if (!currentData?.attendees) return currentData;
        
        return {
          ...currentData,
          attendees: currentData.attendees.map((a: any) =>
            a.id === ticketId ? { ...a, ...updates } : a
          )
        };
      },
      { revalidate: false }  // No revalidar inmediatamente
    );
  };
  
  return {
    attendees: data?.attendees || [],
    event: data?.event || null,
    stats: data?.stats || null,
    isLoading: !error && !data && isValidating,
    error,
    refresh: mutate,
    updateAttendee
  };
}
```

**Resultado:**
- ✅ Cache automático por SWR
- ✅ Actualización optimista built-in
- ✅ Background refresh cada 2 minutos
- ✅ Deduplicación de requests
- ✅ Coexiste con DataCacheContext

---

### FASE 4: Migrar Página del Scanner a SWR (15 min)

**Archivo:** `/src/app/scanner/events/[eventId]/page.tsx`

**Cambios:**

1. **Cambiar import:**

```typescript
// ❌ ANTES:
import { useEventAttendees } from '@/contexts/DataCacheContext';

// ✅ DESPUÉS:
import { useScannerAttendees } from '@/hooks/use-scanner-attendees';
```

2. **Cambiar hook:**

```typescript
// ❌ ANTES:
const { 
  attendees, event, stats, loading, 
  loadEventAttendees, refresh, invalidate 
} = useEventAttendees(eventId);

// ✅ DESPUÉS:
const { 
  attendees, event, stats, 
  isLoading, refresh, updateAttendee 
} = useScannerAttendees(eventId);
```

3. **Eliminar useEffect de carga:**

```typescript
// ❌ ELIMINAR:
useEffect(() => {
  if (!isAuthLoading && user && eventId) {
    loadEventAttendees();
  }
}, [isAuthLoading, user, eventId, loadEventAttendees]);

// ✅ SWR carga automáticamente
```

4. **Pasar updateAttendee a componentes hijos:**

```typescript
<AttendeesList
  attendees={attendees}
  onAttendeeUpdate={updateAttendee}  // ← NUEVA prop
  onRefresh={refresh}
  // ...
/>
```

**Resultado:**
- ✅ Menos código (elimina useEffect manual)
- ✅ Cache automático de SWR
- ✅ Actualización optimista disponible

---

### FASE 5: Simplificar Modal con Actualización Optimista (20 min)

**Archivo:** `/src/components/scanner/ManualCheckInModal.tsx`

**Cambios:**

1. **Agregar prop para actualización optimista:**

```typescript
interface ManualCheckInModalProps {
  // ... props existentes
  onTicketUpdated?: (ticketId: string, updates: any) => void;  // ← NUEVA
}
```

2. **Cambiar lógica de availableDays SOLO para `all_days` (líneas 76-100):**

```typescript
// ✅ SOLO modificar caso all_days:
let availableDays: string[] = [];

switch (attendee.access_type) {
  case 'all_days':
    // Para all_days: todos los días del evento son válidos
    // Solo excluir días ya usados
    const eventDays = generateEventDays(event.start_date, event.end_date);
    availableDays = eventDays.filter(day => 
      !attendee.used_days.includes(day)
    );
    break;
    
  case 'specific_days':
    // ⚠️ NO TOCAR - dejar como está
    availableDays = attendee.authorized_days.filter(day => 
      !attendee.used_days.includes(day)
    );
    break;
    
  case 'any_single_day':
    // ⚠️ NO TOCAR - dejar como está
    availableDays = attendee.used_days.length === 0 
      ? [getTodayInMexicoTimezone()] 
      : [];
    break;
}
```

3. **Actualizar handleSubmit con optimista (línea ~300):**

```typescript
const handleSubmit = async () => {
  // ... validaciones existentes
  
  try {
    setIsProcessing(true);
    
    const response = await authenticatedPost('/api/scanner/manual-checkin', {
      ticketId: attendee.id,
      eventId,
      selectedDay: dayToCheckIn,
      notes: notes.trim()
    });

    if (response.ok) {
      const result = await response.json();
      
      // ✅ Actualización optimista local
      if (onTicketUpdated && result.checkin_data) {
        onTicketUpdated(attendee.id, {
          used_days: [...attendee.used_days, result.checkin_data.day_checked],
          last_checkin: result.checkin_data.check_in_time,
          can_undo_until: result.checkin_data.can_undo_until
        });
      }
      
      toast({ title: "¡Check-in exitoso!" });
      onClose();
      
      // ❌ ELIMINAR estas líneas:
      // invalidateEvent(eventId);
      // onSuccess();
    }
  } catch (error) {
    // ... manejo de errores existente
  } finally {
    setIsProcessing(false);
  }
};
```

**Resultado:**
- ✅ UI instantánea (actualización optimista)
- ✅ Sin doble recarga (elimina invalidateEvent + onSuccess)
- ✅ Background refresh trae cambios de otros usuarios
- ⚠️ Solo modifica lógica de `all_days`

---

### FASE 6: Conectar AttendeesList con Actualización Optimista (10 min)

**Archivo:** `/src/app/scanner/events/[eventId]/components/AttendeesList.tsx`

**Cambios:**

1. **Agregar prop para actualización:**

```typescript
interface AttendeesListProps {
  // ... props existentes
  onAttendeeUpdate?: (ticketId: string, updates: any) => void;  // ← NUEVA
}
```

2. **Modificar handleCheckInSuccess:**

```typescript
const handleCheckInSuccess = (ticketId: string, updatedData: any) => {
  // ✅ Actualización optimista local
  if (onAttendeeUpdate) {
    onAttendeeUpdate(ticketId, updatedData);
  }
  
  // ❌ Ya NO llamar: onRefresh();
};
```

3. **Pasar función al modal:**

```typescript
<ManualCheckInModal
  isOpen={isModalOpen}
  onClose={closeCheckInModal}
  attendee={selectedAttendee}
  eventId={eventId}
  eventName={eventName}
  onTicketUpdated={onAttendeeUpdate}  // ← Pasar función recibida
/>
```

**Resultado:**
- ✅ Actualización se propaga desde página → lista → modal
- ✅ Sin recargas innecesarias
- ✅ UI reactiva instantánea

---

## 🚫 **LO QUE NO SE TOCA**

### Tipos de Boleto NO Modificados

**`specific_days`:**
- ✅ Validación de `authorized_days` se mantiene igual
- ✅ Lógica de días autorizados no cambia
- ✅ Modal sigue usando `authorized_days`

**`any_single_day`:**
- ✅ Validación de uso único se mantiene igual
- ✅ Lógica de `used_days.length` no cambia

### Componentes NO Modificados

- ✅ Scanner de cámara (`/scanner/scan`) - Ya funciona bien
- ✅ DataCacheContext - Sigue para dashboard, cortesías, etc.
- ✅ Dashboard de eventos - Sin cambios
- ✅ Gestión de cortesías - Sin cambios
- ✅ APIs de `specific_days` - Sin cambios

### Solo se Modifica

✅ Lógica de `all_days` en scanner manual  
✅ Cache del scanner (migra a SWR)  
✅ Actualización optimista en check-in manual

---

## 📊 Beneficios Esperados

### Rendimiento
- ✅ **10x más rápido:** UI instantánea (~50ms vs ~500ms)
- ✅ **97% menos datos:** Solo actualiza 1 boleto (~5KB vs ~150KB)
- ✅ **Sin doble recarga:** 1 request en vez de 2
- ✅ Consola limpia (sin logs repetitivos)
- ✅ Cache automático con deduplicación

### Mantenibilidad
- ✅ **-500 líneas:** Elimina cache manual custom
- ✅ **+50 líneas:** Hook simple con SWR
- ✅ Código más simple y declarativo
- ✅ Lógica consistente con scanner de cámara
- ✅ Menos estado manual a manejar

### Escalabilidad
- ✅ Funciona con 38 o 3800 boletos
- ✅ No degrada con más eventos simultáneos
- ✅ Validación O(1) para `all_days`
- ✅ Background refresh sincroniza cambios de otros usuarios

### UX
- ✅ UI reactiva instantánea
- ✅ Sin esperas después de check-in
- ✅ Sincronización automática en background
- ✅ Feedback visual inmediato

---

## ✅ Checklist de Implementación

### Pre-requisitos
- [ ] Backup de archivos a modificar
- [ ] Branch `security/remove-sensitive-logs` actualizado
- [ ] Servidor de desarrollo corriendo
- [ ] Node.js y npm funcionando

### Fase 1: Instalar SWR (2 min)
- [ ] Ejecutar: `npm install swr`
- [ ] Verificar instalación en `package.json`
- [ ] Reiniciar servidor de desarrollo

### Fase 2: Limpieza API Lista (15 min)
- [ ] Modificar `/api/scanner/events/[eventId]/route.ts`
- [ ] Eliminar auto-corrección SOLO para `all_days` (líneas 164-182)
- [ ] Eliminar logs de "Filtered obsolete used_days" (líneas 189-195)
- [ ] Probar: Cargar lista de asistentes
- [ ] Verificar: Consola limpia, sin logs repetitivos
- [ ] Verificar: `specific_days` sigue funcionando igual

### Fase 3: Crear Hook SWR (15 min)
- [ ] Crear archivo `/src/hooks/use-scanner-attendees.ts`
- [ ] Copiar código del hook desde el plan
- [ ] Verificar imports correctos
- [ ] Probar que compila sin errores

### Fase 4: Migrar Página Scanner (15 min)
- [ ] Modificar `/app/scanner/events/[eventId]/page.tsx`
- [ ] Cambiar import de useEventAttendees a useScannerAttendees
- [ ] Eliminar useEffect de carga manual
- [ ] Pasar `updateAttendee` a AttendeesList
- [ ] Probar: Página carga correctamente
- [ ] Verificar: Lista muestra 38 asistentes

### Fase 5: Simplificar Modal (20 min)
- [ ] Modificar `ManualCheckInModal.tsx`
- [ ] Agregar prop `onTicketUpdated`
- [ ] Modificar lógica de `availableDays` SOLO para `all_days`
- [ ] Actualizar `handleSubmit` con actualización optimista
- [ ] Eliminar `invalidateEvent()` y `onSuccess()`
- [ ] Probar: Abrir modal para `all_days`
- [ ] Probar: Abrir modal para `specific_days` (sin cambios)

### Fase 6: Conectar AttendeesList (10 min)
- [ ] Modificar `AttendeesList.tsx`
- [ ] Agregar prop `onAttendeeUpdate`
- [ ] Modificar `handleCheckInSuccess`
- [ ] Pasar función al ManualCheckInModal
- [ ] Probar: Check-in manual funciona

### Testing Completo
- [ ] **Test all_days:**
  - [ ] Cargar lista de asistentes (sin logs)
  - [ ] Abrir modal de boleto `all_days`
  - [ ] Hacer check-in manual
  - [ ] Verificar: UI actualiza instantáneamente
  - [ ] Verificar: NO hay recarga de página
  - [ ] Verificar: Usuario aparece en "Hoy registrados"
  - [ ] Verificar: Botón "Registrar" desaparece
  - [ ] Reabrir modal: Verificar "Ya registrado hoy"

- [ ] **Test specific_days (sin cambios):**
  - [ ] Abrir modal de boleto `specific_days`
  - [ ] Verificar: Días autorizados se muestran
  - [ ] Hacer check-in: Verificar funciona igual que antes

- [ ] **Test scanner cámara (sin cambios):**
  - [ ] Escanear QR de boleto `all_days`
  - [ ] Verificar: Funciona igual que antes
  - [ ] Escanear QR de boleto `specific_days`
  - [ ] Verificar: Funciona igual que antes

- [ ] **Test múltiples usuarios:**
  - [ ] Abrir página en 2 navegadores diferentes
  - [ ] Hacer check-in en navegador 1
  - [ ] Esperar 2 minutos
  - [ ] Verificar: Navegador 2 muestra cambio (background refresh)

### Post-implementación
- [ ] Commit 1: "feat: install SWR for cache optimization"
- [ ] Commit 2: "refactor: remove auto-correction logs for all_days"
- [ ] Commit 3: "feat: add useScannerAttendees hook with SWR"
- [ ] Commit 4: "refactor: migrate scanner page to SWR"
- [ ] Commit 5: "feat: add optimistic updates for check-in"
- [ ] Push a rama `security/remove-sensitive-logs`
- [ ] Documentar cambios en CHANGELOG
- [ ] Actualizar README si es necesario

---

## 🔄 Rollback Plan

Si algo falla:

1. **Revertir commits específicos:**
   ```bash
   git log --oneline -n 10
   git revert <commit-hash>
   ```

2. **Archivos modificados (para rollback manual):**
   - `/src/app/api/scanner/events/[eventId]/route.ts` (FASE 2)
   - `/src/hooks/use-scanner-attendees.ts` (FASE 3 - archivo nuevo)
   - `/src/app/scanner/events/[eventId]/page.tsx` (FASE 4)
   - `/src/components/scanner/ManualCheckInModal.tsx` (FASE 5)
   - `/src/app/scanner/events/[eventId]/components/AttendeesList.tsx` (FASE 6)

3. **Rollback por fase:**
   ```bash
   # Si falla FASE 6: Solo revertir AttendeesList.tsx
   git checkout HEAD~1 -- src/app/scanner/events/[eventId]/components/AttendeesList.tsx
   
   # Si falla FASE 5: Revertir Modal
   git checkout HEAD~2 -- src/components/scanner/ManualCheckInModal.tsx
   
   # Si falla FASE 4: Revertir página
   git checkout HEAD~3 -- src/app/scanner/events/[eventId]/page.tsx
   
   # Si falla FASE 3: Eliminar hook
   rm src/hooks/use-scanner-attendees.ts
   
   # Si falla FASE 2: Revertir API
   git checkout HEAD~5 -- src/app/api/scanner/events/[eventId]/route.ts
   ```

4. **Desinstalar SWR (si es necesario):**
   ```bash
   npm uninstall swr
   ```

5. **Verificación después de rollback:**
   - [ ] Check-in manual funciona
   - [ ] Check-in cámara funciona
   - [ ] Lista carga correctamente
   - [ ] Dashboard funciona (usa DataCacheContext)
   - [ ] No hay errores en consola

---

## 📝 Notas Importantes

### ✅ Lo que SÍ se Modifica
- **API de lista:** Solo lógica de `all_days` (eliminar auto-corrección)
- **Hook nuevo:** Crear `useScannerAttendees` con SWR
- **Página scanner:** Migrar a SWR (sin tocar DataCacheContext)
- **Modal:** Actualización optimista para check-in
- **Lista:** Propagar actualización optimista

### ❌ Lo que NO se Toca
- **Scanner de cámara:** Ya funciona bien, sin cambios
- **DataCacheContext:** Sigue funcionando para dashboard, cortesías, etc.
- **Lógica `specific_days`:** Sin cambios en validación
- **Lógica `any_single_day`:** Sin cambios en validación
- **APIs de otros módulos:** Solo se modifica scanner

### ⚠️ Coexistencia SWR y DataCacheContext
- **SWR:** Solo para scanner (`/scanner/events/[eventId]`)
- **DataCacheContext:** Para todo lo demás (dashboard, cortesías, usuarios)
- **Sin conflictos:** Usan diferentes keys y state
- **Migración gradual:** Después se puede migrar otros módulos

### 🎯 Próximos Pasos (Futuro)
Después de validar que funciona bien en scanner:
1. ✅ Scanner (implementado en este plan)
2. ⏭️ Dashboard stats (futuro)
3. ⏭️ Cortesías (futuro)
4. ⏭️ Usuarios (futuro)
5. ⏭️ Eliminar DataCacheContext completamente (futuro)

### 🔍 Decisiones Pendientes (Para Después)
- [ ] Comportamiento de `specific_days` cuando cambien fechas del evento
  - Opción A: Estricta (invalidar boletos)
  - Opción B: Flexible (permitir dentro del nuevo rango)
- [ ] Migrar otros módulos a SWR
- [ ] Evaluar eliminar DataCacheContext

---

**Tiempo estimado total:** 1 hora 15 minutos  
**Complejidad:** Media (por migración a SWR)  
**Riesgo:** Bajo (coexiste con sistema actual)  
**Beneficio:** Alto (10x más rápido, UI instantánea)  
**Alcance:** Solo boletos `all_days` en scanner
