## ✅ Cambios aplicados para solucionar problemas

### 🔧 **Problema 1: Boletos vendidos en cero**
**Solución**: Cambiar `EventCacheProvider` para usar funciones client-side en lugar de APIs inexistentes.

**Cambios realizados:**
- ✅ `loadSoldTickets()`: Ahora usa `getTicketsByEvent()` y `getOrdersByEvent()` 
- ✅ `loadCourtesyTickets()`: Ahora usa `authenticatedGet('/api/admin/courtesy-orders')`
- ✅ Transformación correcta de datos a formato `SoldTicket` y `CourtesyTicket`

### 🚨 **Problema 2: Maximum update depth en preregistros**
**Solución**: Simplificar dependencias de `useEffect` para evitar loops infinitos.

**Cambios realizados:**
- ✅ `useEffect` ahora solo depende de `isLoading`
- ✅ Eliminadas dependencias problemáticas que cambiaban en cada render

### 📋 **Para probar:**

1. **Boletos vendidos**: Ir a `/dashboard/eventos/[id]/boletos-vendidos`
   - Debería mostrar datos reales de tickets y órdenes
   - Stats deberían mostrar números correctos

2. **Preregistros**: Ir a `/dashboard/eventos/[id]/preregistros`
   - No debería dar error de "Maximum update depth"
   - Debería cargar sin problemas

### 🔗 **APIs utilizadas:**
- ✅ Boletos: `getTicketsByEvent()` + `getOrdersByEvent()` (client-side)
- ✅ Cortesías: `/api/admin/courtesy-orders` (server-side pero existente)
- ✅ Preregistros: Ya funcionaba con su API

¿Quieres que probemos ahora?
