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
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase/client";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Calendar, DollarSign, Users, Clock, Gift, Eye, FileText, Star } from "lucide-react";
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
  is_courtesy: z.boolean().optional(),
  
  // 🆕 Nuevos campos para página pública
  public_description: z.string().optional(),
  features: z.array(z.string()).optional(),
  terms: z.string().optional(),
}).refine((data) => {
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
  ticketTypeToEdit?: TicketType;
  onSuccess: (ticketType?: TicketType) => void;
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function TicketTypeFormDialog({
  event,
  ticketTypeToEdit,
  onSuccess,
  trigger,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
}: TicketTypeFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'public' | 'advanced'>('basic');
  const [features, setFeatures] = useState<string[]>(ticketTypeToEdit?.features || []);
  const [newFeature, setNewFeature] = useState('');
  const { toast } = useToast();
  const eventDays = getEventDays(event);

  // Usar open externo si se proporciona, sino usar estado interno
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TicketTypeFormData>({
    resolver: zodResolver(ticketTypeSchema) as any,
    defaultValues: {
      name: ticketTypeToEdit?.name ?? "",
      description: ticketTypeToEdit?.description ?? "",
      price: ticketTypeToEdit?.price ?? 0,
      currency: (ticketTypeToEdit?.currency ?? "MXN") as "MXN" | "USD",
      access_type: ticketTypeToEdit?.access_type ?? "all_days",
      available_days: ticketTypeToEdit?.available_days?.map(d => format(d, "yyyy-MM-dd")) ?? [],
      limit_per_user: ticketTypeToEdit?.limit_per_user ?? null,
      total_stock: ticketTypeToEdit?.total_stock ?? null,
      sale_start: ticketTypeToEdit?.sale_start ? format(ticketTypeToEdit.sale_start, "yyyy-MM-dd'T'HH:mm") : "",
      sale_end: ticketTypeToEdit?.sale_end ? format(ticketTypeToEdit.sale_end, "yyyy-MM-dd'T'HH:mm") : "",
      is_active: ticketTypeToEdit?.is_active ?? true,
      is_courtesy: ticketTypeToEdit?.is_courtesy ?? false,
      // 🆕 Nuevos campos
      public_description: ticketTypeToEdit?.public_description ?? "",
      features: ticketTypeToEdit?.features ?? [],
      terms: ticketTypeToEdit?.terms ?? "",
    },
  });

  const watchAccessType = watch("access_type");
  const watchAvailableDays = watch("available_days");
  const watchIsCourtesy = watch("is_courtesy");
  const watchPrice = watch("price");
  const watchCurrency = watch("currency");

  // Auto-configurar precio a 0 si es cortesía
  useEffect(() => {
    if (watchIsCourtesy) {
      setValue("price", 0);
    }
  }, [watchIsCourtesy, setValue]);

  // Manejar características
  const addFeature = () => {
    if (newFeature.trim() && !features.includes(newFeature.trim())) {
      const updatedFeatures = [...features, newFeature.trim()];
      setFeatures(updatedFeatures);
      setValue("features", updatedFeatures);
      setNewFeature('');
    }
  };

  const removeFeature = (index: number) => {
    const updatedFeatures = features.filter((_, i) => i !== index);
    setFeatures(updatedFeatures);
    setValue("features", updatedFeatures);
  };

  const onSubmit = async (data: TicketTypeFormData) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Usuario no autenticado");

      const token = await currentUser.getIdToken();
      
      const payload = {
        event_id: event.id,
        ...data,
        available_days: data.access_type === "specific_days" ? data.available_days : null,
        limit_per_user: data.limit_per_user || null,
        total_stock: data.total_stock || null,
        sale_start: data.sale_start || null,
        sale_end: data.sale_end || null,
        is_courtesy: data.is_courtesy || false,
        features: features,
      };

      const url = ticketTypeToEdit 
        ? `/api/admin/ticket-types/${ticketTypeToEdit.id}` 
        : "/api/admin/ticket-types";
      const method = ticketTypeToEdit ? "PUT" : "POST";

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
        is_courtesy: data.is_courtesy || false,
        sort_order: ticketTypeToEdit?.sort_order || 1,
        created_at: ticketTypeToEdit?.created_at || new Date(),
        updated_at: new Date(),
        
        // 🆕 Nuevos campos
        public_description: data.public_description || "",
        features: features,
        terms: data.terms || "",
      };

      const isCourtesy = data.is_courtesy ? " (Cortesía)" : "";
      toast({
        title: `Tipo de boleto ${ticketTypeToEdit ? "actualizado" : "creado"} correctamente`,
        description: `${data.name}${isCourtesy} - ${formatPriceForInput(data.price)} ${data.currency}`,
      });

      setOpen(false);
      reset();
      setActiveTab('basic');
      setFeatures([]);
      setNewFeature('');
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
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            {ticketTypeToEdit ? "Editar tipo de boleto" : "Crear tipo de boleto"}
            {watchPrice > 0 && (
              <Badge className="ml-2">
                {formatPriceForInput(watchPrice)} {watchCurrency}
              </Badge>
            )}
            {watchIsCourtesy && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                <Gift className="h-3 w-3 mr-1" />
                Cortesía
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Tabs de navegación */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'basic' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Información básica
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('public')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'public' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Página pública
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('advanced')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'advanced' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Configuración avanzada
          </button>
        </div>
        
  <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
          
          {/* Tab: Información Básica */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div>
                <Label>Nombre del tipo *</Label>
                <Input {...register("name")} placeholder="Ej: General, VIP, Estudiante" />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div>
                <Label>Descripción interna</Label>
                <Textarea 
                  {...register("description")} 
                  placeholder="Descripción para uso interno del equipo..."
                  rows={2}
                />
                <p className="text-xs text-gray-500 mt-1">Solo visible para administradores</p>
              </div>

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
                  Es cortesía (precio $0, no visible en página pública)
                </Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Precio *</Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    {...register("price")} 
                    placeholder="0.00"
                    disabled={watchIsCourtesy}
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

              {/* Control de acceso */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Tipo de acceso
                </Label>
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
            </div>
          )}

          {/* Tab: Página Pública */}
          {activeTab === 'public' && (
            <div className="space-y-4">
              <div>
                <Label className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Descripción pública
                </Label>
                <Textarea 
                  {...register("public_description")} 
                  placeholder="Descripción detallada que verán los compradores. Incluye beneficios, accesos especiales, etc."
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">Esta descripción aparecerá en la página del evento</p>
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  Características incluidas
                </Label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                      placeholder="Ej: Acceso VIP, Bebida incluida, Parking gratuito"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={addFeature}
                      disabled={!newFeature.trim()}
                    >
                      Agregar
                    </Button>
                  </div>
                  
                  {features.length > 0 && (
                    <div className="space-y-1">
                      {features.map((feature, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                          <span className="text-sm">{feature}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFeature(index)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-500">Las características aparecerán como lista de beneficios</p>
                </div>
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Términos específicos
                </Label>
                <Textarea 
                  {...register("terms")} 
                  placeholder="Condiciones específicas para este tipo de boleto (ej: No reembolsable, Válido solo con ID, etc.)"
                  rows={3}
                />
                <p className="text-xs text-gray-500 mt-1">Términos que aparecerán junto al boleto</p>
              </div>
            </div>
          )}

          {/* Tab: Configuración Avanzada */}
          {activeTab === 'advanced' && (
            <div className="space-y-4">
              {/* Límites y stock */}
              <div className="space-y-3">
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
                      Máximo que puede comprar cada usuario
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
                      Total de boletos disponibles
                    </p>
                  </div>
                </div>
              </div>

              {/* Programación de ventas */}
              <div className="space-y-3">
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
                      Cuándo estará disponible para compra
                    </p>
                  </div>
                  <div>
                    <Label>Fin de ventas</Label>
                    <Input 
                      type="datetime-local"
                      {...register("sale_end")} 
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Cuándo dejará de estar disponible
                    </p>
                  </div>
                </div>
              </div>

              {/* Estado */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Eye className="w-5 h-5 text-green-500" />
                  <div>
                    <Label className="text-base font-medium">Activar tipo de boleto</Label>
                    <p className="text-sm text-gray-600">El boleto estará disponible para venta</p>
                  </div>
                </div>
                <Controller
                  name="is_active"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>

              {!watch("is_active") && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    <strong>Tipo desactivado:</strong> No aparecerá en la página pública hasta que lo actives.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : ticketTypeToEdit ? "Guardar cambios" : "Crear tipo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
