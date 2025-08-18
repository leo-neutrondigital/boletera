// Tipos específicos para el módulo de cortesías
export interface CourtesyTicket {
  id: string;
  event_id: string;
  ticket_type_id: string;
  ticket_type_name: string;
  attendee_name: string;
  attendee_email: string;
  attendee_phone?: string;
  courtesy_type: string;
  courtesy_notes?: string;
  status: string;
  is_courtesy: boolean;
  user_id?: string | null;
  created_at: Date;
  created_by: string;
  qr_id: string;
  amount_paid: number;
  currency: string;
  order_id: string; // 🆕 Ahora siempre presente
  purchase_date: Date;
  pdf_url?: string;
  customer_name: string;
  customer_email: string;
}

// 🆕 Nuevo tipo para órdenes agrupadas
export interface CourtesyOrder {
  order_id: string;
  orderIds?: string[]; // 🆕 Lista de órdenes reales en el grupo
  tickets: CourtesyTicket[];
  total_tickets: number;
  configured_tickets: number;
  pending_tickets: number;
  total_amount: number;
  currency: string;
  created_at: Date;
  courtesy_type: string;
  event_id: string;
  event_name: string;
  event_start_date: Date;
  event_end_date: Date;
  event_location: string;
  customer_email: string;
  customer_name: string;
}

export interface Event {
  id: string;
  name: string;
  start_date: Date;
  end_date: Date;
  published: boolean;
}

export interface TicketType {
  id: string;
  event_id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  is_active: boolean;
}

export interface CourtesyType {
  value: string;
  label: string;
  color: string;
}

export interface CourtesyStats {
  total: number;
  linked: number;
  unlinked: number;
  byType: Record<string, number>;
}

// Tipos de cortesía predefinidos
export const COURTESY_TYPES: CourtesyType[] = [
  { value: 'prensa', label: '📰 Prensa', color: 'bg-blue-100 text-blue-800' },
  { value: 'staff', label: '👥 Staff', color: 'bg-green-100 text-green-800' },
  { value: 'vip', label: '⭐ VIP', color: 'bg-purple-100 text-purple-800' },
  { value: 'sponsor', label: '💎 Sponsor', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'influencer', label: '📱 Influencer', color: 'bg-pink-100 text-pink-800' },
  { value: 'organizador', label: '🎯 Organizador', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'proveedor', label: '🤝 Proveedor', color: 'bg-gray-100 text-gray-800' },
  { value: 'otro', label: '🎁 Otro', color: 'bg-orange-100 text-orange-800' }
];
