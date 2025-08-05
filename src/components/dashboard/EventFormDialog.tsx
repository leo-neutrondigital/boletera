// src/components/dashboard/EventFormDialog.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { auth } from "@/lib/firebase/client";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import type { Event } from "@/types";
import { Calendar, Clock } from "lucide-react";

const eventSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  slug: z.string().min(1, "Slug requerido"),
  start_date: z.string().min(1, "Fecha de inicio requerida"),
  end_date: z.string().min(1, "Fecha de fin requerida"),
  location: z.string().min(1, "Lugar requerido"),
  description: z.string().optional(),
  internal_notes: z.string().optional(),
  published: z.boolean(),
}).refine((data) => {
  // Validar que end_date >= start_date
  const startDate = new Date(data.start_date);
  const endDate = new Date(data.end_date);
  return endDate >= startDate;
}, {
  message: "La fecha de fin debe ser igual o posterior a la fecha de inicio",
  path: ["end_date"],
});

type EventFormData = z.infer<typeof eventSchema>;

export interface EventFormDialogProps {
  eventToEdit?: {
    id: string;
    name: string;
    slug: string;
    start_date: string;
    end_date: string;
    location: string;
    description?: string;
    internal_notes?: string;
    published: boolean;
  };
  onSuccess: (event?: Event) => void;
  trigger?: React.ReactElement;
}

export function EventFormDialog({
  eventToEdit,
  onSuccess,
  trigger,
}: EventFormDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      name: eventToEdit?.name ?? "",
      slug: eventToEdit?.slug ?? "",
      start_date: eventToEdit?.start_date ?? "",
      end_date: eventToEdit?.end_date ?? eventToEdit?.start_date ?? "", // Si no hay end_date, usar start_date
      location: eventToEdit?.location ?? "",
      description: eventToEdit?.description ?? "",
      internal_notes: eventToEdit?.internal_notes ?? "",
      published: eventToEdit?.published ?? false,
    },
  });

  // Auto-set end_date when start_date changes (for convenience)
  const watchStartDate = watch("start_date");
  const watchEndDate = watch("end_date");

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = e.target.value;
    setValue("start_date", newStartDate);
    
    // Si end_date está vacío o es anterior a start_date, actualizarlo
    if (!watchEndDate || new Date(watchEndDate) < new Date(newStartDate)) {
      setValue("end_date", newStartDate);
    }
  };

  const onSubmit = async (data: EventFormData) => {
    try {
      if (!data.slug) {
        data.slug = data.name
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "");
      }

      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Usuario no autenticado");

      const token = await currentUser.getIdToken();
      console.log("🪪 Token enviado al backend:", token);

      const url = eventToEdit ? "/api/admin/update-event" : "/api/admin/create-event";
      const method = eventToEdit ? "PUT" : "POST";
      
      const payload = eventToEdit ? { id: eventToEdit.id, ...data } : data;
      console.log(`📤 ${method} request to ${url}:`, payload);

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al guardar el evento");
      }

      const responseData = await res.json();
      
      // Crear objeto Event para actualización optimista
      const eventData: Event = {
        id: eventToEdit?.id || responseData.id,
        name: data.name,
        start_date: new Date(data.start_date),
        end_date: new Date(data.end_date),
        location: data.location,
        description: data.description || "",
        internal_notes: data.internal_notes || "",
        published: data.published,
      };

      const isMultiDay = new Date(data.start_date).getTime() !== new Date(data.end_date).getTime();
      const durationText = isMultiDay ? `(${Math.ceil((new Date(data.end_date).getTime() - new Date(data.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1} días)` : "";

      toast({
        title: `Evento ${eventToEdit ? "actualizado" : "creado"} correctamente`,
        description: `${data.name} ${durationText}`,
      });
      
      setOpen(false);
      reset();
      
      onSuccess(eventData);
    } catch (error: unknown) {
      console.error("Error al guardar el evento:", error);
      const err = error as { message?: string };
      toast({
        variant: "destructive",
        title: "Error",
        description: err?.message || "No se pudo guardar el evento",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="default">
            {eventToEdit ? "Editar" : "+ Crear evento"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {eventToEdit ? "Editar evento" : "Crear nuevo evento"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Nombre del evento</Label>
            <Input {...register("name")} placeholder="Ej: Congreso de Tecnología 2024" />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label>Slug (URL amigable)</Label>
            <Input {...register("slug")} placeholder="Ej: congreso-tecnologia-2024" />
            {errors.slug && (
              <p className="text-sm text-red-500">{errors.slug.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Fecha de inicio
              </Label>
              <Input 
                type="date" 
                {...register("start_date")}
                onChange={handleStartDateChange}
              />
              {errors.start_date && (
                <p className="text-sm text-red-500">{errors.start_date.message}</p>
              )}
            </div>
            <div>
              <Label className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Fecha de fin
              </Label>
              <Input type="date" {...register("end_date")} />
              {errors.end_date && (
                <p className="text-sm text-red-500">{errors.end_date.message}</p>
              )}
            </div>
          </div>

          {/* Indicador visual para eventos multi-día */}
          {watchStartDate && watchEndDate && watchStartDate !== watchEndDate && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-md">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-700">
                Evento de {Math.ceil((new Date(watchEndDate).getTime() - new Date(watchStartDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} días
              </span>
            </div>
          )}

          <div>
            <Label>Lugar</Label>
            <Input {...register("location")} placeholder="Ej: Centro de Convenciones, Ciudad" />
            {errors.location && (
              <p className="text-sm text-red-500">{errors.location.message}</p>
            )}
          </div>

          <div>
            <Label>Descripción pública</Label>
            <Textarea 
              {...register("description")} 
              placeholder="Descripción que verán los usuarios al comprar boletos..."
              rows={3}
            />
          </div>

          <div>
            <Label>Notas internas</Label>
            <Textarea 
              {...register("internal_notes")} 
              placeholder="Notas privadas para el equipo organizador..."
              rows={2}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="published"
              checked={watch("published")}
              onCheckedChange={(val) => setValue("published", val)}
            />
            <Label htmlFor="published">Publicar evento</Label>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : eventToEdit ? "Guardar cambios" : "Crear evento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
