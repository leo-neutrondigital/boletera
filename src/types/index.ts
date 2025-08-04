export type Event = {
  id: string;
  name: string;
  start_date: Date;
  end_date: Date;
  location: string;
  description?: string;
  internal_notes?: string;
  published: boolean;
  created_at?: Date;
  updated_at?: Date;
};

export type User = {
  uid: string;
  name: string;
  email?: string;
  roles: ("admin" | "gestor" | "comprobador" | "usuario")[];
  created_at?: Date;
};

export type TicketType = {
  id: string;
  event_id: string;
  name: string;              // "General", "VIP", "Estudiante"
  description?: string;       // Descripción pública
  price: number;             // Precio (se guarda como número decimal: 25.50)
  currency: "MXN" | "USD";   // Moneda
  
  // Control de acceso por días
  access_type: "all_days" | "specific_days" | "any_single_day";
  available_days?: Date[];   // Si es "specific_days"
  
  // Límites (opcionales)
  limit_per_user?: number;   // Máximo por usuario (null = sin límite)
  total_stock?: number;      // Stock total (null = ilimitado)
  sold_count: number;        // Vendidos hasta ahora
  
  // Estado y programación
  is_active: boolean;        // Disponible para venta
  sale_start?: Date;         // Cuándo inicia la venta
  sale_end?: Date;           // Cuándo termina la venta
  
  // 🆕 Cortesías
  is_courtesy?: boolean;     // Es cortesía (precio $0, no visible en front público)
  
  // Metadata
  sort_order: number;        // Orden de visualización
  created_at: Date;
  updated_at?: Date;
};

export type Ticket = {
  id: string;
  user_id: string;
  event_id: string;
  ticket_type_id: string;
  status: "pendiente" | "comprado" | "usado";
  qr_id: string;
  pdf_url?: string;
  dias_autorizados: Date[];
  dias_usados: Date[];
  created_at: Date;
};

// 🆕 Tipos para estadísticas
export type TicketTypeStats = {
  ticket_type_id: string;
  name: string;
  total_sold: number;
  total_revenue: number;
  currency: "MXN" | "USD";
  sales_by_day?: { date: string; count: number }[];
  is_courtesy?: boolean;
};

export type EventStats = {
  event_id: string;
  total_tickets_sold: number;
  total_revenue_mxn: number;
  total_revenue_usd: number;
  ticket_types: TicketTypeStats[];
};

// 🆕 Utilidades para fechas
export type EventDateInfo = {
  isMultiDay: boolean;
  duration: number;
  dateRange: string;
};

// 🆕 Breadcrumb
export type BreadcrumbItem = {
  label: string;
  href?: string;
  current?: boolean;
};
