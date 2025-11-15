# Plan de Optimización - Scanner Manual de Asistentes

## 📋 Análisis Actual

### ✅ Ya Implementado:
- **SWR con cache**: Hook `useScannerAttendees` ya usa SWR
- **Actualización optimista**: Función `updateAttendee` para cambios locales
- **Endpoint existente**: `/api/scanner/events/[eventId]` trae todos los datos
- **Check-in manual**: Componente `ManualCheckInModal` funcional

### ⚠️ Problemas Identificados:
1. **Sin localStorage**: SWR se borra al recargar página
2. **Endpoint no optimizado**: Trae TODOS los datos siempre (tickets, tipos, event)
3. **Sin botón de descarga/impresión PDF**: No hay opción para boletos generados
4. **Sin link a configuración**: No redirige a orden cuando boleto no está generado

---

## 🎯 Objetivos de Mejora

### 1. **Persistencia con localStorage** 
- Agregar `localStorage` persistence a SWR (igual que boletos-vendidos)
- Solo recargar con botón "Actualizar" explícito
- Mantener datos entre recargas de página

### 2. **Optimización de Endpoint**
- Crear endpoint ligero: `/api/scanner/events/[eventId]/attendees-light`
- Solo devolver: `id`, `attendee_name`, `status`, `check_in_status`, `used_days`, `authorized_days`, `access_type`, `qr_id`
- Reducir datos transferidos (~60-70% menos)

### 3. **Botón Descargar/Imprimir PDF**
- Agregar botón en `AttendeeCard` cuando `status === 'generated'`
- Usar endpoint: `GET /api/tickets/[ticketId]/pdf` (si existe) o generar con `/api/tickets/[ticketId]/generate-pdf`
- Abrir PDF en nueva pestaña para imprimir

### 4. **Modal de Configuración de Boleto (In-Place)**
- Cuando `status === 'purchased'` o `status === 'configured'` (sin PDF)
- Abrir modal con componente `TicketCard` en modo edición
- Reutilizar lógica existente de configuración + generación PDF
- Actualización optimista del ticket (sin recargar lista completa)
- **Solo necesita `ticket_id`** (ya disponible, no necesitamos `order_id`)

---

## 📝 Plan de Implementación

### **Fase 1: localStorage Persistence**
**Archivos a modificar:**
- `src/hooks/use-scanner-attendees.ts`

**Cambios:**
```typescript
// Agregar provider de localStorage (igual que boletos-vendidos)
const localStorageProvider = () => {
  const map = new Map(JSON.parse(localStorage.getItem('scanner-cache') || '[]'));
  window.addEventListener('beforeunload', () => {
    const appCache = Array.from(map.entries());
    localStorage.setItem('scanner-cache', JSON.stringify(appCache));
  });
  return map;
};

// Usar en SWR
const { data, error, mutate } = useSWR(
  eventId ? `/api/scanner/events/${eventId}` : null,
  fetcher,
  {
    provider: localStorageProvider, // ← NUEVO
    revalidateOnFocus: false,
    revalidateOnMount: false,      // ← No recargar al montar
    // ... resto de config
  }
);
```

**Testing:**
- ✅ Recargar página y verificar que datos persisten
- ✅ Botón "Actualizar" fuerza revalidación
- ✅ Cache se guarda antes de cerrar pestaña

---

### **Fase 2: Agregar Campo pdf_url al Endpoint Existente**
**Archivos a modificar:**
- `src/app/api/scanner/events/[eventId]/route.ts`

**Cambio mínimo:**
```typescript
// En el mapeo de attendees, agregar:
attendees: ticketsSnapshot.docs.map(doc => {
  const ticketData = doc.data();
  return {
    // ... campos existentes
    pdf_url: ticketData.pdf_url || null, // ← AGREGAR (para botón PDF)
    // ...
  };
});
```

**Beneficios:**
- Un solo campo adicional
- Sin costo extra (misma lectura de Firestore)
- Habilita botón de descarga PDF

**⚠️ Nota:** NO crear endpoint nuevo. 1 consulta = 1 consulta, traer más o menos campos no cambia el costo de lectura en Firestore, solo bytes transferidos (que con localStorage + SWR solo descargamos 1 vez).

---

### **Fase 3: Botón Descargar/Imprimir PDF**
**Archivos a modificar:**
- `src/app/scanner/events/[eventId]/components/AttendeesList.tsx`

**Cambios en `AttendeeCard`:**
```tsx
// Agregar botón junto a "Registrar"
{attendee.status === 'generated' && attendee.pdf_url && (
  <Button
    variant="outline"
    size="sm"
    onClick={(e) => {
      e.stopPropagation();
      handleDownloadPDF(attendee.id);
    }}
  >
    <Printer className="w-4 h-4" />
  </Button>
)}

// Handler
const handleDownloadPDF = async (ticketId: string) => {
  try {
    // Opción 1: Si ya tiene URL
    if (attendee.pdf_url) {
      window.open(attendee.pdf_url, '_blank');
      return;
    }
    
    // Opción 2: Generar on-demand
    const response = await authenticatedGet(`/api/tickets/${ticketId}/pdf`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  } catch (error) {
    toast({ variant: 'destructive', title: 'Error al descargar PDF' });
  }
};
```

