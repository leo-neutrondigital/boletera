# 🐛 Debug de Estados de Tickets

## 🎯 Problemas Identificados

### 1. **Discrepancia en Estados**
- **UI muestra**: 0 Configurados, 18 Pendientes, 0 Usados
- **Datos en BD**: Necesitamos verificar qué estados realmente existen

### 2. **Estados Posibles según Código**
```typescript
// En el API actual se buscan estos estados:
if (ticketData.status === 'configured') order.configured_tickets++;
else if (ticketData.status === 'purchased') order.pending_tickets++;
else if (ticketData.status === 'used') order.used_tickets++;
```

## 🔍 **Análisis Necesario**

### **Query para verificar estados reales:**
```javascript
// En Firebase Console o script
db.collection('tickets')
  .where('event_id', '==', 'TU_EVENT_ID')
  .get()
  .then(snapshot => {
    const states = {};
    snapshot.docs.forEach(doc => {
      const status = doc.data().status;
      states[status] = (states[status] || 0) + 1;
    });
    console.log('Estados reales:', states);
  });
```

## 🛠️ **Posibles Correcciones**

### **Opción 1: Estados Incorrectos en Mapeo**
Si los estados reales son diferentes:
- `purchased` → Debería ser "Configurados" 
- `pending` → Debería ser "Pendientes"
- `completed` → Debería ser "Usados"

### **Opción 2: Lógica de Negocio Diferente**
- Configurados = PDFs generados
- Pendientes = Sin configurar aún
- Usados = Escaneados en evento

## 🎯 **Plan de Acción**

1. **Verificar estados reales** en BD
2. **Corregir mapeo** en el API
3. **Ocultar "Usados"** por complejidad de días múltiples
4. **Cambiar redirección** a vista administrativa
5. **Corregir espacio en blanco** en layout
