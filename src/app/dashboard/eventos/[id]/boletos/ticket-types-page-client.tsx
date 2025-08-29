"use client"


import { TicketTypesList } from "@/components/dashboard/TicketTypesList";
import { TicketTypeFormDialog } from "@/components/dashboard/TicketTypeFormDialog";
import { useSalesPage } from "@/contexts/SalesPageContext";
import { useTicketTypes } from "@/hooks/use-ticket-types";
import { getEventDateInfo } from "@/lib/utils/event-dates";
import { useState, useEffect } from "react";
import type { Event, TicketType } from "@/types";

interface TicketTypesPageClientProps {
  event: Event;
  initialTicketTypes: TicketType[];
}

export function TicketTypesPageClient({ event, initialTicketTypes }: TicketTypesPageClientProps) {
  const { setTicketTypesActions } = useSalesPage();
  const [showNewTypeDialog, setShowNewTypeDialog] = useState(false);
  
  const {
    ticketTypes,
    isLoading,
    refreshTicketTypes,
    deleteTicketType,
    updateTicketTypeLocally,
    addTicketTypeLocally,
  } = useTicketTypes(event.id, initialTicketTypes);

  const eventDateInfo = getEventDateInfo(event);

  const handleTicketTypeSuccess = (ticketType?: TicketType) => {
    if (ticketType) {
      const existingTicketType = ticketTypes.find((tt) => tt.id === ticketType.id);
      if (existingTicketType) {
        updateTicketTypeLocally(ticketType);
      } else {
        addTicketTypeLocally(ticketType);
      }
    } else {
      refreshTicketTypes();
    }
    setShowNewTypeDialog(false);
  };

  // Configurar acciones para el header
  useEffect(() => {
    setTicketTypesActions({
      onRefresh: refreshTicketTypes,
      onNewType: () => setShowNewTypeDialog(true),
      isRefreshing: isLoading
    });

    // Cleanup: quitar acciones cuando el componente se desmonta
    return () => setTicketTypesActions(null);
  }, [isLoading, setTicketTypesActions, refreshTicketTypes]);

  // Breadcrumbs are now handled by EventTabsNavigation in layout

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Stats summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">{ticketTypes.length}</div>
          <div className="text-sm text-blue-600">Tipos configurados</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">
            {ticketTypes.filter(tt => tt.is_active).length}
          </div>
          <div className="text-sm text-green-600">Activos</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-600">
            {ticketTypes.filter(tt => tt.is_courtesy).length}
          </div>
          <div className="text-sm text-yellow-600">Cortesías</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">
            {ticketTypes.reduce((sum, tt) => sum + (tt.total_stock || 0), 0)}
          </div>
          <div className="text-sm text-purple-600">Stock total</div>
        </div>
      </div>

      {/* Lista de tipos de boletos */}
      <TicketTypesList
        event={event}
        ticketTypes={ticketTypes}
        onRefresh={refreshTicketTypes}
        onDeleteTicketType={deleteTicketType}
        onUpdateTicketType={updateTicketTypeLocally}
        onAddTicketType={addTicketTypeLocally}
      />

      {/* Dialog para nuevo tipo (controlado desde el header) */}
      <TicketTypeFormDialog
        event={event}
        open={showNewTypeDialog}
        onOpenChange={setShowNewTypeDialog}
        onSuccess={handleTicketTypeSuccess}
      />
    </div>
  );
}
