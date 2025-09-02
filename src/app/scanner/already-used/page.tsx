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
          console.log('🎫 Ticket data received:', result.ticket);
          console.log('📅 Used days data:', result.ticket.used_days);
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
      let date: Date;
      
      // Manejar diferentes formatos de fecha
      if (dateData && typeof dateData === 'object') {
        if (dateData.toDate && typeof dateData.toDate === 'function') {
          // Firebase Timestamp
          date = dateData.toDate();
        } else if (dateData._seconds) {
          // Firebase Timestamp serializado
          date = new Date(dateData._seconds * 1000);
        } else if (dateData.seconds) {
          // Firebase Timestamp serializado alternativo
          date = new Date(dateData.seconds * 1000);
        } else {
          // Objeto Date
          date = new Date(dateData);
        }
      } else if (typeof dateData === 'string' || typeof dateData === 'number') {
        // String o timestamp
        date = new Date(dateData);
      } else {
        return 'Fecha no disponible';
      }
      
      // Verificar que la fecha es válida
      if (isNaN(date.getTime())) {
        return 'Fecha no disponible';
      }
      
      return format(date, "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es });
    } catch (error) {
      console.error('Error formatting date:', error, dateData);
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

          {/* 🆕 Botón principal de acción - Movido aquí para mejor accesibilidad */}
          <div className="hidden sm:block mb-6">
            <Button 
              onClick={() => router.push('/scanner/scan')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6"
              size="lg"
            >
              <QrCode className="w-5 h-5 mr-2" />
              Escanear otro boleto
            </Button>
          </div>

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
                    <span className="font-medium">{ticketData.attendee_name || 'No disponible'}</span>
                  </div>
                  
                  {ticketData.attendee_email && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Email:</span>
                      <span className="text-sm text-gray-600">{String(ticketData.attendee_email)}</span>
                    </div>
                  )}
                  
                  {ticketData.attendee_phone && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Teléfono:</span>
                      <span className="text-sm text-gray-600">{String(ticketData.attendee_phone)}</span>
                    </div>
                  )}
                </div>

                <hr className="border-gray-200" />

                {/* Evento */}
                {ticketData.event && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Evento:</span>
                      <span className="font-medium">{String(ticketData.event.name || 'No disponible')}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Ubicación:</span>
                      <span className="text-sm text-gray-600">{String(ticketData.event.location || 'No disponible')}</span>
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
                  
                  {ticketData.used_days && Array.isArray(ticketData.used_days) && ticketData.used_days.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Días utilizados:</span>
                      <div className="flex flex-wrap gap-1">
                        {ticketData.used_days.map((day: any, index) => {
                          // Manejar diferentes formatos de día
                          let dayText = '';
                          
                          if (typeof day === 'string') {
                            dayText = day;
                          } else if (typeof day === 'object' && day !== null) {
                            // Si es un objeto, extraer información relevante
                            if (day.date) {
                              dayText = day.date;
                            } else if (day.day) {
                              dayText = day.day;
                            } else if (day._seconds) {
                              // Si es un timestamp
                              const date = new Date(day._seconds * 1000);
                              dayText = date.toLocaleDateString('es-MX');
                            } else {
                              // Como último recurso, convertir a JSON para debugging
                              dayText = `Debug: ${JSON.stringify(day)}`;
                            }
                          } else {
                            dayText = String(day);
                          }
                          
                          return (
                            <Badge key={`day-${index}`} variant="secondary" className="text-xs">
                              {dayText}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {ticketData.ticket_type && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Tipo de boleto:</span>
                      <Badge variant="outline">{String(ticketData.ticket_type.name || 'No disponible')}</Badge>
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

          {/* Botón de volver al dashboard - Solo desktop */}
          <div className="hidden sm:block mb-6">
            <Button 
              onClick={() => router.push('/scanner')}
              variant="ghost"
              className="w-full text-gray-600 hover:text-gray-800 text-sm py-2 flex items-center justify-center"
              size="sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al dashboard
            </Button>
          </div>

          {/* 🆕 Botón flotante "Dashboard" para móvil - Esquina superior derecha */}
          <div className="fixed top-4 right-4 sm:hidden z-50">
            <Button 
              onClick={() => router.push('/scanner')}
              variant="secondary"
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 shadow-lg border border-gray-300 rounded-full px-3 py-2 text-sm"
              size="sm"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Dashboard
            </Button>
          </div>

          {/* 🆕 Botón flotante para móvil */}
          <div className="fixed bottom-10 left-4 right-4 sm:hidden z-50">
            <Button 
              onClick={() => router.push('/scanner/scan')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6 shadow-lg border-2 border-white rounded-lg backdrop-blur-sm"
              size="lg"
            >
              <QrCode className="w-5 h-5 mr-2" />
              Escanear otro boleto
            </Button>
          </div>

          {/* Información adicional */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500 mb-20">
              Si crees que esto es un error, contacta al administrador del evento.
            </p>
          </div>

        </div>
      </div>
    </AuthGuard>
  );
}
