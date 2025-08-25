// Tipos compartidos para el scanner de eventos

export interface AttendeeTicket {
  id: string;
  attendee_name: string;
  attendee_email?: string;
  attendee_phone?: string;
  customer_name: string;
  customer_email: string;
  ticket_type_name: string;
  status: 'purchased' | 'configured' | 'generated' | 'used';
  check_in_status: 'not_arrived' | 'checked_in' | 'partial';
  authorized_days: string[];
  used_days: string[];
  last_checkin?: string;
  can_undo_until?: string;
  qr_id?: string;
  amount_paid: number;
  currency: string;
}

export interface EventData {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  location: string;
  description?: string;
}

export interface EventStats {
  total_tickets: number;
  configured_tickets: number;
  checked_in_count: number;
  not_arrived_count: number;
  attendance_rate: number;
}

export type StatusFilter = 'all' | 'checked_in' | 'not_arrived' | 'partial';
