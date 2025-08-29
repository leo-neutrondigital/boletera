'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Mail, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { createPreregistration, isUserPreregistered } from '@/lib/api/preregistrations';
import type { Event } from '@/types';

interface PreregisterSectionProps {
  event: Event;
}

export function PreregisterSection({ event }: PreregisterSectionProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  const handlePreregister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      // Redirigir a registro con intención de prerregistro
      const registerUrl = `/register?intent=preregister&event=${event.slug}&redirect=${encodeURIComponent(window.location.pathname)}`;
      router.push(registerUrl);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Verificar si ya está prerregistrado
      const alreadyPreregistered = await isUserPreregistered(user.uid, event.id);
      
      if (alreadyPreregistered) {
        setError('Ya estás prerregistrado para este evento');
        setIsLoading(false);
        return;
      }

      // Crear prerregistro
      await createPreregistration({
        user_id: user.uid,
        event_id: event.id,
        source: 'landing_page',
      });

      setIsSuccess(true);
      
      // TODO: Enviar email de confirmación
      
    } catch (err) {
      console.error('Error creating preregistration:', err);
      setError('Error al procesar el prerregistro. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <h3 className="text-xl font-semibold text-green-900">
              ¡Prerregistro exitoso!
            </h3>
            <p className="text-green-700">
              Te hemos prerregistrado para <strong>{event.name}</strong>.
              Te notificaremos cuando los boletos estén disponibles.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-green-600">
              <Mail className="h-4 w-4" />
              <span>Revisa tu email para la confirmación</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-blue-500" />
          Prerregistro para {event.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mensaje personalizado del evento */}
        {event.preregistration_message && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-900 leading-relaxed">
              {event.preregistration_message}
            </p>
          </div>
        )}

        {/* Beneficios del prerregistro */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Beneficios del prerregistro:</h4>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span>Notificación inmediata cuando abra la venta</span>
            </li>
            <li className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span>Acceso prioritario a boletos de descuento</span>
            </li>
            <li className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span>Información exclusiva sobre el evento</span>
            </li>
            <li className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span>Sin compromiso de compra</span>
            </li>
          </ul>
        </div>

        {/* Formulario de prerregistro */}
        {user ? (
          <form onSubmit={handlePreregister} className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">
                Te has identificado como:
              </p>
              <p className="font-medium text-gray-900">{String((user && (user as any).name) || (user && (user as any).email) || '')}</p>
              <p className="text-sm text-gray-600">{user?.email || ''}</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button 
              type="submit"
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Procesando prerregistro...
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Confirmar prerregistro
                </>
              )}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-800 font-medium mb-1">
                    Inicia sesión para prerregistrarte
                  </p>
                  <p className="text-amber-700 text-sm">
                    Necesitas una cuenta para recibir notificaciones sobre la disponibilidad de boletos.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button 
                onClick={() => router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)}
                variant="outline"
                className="w-full"
              >
                Iniciar sesión
              </Button>
              <Button 
                onClick={() => router.push(`/register?intent=preregister&event=${event.slug}&redirect=${encodeURIComponent(window.location.pathname)}`)}
                className="w-full"
              >
                Crear cuenta
              </Button>
            </div>
          </div>
        )}

        {/* Información adicional */}
        <div className="text-center pt-4 border-t">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-2">
            <Users className="h-4 w-4" />
            <span>¿Conoces a alguien interesado?</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: event.name,
                  text: `¡Mira este evento: ${event.name}!`,
                  url: window.location.href,
                });
              } else {
                // Fallback: copiar al portapapeles
                navigator.clipboard.writeText(window.location.href);
                // TODO: Mostrar toast de confirmación
              }
            }}
          >
            Compartir evento
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
