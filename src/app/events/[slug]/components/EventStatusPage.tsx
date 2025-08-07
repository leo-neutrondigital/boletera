'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Clock, CheckCircle, XCircle, Eye, Calendar, MapPin, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Event } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface EventStatusPageProps {
  event: Event;
  status: 'not_published' | 'expired' | 'in_progress' | 'upcoming';
}

export function EventStatusPage({ event, status }: EventStatusPageProps) {
  const router = useRouter();

  const statusConfig = {
    not_published: {
      icon: Eye,
      title: 'Evento no disponible',
      description: 'Este evento aún no está disponible para el público',
      color: 'gray',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200'
    },
    expired: {
      icon: XCircle,
      title: 'Evento finalizado',
      description: 'Este evento ya ha terminado',
      color: 'red',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    },
    in_progress: {
      icon: Clock,
      title: 'Evento en curso',
      description: 'Este evento ya ha comenzado',
      color: 'blue',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    upcoming: {
      icon: CheckCircle,
      title: 'Próximamente',
      description: 'Las ventas aún no han comenzado',
      color: 'green',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  const formatEventDate = (date: Date) => {
    return format(date, "EEEE, d 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es });
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'in_progress':
        return {
          title: '🎪 El evento está en curso',
          message: 'Las ventas de boletos han finalizado, pero puedes contactar al organizador para consultar disponibilidad.',
          action: 'Contactar organizador'
        };
      case 'expired':
        return {
          title: '📅 Evento finalizado',
          message: 'Este evento ya ha terminado. ¡Esperamos que hayas disfrutado si asististe!',
          action: 'Ver otros eventos'
        };
      case 'not_published':
        return {
          title: '👁️ No disponible',
          message: 'Este evento no está disponible para el público o aún no ha sido publicado.',
          action: 'Volver al inicio'
        };
      default:
        return {
          title: '⏰ Próximamente',
          message: 'Las ventas de boletos aún no han comenzado para este evento.',
          action: 'Volver después'
        };
    }
  };

  const statusInfo = getStatusMessage();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>

            <h1 className="text-lg font-semibold text-gray-900 truncate max-w-md">
              {event.name}
            </h1>
            
            <div className="flex items-center gap-4">
              {event.contact_email && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`mailto:${event.contact_email}`}>
                    <Mail className="h-4 w-4 mr-2" />
                    Contacto
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          
          {/* Estado del evento */}
          <Alert className={`${config.bgColor} ${config.borderColor}`}>
            <Icon className={`h-4 w-4 text-${config.color}-600`} />
            <AlertDescription className={`text-${config.color}-800`}>
              <div className="flex items-center justify-between">
                <div>
                  <strong>{statusInfo.title}</strong>
                  <p className="mt-1">{statusInfo.message}</p>
                </div>
                <Badge variant="outline" className={`${config.bgColor} text-${config.color}-700 border-${config.color}-300`}>
                  {config.title}
                </Badge>
              </div>
            </AlertDescription>
          </Alert>

          {/* Información del evento */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {event.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* Fechas */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">📅 Fecha de inicio</h4>
                  <p className="text-gray-600">{formatEventDate(event.start_date)}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">🏁 Fecha de finalización</h4>
                  <p className="text-gray-600">{formatEventDate(event.end_date)}</p>
                </div>
              </div>

              {/* Ubicación */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Ubicación
                </h4>
                <p className="text-gray-600">{event.location}</p>
              </div>

              {/* Descripción */}
              {event.public_description && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">📄 Descripción</h4>
                  <p className="text-gray-600">{event.public_description}</p>
                </div>
              )}

              {/* Términos específicos para evento en curso */}
              {status === 'in_progress' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">💡 ¿Necesitas un boleto?</h4>
                  <p className="text-blue-800 text-sm">
                    Aunque las ventas regulares han finalizado, el organizador puede tener boletos disponibles 
                    en la entrada o mediante venta directa. Te recomendamos contactarlos directamente.
                  </p>
                </div>
              )}

            </CardContent>
          </Card>

          {/* Acciones */}
          <div className="flex justify-center gap-4">
            {event.contact_email && status === 'in_progress' && (
              <Button asChild>
                <a href={`mailto:${event.contact_email}?subject=Consulta sobre boletos - ${event.name}`}>
                  <Mail className="h-4 w-4 mr-2" />
                  Contactar organizador
                </a>
              </Button>
            )}
            
            <Button variant="outline" onClick={() => router.push('/')}>
              Volver al inicio
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}
