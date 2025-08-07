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
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { auth } from "@/lib/firebase/client";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import type { Event } from "@/types";
import { Calendar, Clock, Globe, Bell, Mail, Image, FileText, AlertCircle } from "lucide-react";

const eventSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  slug: z.string().min(1, "Slug requerido").regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug debe contener solo letras minúsculas, números y guiones"),
  start_date: z.string().min(1, "Fecha de inicio requerida"),
  end_date: z.string().min(1, "Fecha de fin requerida"),
  location: z.string().min(1, "Lugar requerido"),
  description: z.string().optional(),
  internal_notes: z.string().optional(),
  published: z.boolean(),
  
  // 🆕 Nuevos campos para carrito de compras
  public_description: z.string().min(1, "Descripción pública requerida"),
  allow_preregistration: z.boolean(),
  preregistration_message: z.string().optional(),
  featured_image_url: z.string().url("URL de imagen inválida").optional().or(z.literal("")),
  terms_and_conditions: z.string().optional(),
  contact_email: z.string().email("Email inválido").optional().or(z.literal("")),
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
  eventToEdit?: Event;
  onSuccess: (event?: Event) => void;
  trigger?: React.ReactElement;
}

export function EventFormDialog({
  eventToEdit,
  onSuccess,
  trigger,
}: EventFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'public' | 'advanced'>('basic');
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
      start_date: eventToEdit?.start_date ? eventToEdit.start_date.toISOString().split('T')[0] : "",
      end_date: eventToEdit?.end_date ? eventToEdit.end_date.toISOString().split('T')[0] : "",
      location: eventToEdit?.location ?? "",
      description: eventToEdit?.description ?? "",
      internal_notes: eventToEdit?.internal_notes ?? "",
      published: eventToEdit?.published ?? false,
      
      // 🆕 Nuevos campos
      public_description: eventToEdit?.public_description ?? "",
      allow_preregistration: eventToEdit?.allow_preregistration ?? false,
      preregistration_message: eventToEdit?.preregistration_message ?? "",
      featured_image_url: eventToEdit?.featured_image_url ?? "",
      terms_and_conditions: eventToEdit?.terms_and_conditions ?? "",
      contact_email: eventToEdit?.contact_email ?? "",
    },
  });

  // Auto-generar slug desde el nombre
  const watchName = watch("name");
  const watchSlug = watch("slug");
  
  const generateSlugFromName = () => {
    const generatedSlug = watchName
      .toLowerCase()
      .trim()
      .replace(/[áàäâã]/g, 'a')
      .replace(/[éèëê]/g, 'e')
      .replace(/[íìïî]/g, 'i')
      .replace(/[óòöôõ]/g, 'o')
      .replace(/[úùüû]/g, 'u')
      .replace(/ñ/g, 'n')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    setValue("slug", generatedSlug);
  };

  // Auto-set end_date when start_date changes
  const watchStartDate = watch("start_date");
  const watchEndDate = watch("end_date");
  const watchPublicDescription = watch("public_description");

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = e.target.value;
    setValue("start_date", newStartDate);
    
    if (!watchEndDate || new Date(watchEndDate) < new Date(newStartDate)) {
      setValue("end_date", newStartDate);
    }
  };

  const onSubmit = async (data: EventFormData) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Usuario no autenticado");

      const token = await currentUser.getIdToken();
      
      const url = eventToEdit ? "/api/admin/update-event" : "/api/admin/create-event";
      const method = eventToEdit ? "PUT" : "POST";
      
      const payload = eventToEdit ? { id: eventToEdit.id, ...data } : data;

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
        
        // 🆕 Nuevos campos
        slug: data.slug,
        public_description: data.public_description,
        allow_preregistration: data.allow_preregistration,
        preregistration_message: data.preregistration_message || "",
        featured_image_url: data.featured_image_url || "",
        terms_and_conditions: data.terms_and_conditions || "",
        contact_email: data.contact_email || "",
        
        created_at: eventToEdit?.created_at || new Date(),
        updated_at: new Date(),
      };

      const isMultiDay = new Date(data.start_date).getTime() !== new Date(data.end_date).getTime();
      const durationText = isMultiDay ? `(${Math.ceil((new Date(data.end_date).getTime() - new Date(data.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1} días)` : "";

      toast({
        title: `Evento ${eventToEdit ? "actualizado" : "creado"} correctamente`,
        description: `${data.name} ${durationText}`,
      });
      
      setOpen(false);
      reset();
      setActiveTab('basic');
      
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

  const validateImageUrl = async (url: string) => {
    if (!url) return true;
    
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  };

  const isMultiDay = watchStartDate && watchEndDate && watchStartDate !== watchEndDate;
  const eventDuration = isMultiDay ? 
    Math.ceil((new Date(watchEndDate).getTime() - new Date(watchStartDate).getTime()) / (1000 * 60 * 60 * 24)) + 1 
    : 1;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="default">
            {eventToEdit ? "Editar" : "+ Crear evento"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {eventToEdit ? "Editar evento" : "Crear nuevo evento"}
            {eventToEdit && eventToEdit.published && (
              <Badge className="bg-green-100 text-green-800">
                <Globe className="h-3 w-3 mr-1" />
                Publicado
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Tab: Información Básica */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div>
                <Label>Nombre del evento *</Label>
                <Input 
                  {...register("name")} 
                  placeholder="Ej: Congreso de Tecnología 2024"
                  onChange={(e) => {
                    register("name").onChange(e);
                    // Auto-generar slug si está vacío
                    if (!watchSlug || !eventToEdit) {
                      setTimeout(generateSlugFromName, 100);
                    }
                  }}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div>
                <Label className="flex items-center justify-between">
                  <span>Slug (URL pública) *</span>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={generateSlugFromName}
                    disabled={!watchName}
                  >
                    Regenerar
                  </Button>
                </Label>
                <Input 
                  {...register("slug")} 
                  placeholder="congreso-tecnologia-2024" 
                />
                {watchSlug && (
                  <p className="text-sm text-gray-500">
                    URL pública: <code>/events/{watchSlug}</code>
                  </p>
                )}
                {errors.slug && (
                  <p className="text-sm text-red-500">{errors.slug.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Fecha de inicio *
                  </Label>
                  <Input 
                    type="datetime-local" 
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
                    Fecha de fin *
                  </Label>
                  <Input type="datetime-local" {...register("end_date")} />
                  {errors.end_date && (
                    <p className="text-sm text-red-500">{errors.end_date.message}</p>
                  )}
                </div>
              </div>

              {/* Indicador visual para eventos multi-día */}
              {isMultiDay && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-md border border-blue-200">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-700">
                    Evento de múltiples días ({eventDuration} días)
                  </span>
                </div>
              )}

              <div>
                <Label>Ubicación *</Label>
                <Input {...register("location")} placeholder="Centro de Convenciones, Ciudad de México" />
                {errors.location && (
                  <p className="text-sm text-red-500">{errors.location.message}</p>
                )}
              </div>

              <div>
                <Label>Descripción interna</Label>
                <Textarea 
                  {...register("description")} 
                  placeholder="Descripción para uso interno del equipo organizador..."
                  rows={3}
                />
                <p className="text-xs text-gray-500 mt-1">Solo visible para administradores</p>
              </div>

              <div>
                <Label>Notas internas</Label>
                <Textarea 
                  {...register("internal_notes")} 
                  placeholder="Notas privadas, recordatorios, checklist..."
                  rows={2}
                />
                <p className="text-xs text-gray-500 mt-1">Solo visible para el equipo</p>
              </div>
            </div>
          )}

          {/* Tab: Página Pública */}
          {activeTab === 'public' && (
            <div className="space-y-4">
              <div>
                <Label className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Descripción pública *
                </Label>
                <Textarea 
                  {...register("public_description")} 
                  placeholder="Describe tu evento para los asistentes. Esta descripción aparecerá en la página pública..."
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {watchPublicDescription?.length || 0} caracteres. Recomendado: 150-300 caracteres
                </p>
                {errors.public_description && (
                  <p className="text-sm text-red-500">{errors.public_description.message}</p>
                )}
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  Imagen destacada (URL)
                </Label>
                <Input 
                  {...register("featured_image_url")} 
                  placeholder="https://ejemplo.com/imagen-evento.jpg"
                  type="url"
                />
                <p className="text-xs text-gray-500 mt-1">Imagen que aparecerá en la página del evento</p>
                {errors.featured_image_url && (
                  <p className="text-sm text-red-500">{errors.featured_image_url.message}</p>
                )}
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email de contacto
                </Label>
                <Input 
                  {...register("contact_email")} 
                  placeholder="contacto@evento.com"
                  type="email"
                />
                <p className="text-xs text-gray-500 mt-1">Email para consultas de los asistentes</p>
                {errors.contact_email && (
                  <p className="text-sm text-red-500">{errors.contact_email.message}</p>
                )}
              </div>

              <div>
                <Label>Términos y condiciones</Label>
                <Textarea 
                  {...register("terms_and_conditions")} 
                  placeholder="Condiciones específicas de este evento (políticas de cancelación, código de vestimenta, etc.)"
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">Aparecerán en la página del evento</p>
              </div>
            </div>
          )}

          {/* Tab: Configuración Avanzada */}
          {activeTab === 'advanced' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Bell className="w-5 h-5 text-blue-500" />
                  <div>
                    <Label className="text-base font-medium">Permitir prerregistros</Label>
                    <p className="text-sm text-gray-600">Los usuarios podrán prerregistrarse antes de que abra la venta</p>
                  </div>
                </div>
                <Switch
                  checked={watch("allow_preregistration")}
                  onCheckedChange={(val) => setValue("allow_preregistration", val)}
                />
              </div>

              {watch("allow_preregistration") && (
                <div>
                  <Label>Mensaje para prerregistro</Label>
                  <Textarea 
                    {...register("preregistration_message")} 
                    placeholder="¡Prerregístrate para ser el primero en saber cuando abra la venta de boletos!"
                    rows={3}
                  />
                  <p className="text-xs text-gray-500 mt-1">Mensaje que verán los usuarios al prerregistrarse</p>
                </div>
              )}

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Globe className="w-5 h-5 text-green-500" />
                  <div>
                    <Label className="text-base font-medium">Publicar evento</Label>
                    <p className="text-sm text-gray-600">El evento será visible públicamente en /events/{watchSlug}</p>
                  </div>
                </div>
                <Switch
                  checked={watch("published")}
                  onCheckedChange={(val) => setValue("published", val)}
                />
              </div>

              {watch("published") && (
                <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
                  <AlertCircle className="w-4 h-4 text-green-600 mt-0.5" />
                  <div className="text-sm text-green-700">
                    <p className="font-medium">Evento público</p>
                    <p>Los usuarios podrán acceder a este evento en: <code>/events/{watchSlug}</code></p>
                  </div>
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
              {isSubmitting ? "Guardando..." : eventToEdit ? "Guardar cambios" : "Crear evento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
