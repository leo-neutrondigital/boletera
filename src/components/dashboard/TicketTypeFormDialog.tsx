// src/components/dashboard/TicketTypeFormDialog.tsx
"use client";

import { useForm, Controller } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase/client";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Calendar, DollarSign, Users, Clock, Gift } from "lucide-react";
import { format } from "date-fns";
import { getEventDays } from "@/lib/utils/event-dates";
import { formatPriceForInput, CURRENCIES } from "@/lib/utils/currency";
import type { Event, TicketType } from "@/types";

const ticketTypeSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "El precio debe ser mayor o igual a 0"),
  currency: z.enum(["MXN", "USD"]),
  access_type: z.enum(["all_days", "specific_days", "any_single_day"]),
  available_days: z.array(z.string()).optional(),
  // ✅ ARREGLADO: Campos opcionales que pueden ser vacíos
  limit_per_user: z.union([
    z.string().transform(val => val === "" ? null : Number(val)),
    z.number(),
    z.null()
  ]).optional(),
  total_stock: z.union([
    z.string().transform(val => val === "" ? null : Number(val)),
    z.number(),
    z.null()
  ]).optional(),
  sale_start: z.string().optional(),
  sale_end: z.string().optional(),
  is_active: z.boolean(),
  // 🆕 NUEVO: Campo para cortesías
  is_courtesy: z.boolean().optional(),
}).refine((data) => {
  // Si es specific_days, debe tener available_days
  if (data.access_type === "specific_days" && (!data.available_days || data.available_days.length === 0)) {
    return false;
  }
  return true;
}, {
  message: "Debe seleccionar al menos un día para el acceso específico",
  path: ["available_days"],
});

type TicketTypeFormData = z.infer<typeof ticketTypeSchema>;

interface TicketTypeFormDialogProps {
  event: Event;
  ticketTypeToEdit?: TicketType & { is_courtesy?: boolean }; // Agregar is_courtesy
  onSuccess: (ticketType?: TicketType) => void;
  trigger?: React.ReactElement;
}

