'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, User, Mail, Phone, Building, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Schema de validación
const customerSchema = z.object({
  name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'Teléfono debe tener al menos 10 dígitos'),
  company: z.string().optional(),
  createAccount: z.boolean().optional(),
  password: z.string().optional(),
}).refine((data) => {
  // Si quiere crear cuenta, la contraseña es obligatoria
  if (data.createAccount && (!data.password || data.password.length < 6)) {
    return false;
  }
  return true;
}, {
  message: "La contraseña debe tener al menos 6 caracteres",
  path: ["password"],
});

export type CustomerFormData = z.infer<typeof customerSchema>;

interface CustomerFormProps {
  initialData?: Partial<CustomerFormData>;
  isPreregistration?: boolean;
  isLoggedIn?: boolean;
  onValidationChange?: (isValid: boolean, data?: CustomerFormData) => void;
  isLoading?: boolean;
}

export function CustomerForm({
  initialData = {},
  isPreregistration = false,
  isLoggedIn = false,
  onValidationChange,
  isLoading = false
}: CustomerFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  // Para compras siempre crear cuenta (si no está loggeado)
  const wantsAccount = !isLoggedIn && !isPreregistration;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
    getValues
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: initialData.name || '',
      email: initialData.email || '',
      phone: initialData.phone || '',
      company: initialData.company || '',
      createAccount: !isLoggedIn && !isPreregistration, // Siempre true para compras
      password: initialData.password || '',
    },
    mode: 'onChange'
  });

  // Notificar cambios de validación al padre
  React.useEffect(() => {
    if (onValidationChange) {
      if (isValid) {
        const formData = getValues();
        onValidationChange(true, formData);
      } else {
        onValidationChange(false);
      }
    }
  }, [isValid, onValidationChange, getValues]);

  return (
    <div className="space-y-6">
      {/* Mensaje para usuarios loggeados */}
      {isLoggedIn && (
        <Alert className="bg-blue-50 border-blue-200">
          <User className="h-4 w-4" />
          <AlertDescription className="text-blue-800">
            Ya tienes una cuenta. Los datos se completaron automáticamente.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {/* Campos principales */}
        <div className="space-y-4">
          {/* Nombre */}
          <div>
            <Label htmlFor="name" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Nombre completo *
            </Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="Ej: Juan Pérez González"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Correo electrónico *
            </Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="correo@ejemplo.com"
              className={errors.email ? 'border-red-500' : ''}
              disabled={isLoggedIn} // No editable si ya está loggeado
            />
            {errors.email && (
              <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
            )}
            {isLoggedIn && (
              <p className="text-xs text-gray-500 mt-1">
                Email no editable - asociado a tu cuenta
              </p>
            )}
          </div>

          {/* Teléfono */}
          <div>
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Teléfono *
            </Label>
            <Input
              id="phone"
              type="tel"
              {...register('phone')}
              placeholder="+52 999 123 4567"
              className={errors.phone ? 'border-red-500' : ''}
            />
            {errors.phone && (
              <p className="text-sm text-red-500 mt-1">{errors.phone.message}</p>
            )}
          </div>

          {/* Empresa (opcional) */}
          <div>
            <Label htmlFor="company" className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              Empresa u organización
            </Label>
            <Input
              id="company"
              {...register('company')}
              placeholder="Nombre de tu empresa (opcional)"
            />
            <p className="text-xs text-gray-500 mt-1">Opcional</p>
          </div>
        </div>

        {/* Crear cuenta (solo para compras y no loggeados) */}
        {!isPreregistration && !isLoggedIn && (
          <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-blue-600" />
              <div>
                <Label className="text-base font-medium text-blue-900">Crear cuenta</Label>
                <p className="text-sm text-blue-700">
                  Se creará tu cuenta automáticamente para acceder a tus boletos
                </p>
              </div>
            </div>

            {/* Campo de contraseña obligatorio */}
            <div>
              <Label htmlFor="password">Contraseña *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder="Mínimo 6 caracteres"
                  className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
                />
                <button
                  type="button"
                  className="absolute right-0 top-0 h-full px-3 text-gray-500 hover:text-gray-700"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
              )}
              <p className="text-xs text-blue-600 mt-1">
                🔐 Usarás esta contraseña para acceder a tu cuenta y ver tus boletos
              </p>
            </div>
          </div>
        )}

        {/* Información adicional según el flujo */}
        <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
          {isPreregistration ? (
            <p>
              📧 Te contactaremos a tu correo con información sobre disponibilidad y compra de boletos.
            </p>
          ) : isLoggedIn ? (
            <p>
              🎫 Procederemos al pago con los datos de tu cuenta. Podrás configurar los asistentes después.
            </p>
          ) : (
            <p>
              🔐 Se creará tu cuenta automáticamente después del pago exitoso. Te enviaremos los boletos por email.
            </p>
          )}
        </div>

        {/* Debug en desarrollo */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-gray-100 p-3 rounded text-xs">
            <div><strong>Debug CustomerForm:</strong></div>
            <div>Is Valid: {isValid ? 'Yes' : 'No'}</div>
            <div>Is Preregistration: {isPreregistration ? 'Yes' : 'No'}</div>
            <div>Is Logged In: {isLoggedIn ? 'Yes' : 'No'}</div>
            <div>Will Create Account: {wantsAccount ? 'Yes' : 'No'}</div>
            <div>Errors: {Object.keys(errors).join(', ') || 'None'}</div>
          </div>
        )}

        {/* Mensaje de validación */}
        {!isValid && Object.keys(errors).length > 0 && (
          <Alert className="bg-red-50 border-red-200">
            <AlertDescription className="text-red-800">
              Por favor corrige los errores antes de continuar.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
