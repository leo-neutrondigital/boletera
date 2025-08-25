'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, User, Mail, Phone, Building, Lock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useEmailValidation } from '@/hooks/use-email-validation';
import { Badge } from '@/components/ui/badge';

// Schema de validación MEJORADO para preregistros
const customerSchemaPreregistro = z.object({
  name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'Teléfono debe tener al menos 10 dígitos'),
  company: z.string().optional(),
  createAccount: z.boolean().optional(),
  password: z.string().optional(),
});

// Schema de validación MEJORADO para compras
const customerSchemaCompra = z.object({
  name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'Teléfono debe tener al menos 10 dígitos'),
  company: z.string().optional(),
  createAccount: z.boolean().optional(),
  password: z.string().optional(),
}).refine((data) => {
  // 🔧 ARREGLO: Validación de contraseña más clara
  if (data.createAccount === true) {
    if (!data.password || data.password.length < 6) {
      return false;
    }
  }
  return true;
}, {
  message: "La contraseña debe tener al menos 6 caracteres cuando se crea cuenta",
  path: ["password"],
});

export type CustomerFormData = z.infer<typeof customerSchemaCompra>;

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
  const { emailValidation, validateEmail } = useEmailValidation();
  
  // 🆕 Lógica para crear cuenta basada en email
  const shouldCreateAccount = !isLoggedIn && !isPreregistration && emailValidation.emailExists === false;
  const emailExistsAndNotLoggedIn = !isLoggedIn && emailValidation.emailExists === true;
  
  // 🔧 USAR SCHEMA CORRECTO según el tipo
  const schema = isPreregistration ? customerSchemaPreregistro : customerSchemaCompra;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
    getValues
  } = useForm<CustomerFormData>({
    resolver: zodResolver(schema), // 🔧 Schema dinámico
    defaultValues: {
      name: initialData.name || '',
      email: initialData.email || '',
      phone: initialData.phone || '',
      company: initialData.company || '',
      createAccount: shouldCreateAccount, // 🆕 Basado en validación de email
      password: initialData.password || '',
    },
    mode: 'onChange'
  });

  // 🆕 Validar email en tiempo real SOLO para compras
  const watchedEmail = watch('email');
  
  useEffect(() => {
    // 🔧 NO validar email para preregistros
    if (isPreregistration) return;
    
    // 🔧 ARREGLO: Condiciones más estrictas para evitar loops
    if (!watchedEmail || 
        isLoggedIn || 
        !watchedEmail.includes('@') || 
        watchedEmail.length < 5) { // Email mínimo válido
      return;
    }
    
    // Solo validar si el email cambió realmente
    const timeoutId = setTimeout(() => {
      console.log('🕰️ Debounce timeout triggered for email:', watchedEmail);
      validateEmail(watchedEmail);
    }, 1000); // Aumentar debounce a 1 segundo
    
    return () => {
      console.log('🗑️ Clearing timeout for email:', watchedEmail);
      clearTimeout(timeoutId);
    };
  }, [watchedEmail, isLoggedIn, isPreregistration, validateEmail]);
  
  // 🆕 Actualizar createAccount cuando cambie la validación de email
  useEffect(() => {
    // 🔧 ARREGLO: Solo para compras, no para preregistros
    if (!isLoggedIn && !isPreregistration) {
      const newCreateAccount = emailValidation.emailExists === false;
      console.log('🔄 CustomerForm - Updating createAccount:', {
        emailExists: emailValidation.emailExists,
        newCreateAccount,
        isPreregistration,
        currentCreateAccount: watch('createAccount')
      });
      setValue('createAccount', newCreateAccount);
    }
  }, [emailValidation.emailExists, isLoggedIn, isPreregistration, setValue, watch]);

  // 🔧 SOLUCIÓN FINAL: Notificar cambios más rápido
  React.useEffect(() => {
    if (onValidationChange) {
      if (isValid) {
        const timeoutId = setTimeout(() => {
          const formData = getValues();
          
          console.log('📝 CustomerForm - Form is valid, sending data:', {
            isValid,
            isPreregistration,
            formData: {
              ...formData,
              passwordLength: formData.password?.length || 0,
              passwordProvided: !!formData.password
            },
            createAccount: formData.createAccount,
            isLoggedIn
          });
          
          onValidationChange(true, formData);
        }, 10);
        return () => clearTimeout(timeoutId);
      } else {
        console.log('🚫 CustomerForm - Form is invalid, errors:', errors);
        onValidationChange(false);
      }
    }
  }, [isValid, errors, onValidationChange, getValues, isPreregistration, isLoggedIn]);

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

          {/* Email - Simplificado para preregistros */}
          <div>
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Correo electrónico *
            </Label>
            
            {isPreregistration ? (
              /* VERSION SIMPLE PARA PREREGISTROS */
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="correo@ejemplo.com"
                className={errors.email ? 'border-red-500' : ''}
                disabled={isLoggedIn}
              />
            ) : (
              /* VERSION CON VALIDACION PARA COMPRAS */
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="correo@ejemplo.com"
                  className={`${errors.email ? 'border-red-500' : ''} ${emailExistsAndNotLoggedIn ? 'border-orange-400' : ''} pr-10`}
                  disabled={isLoggedIn}
                />
                
                {/* Indicador de estado del email */}
                <div className="absolute right-0 top-0 h-full px-3 flex items-center">
                  {emailValidation.isValidating && (
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  )}
                  {!emailValidation.isValidating && emailValidation.emailExists === false && watchedEmail && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  {!emailValidation.isValidating && emailValidation.emailExists === true && (
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                  )}
                </div>
              </div>
            )}
            
            {/* Mensajes de estado del email */}
            {errors.email && (
              <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
            )}
            
            {/* Mensajes SOLO para compras */}
            {!isPreregistration && !errors.email && emailValidation.emailExists === true && !isLoggedIn && (
              <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                    Email ya registrado
                  </Badge>
                </div>
                <p className="text-sm text-orange-700 mt-1">
                  🔄 Este email ya tiene cuenta. Tus boletos se asociarán automáticamente.
                </p>
              </div>
            )}
            
            {!isPreregistration && !errors.email && emailValidation.emailExists === false && watchedEmail && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                    Email disponible
                  </Badge>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  ✨ Se creará tu cuenta automáticamente.
                </p>
              </div>
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

        {/* Crear cuenta - Solo para emails NUEVOS */}
        {shouldCreateAccount && (
          <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-blue-600" />
              <div>
                <Label className="text-base font-medium text-blue-900">Crear cuenta nueva</Label>
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

        {/* Información adicional según el flujo - MEJORADA */}
        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
          {isPreregistration ? (
            <p>
              📧 Te contactaremos a tu correo con información sobre disponibilidad y compra de boletos.
            </p>
          ) : isLoggedIn ? (
            <p>
              🎫 Procederemos al pago con los datos de tu cuenta. Podrás configurar los asistentes después.
            </p>
          ) : emailExistsAndNotLoggedIn ? (
            <div className="bg-orange-50 p-3 rounded border border-orange-200">
              <p className="text-orange-800">
                🔄 <strong>Email ya registrado:</strong> Tus boletos se asociarán automáticamente a tu cuenta existente. Después de la compra, podrás iniciar sesión para ver y gestionar tus boletos.
              </p>
            </div>
          ) : shouldCreateAccount ? (
            <p>
              🔐 Se creará tu cuenta automáticamente después del pago exitoso. Te enviaremos los boletos por email y podrás acceder a tu cuenta inmediatamente.
            </p>
          ) : (
            <p>
              📋 Procederemos con la compra usando los datos proporcionados.
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
            <div>Email Exists: {emailValidation.emailExists === null ? 'Unknown' : emailValidation.emailExists ? 'Yes' : 'No'}</div>
            <div>Email Validating: {emailValidation.isValidating ? 'Yes' : 'No'}</div>
            <div>Should Create Account: {shouldCreateAccount ? 'Yes' : 'No'}</div>
            <div>Email Exists And Not Logged In: {emailExistsAndNotLoggedIn ? 'Yes' : 'No'}</div>
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
