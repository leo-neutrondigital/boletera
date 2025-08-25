import type { CourtesyOrder } from '@/app/dashboard/cortesias/components/types';

// Tipos del EventGroupCard
export interface AdaptedEventGroup {
  event_id: string;
  event_name: string;
  event_start_date: Date;
  event_location: string;
  totalTickets: number;
  configuredTickets: number;
  pendingTickets: number;
  totalAmount: number;
  currency: string;
  totalOrders: number;
  orders: AdaptedOrder[];
}

export interface AdaptedOrder {
  id: string;
  createdAt: Date;
  ticketCount: number;
  configuredTickets: number;
  pendingTickets: number;
  totalAmount: number;
  currency: string;
  tickets: Array<{
    id: string;
    ticket_type_name: string;
    attendee_name?: string;
  }>;
}

export interface GroupedCourtesyData {
  eventName: string;
  eventDate: Date;
  eventLocation: string;
  customerName: string;
  customerEmail: string;
  orders: CourtesyOrder[];
}

/**
 * Convierte los datos de cortesías agrupadas al formato esperado por EventGroupCard
 */
export function adaptCourtesyGroupToEventGroup(
  group: GroupedCourtesyData
): AdaptedEventGroup {
  // Calcular totales del grupo
  const totalTickets = group.orders.reduce((sum, order) => sum + order.total_tickets, 0);
  const configuredTickets = group.orders.reduce((sum, order) => sum + order.configured_tickets, 0);
  const pendingTickets = group.orders.reduce((sum, order) => sum + order.pending_tickets, 0);
  const totalAmount = group.orders.reduce((sum, order) => sum + order.total_amount, 0);

  // Convertir órdenes individuales
  const adaptedOrders: AdaptedOrder[] = group.orders.map(order => ({
    id: order.order_id,
    createdAt: order.created_at,
    ticketCount: order.total_tickets,
    configuredTickets: order.configured_tickets,
    pendingTickets: order.pending_tickets,
    totalAmount: order.total_amount,
    currency: order.currency,
    tickets: order.tickets.map(ticket => ({
      id: ticket.id,
      ticket_type_name: ticket.ticket_type_name,
      attendee_name: ticket.attendee_name
    }))
  }));

  return {
    event_id: group.orders[0].event_id,
    event_name: group.eventName,
    event_start_date: group.eventDate,
    event_location: group.eventLocation,
    totalTickets,
    configuredTickets,
    pendingTickets,
    totalAmount,
    currency: group.orders[0].currency,
    totalOrders: group.orders.length,
    orders: adaptedOrders
  };
}

/**
 * Agrupa órdenes de cortesías por usuario + evento
 */
export function groupCourtesyOrdersByUserAndEvent(
  courtesyOrders: CourtesyOrder[]
): GroupedCourtesyData[] {
  const groups: Record<string, GroupedCourtesyData> = {};
  
  courtesyOrders.forEach(order => {
    const groupKey = `${order.customer_email}_${order.event_id}`;
    
    if (groups[groupKey]) {
      // Agregar orden al grupo existente
      groups[groupKey].orders.push(order);
    } else {
      // Crear nuevo grupo
      groups[groupKey] = {
        eventName: order.event_name,
        eventDate: order.event_start_date,
        eventLocation: order.event_location,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        orders: [order]
      };
    }
  });
  
  return Object.values(groups);
}
