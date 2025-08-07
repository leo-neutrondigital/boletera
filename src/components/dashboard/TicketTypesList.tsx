// src/components/dashboard/TicketTypesList.tsx
"use client";

import { Edit, Trash2, Calendar, Users, DollarSign, Clock, AlertCircle, Gift } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { TicketTypeFormDialog } from "./TicketTypeFormDialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Can } from "@/components/auth/Can";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/currency"; // ✅ CORREGIDO
import type { Event, TicketType } from "@/types";

interface TicketTypesListProps {
  event: Event;
  ticketTypes: TicketType[];
  onRefresh: () => void;
  onDeleteTicketType: (ticketTypeId: string) => Promise<boolean>;
  onUpdateTicketType: (ticketType: TicketType) => void;
  onAddTicketType: (ticketType: TicketType) => void;
}

export function TicketTypesList({
  event,
  ticketTypes,
  onRefresh,
  onDeleteTicketType,
  onUpdateTicketType,
  onAddTicketType,
}: TicketTypesListProps) {
  const handleDelete = async (ticketTypeId: string) => {
    const success = await onDeleteTicketType(ticketTypeId);
    if (success) {
      console.log("✅ Ticket type deleted and state updated");
    }
  };

  const handleTicketTypeSuccess = (ticketType?: TicketType) => {
    if (ticketType) {
      const existingTicketType = ticketTypes.find((t) => t.id === ticketType.id);
      if (existingTicketType) {
        console.log("🔄 Updating ticket type optimistically:", ticketType);
        onUpdateTicketType(ticketType);
      } else {
        console.log("➕ Adding new ticket type optimistically:", ticketType);
        onAddTicketType(ticketType);
      }
    } else {
      console.log("🔄 Falling back to full refresh");
      onRefresh();
    }
  };

  const formatAccessType = (ticketType: TicketType) => {
    switch (ticketType.access_type) {
      case "all_days":
        return "Todos los días";
      case "specific_days":
        return `${ticketType.available_days?.length || 0} días específicos`;
      case "any_single_day":
        return "Un día a elegir";
      default:
        return "No definido";
    }
  };

  const getAccessDaysList = (ticketType: TicketType) => {
    if (ticketType.access_type === "specific_days" && ticketType.available_days) {
      return ticketType.available_days
        .map((day) => format(day, "dd MMM", { locale: es }))
        .join(", ");
    }
    return null;
  };

  const getStockInfo = (ticketType: TicketType) => {
    if (!ticketType.total_stock) return "Ilimitado";
    const remaining = ticketType.total_stock - ticketType.sold_count;
    const percentage = (ticketType.sold_count / ticketType.total_stock) * 100;
    
    return {
      text: `${ticketType.sold_count}/${ticketType.total_stock}`,
      remaining,
      percentage,
      isLow: percentage > 80,
      isSoldOut: remaining === 0,
    };
  };

  const isCurrentlyOnSale = (ticketType: TicketType) => {
    const now = new Date();
    const saleStart = ticketType.sale_start;
    const saleEnd = ticketType.sale_end;
    
    if (saleStart && now < saleStart) return false; // Aún no inicia
    if (saleEnd && now > saleEnd) return false; // Ya terminó
    
    return ticketType.is_active;
  };

  const getSaleStatus = (ticketType: TicketType) => {
    const now = new Date();
    const saleStart = ticketType.sale_start;
    const saleEnd = ticketType.sale_end;
    
    // Si es cortesía, mostrar estado especial
    if (ticketType.is_courtesy) {
      return { status: "courtesy", text: "Solo administrador" };
    }
    
    if (!ticketType.is_active) return { status: "inactive", text: "Inactivo" };
    if (saleStart && now < saleStart) return { status: "scheduled", text: `Inicia ${format(saleStart, "dd/MM HH:mm")}` };
    if (saleEnd && now > saleEnd) return { status: "ended", text: "Ventas terminadas" };
    if (saleEnd) return { status: "active", text: `Hasta ${format(saleEnd, "dd/MM HH:mm")}` };
    
    return { status: "active", text: "En venta" };
  };

  if (ticketTypes.length === 0) {
    return (
      <div className="w-full p-8 text-center text-muted-foreground">
        <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg mb-2">No hay tipos de boletos creados</p>
        <p className="text-sm mb-4">Crea el primer tipo de boleto para este evento</p>
        
        {/* 🔐 Solo admin y gestor pueden crear el primer tipo */}
        <Can do="create" on="ticketTypes">
          <TicketTypeFormDialog
            event={event}
            onSuccess={handleTicketTypeSuccess}
            trigger={
              <Button>
                <DollarSign className="w-4 h-4 mr-2" />
                Crear primer tipo
              </Button>
            }
          />
        </Can>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {ticketTypes.map((ticketType) => {
        const stockInfo = getStockInfo(ticketType);
        const saleStatus = getSaleStatus(ticketType);
        const accessDays = getAccessDaysList(ticketType);
        const currentlyOnSale = isCurrentlyOnSale(ticketType);
        const isCourtesy = ticketType.is_courtesy;

        // Preparar datos para editar
        const ticketTypeToEdit = {
          ...ticketType,
          available_days: ticketType.available_days || [],
        };

        return (
          <div
            key={ticketType.id}
            className={`border rounded-lg p-4 transition-all ${
              isCourtesy 
                ? "bg-amber-50 border-amber-200 hover:shadow-md"
                : currentlyOnSale 
                ? "bg-white hover:shadow-md" 
                : "bg-gray-50"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    {isCourtesy && <Gift className="w-5 h-5 text-amber-600" />}
                    <h3 className={`text-lg font-semibold truncate ${isCourtesy ? 'text-amber-800' : ''}`}>
                      {ticketType.name}
                      {isCourtesy && <span className="text-sm font-normal text-amber-600 ml-2">(Cortesía)</span>}
                    </h3>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {/* Badge de estado de venta */}
                    <Badge
                      variant={
                        saleStatus.status === "courtesy" ? "outline" :
                        saleStatus.status === "active" ? "default" :
                        saleStatus.status === "scheduled" ? "secondary" :
                        "destructive"
                      }
                      className={
                        saleStatus.status === "courtesy" ? "bg-amber-100 text-amber-800 border-amber-300" :
                        saleStatus.status === "active" ? "bg-green-100 text-green-800" :
                        saleStatus.status === "scheduled" ? "bg-blue-100 text-blue-800" :
                        "bg-red-100 text-red-800"
                      }
                    >
                      {saleStatus.text}
                    </Badge>

                    {/* Badge de stock */}
                    {typeof stockInfo === "object" && (
                      <Badge
                        variant="outline"
                        className={
                          stockInfo.isSoldOut ? "bg-red-50 text-red-700 border-red-200" :
                          stockInfo.isLow ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                          "bg-gray-50 text-gray-700"
                        }
                      >
                        {stockInfo.text}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Precio */}
                <div className={`text-2xl font-bold mb-2 ${
                  isCourtesy ? 'text-amber-600' : 'text-green-600'
                }`}>
                  {isCourtesy ? "GRATIS" : formatCurrency(ticketType.price, ticketType.currency)}
                </div>

                {/* Información detallada */}
                <div className="space-y-2 text-sm text-muted-foreground">
                  {ticketType.description && (
                    <p className="text-foreground">{ticketType.description}</p>
                  )}

                  <div className="flex items-center gap-4 flex-wrap">
                    {/* Acceso */}
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatAccessType(ticketType)}</span>
                    </div>

                    {/* Límite por usuario */}
                    {ticketType.limit_per_user && (
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>Máx. {ticketType.limit_per_user}/usuario</span>
                      </div>
                    )}

                    {/* Stock total */}
                    {typeof stockInfo === "object" && (
                      <div className="flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        <span>
                          {stockInfo.remaining} disponibles
                          {stockInfo.isLow && " ⚠️"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Días específicos */}
                  {accessDays && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>Días: {accessDays}</span>
                    </div>
                  )}

                  {/* Nota especial para cortesías */}
                  {isCourtesy && (
                    <div className="flex items-center gap-1 text-amber-700 bg-amber-100 p-2 rounded text-xs">
                      <Gift className="w-3 h-3" />
                      <span>Boleto cortesía - Solo visible para administradores - Asignación manual</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Acciones */}
              <div className="flex gap-2 ml-4 flex-shrink-0">
                {/* 🔐 Botón Editar - Admin y gestor */}
                <Can do="update" on="ticketTypes">
                  <TicketTypeFormDialog
                    event={event}
                    ticketTypeToEdit={ticketTypeToEdit}
                    onSuccess={handleTicketTypeSuccess}
                    trigger={
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Edit className="h-4 w-4" />
                      </Button>
                    }
                  />
                </Can>

                {/* 🔐 Botón Eliminar - Solo admin */}
                <Can do="delete" on="ticketTypes">
                  <ConfirmDialog
                    trigger={
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    }
                    title="¿Eliminar tipo de boleto?"
                    description={`¿Estás seguro de que quieres eliminar "${ticketType.name}"? Esta acción no se puede deshacer.`}
                    onConfirm={() => handleDelete(ticketType.id)}
                    confirmText="Eliminar"
                    cancelText="Cancelar"
                    destructive
                  />
                </Can>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
