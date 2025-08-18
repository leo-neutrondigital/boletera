import { CourtesyCard } from './CourtesyCard';

import type { CourtesyTicket, CourtesyType } from './types';

interface CourtesyListProps {
  tickets: CourtesyTicket[];
  courtesyTypes: CourtesyType[];
  onDelete?: (ticketId: string) => void; // 🆕 Callback para eliminar
}

export function CourtesyList({ tickets, courtesyTypes, onDelete }: CourtesyListProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Boletos de cortesía ({tickets.length})
        </h2>
      </div>

      {tickets.map((ticket) => (
        <CourtesyCard 
          key={ticket.id} 
          ticket={ticket} 
          courtesyTypes={courtesyTypes}
          onDelete={onDelete} // 🆕 Pasar callback
        />
      ))}
    </div>
  );
}