export function TicketTypeFormDialog({
  event,
  ticketTypeToEdit,
  onSuccess,
  trigger,
}: TicketTypeFormDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const eventDays = getEventDays(event);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TicketTypeFormData>({
    resolver: zodResolver(ticketTypeSchema),
    defaultValues: {
      name: ticketTypeToEdit?.name ?? "",
      description: ticketTypeToEdit?.description ?? "",
      price: ticketTypeToEdit?.price ?? 0,
      currency: ticketTypeToEdit?.currency ?? "MXN",
      access_type: ticketTypeToEdit?.access_type ?? "all_days",
      available_days: ticketTypeToEdit?.available_days?.map(d => format(d, "yyyy-MM-dd")) ?? [],
      // ✅ ARREGLADO: Valores por defecto correctos para campos opcionales
      limit_per_user: ticketTypeToEdit?.limit_per_user ?? null,
      total_stock: ticketTypeToEdit?.total_stock ?? null,
      sale_start: ticketTypeToEdit?.sale_start ? format(ticketTypeToEdit.sale_start, "yyyy-MM-dd'T'HH:mm") : "",
      sale_end: ticketTypeToEdit?.sale_end ? format(ticketTypeToEdit.sale_end, "yyyy-MM-dd'T'HH:mm") : "",
      is_active: ticketTypeToEdit?.is_active ?? true,
      is_courtesy: ticketTypeToEdit?.is_courtesy ?? false, // 🆕 Campo cortesía
    },
  });

  const watchAccessType = watch("access_type");
  const watchAvailableDays = watch("available_days");
  const watchIsCourtesy = watch("is_courtesy"); // 🆕 Observar campo cortesía

  // 🆕 Auto-configurar precio a 0 si es cortesía
  useEffect(() => {
    if (watchIsCourtesy) {
      setValue("price", 0);
    }
  }, [watchIsCourtesy, setValue]);

  const onSubmit = async (data: TicketTypeFormData) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Usuario no autenticado");

      const token = await currentUser.getIdToken();
      
      const payload = {
        event_id: event.id,
        ...data,
        available_days: data.access_type === "specific_days" ? data.available_days : null,
        // ✅ ARREGLADO: Enviar null explícitamente para campos vacíos
        limit_per_user: data.limit_per_user || null,
        total_stock: data.total_stock || null,
        sale_start: data.sale_start || null,
        sale_end: data.sale_end || null,
        is_courtesy: data.is_courtesy || false, // 🆕 Campo cortesía
      };

      const url = ticketTypeToEdit 
        ? `/api/admin/ticket-types/${ticketTypeToEdit.id}` 
        : "/api/admin/ticket-types";
      const method = ticketTypeToEdit ? "PUT" : "POST";

      console.log(`📤 ${method} ${url}:`, payload);

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
        throw new Error(errorData.error || "Error al guardar el tipo de boleto");
      }

      const responseData = await res.json();

      // Crear objeto TicketType para actualización optimista
      const ticketTypeData: TicketType = {
        id: ticketTypeToEdit?.id || responseData.id,
        event_id: event.id,
        name: data.name,
        description: data.description || "",
        price: data.price,
        currency: data.currency,
        access_type: data.access_type,
        available_days: data.access_type === "specific_days" 
          ? data.available_days?.map(d => new Date(d)) || []
          : [],
        limit_per_user: data.limit_per_user || undefined,
        total_stock: data.total_stock || undefined,
        sold_count: ticketTypeToEdit?.sold_count || 0,
        is_active: data.is_active,
        sale_start: data.sale_start ? new Date(data.sale_start) : undefined,
        sale_end: data.sale_end ? new Date(data.sale_end) : undefined,
        sort_order: ticketTypeToEdit?.sort_order || 1,
        created_at: ticketTypeToEdit?.created_at || new Date(),
        updated_at: new Date(),
      };

      const isCourtesy = data.is_courtesy ? " (Cortesía)" : "";
      toast({
        title: `Tipo de boleto ${ticketTypeToEdit ? "actualizado" : "creado"} correctamente`,
        description: `${data.name}${isCourtesy} - ${formatPriceForInput(data.price)} ${data.currency}`,
      });

      setOpen(false);
      reset();
      onSuccess(ticketTypeData);
    } catch (error: unknown) {
      console.error("Error al guardar tipo de boleto:", error);
      const err = error as { message?: string };
      toast({
        variant: "destructive",
        title: "Error",
        description: err?.message || "No se pudo guardar el tipo de boleto",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="default">
            {ticketTypeToEdit ? "Editar" : "+ Nuevo tipo"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            {ticketTypeToEdit ? "Editar tipo de boleto" : "Crear tipo de boleto"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Información básica */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Información básica</h3>
            
            <div>
              <Label>Nombre del tipo</Label>
              <Input {...register("name")} placeholder="Ej: General, VIP, Estudiante" />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label>Descripción</Label>
              <Textarea 
                {...register("description")} 
                placeholder="Descripción que verán los usuarios..."
                rows={2}
              />
            </div>

            {/* 🆕 Campo cortesía */}
            <div className="flex items-center space-x-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <Gift className="w-4 h-4 text-amber-600" />
              <Controller
                name="is_courtesy"
                control={control}
                render={({ field }) => (
                  <Switch
                    id="is_courtesy"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label htmlFor="is_courtesy" className="text-amber-800">
                Es cortesía (precio $0, no visible para usuarios)
              </Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Precio</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  min="0"
                  {...register("price")} 
                  placeholder="0.00"
                  disabled={watchIsCourtesy} // 🆕 Deshabilitado si es cortesía
                  className={watchIsCourtesy ? "bg-gray-100" : ""}
                />
                {errors.price && (
                  <p className="text-sm text-red-500">{errors.price.message}</p>
                )}
                {watchIsCourtesy && (
                  <p className="text-xs text-amber-600 mt-1">Precio fijo $0 para cortesías</p>
                )}
              </div>
              <div>
                <Label>Moneda</Label>
                <Controller
                  name="currency"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MXN">MXN - {CURRENCIES.MXN.name}</SelectItem>
                        <SelectItem value="USD">USD - {CURRENCIES.USD.name}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Control de acceso */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Control de acceso
            </h3>
            
            <Controller
              name="access_type"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_days">Todos los días del evento</SelectItem>
                    <SelectItem value="specific_days">Días específicos</SelectItem>
                    <SelectItem value="any_single_day">Un día a elegir por el usuario</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />

            {watchAccessType === "specific_days" && (
              <div>
                <Label>Días disponibles</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {eventDays.map((day, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`day-${index}`}
                        value={format(day, "yyyy-MM-dd")}
                        checked={watchAvailableDays?.includes(format(day, "yyyy-MM-dd")) || false}
                        onChange={(e) => {
                          const dayStr = e.target.value;
                          const current = watchAvailableDays || [];
                          if (e.target.checked) {
                            setValue("available_days", [...current, dayStr]);
                          } else {
                            setValue("available_days", current.filter(d => d !== dayStr));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor={`day-${index}`} className="text-sm">
                        {format(day, "dd MMM yyyy")}
                      </Label>
                    </div>
                  ))}
                </div>
                {errors.available_days && (
                  <p className="text-sm text-red-500">{errors.available_days.message}</p>
                )}
              </div>
            )}
          </div>

          {/* Límites y stock */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              Límites y stock
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Límite por usuario</Label>
                <Input 
                  type="number" 
                  min="1"
                  {...register("limit_per_user")} 
                  placeholder="Sin límite"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Dejar vacío = sin límite
                </p>
              </div>
              <div>
                <Label>Stock total</Label>
                <Input 
                  type="number" 
                  min="1"
                  {...register("total_stock")} 
                  placeholder="Ilimitado"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Dejar vacío = ilimitado
                </p>
              </div>
            </div>
          </div>

          {/* Programación de ventas */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Programación de ventas
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Inicio de ventas</Label>
                <Input 
                  type="datetime-local"
                  {...register("sale_start")} 
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Vacío = disponible inmediatamente
                </p>
              </div>
              <div>
                <Label>Fin de ventas</Label>
                <Input 
                  type="datetime-local"
                  {...register("sale_end")} 
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Vacío = disponible hasta el evento
                </p>
              </div>
            </div>
          </div>

          {/* Estado */}
          <div className="flex items-center space-x-2">
            <Controller
              name="is_active"
              control={control}
              render={({ field }) => (
                <Switch
                  id="is_active"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label htmlFor="is_active">Activar inmediatamente</Label>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : ticketTypeToEdit ? "Guardar cambios" : "Crear tipo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
