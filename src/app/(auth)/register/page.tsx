'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/client';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { User, Mail, Lock, Bell, ShoppingCart, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Obtener parámetros de la URL
  const intent = searchParams.get('intent'); // 'preregister' | 'purchase'
  const eventSlug = searchParams.get('event');
  const redirectUrl = searchParams.get('redirect');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    company: '',
    marketingConsent: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isPreregisterIntent = intent === 'preregister';
  const isPurchaseIntent = intent === 'purchase';

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Crear cuenta en Firebase Auth
      const userCred = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCred.user;

      // Actualizar perfil en Auth
      await updateProfile(user, { displayName: formData.name });

      // Guardar en Firestore con campos adicionales
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        name: formData.name,
        phone: formData.phone || '',
        company: formData.company || '',
        roles: ['usuario'],
        marketing_consent: formData.marketingConsent,
        created_via: isPreregisterIntent ? 'preregistration' : 'purchase',
        address: {
          city: '',
          country: 'México'
        },
        created_at: serverTimestamp(),
      });

      // 🆕 AUTO-VINCULAR BOLETOS EXISTENTES POR EMAIL
      try {
        console.log('🔍 Checking for orphan tickets for email:', user.email);
        
        // Buscar boletos sin usuario asignado (user_id = null) con este email
        const { collection, query, where, getDocs, updateDoc, doc } = await import('firebase/firestore');
        
        const ticketsQuery = query(
          collection(db, 'tickets'),
          where('customer_email', '==', user.email),
          where('user_id', '==', null) // Solo boletos huérfanos
        );
        
        const ticketsSnapshot = await getDocs(ticketsQuery);
        
        if (!ticketsSnapshot.empty) {
          console.log(`🎫 Found ${ticketsSnapshot.size} orphan tickets to link`);
          
          // Actualizar cada boleto para vincularlo al usuario
          const updatePromises = ticketsSnapshot.docs.map(ticketDoc => {
            const updateData: any = {
              user_id: user.uid,
              linked_at: serverTimestamp(),
              linked_via: 'auto_recovery'
            };
            
            // Si el boleto tiene datos de recuperación, marcar como recuperado
            const ticketData = ticketDoc.data();
            if (ticketData.orphan_recovery_data) {
              updateData['orphan_recovery_data.recovery_status'] = 'recovered';
              updateData['orphan_recovery_data.recovered_at'] = serverTimestamp();
              updateData['orphan_recovery_data.linked_to_user'] = user.uid;
            }
            
            return updateDoc(doc(db, 'tickets', ticketDoc.id), updateData);
          });
          
          await Promise.all(updatePromises);
          
          console.log(`✅ Successfully linked ${ticketsSnapshot.size} tickets to user ${user.uid}`);
          
          // Mostrar notificación al usuario
          setSuccessMessage(`¡Cuenta creada exitosamente! Se vincularon ${ticketsSnapshot.size} boleto${ticketsSnapshot.size > 1 ? 's' : ''} a tu cuenta.`);
          
          // Redirigir a mis boletos después de un breve delay
          setTimeout(() => {
            router.push('/my-tickets');
          }, 2000);
        } else {
          console.log('📝 No orphan tickets found for this email');
        }
      } catch (linkError) {
        console.error('❌ Error linking orphan tickets:', linkError);
        // No fallar la creación de cuenta si falla la vinculación
      }

      // Redirigir según la intención (solo si no hay boletos vinculados)
      if (!successMessage) {
        if (redirectUrl) {
          router.push(redirectUrl);
        } else if (isPreregisterIntent && eventSlug) {
          router.push(`/events/${eventSlug}`);
        } else {
          router.push('/dashboard');
        }
      }

    } catch (err: any) {
      console.error('Error creating account:', err);
      setError(err.message || 'Error al crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  const getPageTitle = () => {
    if (isPreregisterIntent) return 'Crear cuenta para prerregistro';
    if (isPurchaseIntent) return 'Crear cuenta para comprar';
    return 'Crear cuenta';
  };

  const getPageDescription = () => {
    if (isPreregisterIntent) return 'Te notificaremos cuando los boletos estén disponibles';
    if (isPurchaseIntent) return 'Completa tu registro para proceder con la compra';
    return 'Únete a nuestra plataforma de eventos';
  };

  const getIntentBadge = () => {
    if (isPreregisterIntent) {
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200">
          <Bell className="h-3 w-3 mr-1" />
          Prerregistro
        </Badge>
      );
    }
    if (isPurchaseIntent) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <ShoppingCart className="h-3 w-3 mr-1" />
          Compra
        </Badge>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          
          {getIntentBadge()}
          
          <h2 className="mt-4 text-3xl font-bold text-gray-900">
            {getPageTitle()}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {getPageDescription()}
          </p>
        </div>

        {/* Formulario */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Información Personal</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}
              
              {successMessage && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
                  ✅ {successMessage}
                </div>
              )}

              {/* Nombre completo */}
              <div>
                <Label htmlFor="name">Nombre completo *</Label>
                <div className="mt-1 relative">
                  <Input
                    id="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="pl-10"
                    placeholder="Tu nombre completo"
                  />
                  <User className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
                </div>
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email">Correo electrónico *</Label>
                <div className="mt-1 relative">
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="pl-10"
                    placeholder="tu@email.com"
                  />
                  <Mail className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
                </div>
              </div>

              {/* Contraseña */}
              <div>
                <Label htmlFor="password">Contraseña *</Label>
                <div className="mt-1 relative">
                  <Input
                    id="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="pl-10"
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                  />
                  <Lock className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
                </div>
              </div>

              {/* Campos adicionales para compra */}
              {isPurchaseIntent && (
                <>
                  <div>
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="+52 123 456 7890"
                    />
                  </div>

                  <div>
                    <Label htmlFor="company">Empresa (opcional)</Label>
                    <Input
                      id="company"
                      type="text"
                      value={formData.company}
                      onChange={(e) => handleInputChange('company', e.target.value)}
                      placeholder="Nombre de tu empresa"
                    />
                  </div>
                </>
              )}

              {/* Consentimiento de marketing */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="marketing"
                  checked={formData.marketingConsent}
                  onCheckedChange={(checked) => 
                    handleInputChange('marketingConsent', checked === true)
                  }
                />
                <Label htmlFor="marketing" className="text-sm text-gray-600">
                  Acepto recibir notificaciones sobre eventos y promociones
                </Label>
              </div>

              {/* Términos y condiciones */}
              <div className="text-xs text-gray-500">
                Al crear una cuenta, aceptas nuestros{' '}
                <a href="/terms" className="text-blue-600 hover:underline">
                  Términos y Condiciones
                </a>{' '}
                y{' '}
                <a href="/privacy" className="text-blue-600 hover:underline">
                  Política de Privacidad
                </a>
              </div>

              {/* Botón de registro */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Creando cuenta...
                  </>
                ) : (
                  <>
                    {isPreregisterIntent && <Bell className="h-4 w-4 mr-2" />}
                    {isPurchaseIntent && <ShoppingCart className="h-4 w-4 mr-2" />}
                    {!isPreregisterIntent && !isPurchaseIntent && <User className="h-4 w-4 mr-2" />}
                    Crear cuenta
                  </>
                )}
              </Button>
            </form>

            {/* Link para iniciar sesión */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                ¿Ya tienes cuenta?{' '}
                <Button
                  variant="link"
                  className="p-0 h-auto text-blue-600"
                  onClick={() => {
                    const params = new URLSearchParams();
                    if (redirectUrl) params.set('redirect', redirectUrl);
                    router.push(`/login?${params.toString()}`);
                  }}
                >
                  Inicia sesión
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Información adicional según la intención */}
        {isPreregisterIntent && (
          <Card className="mt-6 bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="text-center">
                <Bell className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <h3 className="text-sm font-medium text-blue-900 mb-1">
                  ¿Qué es el prerregistro?
                </h3>
                <p className="text-xs text-blue-700">
                  Te notificaremos por email cuando los boletos estén disponibles para compra.
                  No hay compromiso de compra.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {isPurchaseIntent && (
          <Card className="mt-6 bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="text-center">
                <ShoppingCart className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <h3 className="text-sm font-medium text-green-900 mb-1">
                  Compra segura
                </h3>
                <p className="text-xs text-green-700">
                  Después de crear tu cuenta, podrás proceder con el pago seguro de tus boletos.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
