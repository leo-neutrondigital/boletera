# 📚 Guía: Página Pública de Eventos (/events)

## 📋 Resumen
Documentación para crear una página pública de listado de eventos con diseño moderno, búsqueda, filtros y funcionalidad de destacados preparada.

## 🏗️ Estructura Creada

```
src/app/events/
├── page.tsx                    # RSC - Carga eventos con getUpcomingPublicEvents()
├── events-page-client.tsx      # Componente cliente con estado y filtros
└── components/
    ├── EventsHero.tsx          # Hero section con gradientes y estadísticas
    ├── EventsGrid.tsx          # Grid responsive con secciones destacados/normales
    ├── EventsFilters.tsx       # Filtros por fecha con UI moderna
    └── EventCard.tsx           # Card individual con precios y estados
```

## 🔧 APIs Utilizadas (sin modificar)
- `getUpcomingPublicEvents(50)` - Lista eventos públicos
- `getEventPricingSummary()` - Calcula rangos de precios por evento
- `isEventAvailableForPurchase()` - Valida disponibilidad del evento

## 🌟 Funcionalidad de Destacados PREPARADA

### Campo requerido:
```typescript
// Agregar a Event interface:
featured?: boolean; // true = destacado, false = normal
```

### Lógica ya implementada:
```typescript
// En events-page-client.tsx líneas 60-65:
const featured = filtered.filter(e => e.featured); // ← Activar cuando agregues campo
const regular = filtered.filter(e => !e.featured);

// Actualmente:
const featured: Event[] = []; // ← Cambiar por línea de arriba
const regular = filtered;     // ← Cambiar por línea de arriba
```

## 🎨 Características del Diseño

### Hero Section:
- Gradiente azul-púrpura con patrón de puntos
- Estadísticas ficticias (100+ eventos, 50K+ usuarios)
- CTAs a "Ver Eventos" y "Mis Boletos"
- SVG decorativo en la parte inferior

### Cards de Eventos:
- **Imagen placeholder** con gradiente y patrón SVG
- **Badges dinámicos**: Destacado, Hoy, Mañana, Esta semana
- **Precios en esquina**: Desde $X o Gratis
- **Info del evento**: Fecha formateada, ubicación, descripción
- **Estados**: Finalizado (opacity-75), Preregistro disponible
- **Botones**: Comprar Boletos / Preregistrarse / Ver Detalles

### Búsqueda y Filtros:
- Barra de búsqueda por nombre/descripción
- Filtro por ubicación
- Filtros por fecha: Todas, Hoy, Esta semana, Este mes
- Contador de resultados con botón "Limpiar filtros"

## ⚡ Solución a Error de Hidratación

### Problema:
```
Text content did not match. Server: "8/31/2025" Client: "31/8/2025"
```

### Solución implementada:
```typescript
// 1. Estado mounted para evitar SSR/client mismatch
const [mounted, setMounted] = useState(false);
useEffect(() => { setMounted(true); }, []);

// 2. Formateo client-side solamente
const getDisplayInfo = () => {
  if (!mounted) return { displayDate: '', ... }; // ← Valores por defecto
  
  // Formateo real solo después de montar
  const displayDate = start.toLocaleDateString('es-ES');
  return { displayDate, ... };
};

// 3. Render condicional con placeholder
{mounted ? (
  displayInfo.displayDate
) : (
  <span className="bg-gray-200 rounded w-24 h-4 animate-pulse"></span>
)}
```

## 🎯 Pasos para Implementar

### 1. Crear estructura de archivos:
```bash
mkdir -p src/app/events/components
```

### 2. Copiar archivos base:
- `page.tsx` - RSC que carga eventos
- `events-page-client.tsx` - Estado y lógica de filtros
- `components/*.tsx` - Componentes UI individuales

### 3. Verificar APIs disponibles:
- ✅ `getUpcomingPublicEvents()` en `/lib/api/public-events.ts`
- ✅ `getEventPricingSummary()` para rangos de precio
- ✅ `isEventAvailableForPurchase()` para validación

### 4. Activar destacados (opcional):
```typescript
// 1. Agregar campo a Event interface
featured?: boolean;

// 2. Descomentar líneas en events-page-client.tsx
const featured = filtered.filter(e => e.featured);
const regular = filtered.filter(e => !e.featured);
```

## 🔍 Componentes Clave

### EventCard.tsx - Props:
```typescript
interface EventCardProps {
  event: Event;
  featured?: boolean; // Cambia diseño y tamaño si es true
}
```

### EventsPageClient.tsx - Estados:
```typescript
const [searchTerm, setSearchTerm] = useState('');
const [locationFilter, setLocationFilter] = useState('');
const [dateFilter, setDateFilter] = useState<'all'|'today'|'week'|'month'>('all');
const [mounted, setMounted] = useState(false); // ← Previene hidration error
```

## 📱 Responsive Design

### Breakpoints:
- **Mobile**: Stack vertical, cards full-width
- **Tablet**: Grid 2 columnas en cards regulares
- **Desktop**: Grid 4 columnas regulares, 3 columnas destacados

### Hero responsive:
- **Mobile**: Estadísticas stack vertical
- **Desktop**: Estadísticas en 3 columnas

## 🚀 Resultado Final

### URL: `/events`
### Funcionalidades:
- ✅ Lista todos los eventos públicos
- ✅ Búsqueda por nombre/ubicación
- ✅ Filtros por fecha
- ✅ Cards con precios y estados dinámicos
- ✅ Responsive design completo
- ✅ Estados vacíos y de error
- 🌟 Sistema de destacados preparado (requiere 1 campo BD)

### Performance:
- SSR para SEO
- Client-side filtering (instantáneo)
- Sin hydration errors
- Loading states apropiados

## 🔗 Navegación
- Cards → `/events/${event.slug}` (página individual)
- Hero CTA → Scroll a eventos o `/my-tickets`
- Estados de botones según disponibilidad y preregistro

---
*Creado: Agosto 2025 | Patrón reutilizable para listados públicos*