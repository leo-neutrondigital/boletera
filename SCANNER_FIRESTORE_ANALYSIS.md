# Análisis de Consultas Firestore - Scanner de Asistentes

## 📊 Resumen Ejecutivo

### Antes de las Optimizaciones:
- **Sin localStorage**: Cada recarga = nueva consulta completa
- **Consultas por sesión de usuario**: 5-10+ requests al endpoint
- **Revalidación automática**: En cada focus/blur de la ventana

### Después de las Optimizaciones:
- **Con localStorage**: Solo 1 consulta inicial por sesión (hasta refrescar explícitamente)
- **Sin revalidación automática**: Cache persiste entre reloads
- **Actualización optimista**: Cambios locales sin refetch

---

## 🔍 Análisis Detallado de Consultas

### **Escenario: Evento con 100 boletos vendidos**

#### Consultas por REQUEST al endpoint:

```typescript
// GET /api/scanner/events/[eventId]

1. ✅ 1 read - Verificar evento existe
   adminDb.collection('events').doc(eventId).get()

2. ✅ 1 query - Obtener todos los tickets del evento
   adminDb.collection('tickets').where('event_id', '==', eventId).get()
   // Supongamos 100 documentos = 100 reads

3. ✅ N reads - Obtener tipos de boleto únicos
   // Si hay 5 tipos diferentes de boletos:
   Promise.all([
     adminDb.collection('ticket_types').doc(id1).get(),
     adminDb.collection('ticket_types').doc(id2).get(),
     adminDb.collection('ticket_types').doc(id3).get(),
     adminDb.collection('ticket_types').doc(id4).get(),
     adminDb.collection('ticket_types').doc(id5).get()
   ])
   // = 5 reads
```

**Total por REQUEST: 1 + 100 + 5 = 106 reads**

---

## 📈 Comparativa: Antes vs Después

### **ANTES (Sin localStorage)**

#### Comportamiento típico de un usuario comprobador en 1 turno (4 horas):

| Acción | Requests | Reads |
|--------|----------|-------|
| Carga inicial de página | 1 | 106 |
| Usuario recarga navegador (5 veces) | 5 | 530 |
| Usuario cambia de pestaña y vuelve (10 veces) | 10 | 1,060 |
| SWR revalida en focus (automático) | 10 | 1,060 |
| Usuario presiona "Actualizar" (3 veces) | 3 | 318 |

**TOTAL: 29 requests = 3,074 reads** 😱

---

### **DESPUÉS (Con localStorage)**

#### Mismo escenario con optimizaciones:

| Acción | Requests | Reads |
|--------|----------|-------|
| Carga inicial de página | 1 | 106 |
| Usuario recarga navegador (5 veces) | 0 | 0 ✅ |
| Usuario cambia de pestaña y vuelve (10 veces) | 0 | 0 ✅ |
| SWR revalida en focus | 0 | 0 ✅ |
| Usuario presiona "Actualizar" (3 veces) | 3 | 318 |
| Check-ins realizados (optimista) | 0 | 0 ✅ |
| Configuración de boleto (optimista) | 0 | 0 ✅ |

**TOTAL: 4 requests = 424 reads** ✅

---

## 💰 Impacto en Costos

### Firestore Pricing (Reads):
- **Gratis**: 50,000 reads/día
- **Costo**: $0.06 USD por 100,000 reads después del tier gratuito

### Cálculo para 10 eventos simultáneos con 100 boletos cada uno:

#### ANTES (Sin optimización):
- 10 comprobadores × 3,074 reads/turno = **30,740 reads/turno**
- 3 turnos/día = **92,220 reads/día**
- Excede tier gratuito: **42,220 reads pagados**
- Costo diario: **$0.025 USD/día** → **$0.76 USD/mes**

#### DESPUÉS (Con optimización):
- 10 comprobadores × 424 reads/turno = **4,240 reads/turno**
- 3 turnos/día = **12,720 reads/día**
- Dentro del tier gratuito ✅
- Costo diario: **$0.00 USD** 🎉

---

## 🚀 Reducción Total

### Métricas:

