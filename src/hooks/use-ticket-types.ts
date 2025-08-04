// src/hooks/use-ticket-types.ts
"use client";

import { useState, useCallback } from "react";
import { auth } from "@/lib/firebase/client";
import { useToast } from "@/hooks/use-toast";
import type { TicketType } from "@/types";

export function useTicketTypes(eventId: string, initialTicketTypes: TicketType[]) {
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>(initialTicketTypes);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const refreshTicketTypes = useCallback(async () => {
    try {
      setIsLoading(true);

      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.warn("No authenticated user for refresh");
        return;
      }

      const token = await currentUser.getIdToken();
      console.log("🔄 Refreshing ticket types with token");

      const response = await fetch(`/api/admin/events/${eventId}/ticket-types`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch ticket types");
      }

      const updatedTicketTypes = await response.json();
      console.log(`✅ Refreshed ${updatedTicketTypes.length} ticket types`);
      setTicketTypes(updatedTicketTypes);
    } catch (error) {
      console.error("Error refreshing ticket types:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron actualizar los tipos de boletos",
      });
    } finally {
      setIsLoading(false);
    }
  }, [eventId, toast]);

  const deleteTicketType = useCallback(async (ticketTypeId: string) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Usuario no autenticado");

      const token = await currentUser.getIdToken();
      console.log("🗑️ Deleting ticket type with ID:", ticketTypeId);

      const response = await fetch(`/api/admin/ticket-types/${ticketTypeId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al eliminar el tipo de boleto");
      }

      // Actualizar estado local inmediatamente
      setTicketTypes((prev) => prev.filter((tt) => tt.id !== ticketTypeId));

      toast({
        title: "Tipo de boleto eliminado",
        description: "El tipo de boleto se eliminó correctamente",
      });

      return true;
    } catch (error) {
      console.error("Error deleting ticket type:", error);
      const err = error as { message?: string };
      toast({
        variant: "destructive",
        title: "Error",
        description: err?.message || "No se pudo eliminar el tipo de boleto",
      });
      return false;
    }
  }, [toast]);

  // Función para actualizar un ticket type en el estado local
  const updateTicketTypeLocally = useCallback((updatedTicketType: TicketType) => {
    setTicketTypes((prev) =>
      prev.map((tt) => (tt.id === updatedTicketType.id ? updatedTicketType : tt))
    );
  }, []);

  // Función para agregar un ticket type en el estado local
  const addTicketTypeLocally = useCallback((newTicketType: TicketType) => {
    setTicketTypes((prev) => [...prev, newTicketType].sort((a, b) => a.sort_order - b.sort_order));
  }, []);

  return {
    ticketTypes,
    isLoading,
    refreshTicketTypes,
    deleteTicketType,
    updateTicketTypeLocally,
    addTicketTypeLocally,
  };
}
