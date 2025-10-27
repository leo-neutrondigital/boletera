# Plan de Implementación: Sistema de Ventas Offline

**Fecha:** 26 de octubre de 2025  
**Objetivo:** Integrar registro manual de ventas en el sistema existente de boletos vendidos  
**Enfoque:** Arquitectura modular para evitar sobrecargar componentes existentes  
**Estimación:** ~3.5 horas

---

## 📋 Índice

1. [Contexto y Decisiones](#contexto-y-decisiones)
2. [Arquitectura Modular](#arquitectura-modular)
3. [Plan de Implementación](#plan-de-implementación)
4. [Checklist de Validación](#checklist-de-validación)
5. [Deuda Técnica](#deuda-técnica)

---

## 🎯 Contexto y Decisiones

### Decisión Arquitectural

**Problema:** El componente `event-sales-page-client.tsx` ya tiene 783 líneas de código. Agregar ventas offline directamente lo sobrecarga.

**Solución:** Enfoque **aditivo y conservador**:
- ✅ NO modificamos lógica existente de 783 líneas
- ✅ Solo agregamos ~20 líneas al componente principal
- ✅ Toda la lógica nueva va en componentes independientes
- ✅ Respetamos sistema de cache existente (DataCacheContext)
- ✅ Seguimos patrones establecidos (hooks, TTL, invalidación)

**Arquitectura del Sistema de Cache (Respetada):**
```
DataCacheContext
  ├─ courtesyOrders (existente)
  ├─ events (existente)
  ├─ users (existente)
  ├─ ticketTypes (existente)
  └─ offlineSales (🆕 nuevo, siguiendo mismo patrón)

Cache Pattern:
- TTL: 5 minutos
- Background refresh: 2 minutos
- Validación: isCacheValid()
- Invalidación granular por recurso
```

**Beneficios:**
- ✅ Integración no invasiva con cache existente
- ✅ No duplicamos lógica de carga/invalidación
- ✅ Reutilizamos patrones probados
- ✅ Fácil rollback si algo falla
- ✅ Testing aislado de nueva funcionalidad

---

## 🏗️ Arquitectura Modular

### Estructura de Archivos

```
src/app/dashboard/eventos/[id]/boletos-vendidos/
├── page.tsx                                    (sin cambios)
├── event-sales-page-client.tsx                 (refactor ligero: 783→200 líneas)
│
├── components/
│   ├── tabs/
│   │   ├── OnlineSalesTab.tsx                  (🆕 extraer lógica existente)
│   │   ├── OfflineSalesTab.tsx                 (🆕 nuevo módulo)
│   │   ├── CourtesiesTab.tsx                   (🆕 extraer lógica existente)
│   │   └── AllSalesTab.tsx                     (🆕 extraer lógica existente)
│   │
│   ├── offline/
│   │   ├── CreateOfflineSaleDialog.tsx         (🆕 modal de creación)
│   │   ├── OfflineSaleCard.tsx                 (🆕 card de venta offline)
│   │   ├── OfflineSalesStats.tsx               (🆕 estadísticas)
│   │   └── OfflineSalesFilters.tsx             (🆕 filtros específicos)
│   │
│   └── shared/
│       ├── SalesHeader.tsx                     (🆕 header con botones)
│       ├── SalesTabs.tsx                       (🆕 navegación de tabs)
│       └── ExportButton.tsx                    (🆕 exportar CSV)
│
├── hooks/
│   └── use-offline-sales.ts                    (🆕 hook especializado)
│
└── types/
    └── offline-sales.ts                        (🆕 tipos específicos)
```

---

## 📝 Plan de Implementación

### FASE 1: Backend y Datos (30 min)

#### 1.1. Crear API de Ventas Offline

**Archivo:** `src/app/api/admin/offline-sales/route.ts`

```typescript
// POST /api/admin/offline-sales
interface CreateOfflineSaleRequest {
  eventId: string;
  ticketTypeId: string;
  attendeeEmail: string;
  attendeeName: string;
  attendeePhone?: string;
  amount_paid: number;              // 🆕 Monto real
  payment_method: string;           // 🆕 'cash' | 'transfer' | 'card' | 'other'
  payment_reference?: string;       // 🆕 Referencia o comprobante
  sale_date: Date;                  // 🆕 Fecha de venta real
  notes?: string;
  quantity: number;
  sendEmail?: boolean;
  autoLink?: boolean;
}

// Validaciones:
- amount_paid > 0
- payment_method requerido
- sale_date <= now()
- quantity: 1-10

// Genera tickets con:
{
  is_courtesy: false,
  is_manual_sale: true,           // 🆕 Flag identificador
  amount_paid: number,
  payment_method: string,
  payment_reference: string,
  sale_date: Timestamp,
  manual_sale_notes: string,
  order_id: 'offline_sale_123456'
}
```

**Archivo:** `src/app/api/admin/offline-sales/[orderId]/route.ts`

```typescript
// GET /api/admin/offline-sales/[orderId]
- Obtener orden específica con tickets

// DELETE /api/admin/offline-sales/[orderId]
- Eliminar orden (solo admin)
- Soft delete: marcar como cancelled
```

**Checklist:**
- [ ] Crear `route.ts` principal con POST
- [ ] Validar campos requeridos
- [ ] Generar order_id único
- [ ] Crear tickets en batch con flags correctos
- [ ] Logs de auditoría (created_by)
- [ ] Endpoint DELETE con permisos

---

#### 1.2. Actualizar Types

**Archivo:** `src/types/index.ts`

```typescript
// Agregar a Ticket existente
export interface Ticket {
  // ... campos existentes
  is_manual_sale?: boolean;         // 🆕
  payment_method?: string;          // 🆕
  payment_reference?: string;       // 🆕
  sale_date?: Date;                 // 🆕
  manual_sale_notes?: string;       // 🆕
}

// 🆕 Tipo para método de pago
export type PaymentMethod = 
  | 'cash'          // Efectivo
  | 'transfer'      // Transferencia
  | 'card'          // Tarjeta
  | 'other';        // Otro

// 🆕 Interface para orden offline
export interface OfflineSaleOrder {
  order_id: string;
  event_id: string;
  tickets: Ticket[];
  total_tickets: number;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_reference?: string;
  sale_date: Date;
  customer_name: string;
  customer_email: string;
  created_by: string;
  created_at: Date;
}
```

**Archivo:** `src/app/dashboard/eventos/[id]/boletos-vendidos/types/offline-sales.ts`

```typescript
export interface OfflineSalesStats {
  total_revenue: number;
  total_tickets: number;
  total_orders: number;
  by_payment_method: Record<PaymentMethod, number>;
  currency: string;
}

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Efectivo', icon: '💵' },
  { value: 'transfer', label: 'Transferencia', icon: '🏦' },
  { value: 'card', label: 'Tarjeta', icon: '💳' },
  { value: 'other', label: 'Otro', icon: '📋' }
] as const;
```

**Checklist:**
- [ ] Actualizar interface Ticket
- [ ] Crear type PaymentMethod
- [ ] Crear interface OfflineSaleOrder
- [ ] Crear archivo types/offline-sales.ts
- [ ] Documentar nuevos campos

---

### FASE 2: Cache y Hooks (20 min)

#### 2.1. Extender DataCacheContext

**Archivo:** `src/contexts/DataCacheContext.tsx`

```typescript
// Agregar al context:
interface DataCacheContextType {
  // ... existentes
  
  // 🆕 Offline Sales
  offlineSales: OfflineSaleOrder[];
  offlineSalesLoading: boolean;
  offlineSalesStats: OfflineSalesStats | null;
  loadOfflineSales: (eventId: string, force?: boolean) => Promise<void>;
  invalidateOfflineSales: (eventId?: string) => void;
}

// Implementar cache con TTL de 5 minutos
const CACHE_TTL = 5 * 60 * 1000;

// Función de carga
const loadOfflineSales = async (eventId: string, force = false) => {
  const cacheKey = `offlineSales_${eventId}`;
  
  // Verificar cache
  if (!force && cache[cacheKey] && !isCacheExpired(cacheKey)) {
    return;
  }
  
  setOfflineSalesLoading(true);
  
  try {
    const response = await authenticatedGet(
      `/api/admin/offline-sales?eventId=${eventId}`
    );
    const data = await response.json();
    
    setOfflineSales(data.orders);
    setOfflineSalesStats(data.stats);
    
    // Actualizar cache
    cache[cacheKey] = {
      data: data.orders,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('[Cache] Error loading offline sales:', error);
  } finally {
    setOfflineSalesLoading(false);
  }
};
```

**Checklist:**
- [ ] Agregar estado para offline sales
- [ ] Implementar loadOfflineSales con cache
- [ ] Implementar invalidateOfflineSales
- [ ] Calcular stats automáticamente
- [ ] Manejar errores correctamente

---

#### 2.2. Hook Especializado

**Archivo:** `src/app/dashboard/eventos/[id]/boletos-vendidos/hooks/use-offline-sales.ts`

```typescript
import { useDataCache } from '@/contexts/DataCacheContext';
import { useEffect, useMemo } from 'react';

export function useOfflineSales(eventId: string) {
  const {
    offlineSales,
    offlineSalesLoading,
    offlineSalesStats,
    loadOfflineSales,
    invalidateOfflineSales
  } = useDataCache();

  // Auto-cargar al montar
  useEffect(() => {
    if (eventId) {
      loadOfflineSales(eventId);
    }
  }, [eventId, loadOfflineSales]);

  // Función de refresh
  const refresh = async () => {
    invalidateOfflineSales(eventId);
    await loadOfflineSales(eventId, true);
  };

  // Filtrar por evento
  const eventOfflineSales = useMemo(() => {
    return offlineSales.filter(order => order.event_id === eventId);
  }, [offlineSales, eventId]);

  return {
    offlineSales: eventOfflineSales,
    loading: offlineSalesLoading,
    stats: offlineSalesStats,
    refresh,
    invalidate: () => invalidateOfflineSales(eventId)
  };
}
```

**Checklist:**
- [ ] Crear hook con auto-carga
- [ ] Filtrar por eventId
- [ ] Implementar refresh
- [ ] Exponer invalidate
- [ ] Manejar loading states

---

### FASE 3: Componentes UI Modulares (60 min)

#### 3.1. Modal de Creación

**Archivo:** `src/app/dashboard/eventos/[id]/boletos-vendidos/components/offline/CreateOfflineSaleDialog.tsx`

```tsx
interface CreateOfflineSaleDialogProps {
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Estructura similar a CreateCourtesyDialog pero:
// - Sin dropdown de courtesy_type
// + Campo: amount_paid (número, validado)
// + Dropdown: payment_method
// + Campo: payment_reference (opcional)
// + DatePicker: sale_date (max: hoy)
// + Calculadora automática: cantidad × precio = total

export function CreateOfflineSaleDialog({
  eventId,
  isOpen,
  onClose,
  onSuccess
}: CreateOfflineSaleDialogProps) {
  // Estados del formulario
  const [form, setForm] = useState({
    ticketTypeId: '',
    attendeeName: '',
    attendeeEmail: '',
    attendeePhone: '',
    amount_paid: 0,
    payment_method: '',
    payment_reference: '',
    sale_date: new Date(),
    quantity: 1,
    notes: '',
    sendEmail: true
  });

  // Validaciones
  const validateForm = () => {
    if (form.amount_paid <= 0) return false;
    if (!form.payment_method) return false;
    if (!form.attendeeEmail.includes('@')) return false;
    return true;
  };

  // Submit
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    await fetch('/api/admin/offline-sales', {
      method: 'POST',
      body: JSON.stringify({ eventId, ...form })
    });
    
    onSuccess();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* Form fields aquí */}
    </Dialog>
  );
}
```

**Checklist:**
- [ ] Crear componente base
- [ ] Formulario con todos los campos
- [ ] Validaciones en tiempo real
- [ ] Calculadora de total
- [ ] Búsqueda de usuario por email (reutilizar)
- [ ] Manejo de errores
- [ ] Loading states

---

#### 3.2. Tab de Ventas Offline

**Archivo:** `src/app/dashboard/eventos/[id]/boletos-vendidos/components/tabs/OfflineSalesTab.tsx`

```tsx
interface OfflineSalesTabProps {
  eventId: string;
  searchTerm: string;
}

export function OfflineSalesTab({ eventId, searchTerm }: OfflineSalesTabProps) {
  const { offlineSales, loading, stats } = useOfflineSales(eventId);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Filtrar por búsqueda
  const filtered = useMemo(() => {
    return offlineSales.filter(order =>
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.payment_reference?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [offlineSales, searchTerm]);

  // Paginación
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  if (loading) return <Skeleton />;

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <OfflineSalesStats stats={stats} />
      
      {/* Lista de órdenes */}
      <div className="space-y-4">
        {paginated.map(order => (
          <OfflineSaleCard key={order.order_id} order={order} />
        ))}
      </div>
      
      {/* Paginación */}
      <PaginationControls
        currentPage={currentPage}
        totalPages={Math.ceil(filtered.length / ITEMS_PER_PAGE)}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
```

**Checklist:**
- [ ] Crear componente tab
- [ ] Integrar hook useOfflineSales
- [ ] Implementar filtros
- [ ] Implementar paginación
- [ ] Mostrar stats
- [ ] Loading y empty states

---

#### 3.3. Card de Venta Offline

**Archivo:** `src/app/dashboard/eventos/[id]/boletos-vendidos/components/offline/OfflineSaleCard.tsx`

```tsx
interface OfflineSaleCardProps {
  order: OfflineSaleOrder;
}

export function OfflineSaleCard({ order }: OfflineSaleCardProps) {
  const paymentMethodInfo = PAYMENT_METHODS.find(
    m => m.value === order.payment_method
  );

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            {/* Badge: VENTA OFFLINE */}
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              💰 Venta Offline
            </Badge>
            
            {/* Cliente */}
            <div>
              <h3 className="font-semibold">{order.customer_name}</h3>
              <p className="text-sm text-gray-600">{order.customer_email}</p>
            </div>
            
            {/* Detalles de venta */}
            <div className="flex items-center gap-4 text-sm">
              <span>{order.total_tickets} boletos</span>
              <span className="font-semibold">
                {formatCurrency(order.total_amount, order.currency)}
              </span>
              <div className="flex items-center gap-1">
                {paymentMethodInfo?.icon}
                <span>{paymentMethodInfo?.label}</span>
              </div>
            </div>
            
            {/* Referencia si existe */}
            {order.payment_reference && (
              <p className="text-xs text-gray-500">
                Ref: {order.payment_reference}
              </p>
            )}
            
            {/* Fecha */}
            <p className="text-xs text-gray-500">
              {format(order.sale_date, "d MMM yyyy HH:mm")}
            </p>
          </div>
          
          {/* Botón Ver */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.href = `/dashboard/ventas/orden-offline/${order.order_id}`}
          >
            Ver <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Checklist:**
- [ ] Crear card component
- [ ] Badge identificador
- [ ] Mostrar info de pago
- [ ] Formatear moneda
- [ ] Link a detalle
- [ ] Responsive design

---

#### 3.4. Stats de Ventas Offline

**Archivo:** `src/app/dashboard/eventos/[id]/boletos-vendidos/components/offline/OfflineSalesStats.tsx`

```tsx
interface OfflineSalesStatsProps {
  stats: OfflineSalesStats | null;
}

export function OfflineSalesStats({ stats }: OfflineSalesStatsProps) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Total Ingresos */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Ingresos Offline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(stats.total_revenue, stats.currency)}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {stats.total_orders} ventas
          </p>
        </CardContent>
      </Card>
      
      {/* Total Boletos */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Boletos Vendidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.total_tickets}
          </div>
        </CardContent>
      </Card>
      
      {/* Desglose por método */}
      {Object.entries(stats.by_payment_method).map(([method, amount]) => {
        const methodInfo = PAYMENT_METHODS.find(m => m.value === method);
        return (
          <Card key={method}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {methodInfo?.icon} {methodInfo?.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(amount, stats.currency)}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
```

**Checklist:**
- [ ] Crear stats component
- [ ] Cards para métricas
- [ ] Desglose por método de pago
- [ ] Formateo de moneda
- [ ] Responsive grid

---

### FASE 4: Integración Modular (40 min)

#### 4.1. Refactor del Orquestador

**Archivo:** `src/app/dashboard/eventos/[id]/boletos-vendidos/event-sales-page-client.tsx`

**Antes (783 líneas):**
```tsx
export function EventSalesPageClient({ event }: EventSalesPageClientProps) {
  // 783 líneas de lógica mezclada
  // - Tabs hardcodeados
  // - Lógica de ventas, cortesías, filtros, etc.
  // - Export CSV
}
```

**Después (~200 líneas):**
```tsx
export function EventSalesPageClient({ event }: EventSalesPageClientProps) {
  const [activeTab, setActiveTab] = useState<TabId>('online');
  const [searchTerm, setSearchTerm] = useState('');
  const [showOfflineDialog, setShowOfflineDialog] = useState(false);
  
  // Hooks modulares
  const onlineSales = useOnlineSales(event.id);
  const offlineSales = useOfflineSales(event.id);
  const courtesies = useCourtesyTickets(event.id);

  return (
    <div className="space-y-6">
      {/* Header con acciones */}
      <SalesHeader
        event={event}
        onExport={handleExport}
        onCreateOfflineSale={() => setShowOfflineDialog(true)}
      />
      
      {/* Tabs de navegación */}
      <SalesTabs activeTab={activeTab} onTabChange={setActiveTab} />
      
      {/* Búsqueda global */}
      <Input
        placeholder="Buscar por nombre, email..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      
      {/* Render del tab activo */}
      {activeTab === 'online' && (
        <OnlineSalesTab eventId={event.id} searchTerm={searchTerm} />
      )}
      
      {activeTab === 'offline' && (
        <OfflineSalesTab eventId={event.id} searchTerm={searchTerm} />
      )}
      
      {activeTab === 'courtesies' && (
        <CourtesiesTab eventId={event.id} searchTerm={searchTerm} />
      )}
      
      {activeTab === 'all' && (
        <AllSalesTab
          eventId={event.id}
          searchTerm={searchTerm}
          onlineSales={onlineSales}
          offlineSales={offlineSales}
          courtesies={courtesies}
        />
      )}
      
      {/* Dialog de creación */}
      <CreateOfflineSaleDialog
        eventId={event.id}
        isOpen={showOfflineDialog}
        onClose={() => setShowOfflineDialog(false)}
        onSuccess={() => {
          setShowOfflineDialog(false);
          offlineSales.refresh();
        }}
      />
    </div>
  );
}
```

**Beneficios:**
- ✅ Orquestador pasa de 783 → ~200 líneas
- ✅ Cada tab es independiente y testeable
- ✅ Agregar nuevo tab = agregar 1 componente, no modificar lógica central
- ✅ Hooks modulares por funcionalidad

**Checklist:**
- [ ] Crear componente SalesHeader
- [ ] Crear componente SalesTabs
- [ ] Extraer OnlineSalesTab (código existente)
- [ ] Extraer CourtesiesTab (código existente)
- [ ] Extraer AllSalesTab (código existente)
- [ ] Integrar OfflineSalesTab nuevo
- [ ] Reducir archivo principal a orquestador simple

---

#### 4.2. Header con Botones

**Archivo:** `src/app/dashboard/eventos/[id]/boletos-vendidos/components/shared/SalesHeader.tsx`

```tsx
interface SalesHeaderProps {
  event: Event;
  onExport: () => void;
  onCreateOfflineSale: () => void;
}

export function SalesHeader({
  event,
  onExport,
  onCreateOfflineSale
}: SalesHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">🎫 Boletos Vendidos</h1>
        <p className="text-gray-600">{event.name}</p>
      </div>
      
      <div className="flex gap-2">
        <Can action="export" resource="sales">
          <Button variant="outline" onClick={onExport}>
            📥 Exportar CSV
          </Button>
        </Can>
        
        <Can action="create" resource="offline-sales">
          <Button onClick={onCreateOfflineSale}>
            + Registrar Venta Offline
          </Button>
        </Can>
      </div>
    </div>
  );
}
```

**Checklist:**
- [ ] Crear header component
- [ ] Botón export CSV
- [ ] Botón crear venta offline
- [ ] Permisos con Can
- [ ] Responsive design

---

#### 4.3. Navegación de Tabs

**Archivo:** `src/app/dashboard/eventos/[id]/boletos-vendidos/components/shared/SalesTabs.tsx`

```tsx
type TabId = 'online' | 'offline' | 'courtesies' | 'all';

interface Tab {
  id: TabId;
  label: string;
  icon: LucideIcon;
}

const TABS: Tab[] = [
  { id: 'online', label: 'Ventas Online', icon: CreditCard },
  { id: 'offline', label: 'Ventas Offline', icon: Banknote },
  { id: 'courtesies', label: 'Cortesías', icon: Gift },
  { id: 'all', label: 'Todos', icon: List }
];

interface SalesTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function SalesTabs({ activeTab, onTabChange }: SalesTabsProps) {
  return (
    <div className="border-b">
      <div className="flex gap-4">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 border-b-2 transition',
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

**Checklist:**
- [ ] Crear tabs component
- [ ] Definir tipos TabId
- [ ] Estados activo/inactivo
- [ ] Iconos por tab
- [ ] Responsive

---

### FASE 5: Vista de Detalle (30 min)

#### 5.1. Página de Orden Offline

**Archivo:** `src/app/dashboard/ventas/orden-offline/[orderId]/page.tsx`

```tsx
interface OfflineOrderPageProps {
  params: { orderId: string };
  searchParams: { eventId?: string };
}

export default function OfflineOrderPage({ params, searchParams }: OfflineOrderPageProps) {
  return (
    <OfflineOrderDetail
      orderId={params.orderId}
      eventId={searchParams.eventId}
    />
  );
}
```

**Archivo:** `src/app/dashboard/ventas/orden-offline/[orderId]/components/OfflineOrderDetail.tsx`

```tsx
interface OfflineOrderDetailProps {
  orderId: string;
  eventId?: string;
}

export function OfflineOrderDetail({ orderId, eventId }: OfflineOrderDetailProps) {
  const [order, setOrder] = useState<OfflineSaleOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    const response = await authenticatedGet(`/api/admin/offline-sales/${orderId}`);
    const data = await response.json();
    setOrder(data.order);
    setLoading(false);
  };

  if (loading) return <Skeleton />;
  if (!order) return <NotFound />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Badge className="mb-2">💰 Venta Offline</Badge>
          <h1 className="text-2xl font-bold">Orden #{order.order_id}</h1>
        </div>
        
        <Can action="delete" resource="offline-sales">
          <Button variant="destructive" onClick={handleDelete}>
            Eliminar Venta
          </Button>
        </Can>
      </div>
      
      {/* Información de pago */}
      <Card>
        <CardHeader>
          <CardTitle>💳 Información de Pago</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Método de Pago</p>
              <p className="font-semibold">{getPaymentMethodLabel(order.payment_method)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Monto Total</p>
              <p className="font-semibold">{formatCurrency(order.total_amount, order.currency)}</p>
            </div>
            {order.payment_reference && (
              <div>
                <p className="text-sm text-gray-600">Referencia</p>
                <p className="font-semibold">{order.payment_reference}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600">Fecha de Venta</p>
              <p className="font-semibold">{format(order.sale_date, "d MMMM yyyy HH:mm")}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Cliente */}
      <Card>
        <CardHeader>
          <CardTitle>👤 Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <p className="font-semibold">{order.customer_name}</p>
            <p className="text-sm text-gray-600">{order.customer_email}</p>
          </div>
        </CardContent>
      </Card>
      
      {/* Boletos */}
      <Card>
        <CardHeader>
          <CardTitle>🎫 Boletos ({order.total_tickets})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {order.tickets.map(ticket => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>ℹ️ Información de Registro</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-1">
            <p>Registrado por: {order.created_by}</p>
            <p>Fecha de registro: {format(order.created_at, "d MMMM yyyy HH:mm")}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Checklist:**
- [ ] Crear página de detalle
- [ ] Mostrar info de pago completa
- [ ] Mostrar cliente
- [ ] Listar boletos
- [ ] Botón eliminar (solo admin)
- [ ] Breadcrumb de navegación

---

### FASE 6: Reportes y Export (20 min)

#### 6.1. Actualizar Export CSV

**Archivo:** `src/app/dashboard/eventos/[id]/boletos-vendidos/utils/export-csv.ts`

```typescript
export async function exportSalesCSV(eventId: string) {
  // Obtener TODOS los datos (online, offline, cortesías)
  const response = await authenticatedGet(
    `/api/admin/events/${eventId}/sales?include=all`
  );
  const data = await response.json();
  
  // Headers actualizados
  const headers = [
    'Tipo Venta',          // 🆕 Online/Offline/Cortesía
    'ID Boleto',
    'ID Orden',
    'Cliente',
    'Email',
    'Asistente',
    'Tipo de Boleto',
    'Estado',
    'Monto',
    'Moneda',
    'Método Pago',         // 🆕
    'Referencia Pago',     // 🆕
    'Fecha Compra',
    'Fecha Venta Real',    // 🆕 Para offline
    'Fecha Uso'
  ];
  
  // Procesar filas
  const rows = [];
  
  // Ventas online
  data.online.forEach(order => {
    order.tickets.forEach(ticket => {
      rows.push([
        'Online',
        ticket.id,
        order.order_id,
        order.customer_name,
        order.customer_email,
        ticket.attendee_name,
        ticket.ticket_type_name,
        ticket.status,
        ticket.amount_paid,
        ticket.currency,
        'Stripe',
        order.payment_intent_id,
        format(order.created_at, 'yyyy-MM-dd HH:mm'),
        '', // No aplica fecha venta real
        ticket.used_days.length > 0 ? ticket.used_days[0] : ''
      ]);
    });
  });
  
  // Ventas offline 🆕
  data.offline.forEach(order => {
    order.tickets.forEach(ticket => {
      rows.push([
        'Offline',
        ticket.id,
        order.order_id,
        order.customer_name,
        order.customer_email,
        ticket.attendee_name,
        ticket.ticket_type_name,
        ticket.status,
        ticket.amount_paid,
        ticket.currency,
        getPaymentMethodLabel(order.payment_method),
        order.payment_reference || '',
        format(order.created_at, 'yyyy-MM-dd HH:mm'),
        format(order.sale_date, 'yyyy-MM-dd HH:mm'), // 🆕
        ticket.used_days.length > 0 ? ticket.used_days[0] : ''
      ]);
    });
  });
  
  // Cortesías
  data.courtesies.forEach(order => {
    order.tickets.forEach(ticket => {
      rows.push([
        'Cortesía',
        ticket.id,
        order.order_id,
        order.customer_name,
        order.customer_email,
        ticket.attendee_name,
        ticket.ticket_type_name,
        ticket.status,
        0,
        ticket.currency,
        'N/A',
        '',
        format(order.created_at, 'yyyy-MM-dd HH:mm'),
        '',
        ticket.used_days.length > 0 ? ticket.used_days[0] : ''
      ]);
    });
  });
  
  // Generar CSV
  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
  
  // Descargar
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ventas_${eventId}_${Date.now()}.csv`;
  a.click();
}
```

**Checklist:**
- [ ] Actualizar headers CSV
- [ ] Incluir columnas offline
- [ ] Diferenciar tipo de venta
- [ ] Incluir método y referencia de pago
- [ ] Incluir fecha de venta real
- [ ] Validar con datos de prueba

---

### FASE 7: Testing (30 min)

#### 7.1. Tests Funcionales

**Checklist:**
- [ ] **Crear venta offline:**
  - Seleccionar evento
  - Seleccionar tipo de boleto
  - Llenar datos del cliente
  - Ingresar monto y método de pago
  - Verificar validaciones
  - Guardar exitosamente
  
- [ ] **Visualización:**
  - Aparece en tab "Ventas Offline"
  - Aparece en tab "Todos"
  - NO aparece en "Ventas Online"
  - Stats se actualizan correctamente
  
- [ ] **Búsqueda y filtros:**
  - Buscar por nombre del cliente
  - Buscar por email
  - Buscar por referencia de pago
  - Filtros cross-tabs funcionan
  
- [ ] **Export CSV:**
  - Incluye ventas offline
  - Columnas correctas
  - Datos formateados correctamente
  
- [ ] **Vista de detalle:**
  - Muestra info completa
  - Botón eliminar funciona (admin)
  - Navegación breadcrumb funciona
  
- [ ] **Permisos:**
  - Admin: puede crear y eliminar
  - Gestor: puede crear (solo su evento)
  - Comprobador: solo lectura

---

#### 7.2. Tests de Validación

**Checklist:**
- [ ] Monto = 0 → Rechazar
- [ ] Monto negativo → Rechazar
- [ ] Método de pago vacío → Rechazar
- [ ] Email inválido → Rechazar
- [ ] Cantidad < 1 o > 10 → Rechazar
- [ ] Evento inexistente → Rechazar
- [ ] Fecha venta futura → Rechazar
- [ ] Tipo de boleto inactivo → Advertencia

---

### FASE 8: Documentación (15 min)

**Checklist:**
- [ ] Actualizar README con sección de ventas offline
- [ ] Documentar campos nuevos en types
- [ ] Crear guía de uso para admins
- [ ] Documentar permisos y roles
- [ ] Comentar código complejo

---

## ✅ Checklist de Validación Final

### Backend
- [ ] API POST `/admin/offline-sales` funciona
- [ ] API GET `/admin/offline-sales/[orderId]` funciona
- [ ] API DELETE `/admin/offline-sales/[orderId]` funciona
- [ ] Validaciones de campos implementadas
- [ ] Logs de auditoría funcionan
- [ ] Permisos por rol funcionan

### Frontend
- [ ] Tab "Ventas Offline" visible y funcional
- [ ] Botón "+ Registrar Venta Offline" funciona
- [ ] Dialog de creación valida correctamente
- [ ] Stats se calculan y muestran correctamente
- [ ] Búsqueda funciona en ventas offline
- [ ] Paginación funciona
- [ ] Vista de detalle muestra info completa
- [ ] Export CSV incluye ventas offline

### Integración
- [ ] Cache se invalida correctamente
- [ ] Hook useOfflineSales funciona
- [ ] Componentes modulares no rompen existentes
- [ ] Navegación entre tabs fluida
- [ ] Loading states correctos

### UX
- [ ] Mensajes de error claros
- [ ] Confirmaciones de éxito
- [ ] Loading spinners en operaciones async
- [ ] Responsive en mobile
- [ ] Accesibilidad (ARIA labels)

---

## 🔧 Deuda Técnica

### Para Futuro Refactoring (NO en este plan)

1. **Extraer lógica de ventas online existente** (783 líneas)
   - Crear `OnlineSalesTab.tsx`
   - Extraer lógica de filtros
   - Extraer componentes de cards
   - **Estimación:** 2-3 horas
   - **Prioridad:** Media

2. **Extraer lógica de cortesías existente**
   - Crear `CourtesiesTab.tsx`
   - Unificar con nueva arquitectura modular
   - **Estimación:** 1-2 horas
   - **Prioridad:** Media

3. **Unificar sistema de filtros**
   - Crear `SalesFilters.tsx` genérico
   - Reutilizar en todos los tabs
   - **Estimación:** 1 hora
   - **Prioridad:** Baja

4. **Optimizar export CSV**
   - Mover lógica a backend
   - Streaming para grandes volúmenes
   - **Estimación:** 2 horas
   - **Prioridad:** Baja

5. **Agregar tests automatizados**
   - Unit tests para hooks
   - Integration tests para API
   - E2E tests con Playwright
   - **Estimación:** 4-6 horas
   - **Prioridad:** Alta (pero post-MVP)

---

## 📈 Métricas de Éxito

### Funcionales
- ✅ Admin puede registrar ventas offline en < 2 minutos
- ✅ Stats se actualizan en tiempo real (< 2 segundos)
- ✅ Export CSV incluye todas las fuentes correctamente
- ✅ 0 errores de validación que bloqueen al usuario

### Técnicas
- ✅ Archivo principal reducido de 783 → ~200 líneas
- ✅ Componentes modulares < 150 líneas cada uno
- ✅ API responde en < 500ms
- ✅ Cache TTL de 5 minutos funciona correctamente

### UX
- ✅ 0 quejas de usuarios sobre complejidad
- ✅ Flujo intuitivo sin necesidad de documentación
- ✅ Responsive en mobile y tablet
- ✅ Accesible para lectores de pantalla

---

## 🚀 Próximos Pasos

1. **Revisión del plan** con el equipo
2. **Aprobación** de arquitectura modular
3. **Inicio de implementación** por fases
4. **Testing incremental** después de cada fase
5. **Deploy gradual** con feature flag (opcional)
6. **Monitoreo** de uso y errores
7. **Iteración** basada en feedback

---

## 📝 Notas Finales

- **Enfoque modular:** Prioriza no tocar código existente que funciona
- **Incremental:** Cada fase es funcional y desplegable
- **Testeable:** Componentes pequeños fáciles de probar
- **Escalable:** Agregar más tabs no requiere refactoring
- **Deuda controlada:** Documentada y priorizada para futuro

---

**Última actualización:** 26 de octubre de 2025  
**Estado:** Pendiente de aprobación e implementación  
**Estimación total:** ~3.5 horas  
**Prioridad:** Alta
