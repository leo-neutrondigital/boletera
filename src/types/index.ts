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
  
  // 🆕 Campos para carrito de compras
  slug: string;                    // URL amigable (/events/mi-evento-2024)
  allow_preregistration: boolean;  // Permite prerregistro
  preregistration_message?: string; // Mensaje personalizado para prerregistro
  public_description: string;      // Descripción para página pública
  featured_image_url?: string;     // Imagen principal del evento
  terms_and_conditions?: string;   // Términos específicos del evento
  contact_email?: string;          // Email de contacto para dudas
};

export type User = {
  uid: string;
  name: string;
  email?: string;
  roles: ("admin" | "gestor" | "comprobador" | "usuario")[];
  created_at?: Date;
  
  // 🆕 Campos para compradores
  phone?: string;
  company?: string;
  address?: {
    city: string;
    country: string;
  };
  marketing_consent: boolean;      // Consentió recibir marketing
  created_via: 'admin' | 'preregistration' | 'purchase'; // Cómo se creó la cuenta
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
  
  // 🆕 Campos para público
  public_description?: string; // Descripción detallada para compradores
  features?: string[];        // Características incluidas en el boleto
  terms?: string;            // Términos específicos de este tipo
  
  // Metadata
  sort_order: number;        // Orden de visualización
  created_at: Date;
  updated_at?: Date;
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

// ============================================================================
// 🛒 NUEVAS COLLECTIONS PARA CARRITO DE COMPRAS
// ============================================================================

// 📝 Prerregistros de usuarios a eventos
export type Preregistration = {
  id: string;
  user_id: string;          // Referencia a users
  event_id: string;         // Referencia a events
  status: 'active' | 'converted_to_purchase';
  source: 'landing_page' | 'admin_import';
  created_at: Date;
  converted_at?: Date;      // Cuándo se convirtió en compra
};

// 🛒 Items individuales del carrito
export type CartItem = {
  ticket_type_id: string;   // Referencia a ticket_types
  ticket_type_name: string; // Cache del nombre para UI
  quantity: number;
  unit_price: number;       // Precio individual
  total_price: number;      // quantity * unit_price
  currency: 'MXN' | 'USD';
  
  // Para boletos de días específicos
  selected_days?: Date[];   // Si access_type = 'specific_days'
  
  // Para boletos personalizables
  attendee_info?: {
    name: string;
    email: string;
    company?: string;
  }[];
};

// 🛒 Carrito temporal (se guarda solo en checkout)
export type Cart = {
  id: string;
  user_id: string;          // Usuario propietario
  event_id: string;         // Un carrito por evento
  items: CartItem[];
  total_amount: number;     // Suma de todos los items
  currency: 'MXN' | 'USD'; // Moneda predominante
  expires_at: Date;         // Auto-limpieza (30 minutos)
  created_at: Date;
};

// 🧾 Orden de compra (post-PayPal)
export type Order = {
  id: string;
  user_id: string;          // Comprador
  event_id: string;         // Evento
  cart_snapshot: Cart;      // Snapshot del carrito al momento de compra
  
  // Estado de la orden
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  
  // Información de pago
  payment_provider: 'paypal';
  payment_id: string;       // PayPal transaction ID
  payment_details: any;     // Datos completos del webhook
  
  // Totales
  total_amount: number;
  currency: 'MXN' | 'USD';
  
  // Timestamps
  created_at: Date;
  paid_at?: Date;
};

// 🎫 Boleto individual generado (post-pago)
export type Ticket = {
  id: string;
  order_id: string;         // Referencia a orders
  user_id: string;          // Propietario
  event_id: string;         // Evento
  ticket_type_id: string;   // Tipo de boleto
  
  // Información del asistente (puede ser diferente al comprador)
  attendee_name: string;
  attendee_email: string;
  attendee_company?: string;
  
  // Estado del boleto
  status: 'active' | 'used' | 'cancelled';
  
  // Validación
  qr_code: string;          // Código QR único
  pdf_url: string;          // URL del PDF en Firebase Storage
  
  // Control de acceso por días
  access_days: Date[];      // Días autorizados para ingresar
  used_days: Date[];        // Días ya utilizados
  
  // Timestamps
  created_at: Date;
  last_validated_at?: Date; // Última vez que se escaneó
};

// ============================================================================
// 🔧 TIPOS AUXILIARES PARA EL CARRITO
// ============================================================================

// Estado del carrito en sessionStorage
export type SessionCart = {
  event_id: string;
  items: CartItem[];
  last_modified: Date;
};

// Configuración de PayPal
export type PayPalConfig = {
  client_id: string;
  currency: 'MXN' | 'USD';
  intent: 'capture';
};

// Respuesta de PayPal
export type PayPalOrderResponse = {
  id: string;
  status: string;
  payment_source?: any;
  purchase_units: any[];
};

// Datos para generar PDF
export type TicketPDFData = {
  ticket: Ticket;
  event: Event;
  ticket_type: TicketType;
  qr_data_url: string;      // QR en base64
};

// Datos para email templates
export type EmailTemplateData = {
  user_name: string;
  event_name: string;
  event_dates: string;
  event_location: string;
  event_url: string;
  order_id?: string;
  ticket_count?: number;
  total_amount?: number;
  currency?: string;
  profile_url?: string;
};
