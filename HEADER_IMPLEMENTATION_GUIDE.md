# 📋 Guía de Implementación: Sistema de Headers Unificado

## 🎯 Objetivo
Sistema de headers consistente para todas las páginas del dashboard usando `PageHeader` component reutilizable.

## 🧩 Componentes Principales

### 1. **PageHeader** (`src/components/shared/PageHeader.tsx`)
Componente base reutilizable para todos los headers.

```tsx
<PageHeader
  icon={ShoppingCart}
  title="Ventas - Música en vivo"
  description="Gestión de ventas y cortesías del evento"
  iconColor="orange"
  badgeColor="orange"
  actions={<>...botones...</>}
/>
```

### 2. **SalesPageContext** (`src/contexts/SalesPageContext.tsx`)
Context para comunicar acciones entre páginas y headers.

```tsx
// En la página
const { setSalesActions } = useSalesPage();
setSalesActions({
  onRefresh: handleRefresh,
  onExport: handleExport,
  isRefreshing: loading
});

// En el header
const { salesActions } = useSalesPage();
```

## 📐 Estructura Visual

```
┌─────────────────────────────────────────────────────────────────┐
│ 🛒 [Título] - [Evento]           [Badge] [Botón1] [Botón2]      │ ← PageHeader
├─────────────────────────────────────────────────────────────────┤
│ 📊 [Fechas]  📍 [Ubicación]  📅 [Duración]                     │ ← Info evento
├─────────────────────────────────────────────────────────────────┤
│ [Pestaña1] [Pestaña2] [Pestaña3]                               │ ← Navegación
├─────────────────────────────────────────────────────────────────┤
│ Contenido de la página...                                       │
└─────────────────────────────────────────────────────────────────┘
```

## 🔧 Implementación por Pasos

### **Paso 1: Detectar Página**
En `EventTabsNavigation.tsx`:
```tsx
const isOnMiPagina = pathname.includes("/mi-pagina");
```

### **Paso 2: Expandir Context** 
En `SalesPageContext.tsx`:
```tsx
interface SalesPageContextType {
  // ... existentes
  miPaginaActions: {
    onAction1: () => void;
    onAction2: () => void;
    isLoading: boolean;
  } | null;
  setMiPaginaActions: (actions: ...) => void;
}
```

### **Paso 3: Agregar Header Condicional**
En `EventTabsNavigation.tsx`:
```tsx
if (isOnMiPagina) {
  return (
    <div>
      <PageHeader
        icon={MiIcono}
        title={`Mi Sección - ${event.name}`}
        description="Descripción de la funcionalidad"
        iconColor="purple"
        badgeColor="purple"
        actions={
          miPaginaActions && (
            <>
              <Button onClick={miPaginaActions.onAction1}>
                Acción 1
              </Button>
              <Button onClick={miPaginaActions.onAction2}>
                Acción 2
              </Button>
            </>
          )
        }
      />

      {/* Información del evento */}
      <div className="bg-gray-50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span>{eventDateInfo.dateRange}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>📍 {event.location}</span>
            </div>
            {eventDateInfo.isMultiDay && (
              <div className="flex items-center gap-2">
                <span>📅 {eventDateInfo.duration} días</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navegación por pestañas */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              // ... lógica de pestañas
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
```

### **Paso 4: Configurar Acciones en la Página**
En tu componente de página:
```tsx
import { useSalesPage } from "@/contexts/SalesPageContext";

export function MiPaginaClient() {
  const { setMiPaginaActions } = useSalesPage();

  useEffect(() => {
    setMiPaginaActions({
      onAction1: handleAction1,
      onAction2: handleAction2,
      isLoading: loading
    });

    return () => setMiPaginaActions(null);
  }, [loading, setMiPaginaActions]);

  // Resto del componente...
}
```

### **Paso 5: Ajustar Márgenes**
En el componente de página:
```tsx
return (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    {/* Sin header manual - se maneja en EventTabsNavigation */}
    {/* Contenido de la página */}
  </div>
);
```

## 🎨 Colores Disponibles

```tsx
iconColor="blue"    // Azul para configuraciones/administración
iconColor="orange"  // Naranja para ventas/transacciones  
iconColor="green"   // Verde para cortesías/gratuito
iconColor="purple"  // Púrpura para reportes/analytics
iconColor="red"     // Rojo para alertas/eliminaciones
```

## ✅ Páginas Implementadas

- 🛒 **Boletos Vendidos**: Naranja + Actualizar + Exportar CSV
- 🎫 **Tipos de Boletos**: Azul + Actualizar + Nuevo Tipo  
- ⚙️ **Configuración**: Azul + Editar + Publicar/Despublicar

## 📝 Checklist de Implementación

- [ ] ✅ Detectar página en `EventTabsNavigation`
- [ ] ✅ Expandir context con nuevas acciones
- [ ] ✅ Agregar bloque condicional con `PageHeader`
- [ ] ✅ Configurar acciones en la página client
- [ ] ✅ Ajustar márgenes (`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8`)
- [ ] ✅ Quitar header manual de la página
- [ ] ✅ Probar botones funcionales
- [ ] ✅ Verificar responsive design

## 🚫 Errores Comunes

1. **Olvidar cerrar llaves**: Cada `if` debe cerrarse correctamente
2. **Context no configurado**: Asegurar que la página esté envuelta en `SalesPageProvider`
3. **Márgenes inconsistentes**: Usar siempre `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
4. **Cleanup del context**: Siempre limpiar acciones en `useEffect` cleanup

## 🔗 Archivos Clave

- `src/components/shared/PageHeader.tsx` - Componente base
- `src/contexts/SalesPageContext.tsx` - Context de comunicación
- `src/components/dashboard/EventTabsNavigation.tsx` - Router de headers
- `src/app/dashboard/eventos/[id]/layout.tsx` - Provider wrapper