'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { 
  CheckCircle, 
  User, 
  Calendar, 
  MapPin, 
  Ticket,
  Clock,
  Undo2,
  QrCode,
  ArrowLeft,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { authenticatedPost, authenticatedGet } from '@/lib/utils/api';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TicketData {
  id: string;
  attendee_name: string;
  attendee_email?: string;
  attendee_phone?: string;
  special_requirements?: string;
  event: {
    id: string;
    name: string;
    start_date: Date;
    end_date: Date;
    location: string;
  };
  ticket_type: {
    id: string;
    name: string;
    access_type: string;
  };
  checkin_time: Date;
  used_days: string[];
  can_undo: boolean;
  undo_deadline?: string;
}

export default function SuccessPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const ticketId = params.ticketId as string;
  const qrId = searchParams.get('qr');
  
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [autoRedirectSeconds, setAutoRedirectSeconds] = useState(10);

  // Cargar datos del ticket
  useEffect(() => {
    const loadTicketData = async () => {
      try {
        console.log('📎 Loading ticket data for:', ticketId);
        
        const response = await authenticatedGet(`/api/tickets/${ticketId}`);
        const result = await response.json();
        
        if (response.ok && result.success) {
          const ticket = result.ticket;
          
          console.log('✅ Ticket data loaded:', {
            id: ticket.id,
            attendee: ticket.attendee_name,
            event: ticket.event.name
          });
          
          // Procesar fechas
          const processedTicket: TicketData = {
            ...ticket,
            event: {
              ...ticket.event,
              start_date: new Date(ticket.event.start_date),
              end_date: new Date(ticket.event.end_date)
            },
            checkin_time: ticket.last_checkin ? new Date(ticket.last_checkin) : new Date(),
            can_undo: ticket.can_undo_until ? new Date() < new Date(ticket.can_undo_until) : false,
            undo_deadline: ticket.can_undo_until
          };
          
          setTicketData(processedTicket);
        } else {
          console.error('❌ Failed to load ticket:', result.error);
          setError(result.error || 'Error loading ticket data');
        }
      } catch (error) {
        console.error('❌ Error loading ticket:', error);
        setError('Failed to load ticket information');
      } finally {
        setIsLoading(false);
      }
    };

    if (ticketId) {
      loadTicketData();
    }
  }, [ticketId]);

  // Countdown timer para undo
  useEffect(() => {
    if (!ticketData?.undo_deadline) return;
    
    const updateTimer = () => {
      const deadline = new Date(ticketData.undo_deadline!);
      const now = new Date();
      const diff = deadline.getTime() - now.getTime();
      
      if (diff > 0) {
        setTimeLeft(Math.floor(diff / 1000));
      } else {
        setTimeLeft(0);
        setTicketData(prev => prev ? { ...prev, can_undo: false } : null);
      }
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [ticketData?.undo_deadline]);

  // Manejar undo
  const handleUndo = useCallback(async () => {
    if (!qrId || !ticketData?.can_undo || isUndoing) return;
    
    try {
      setIsUndoing(true);
      
      const response = await authenticatedPost(`/api/validate/${qrId}`, {
        action: 'undo'
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        toast({
          title: "Check-in deshecho",
          description: "El boleto ha sido marcado como no usado.",
        });
        
        // Redirigir de vuelta al scanner
        router.push('/scanner/scan');
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || 'No se pudo deshacer el check-in',
        });
      }
    } catch (error) {
      console.error('Undo error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: 'Error de conexión al deshacer el check-in',
      });
    } finally {
      setIsUndoing(false);
    }
  }, [qrId, ticketData?.can_undo, isUndoing, toast, router]);

  // Auto-redirect timer
  useEffect(() => {
    if (!ticketData || isUndoing) return;
    
    const interval = setInterval(() => {
      setAutoRedirectSeconds(prev => {
        if (prev <= 1) {
          router.push('/scanner/scan');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [ticketData, isUndoing, router]);

  // Formatear tiempo restante
  const formatTimeLeft = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <AuthGuard requiredRole={['admin', 'gestor', 'comprobador']}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Cargando información del boleto...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (error || !ticketData) {
    return (
      <AuthGuard requiredRole={['admin', 'gestor', 'comprobador']}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Error
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">{error}</p>
              <div className="flex gap-3">
                <Button 
                  onClick={() => router.push('/scanner')}
                  className="flex-1"
                >
                  Volver al scanner
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredRole={['admin', 'gestor', 'comprobador']}>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header de éxito */}
          <div className="text-center mb-8">
            <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              ¡Check-in exitoso!
            </h1>
            <p className="text-gray-600">
              El boleto ha sido validado correctamente
            </p>
          </div>

          {/* Información del boleto */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5" />
                Información del boleto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* Asistente */}
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-full">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{ticketData.attendee_name}</p>
                  {ticketData.attendee_email && (
                    <p className="text-sm text-gray-600">{ticketData.attendee_email}</p>
                  )}
                </div>
              </div>

              {/* Evento */}
              <div className="flex items-start gap-3">
                <div className="bg-purple-100 p-2 rounded-full">
                  <Calendar className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{ticketData.event.name}</p>
                  <p className="text-sm text-gray-600">
                    {format(ticketData.event.start_date, "d 'de' MMMM, yyyy", { locale: es })}
                  </p>
                </div>
              </div>

              {/* Ubicación */}
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-full">
                  <MapPin className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-gray-900">{ticketData.event.location}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Undo section */}
          {ticketData.can_undo && timeLeft > 0 && (
            <Alert className="mb-6 bg-amber-50 border-amber-200">
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-amber-800">
                      Puedes deshacer este check-in
                    </p>
                    <p className="text-sm text-amber-700">
                      Tiempo restante: {formatTimeLeft(timeLeft)}
                    </p>
                  </div>
                  <Button
                    onClick={handleUndo}
                    disabled={isUndoing}
                    variant="outline"
                    size="sm"
                    className="border-amber-300 text-amber-700 hover:bg-amber-100"
                  >
                    {isUndoing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mr-2" />
                        Deshaciendo...
                      </>
                    ) : (
                      <>
                        <Undo2 className="h-4 w-4 mr-2" />
                        Deshacer
                      </>
                    )}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Acciones principales */}
          <div className="space-y-3">
            <Button 
              onClick={() => router.push('/scanner/scan')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6 relative"
              size="lg"
            >
              <QrCode className="w-5 h-5 mr-2" />
              Escanear otro boleto
              {autoRedirectSeconds > 0 && (
                <span className="absolute top-1 right-3 text-xs bg-white/20 px-2 py-1 rounded-full">
                  {autoRedirectSeconds}s
                </span>
              )}
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

          {/* Info adicional */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>
              Ticket ID: <code className="bg-gray-200 px-1 rounded">{ticketData.id}</code>
            </p>
            {qrId && (
              <p className="mt-1">
                QR ID: <code className="bg-gray-200 px-1 rounded">{qrId}</code>
              </p>
            )}
          </div>

        </div>
      </div>
    </AuthGuard>
  );
}
