'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  AlertTriangle,
  QrCode,
  ArrowLeft,
  Clock,
  CheckCircle2,
  User,
  Mail,
  Phone,
  Ticket
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { authenticatedGet, authenticatedPost } from '@/lib/utils/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TicketData {
  id: string;
  attendee_name: string;
  attendee_email?: string;
  attendee_phone?: string;
  qr_code: string;
  created_at: Date | any;
  last_checkin?: Date | any;
  used_days: string[];
  event: {
    id: string;
    name: string;
    location: string;
    start_date: Date | any;
    end_date: Date | any;
  } | null;
  ticket_type: {
    id: string;
    name: string;
    access_type: string;
  } | null;
}

export default function AlreadyUsedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const qrId = searchParams.get('qr');
  const error = searchParams.get('error');
  const details = searchParams.get('details');

  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 🆕 Obtener información del ticket
  useEffect(() => {
    const fetchTicketData = async () => {
      if (!qrId) {
        setIsLoading(false);
        return;
      }

      try {
        // Usar el nuevo endpoint para obtener información del ticket por QR
        const response = await authenticatedGet(`/api/tickets/qr/${qrId}`);
        const result = await response.json();
        
        if (response.ok && result.success) {
          setTicketData(result.ticket);
        } else {
          console.error('Error fetching ticket data:', result);
        }
      } catch (error) {
        console.error('Error fetching ticket data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTicketData();
  }, [qrId]);

  // Formatear fecha y hora del último check-in
  const formatLastCheckIn = (dateData: any) => {
    try {
      const date = dateData?.toDate ? dateData.toDate() : new Date(dateData);
      return format(date, "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es });
    } catch {
      return 'Fecha no disponible';
    }
  };

  return (
  <AuthGuard allowedRoles={['admin', 'gestor', 'comprobador']}>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header de advertencia */}
          <div className="text-center mb-8">
            <div className="bg-orange-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-12 w-12 text-orange-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              ¡Boleto ya validado!
            </h1>
            <p className="text-gray-600">
              Este boleto ya fue usado anteriormente
            </p>
          </div>

          {/* Información del error */}
          <Alert className="mb-6 bg-orange-50 border-orange-200">
            <CheckCircle2 className="h-4 w-4 text-orange-600" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium text-orange-800">
                  Check-in previamente realizado
                </p>
                <p className="text-sm text-orange-700">
                  {details || 'Este boleto ya fue validado para hoy.'}
                </p>
              </div>
            </AlertDescription>
          </Alert>

          {/* Información del QR */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Información del escaneo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* QR ID */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">QR Code:</span>
                <Badge variant="outline" className="font-mono text-xs">
                  {qrId}
                </Badge>
              </div>

              {/* Hora del escaneo */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Escaneado:</span>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  {new Date().toLocaleTimeString()}
                </div>
              </div>

              {/* Estado */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Estado:</span>
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  Ya validado
                </Badge>
              </div>
              
            </CardContent>
          </Card>

          {/* 🆕 Información del ticket */}
          {ticketData && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="h-5 w-5" />
                  Información del boleto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* Asistente */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Asistente:</span>
                    <span className="font-medium">{ticketData.attendee_name}</span>
                  </div>
                  
                  {ticketData.attendee_email && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Email:</span>
                      <span className="text-sm text-gray-600">{ticketData.attendee_email}</span>
                    </div>
                  )}
                  
                  {ticketData.attendee_phone && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Teléfono:</span>
                      <span className="text-sm text-gray-600">{ticketData.attendee_phone}</span>
                    </div>
                  )}
                </div>

                <hr className="border-gray-200" />

                {/* Evento */}
                {ticketData.event && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Evento:</span>
                      <span className="font-medium">{ticketData.event.name}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Ubicación:</span>
                      <span className="text-sm text-gray-600">{ticketData.event.location}</span>
                    </div>
                  </div>
                )}

                <hr className="border-gray-200" />

                {/* Check-in information */}
                <div className="space-y-2">
                  {ticketData.last_checkin && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Último check-in:</span>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4" />
                        {formatLastCheckIn(ticketData.last_checkin)}
                      </div>
                    </div>
                  )}
                  
                  {ticketData.used_days && ticketData.used_days.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Días utilizados:</span>
                      <div className="flex flex-wrap gap-1">
                        {ticketData.used_days.map((day) => (
                          <Badge key={day} variant="secondary" className="text-xs">
                            {day}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {ticketData.ticket_type && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Tipo de boleto:</span>
                      <Badge variant="outline">{ticketData.ticket_type.name}</Badge>
                    </div>
                  )}
                </div>

              </CardContent>
            </Card>
          )}

          {/* Estado de carga */}
          {isLoading && (
            <Card className="mb-6">
              <CardContent className="py-8">
                <div className="text-center text-gray-500">
                  Cargando información del boleto...
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instrucciones */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">¿Qué significa esto?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 p-1 rounded-full mt-1">
                  <CheckCircle2 className="h-3 w-3 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">El asistente ya ingresó</p>
                  <p className="text-gray-600">Este boleto fue validado correctamente en una ocasión anterior.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="bg-orange-100 p-1 rounded-full mt-1">
                  <AlertTriangle className="h-3 w-3 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium">No se permite reingreso</p>
                  <p className="text-gray-600">Para prevenir el uso fraudulento, los boletos solo se pueden usar una vez por día.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="bg-green-100 p-1 rounded-full mt-1">
                  <QrCode className="h-3 w-3 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Sistema funcionando correctamente</p>
                  <p className="text-gray-600">Esta alerta confirma que el sistema de validación está funcionando como se esperaba.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Acciones */}
          <div className="space-y-3">
            <Button 
              onClick={() => router.push('/scanner/scan')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6"
              size="lg"
            >
              <QrCode className="w-5 h-5 mr-2" />
              Escanear otro boleto
            </Button>
            
            <Button 
              onClick={() => router.push('/scanner')}
              variant="ghost"
              className="w-full text-gray-600 hover:text-gray-800 text-sm py-2"
              size="sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al dashboard
            </Button>
          </div>

          {/* Información adicional */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500">
              Si crees que esto es un error, contacta al administrador del evento.
            </p>
          </div>

        </div>
      </div>
    </AuthGuard>
  );
}
