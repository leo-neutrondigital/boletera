'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  X,
  User,
  Mail,
  Phone,
  Calendar,
  Ticket,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { authenticatedPost } from '@/lib/utils/api';
import { formatCurrency } from '@/lib/utils/currency';

interface AttendeeTicket {
  id: string;
  attendee_name: string;
  attendee_email?: string;
  attendee_phone?: string;
  customer_name: string;
  customer_email: string;
  ticket_type_name: string;
  status: 'purchased' | 'configured' | 'generated' | 'used';
  check_in_status: 'not_arrived' | 'checked_in' | 'partial';
  authorized_days: string[];
  used_days: string[];
  last_checkin?: string;
  can_undo_until?: string;
  qr_id?: string;
  amount_paid: number;
  currency: string;
}

interface ManualCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendee: AttendeeTicket | null;
  eventId: string;
  eventName: string;
  onSuccess: () => void; // Para recargar la lista después del check-in
}

export function ManualCheckInModal({
  isOpen,
  onClose,
  attendee,
  eventId,
  eventName,
  onSuccess
}: ManualCheckInModalProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [notes, setNotes] = useState('');

  if (!attendee) return null;

  // Determinar días disponibles para check-in
  const availableDays = attendee.authorized_days.filter(day => 
    !attendee.used_days.includes(day)
  );

  // Formatear fecha para mostrar
  const formatDisplayDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return format(date, "EEEE d 'de' MMMM", { locale: es });
    } catch {
      return dateStr;
    }
  };

  // Formatear fecha para select value
  const formatSelectDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return format(date, "d MMM", { locale: es });
    } catch {
      return dateStr;
    }
  };

  // Manejar check-in manual
  const handleCheckIn = async () => {
    try {
      setIsProcessing(true);

      // Validaciones
      if (attendee.check_in_status === 'checked_in') {
        toast({
          variant: "destructive",
          title: "Ya registrado",
          description: "Este asistente ya completó su registro.",
        });
        return;
      }

      if (availableDays.length === 0) {
        toast({
          variant: "destructive",
          title: "Sin días disponibles",
          description: "Este asistente ya usó todos sus días autorizados.",
        });
        return;
      }

      // Si hay múltiples días, debe seleccionar uno
      if (availableDays.length > 1 && !selectedDay) {
        toast({
          variant: "destructive",
          title: "Selecciona un día",
          description: "Este boleto es válido para múltiples días. Selecciona el día del check-in.",
        });
        return;
      }

      // Determinar día para el check-in
      const dayToCheckIn = selectedDay || availableDays[0];

      console.log('✋ Manual check-in:', {
        ticketId: attendee.id,
        eventId,
        selectedDay: dayToCheckIn,
        notes: notes.trim()
      });

      // Llamar API de check-in manual
      const response = await authenticatedPost('/api/scanner/manual-checkin', {
        ticketId: attendee.id,
        eventId,
        selectedDay: dayToCheckIn,
        notes: notes.trim() || undefined
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error en el check-in manual');
      }

      console.log('✅ Manual check-in successful:', result);

      // Mostrar éxito
      toast({
        title: "¡Check-in exitoso!",
        description: `${attendee.attendee_name} registrado para ${formatSelectDate(dayToCheckIn)}`,
        className: "bg-green-50 border-green-200",
      });

      // Cerrar modal y recargar datos
      onClose();
      onSuccess();

      // Limpiar formulario
      setSelectedDay('');
      setNotes('');

    } catch (error) {
      console.error('❌ Error in manual check-in:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      
      toast({
        variant: "destructive",
        title: "Error en el check-in",
        description: errorMessage,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Obtener color del estado
  const getStatusColor = () => {
    switch (attendee.check_in_status) {
      case 'checked_in': return 'text-green-600';
      case 'partial': return 'text-yellow-600';
      case 'not_arrived': return 'text-gray-500';
      default: return 'text-gray-500';
    }
  };

  // Obtener texto del estado
  const getStatusText = () => {
    switch (attendee.check_in_status) {
      case 'checked_in': return 'Completamente registrado';
      case 'partial': return `Parcial (${attendee.used_days.length}/${attendee.authorized_days.length} días)`;
      case 'not_arrived': return 'No ha llegado';
      default: return 'Estado desconocido';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        
        {/* Header */}
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <User className="w-5 h-5" />
            Check-in Manual
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          
          {/* Attendee Info */}
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">
                {attendee.attendee_name}
              </h3>
              <p className="text-sm text-gray-600">{attendee.ticket_type_name}</p>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">Estado:</span>
              <span className={`text-sm font-medium ${getStatusColor()}`}>
                {getStatusText()}
              </span>
            </div>

            {/* Contact Info */}
            <div className="space-y-2 text-sm">
              {attendee.attendee_email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">{attendee.attendee_email}</span>
                </div>
              )}
              
              {attendee.attendee_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">{attendee.attendee_phone}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Ticket className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">
                  {formatCurrency(attendee.amount_paid, attendee.currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Event Info */}
          <div className="bg-gray-50 rounded-lg p-3">
            <h4 className="font-medium text-gray-900 mb-2">Evento</h4>
            <p className="text-sm text-gray-600">{eventName}</p>
          </div>

          {/* Authorized Days */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Días autorizados</h4>
            <div className="flex flex-wrap gap-2">
              {attendee.authorized_days.map((day, index) => {
                const isUsed = attendee.used_days.includes(day);
                return (
                  <Badge 
                    key={index} 
                    variant={isUsed ? "secondary" : "outline"}
                    className={isUsed ? "bg-green-100 text-green-800" : ""}
                  >
                    {formatSelectDate(day)}
                    {isUsed && <CheckCircle2 className="w-3 h-3 ml-1" />}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Check-in Form */}
          {availableDays.length > 0 && attendee.check_in_status !== 'checked_in' ? (
            <div className="space-y-4">
              
              {/* Day Selection (if multiple days) */}
              {availableDays.length > 1 && (
                <div>
                  <Label htmlFor="day-select" className="text-sm font-medium">
                    Seleccionar día *
                  </Label>
                  <Select value={selectedDay} onValueChange={setSelectedDay}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Elige el día para registrar" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDays.map((day) => (
                        <SelectItem key={day} value={day}>
                          {formatDisplayDate(day)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Single day info */}
              {availableDays.length === 1 && (
                <Alert className="bg-blue-50 border-blue-200">
                  <Calendar className="h-4 w-4" />
                  <AlertDescription className="text-blue-800">
                    <p className="font-medium">Día del check-in:</p>
                    <p>{formatDisplayDate(availableDays[0])}</p>
                  </AlertDescription>
                </Alert>
              )}

              {/* Notes */}
              <div>
                <Label htmlFor="notes" className="text-sm font-medium">
                  Notas (opcional)
                </Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observaciones del check-in..."
                  rows={2}
                  className="mt-1"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleCheckIn}
                  disabled={isProcessing || (availableDays.length > 1 && !selectedDay)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Registrar entrada
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            /* Already checked in or no available days */
            <div className="text-center py-4">
              {attendee.check_in_status === 'checked_in' ? (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription className="text-green-800">
                    <p className="font-medium">¡Ya está registrado!</p>
                    <p>Este asistente completó su check-in.</p>
                    {attendee.last_checkin && (
                      <p className="text-xs mt-1">
                        Último registro: {format(new Date(attendee.last_checkin), "d MMM 'a las' HH:mm", { locale: es })}
                      </p>
                    )}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-yellow-800">
                    <p className="font-medium">Sin días disponibles</p>
                    <p>Este asistente ya usó todos sus días autorizados.</p>
                  </AlertDescription>
                </Alert>
              )}
              
              <Button
                variant="outline"
                onClick={onClose}
                className="mt-4 w-full"
              >
                Cerrar
              </Button>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
