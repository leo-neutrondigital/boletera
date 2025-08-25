'use client';

import { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import { User, Mail, Phone, Building, MapPin, Save, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface ProfileFormData {
  name: string;
  phone: string;
  company: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
}

export function ProfileForm() {
  const { user, userData, refreshUserData } = useAuth();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    phone: '',
    company: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: 'México',
      zipCode: ''
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Cargar datos iniciales del usuario
  useEffect(() => {
    if (userData) {
      const initialData: ProfileFormData = {
        name: userData.name || '',
        phone: userData.phone || '',
        company: userData.company || '',
        address: {
          street: userData.address?.street || '',
          city: userData.address?.city || '',
          state: userData.address?.state || '',
          country: userData.address?.country || 'México',
          zipCode: userData.address?.zipCode || ''
        }
      };
      setFormData(initialData);
    }
  }, [userData]);

  const handleInputChange = (field: string, value: string, isAddress = false) => {
    if (isAddress) {
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
    setHasChanges(true);
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !userData) {
      setError('Usuario no autenticado.');
      return;
    }

    if (!formData.name.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Actualizar en Firestore
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        name: formData.name.trim(),
        phone: formData.phone.trim() || null,
        company: formData.company.trim() || null,
        address: {
          street: formData.address.street.trim() || null,
          city: formData.address.city.trim() || null,
          state: formData.address.state.trim() || null,
          country: formData.address.country.trim() || 'México',
          zipCode: formData.address.zipCode.trim() || null
        },
        updated_at: new Date()
      });

      // Refrescar datos del contexto
      await refreshUserData();
      
      setHasChanges(false);

      toast({
        title: "✅ Perfil actualizado",
        description: "Tus datos se han guardado exitosamente.",
      });

    } catch (err: any) {
      console.error('Profile update error:', err);
      const errorMessage = 'Error al actualizar el perfil. Inténtalo nuevamente.';
      setError(errorMessage);
      
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5 text-blue-600" />
          Información personal
        </CardTitle>
        <CardDescription>
          Actualiza tu información de perfil y datos de contacto
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Información básica */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
              Datos básicos
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Nombre */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Nombre completo <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Tu nombre completo"
                    className="pl-10"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              {/* Email (readonly) */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Correo electrónico
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ''}
                    className="pl-10 bg-gray-50"
                    disabled
                    readOnly
                  />
                </div>
                <p className="text-xs text-gray-500">
                  El email no se puede cambiar desde aquí
                </p>
              </div>

              {/* Teléfono */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  Teléfono
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+52 999 123 4567"
                    className="pl-10"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Empresa */}
              <div className="space-y-2">
                <Label htmlFor="company" className="text-sm font-medium">
                  Empresa
                </Label>
                <div className="relative">
                  <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="company"
                    type="text"
                    value={formData.company}
                    onChange={(e) => handleInputChange('company', e.target.value)}
                    placeholder="Nombre de tu empresa"
                    className="pl-10"
                    disabled={loading}
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Dirección */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
              Dirección
            </h3>

            <div className="space-y-4">
              
              {/* Calle */}
              <div className="space-y-2">
                <Label htmlFor="street" className="text-sm font-medium">
                  Dirección
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="street"
                    type="text"
                    value={formData.address.street}
                    onChange={(e) => handleInputChange('street', e.target.value, true)}
                    placeholder="Calle y número"
                    className="pl-10"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Ciudad */}
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-sm font-medium">
                    Ciudad
                  </Label>
                  <Input
                    id="city"
                    type="text"
                    value={formData.address.city}
                    onChange={(e) => handleInputChange('city', e.target.value, true)}
                    placeholder="Ciudad"
                    disabled={loading}
                  />
                </div>

                {/* Estado */}
                <div className="space-y-2">
                  <Label htmlFor="state" className="text-sm font-medium">
                    Estado
                  </Label>
                  <Input
                    id="state"
                    type="text"
                    value={formData.address.state}
                    onChange={(e) => handleInputChange('state', e.target.value, true)}
                    placeholder="Estado"
                    disabled={loading}
                  />
                </div>

                {/* Código postal */}
                <div className="space-y-2">
                  <Label htmlFor="zipCode" className="text-sm font-medium">
                    Código postal
                  </Label>
                  <Input
                    id="zipCode"
                    type="text"
                    value={formData.address.zipCode}
                    onChange={(e) => handleInputChange('zipCode', e.target.value, true)}
                    placeholder="12345"
                    disabled={loading}
                  />
                </div>

              </div>

              {/* País */}
              <div className="space-y-2">
                <Label htmlFor="country" className="text-sm font-medium">
                  País
                </Label>
                <select
                  id="country"
                  value={formData.address.country}
                  onChange={(e) => handleInputChange('country', e.target.value, true)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                >
                  <option value="México">México</option>
                  <option value="Estados Unidos">Estados Unidos</option>
                  <option value="Guatemala">Guatemala</option>
                  <option value="Belice">Belice</option>
                  <option value="El Salvador">El Salvador</option>
                  <option value="Honduras">Honduras</option>
                  <option value="Nicaragua">Nicaragua</option>
                  <option value="Costa Rica">Costa Rica</option>
                  <option value="Panamá">Panamá</option>
                </select>
              </div>

            </div>
          </div>

          {/* Botón de guardar */}
          <div className="flex items-center justify-between pt-6 border-t">
            <p className="text-sm text-gray-500">
              {hasChanges ? 'Tienes cambios sin guardar' : 'Todos los cambios han sido guardados'}
            </p>
            <Button
              type="submit"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              disabled={loading || !hasChanges}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Guardar cambios
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
