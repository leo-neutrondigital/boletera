"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, MapPin, Save, Eye, EyeOff, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Can } from "@/components/auth/Can";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EventFormDialog } from "@/components/dashboard/EventFormDialog";
import { useSalesPage } from "@/contexts/SalesPageContext";
import { getEventDateInfo } from "@/lib/utils/event-dates";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Event } from "@/types";

interface EventConfigurationClientProps {
  event: Event;
}

export function EventConfigurationClient({ event: initialEvent }: EventConfigurationClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { setConfigActions } = useSalesPage();
  const [event, setEvent] = useState(initialEvent);
  const [internalNotes, setInternalNotes] = useState(event.internal_notes || "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const eventDateInfo = getEventDateInfo(event);

  // Guardar notas internas
  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const response = await fetch(`/api/admin/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internal_notes: internalNotes }),
      });

      if (response.ok) {
        setEvent({ ...event, internal_notes: internalNotes });
        toast({ title: "Notas guardadas exitosamente" });
      } else {
        throw new Error("Error al guardar notas");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al guardar notas",
        description: "No se pudieron guardar las notas internas",
      });
    } finally {
      setSavingNotes(false);
    }
  };

  // Cambiar estado de publicación
  const handleTogglePublished = async () => {
    setUpdating(true);
    try {
      const newPublished = !event.published;
      const response = await fetch(`/api/admin/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: newPublished }),
      });

      if (response.ok) {
        setEvent({ ...event, published: newPublished });
        toast({
          title: newPublished ? "Evento publicado" : "Evento despublicado",
          description: newPublished 
            ? "El evento ahora es visible públicamente" 
            : "El evento ya no es visible públicamente",
        });
      } else {
        throw new Error("Error al cambiar estado");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cambiar el estado del evento",
      });
    } finally {
      setUpdating(false);
    }
  };

  // Eliminar evento
  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/events/${event.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({ title: "Evento eliminado exitosamente" });
        router.push("/dashboard/eventos");
      } else {
        const data = await response.json();
        throw new Error(data.error || "Error al eliminar evento");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al eliminar evento",
        description: error instanceof Error ? error.message : "Error desconocido",
      });
    } finally {
      setDeleting(false);
    }
  };

  // Actualizar evento después de edición
  const handleEventUpdate = (updatedEvent: Event) => {
    setEvent(updatedEvent);
    setShowEditDialog(false);
    router.refresh();
  };

  // Configurar acciones para el header
  useEffect(() => {
    setConfigActions({
      onEdit: () => setShowEditDialog(true),
      onTogglePublished: handleTogglePublished,
      isUpdating: updating
    });

    // Cleanup: quitar acciones cuando el componente se desmonta
    return () => setConfigActions(null);
  }, [updating, setConfigActions]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Quick Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Can do="update" on="events">
            <div className="flex items-center space-x-2">
              <Switch
                id="published"
                checked={event.published}
                onCheckedChange={handleTogglePublished}
                disabled={updating}
              />
              <Label htmlFor="published" className="cursor-pointer">
                {event.published ? (
                  <span className="flex items-center gap-2 text-green-600">
                    <Eye className="w-4 h-4" />
                    Público
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-gray-600">
                    <EyeOff className="w-4 h-4" />
                    Borrador
                  </span>
                )}
              </Label>
            </div>
          </Can>
        </div>

        <div className="flex items-center gap-2">
          <Can do="delete" on="events">
            <ConfirmDialog
              title="¿Eliminar evento?"
              description={`Esta acción eliminará "${event.name}" y todos sus tipos de boletos. Esta acción no se puede deshacer.`}
              onConfirm={handleDelete}
              trigger={
                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                  <Trash2 className="w-4 h-4" />
                </Button>
              }
            />
          </Can>
        </div>
      </div>

      {/* Grid de información */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Información básica */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Información del Evento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-600">Nombre</Label>
              <p className="text-lg font-semibold">{event.name}</p>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-600">Fechas</Label>
              <p className="flex items-center gap-2">
                {eventDateInfo.dateRange}
                {eventDateInfo.isMultiDay && (
                  <Badge variant="outline">{eventDateInfo.duration} días</Badge>
                )}
              </p>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-600">Ubicación</Label>
              <p className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {event.location}
              </p>
            </div>

            {event.description && (
              <div>
                <Label className="text-sm font-medium text-gray-600">Descripción</Label>
                <p className="text-sm text-gray-700">{event.description}</p>
              </div>
            )}

            <div>
              <Label className="text-sm font-medium text-gray-600">Estado</Label>
              <Badge variant={event.published ? "default" : "secondary"}>
                {event.published ? "Publicado" : "Borrador"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Metadatos */}
        <Card>
          <CardHeader>
            <CardTitle>Metadatos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-600">ID del evento</Label>
              <code className="block text-sm bg-gray-100 p-2 rounded font-mono">
                {event.id}
              </code>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-600">Creado</Label>
              <p className="text-sm">
                {format(event.created_at, "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
              </p>
            </div>

            {event.updated_at && (
              <div>
                <Label className="text-sm font-medium text-gray-600">Última actualización</Label>
                <p className="text-sm">
                  {format(event.updated_at, "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notas internas */}
      <Card>
        <CardHeader>
          <CardTitle>Notas Internas</CardTitle>
          <p className="text-sm text-gray-600">
            Estas notas solo son visibles para administradores y gestores
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Can do="update" on="events">
            <Textarea
              placeholder="Agregar notas internas sobre el evento..."
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              rows={4}
              className="resize-none"
            />
            
            {internalNotes !== (event.internal_notes || "") && (
              <Button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {savingNotes ? "Guardando..." : "Guardar notas"}
              </Button>
            )}
          </Can>

          <Can do="read" on="events" fallback={
            <p className="text-sm text-gray-500 italic">
              {event.internal_notes || "Sin notas internas"}
            </p>
          }>
            {!internalNotes && !event.internal_notes && (
              <p className="text-sm text-gray-500 italic">
                Sin notas internas
              </p>
            )}
          </Can>
        </CardContent>
      </Card>

      {/* Dialog para editar evento (controlado desde el header) */}
      <EventFormDialog
        eventToEdit={event}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSuccess={(updatedEvent) => {
          if (updatedEvent) handleEventUpdate(updatedEvent);
        }}
      />
    </div>
  );
}