**Testing:**
- ✅ Botón solo aparece cuando `status === 'generated'`
- ✅ Click abre PDF en nueva pestaña
- ✅ Se puede imprimir desde navegador

---

### **Fase 4: Modal de Configuración In-Place**
**Archivos a modificar:**
- `src/app/scanner/events/[eventId]/components/AttendeesList.tsx`

**Componentes a reutilizar:**
- `TicketCard` (ya tiene form + lógica completa)
- Dialog/Modal de shadcn/ui

**Implementación:**
```tsx
// 1. Estado para modal
const [selectedTicket, setSelectedTicket] = useState<AttendeeTicket | null>(null);
const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

// 2. Handler para abrir modal
const handleConfigureTicket = (attendee: AttendeeTicket) => {
  setSelectedTicket(attendee);
  setIsConfigModalOpen(true);
};

// 3. Botón en AttendeeCard
{(attendee.status === 'purchased' || attendee.status === 'configured') && (
  <Button
    variant="outline"
    size="sm"
    onClick={(e) => {
      e.stopPropagation();
      handleConfigureTicket(attendee);
    }}
  >
    <Settings className="w-4 h-4" />
    Configurar
  </Button>
)}

// 4. Modal con TicketCard
<Dialog open={isConfigModalOpen} onOpenChange={setIsConfigModalOpen}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>Configurar Boleto</DialogTitle>
    </DialogHeader>
    {selectedTicket && (
      <TicketCard
        ticket={selectedTicket}
        onUpdate={async (ticketId, updates) => {
          // Actualización optimista local
          onAttendeeUpdate?.(ticketId, updates);
          setIsConfigModalOpen(false);
        }}
        autoEdit={true} // ← Abrir directo en modo edición
        canEdit={true}
      />
    )}
  </DialogContent>
</Dialog>
```

**Ventajas de este enfoque:**
- ✅ Reutiliza componente existente completo
- ✅ No sale de la interfaz del scanner
- ✅ Actualización optimista ya implementada
- ✅ Generación PDF automática en background
- ✅ **Solo necesita `ticket_id`** (no necesitamos `order_id`)
- ✅ UX más fluida y rápida

**Testing:**
- ✅ Botón aparece cuando boleto no está generado
- ✅ Modal abre con form pre-llenado
- ✅ Guardado actualiza lista sin recargar
- ✅ PDF se genera automáticamente si datos completos

---

## 🔄 Optimización de Check-in (Ya implementado)

### ✅ Actualización Optimista Actual:
```typescript
// En useScannerAttendees
const updateAttendee = (ticketId: string, updates: any) => {
  mutate(
    (currentData: any) => ({
      ...currentData,
      attendees: currentData.attendees.map((a: any) =>
        a.id === ticketId ? { ...a, ...updates } : a
      )
    }),
    { revalidate: false } // No refetch
  );
};
```

**Ya funciona correctamente:**
- Cambio local inmediato en UI
- No refetch completo
- Solo se actualiza el ticket modificado

---

## 📊 Resumen de Mejoras

| Feature | Complejidad | Impacto | Prioridad |
|---------|-------------|---------|-----------|
| localStorage persistence | 🟢 Baja | 🔥 Alto | **1** |
| Agregar campo pdf_url | 🟢 Baja | 🟢 Bajo | **2** |
| Botón Descargar PDF | 🟢 Baja | 🔥 Alto | **3** |
| Modal Configuración In-Place | 🟢 Baja | 🔥 Alto | **4** |

---

## ⚡ Orden de Implementación Recomendado

### 1️⃣ localStorage (10 min)
- Cambio mínimo en hook SWR
- Gran mejora UX inmediata
- Datos persisten entre recargas

### 2️⃣ Agregar campo pdf_url (5 min)
- Un solo campo en endpoint existente
- Sin costo adicional en Firestore
- Habilita botón PDF

### 3️⃣ Botón Descargar PDF (15 min)
- Feature muy solicitada
- Solo para boletos con status 'generated'
- Abre PDF en nueva pestaña

### 4️⃣ Modal Configuración (20 min)
- Reutiliza componente `TicketCard` existente
- Envolver en Dialog/Modal
- Actualización optimista ya implementada
- **No sale de la interfaz del scanner**

**Total: ~50 minutos** ⚡

---

## 🚀 Próximos Pasos

**Implementar las 4 fases:**
1. ✅ localStorage persistence (ya funciona el cache, solo falta persistirlo)
2. ✅ Agregar `pdf_url` al endpoint (1 línea de código)
3. ✅ Botón PDF (componente simple)
4. ✅ Modal de configuración in-place (reutilizar `TicketCard`)

**Beneficios del nuevo enfoque:**
- ❌ No necesitamos `order_id`
- ❌ No creamos endpoints nuevos
- ❌ No salimos de la interfaz
- ✅ Reutilizamos código existente
- ✅ UX más fluida
- ✅ Actualización optimista ya implementada
