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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, User, Mail, Phone, Building, MapPin, Shield } from "lucide-react";
import { useUsers } from "@/hooks/use-users";
import type { User as UserType } from "@/types";

const userSchema = z.object({
  email: z.string().email("Email inválido").min(1, "Email requerido"),
  name: z.string().min(1, "Nombre requerido"),
  role: z.enum(["admin", "gestor", "comprobador", "usuario"]),
  phone: z.string().optional(),
  company: z.string().optional(),
  city: z.string().optional(),
  country: z.string().default("México"),
  marketing_consent: z.boolean().default(false),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserFormDialogProps {
  userToEdit?: UserType;
  onSuccess: (user?: UserType) => void;
  trigger?: React.ReactElement;
}

export function UserFormDialog({
  userToEdit,
  onSuccess,
  trigger,
}: UserFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'contact' | 'permissions'>('basic');
  const { toast } = useToast();
  const { createUser, updateUser } = useUsers();

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: userToEdit?.email ?? "",
      name: userToEdit?.name ?? "",
      role: userToEdit?.roles?.[0] ?? "usuario",
      phone: userToEdit?.phone ?? "",
      company: userToEdit?.company ?? "",
      city: userToEdit?.address?.city ?? "",
      country: userToEdit?.address?.country ?? "México",
      marketing_consent: userToEdit?.marketing_consent ?? false,
    },
  });

  const watchedRole = watch("role");

  const onSubmit = async (data: UserFormData) => {
    try {
      if (userToEdit) {
        // Actualizar usuario existente
        const updateData = {
          name: data.name,
          roles: [data.role],
          phone: data.phone || "",
          company: data.company || "",
          address: {
            city: data.city || "",
            country: data.country || "México",
          },
          marketing_consent: data.marketing_consent,
        };

        await updateUser(userToEdit.id, updateData);
      } else {
        // Crear nuevo usuario
        await createUser(data);
      }

      setOpen(false);
      reset();
      setActiveTab('basic');
      onSuccess();
    } catch (error: unknown) {
      // Error ya manejado en el hook
      console.error("Error in form:", error);
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case "admin":
        return "Acceso completo al sistema, gestión de usuarios y configuración";
      case "gestor":
        return "Crear y gestionar eventos, tipos de boletos y reportes";
      case "comprobador":
        return "Validar boletos y generar reportes de asistencia";
      case "usuario":
        return "Comprar boletos y gestionar cuenta personal";
      default:
        return "";
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "text-red-600 bg-red-50 border-red-200";
      case "gestor":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "comprobador":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "usuario":
        return "text-green-600 bg-green-50 border-green-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="default">
            {userToEdit ? "Editar" : <><UserPlus className="w-4 h-4 mr-2" />Nuevo Usuario</>}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            {userToEdit ? "Editar Usuario" : "Crear Nuevo Usuario"}
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
            onClick={() => setActiveTab('contact')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'contact' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Contacto
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('permissions')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'permissions' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Permisos
          </button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Tab: Información Básica */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div>
                <Label className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email *
                </Label>
                <Input 
                  {...register("email")} 
                  placeholder="usuario@ejemplo.com"
                  disabled={!!userToEdit} // No permitir cambiar email en edición
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
                {userToEdit && (
                  <p className="text-xs text-gray-500 mt-1">
                    El email no se puede modificar después de crear el usuario
                  </p>
                )}
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Nombre completo *
                </Label>
                <Input {...register("name")} placeholder="Juan Pérez" />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              {!userToEdit && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">Información importante</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Se generará una contraseña temporal automáticamente</li>
                    <li>• El usuario recibirá un email para establecer su contraseña</li>
                    <li>• El email no podrá modificarse después de crear la cuenta</li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Tab: Contacto */}
          {activeTab === 'contact' && (
            <div className="space-y-4">
              <div>
                <Label className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Teléfono
                </Label>
                <Input 
                  {...register("phone")} 
                  placeholder="+52 999 123 4567"
                  type="tel"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Incluye código de país para números internacionales
                </p>
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  Empresa / Organización
                </Label>
                <Input 
                  {...register("company")} 
                  placeholder="Nombre de la empresa"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Ciudad
                  </Label>
                  <Input 
                    {...register("city")} 
                    placeholder="Ciudad de México"
                  />
                </div>
                <div>
                  <Label>País</Label>
                  <Controller
                    name="country"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="México">México</SelectItem>
                          <SelectItem value="Estados Unidos">Estados Unidos</SelectItem>
                          <SelectItem value="España">España</SelectItem>
                          <SelectItem value="Colombia">Colombia</SelectItem>
                          <SelectItem value="Argentina">Argentina</SelectItem>
                          <SelectItem value="Otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg border border-green-200">
                <Controller
                  name="marketing_consent"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      id="marketing_consent"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="marketing_consent" className="text-green-800">
                  Acepta recibir comunicaciones de marketing
                </Label>
              </div>
            </div>
          )}

          {/* Tab: Permisos */}
          {activeTab === 'permissions' && (
            <div className="space-y-4">
              <div>
                <Label className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Rol del usuario *
                </Label>
                <Controller
                  name="role"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            Administrador
                          </div>
                        </SelectItem>
                        <SelectItem value="gestor">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                            Gestor
                          </div>
                        </SelectItem>
                        <SelectItem value="comprobador">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            Comprobador
                          </div>
                        </SelectItem>
                        <SelectItem value="usuario">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            Usuario
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.role && (
                  <p className="text-sm text-red-500">{errors.role.message}</p>
                )}
              </div>

              {/* Descripción del rol seleccionado */}
              {watchedRole && (
                <div className={`p-4 rounded-lg border ${getRoleColor(watchedRole)}`}>
                  <h4 className="font-medium mb-2">
                    Permisos del rol "{watchedRole.charAt(0).toUpperCase() + watchedRole.slice(1)}"
                  </h4>
                  <p className="text-sm">{getRoleDescription(watchedRole)}</p>
                  
                  <div className="mt-3 space-y-2">
                    <h5 className="font-medium text-sm">Acciones permitidas:</h5>
                    <div className="text-xs space-y-1">
                      {watchedRole === 'admin' && (
                        <>
                          <p>✅ Gestión completa de eventos y tipos de boletos</p>
                          <p>✅ Crear, editar y eliminar usuarios</p>
                          <p>✅ Acceso a todos los reportes y configuración</p>
                          <p>✅ Gestión de boletos cortesía</p>
                          <p>✅ Validación de boletos</p>
                        </>
                      )}
                      {watchedRole === 'gestor' && (
                        <>
                          <p>✅ Crear y editar eventos</p>
                          <p>✅ Gestionar tipos de boletos (no cortesías)</p>
                          <p>✅ Ver reportes de ventas</p>
                          <p>❌ No puede gestionar usuarios</p>
                          <p>❌ No puede eliminar eventos</p>
                        </>
                      )}
                      {watchedRole === 'comprobador' && (
                        <>
                          <p>✅ Ver eventos y tipos de boletos</p>
                          <p>✅ Validar boletos en eventos</p>
                          <p>✅ Generar reportes de asistencia</p>
                          <p>❌ No puede crear o editar contenido</p>
                        </>
                      )}
                      {watchedRole === 'usuario' && (
                        <>
                          <p>✅ Comprar boletos para eventos</p>
                          <p>✅ Ver su historial de compras</p>
                          <p>✅ Descargar sus boletos</p>
                          <p>❌ No acceso al panel administrativo</p>
                        </>
                      )}
                    </div>
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
              {isSubmitting ? "Guardando..." : userToEdit ? "Actualizar Usuario" : "Crear Usuario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
