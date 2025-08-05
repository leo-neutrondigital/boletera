"use client"

import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { TicketTypesList } from "@/components/dashboard/TicketTypesList";
import { TicketTypeFormDialog } from "@/components/dashboard/TicketTypeFormDialog";
import { Can } from "@/components/auth/Can";
import { useTicketTypes } from "@/hooks/use-ticket-types";
import { getEventDateInfo } from "@/lib/utils/event-dates";
import type { Event, TicketType } from "@/types";

interface TicketTypesPageClientProps {
  event: Event;
  initialTicketTypes: TicketType[];
}

export function TicketTypesPageClient({ event, initialTicketTypes }: TicketTypesPageClientProps) {
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
  };

  const breadcrumbItems = [
    { label: "Eventos", href: "/dashboard/eventos" },
    { label: event.name, href: `/dashboard/eventos/${event.id}` },
    { label: "Tipos de Boletos", current: true },
  ];

  return (
    <main className="p-6 space-y-6">
      <Breadcrumb items={breadcrumbItems} />

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Tipos de Boletos</h1>
            <p className="text-muted-foreground">
              {event.name} • {eventDateInfo.dateRange}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={refreshTicketTypes}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              {isLoading ? "Actualizando..." : "Actualizar"}
            </Button>

            {/* 🔐 Solo admin y gestor pueden crear tipos de boletos */}
            <Can do="create" on="ticketTypes">
              <TicketTypeFormDialog
                event={event}
                onSuccess={handleTicketTypeSuccess}
                trigger={
                  <Button className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Nuevo tipo
                  </Button>
                }
              />
            </Can>
          </div>
        </div>

        {/* Información del evento */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
          <div className="flex items-center gap-1">
            <span className="font-medium">Ubicación:</span>
            <span>{event.location}</span>
          </div>
          {eventDateInfo.isMultiDay && (
            <div className="flex items-center gap-1">
              <span className="font-medium">Duración:</span>
              <span>{eventDateInfo.duration} días</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <span className="font-medium">Estado:</span>
            <span className={event.published ? "text-green-600" : "text-yellow-600"}>
              {event.published ? "Publicado" : "Borrador"}
            </span>
          </div>
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
    </main>
  );
}