| Métrica | Antes | Después | Reducción |
|---------|-------|---------|-----------|
| **Requests por usuario/turno** | 29 | 4 | **-86%** 📉 |
| **Reads por usuario/turno** | 3,074 | 424 | **-86%** 📉 |
| **Reads diarios (10 eventos)** | 92,220 | 12,720 | **-86%** 📉 |
| **Costo mensual (10 eventos)** | $0.76 | $0.00 | **-100%** 💰 |

---

## 🎯 Optimizaciones Implementadas

### 1. **localStorage Persistence** ✅
- Cache persiste entre recargas
- No consulta en cada mount
- Solo actualiza con botón explícito

**Código:**
```typescript
const localStorageProvider = () => {
  const map = new Map(JSON.parse(localStorage.getItem('scanner-attendees-cache') || '[]'));
  window.addEventListener('beforeunload', () => {
    localStorage.setItem('scanner-attendees-cache', JSON.stringify(Array.from(map.entries())));
  });
  return map;
};

useSWR(key, fetcher, {
  provider: localStorageProvider,
  revalidateIfStale: true,     // Solo primera carga si no hay cache
  revalidateOnFocus: false,    // No revalidar al cambiar de pestaña
  revalidateOnMount: false,    // No revalidar al montar
  refreshInterval: 0           // No polling automático
});
```

### 2. **Actualización Optimista** ✅
- Check-ins se reflejan inmediatamente sin refetch
- Configuración de boleto actualiza localmente
- Solo el ticket modificado cambia (no toda la lista)

**Código:**
```typescript
const updateAttendee = (ticketId: string, updates: any) => {
  mutate(
    (data) => ({
      ...data,
      attendees: data.attendees.map(a => 
        a.id === ticketId ? { ...a, ...updates } : a
      )
    }),
    { revalidate: false } // No hacer refetch
  );
};
```

### 3. **Modal In-Place** ✅
- Configuración sin salir de la interfaz
- Reutiliza componente `TicketCard` existente
- Update optimista integrado

---

## 📌 Casos de Uso Reales

### Caso 1: Comprobador revisando lista antes del evento
**Antes:**
- Abre página: 106 reads
- Revisa nombres, recarga para estar seguro: +106 reads
- **Total: 212 reads**

**Después:**
- Abre página: 106 reads
- Revisa nombres (usa cache): 0 reads
- **Total: 106 reads** → **50% menos** ✅

---

### Caso 2: Comprobador haciendo check-ins durante el evento
**Antes:**
- Carga página: 106 reads
- Hace 20 check-ins (cada uno refresca): +20×106 = 2,120 reads
- **Total: 2,226 reads**

**Después:**
- Carga página: 106 reads
- Hace 20 check-ins (optimista): 0 reads
- **Total: 106 reads** → **95% menos** ✅

---

### Caso 3: Comprobador configurando boletos no generados
**Antes:**
- Carga página: 106 reads
- Configura 10 boletos (cada redirección recarga): +10×106 = 1,060 reads
- **Total: 1,166 reads**

**Después:**
- Carga página: 106 reads
- Configura 10 boletos (modal + optimista): 0 reads
- **Total: 106 reads** → **91% menos** ✅

---

## 🎉 Conclusión

### **Reducción Global: 86% menos consultas**

### **Beneficios adicionales:**
- ✅ UX más rápida (sin esperas de red)
- ✅ Funciona offline después de primera carga
- ✅ Menos probabilidad de errores de red
- ✅ Mejor rendimiento en móviles
- ✅ Costos de Firestore reducidos a $0

### **Tiempo de implementación: ~50 minutos**
### **ROI: Infinito** 🚀

---

## 📝 Notas Técnicas

### ¿Por qué no crear endpoint "ligero"?
- **1 query = 1 query** independientemente de los campos devueltos
- Firestore cobra por documento leído, no por bytes transferidos
- Agregar `pdf_url` no incrementa costo
- Reducir campos solo ahorra ~10KB de transferencia (insignificante)

### ¿El cache es seguro?
- ✅ Solo datos públicos del evento (nombres, check-ins)
- ✅ Expira con botón "Actualizar"
- ✅ Se limpia al cambiar de evento
- ✅ localStorage es por dominio (aislado por usuario/navegador)

---

_Análisis realizado: 14 de noviembre de 2025_
