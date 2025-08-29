// src/types/index.ts

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  company?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  roles: string[];
  created_at: Date;
  updated_at?: Date;
}

export interface Event {
  id: string;
  name: string;
  start_date: Date;
  end_date: Date;
  location: string;
  description?: string;
  internal_notes?: string;
  published: boolean;
  created_at: Date;
  updated_at?: Date;
  // 🆕 Campos nuevos para carrito de compras
  slug: string;
  allow_preregistration?: boolean;
  preregistration_message?: string;
  public_description?: string;
  featured_image_url?: string;
  terms_and_conditions?: string;
  contact_email?: string;
}

export interface TicketType {
  id: string;
  event_id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  access_type: 'all_days' | 'specific_days' | 'any_single_day';
  available_days?: Date[];
  limit_per_user?: number;
  total_stock?: number;
  sold_count: number;
  is_active: boolean;
  sale_start?: Date;
  sale_end?: Date;
  is_courtesy: boolean;
  sort_order: number;
  created_at: Date;
  updated_at?: Date;
  // 🆕 Campos para página pública
  public_description?: string;
  features?: string[];
  terms?: string;
}

// 🆕 Nuevo: Interfaz para tickets
export interface Ticket {
  id: string;
  
  // Referencias
  user_id?: string; // null para invitados
  customer_email: string;
  customer_name: string;
  customer_phone: string;
  customer_company?: string;
  event_id: string;
  ticket_type_id: string;
  ticket_type_name: string;
  
  // Estado del boleto
  status: 'purchased' | 'configured' | 'used';
  
  // Datos de pago
  order_id: string;
  capture_id: string;
  purchase_date: Date;
  amount_paid: number;
  currency: string;
  
  // QR y PDF
  qr_id: string;
  pdf_url?: string;
  pdf_path?: string;
  
  // Datos del asistente
  attendee_name?: string;
  attendee_email?: string;
  attendee_phone?: string;
  special_requirements?: string;
  
  // Control de acceso
  authorized_days: Date[];
  used_days: Date[];
  selected_days?: Date[]; // Para boletos "any_single_day"
  
  // Información del evento (cuando se hace join)
  event?: {
    id: string;
    name: string;
    start_date: Date;
    end_date: Date;
    location: string;
    description?: string;
    slug?: string;
  };
  
  // Timestamps
  created_at: Date;
  updated_at?: Date;
  configured_at?: Date;
}

// 🆕 Nuevo: Resumen de orden por ID
export interface OrderSummary {
  id: string;
  createdAt: Date;
  ticketCount: number;
  configuredTickets: number;
  pendingTickets: number;
  usedTickets: number;
  totalAmount: number;
  currency: string;
  allConfigured: boolean;
  tickets: Ticket[];
}

// 🆕 Nuevo: Grupo de evento con órdenes
export interface EventGroup {
  event_id: string;
  event_name: string;
  event_location: string;
  event_start_date: Date;
  event_end_date: Date;
  event_description?: string;
  totalTickets: number;
  totalAmount: number;
  totalOrders: number;
  currency: string;
  configuredTickets: number;
  pendingTickets: number;
  usedTickets: number;
  orders: OrderSummary[];
}

// 🆕 Nuevo: Respuesta del API de tickets por usuario
export interface UserTicketsResponse {
  success: boolean;
  userId: string;
  events: EventGroup[];
  summary: {
    totalTickets: number;
    totalEvents: number;
    totalAmount: number;
    totalOrders: number;
    configuredTickets: number;
    pendingTickets: number;
    usedTickets: number;
    currency: string;
  };
}

// 🔄 Resumen de orden existente
export interface TicketsOrderSummary {
  totalTickets: number;
  configuredTickets: number;
  usedTickets: number;
  pendingTickets: number;
  events: Array<{
    id: string;
    name: string;
    start_date: Date;
    end_date: Date;
    location: string;
    description?: string;
    slug?: string;
  }>;
  totalAmount: number;
  currency: string;
}

// 🆕 Respuesta del API de tickets por orden
export interface TicketsOrderResponse {
  success: boolean;
  orderId: string;
  tickets: Ticket[];
  summary: TicketsOrderSummary;
  message: string;
}

export interface EventData {
  name: string;
  start_date: Date;
  end_date: Date;
  location: string;
  description?: string;
  internal_notes?: string;
  published: boolean;
  // 🆕 Campos nuevos para carrito de compras
  slug?: string;
  allow_preregistration?: boolean;
  preregistration_message?: string;
  public_description?: string;
  featured_image_url?: string;
  terms_and_conditions?: string;
  contact_email?: string;
}

// 🆕 Nuevo: Interfaz para preregistros
export interface Preregistration {
  id: string;
  event_id: string;
  user_id: string | null; // 🆕 Permitir preregistros sin usuario
  
  // Datos del interesado
  name: string;
  email: string;
  phone: string;
  company?: string;
  
  // 🆕 Boletos de interés
  interested_tickets?: {
    ticket_type_id: string;
    ticket_type_name: string;
    quantity: number;
    unit_price: number;
    currency: string;
    total_price: number;
  }[];
  
  // Estado y gestión CRM
  status: 'nuevo' | 'contactado' | 'interesado' | 'no_interesado' | 'convertido';
  
  // Metadata
  created_at: Date;
  updated_at?: Date;
  contacted_at?: Date;
  contacted_by?: string; // user_id del admin/gestor
  
  // Origen
  source: 'landing_page' | 'admin_import';
  
  // Email
  email_sent: boolean;
  email_sent_at?: Date;
  
  // Datos del evento (para joins)
  event?: {
    id: string;
    name: string;
    start_date: Date;
    end_date: Date;
    location: string;
    description?: string;
  };
}

export interface TicketTypeData {
  event_id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  access_type: 'all_days' | 'specific_days' | 'any_single_day';
  available_days?: Date[];
  limit_per_user?: number;
  total_stock?: number;
  is_active: boolean;
  sale_start?: Date;
  sale_end?: Date;
  is_courtesy?: boolean;
  sort_order?: number;
  // 🆕 Campos para página pública
  public_description?: string;
  features?: string[];
  terms?: string;
}

// 🆕 Tipos para carrito de compras
export interface CartItem {
  ticket_type_id: string;
  ticket_type_name: string;
  event_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  currency: string;
}

export type SessionCart = CartItem[];
