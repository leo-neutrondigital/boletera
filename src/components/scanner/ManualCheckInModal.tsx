'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  User,
  Mail,
  Phone,
  Calendar,
  Ticket,
  CheckCircle2,
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
import { formatCurrency, Currency } from '@/lib/utils/currency';
import { getTodayAsLocalString, getTodayInMexicoTimezone, debugDate, formatDateForDisplayMexico } from '@/lib/utils/date-utils';

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
  currency: Currency;
  // 🆕 Campo para lógica inteligente de check-in
  access_type?: 'all_days' | 'specific_days' | 'any_single_day';
}

interface ManualCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendee: AttendeeTicket | null;
  eventId: string;
  eventName: string;
  onTicketUpdated?: (ticketId: string, updates: any) => void;
}

export function ManualCheckInModal({
  isOpen,
  onClose,
  attendee,
  eventId,
  eventName,
  onTicketUpdated
}: ManualCheckInModalProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [notes, setNotes] = useState('');

  // 🆕 Lógica inteligente de preselección según access_type
  useEffect(() => {
    if (attendee && isOpen) {
      const today = getTodayAsLocalString();
      const todayMexico = getTodayInMexicoTimezone();
      const availableDays = attendee.authorized_days.filter(day => 
        !attendee.used_days.includes(day)
      );
      
      console.log('[ManualCheckIn] DEBUG: Date information:', {
        todayFromFunction: today,
        todayMexicoTimezone: todayMexico,
        todayDirectly: new Date().toISOString().split('T')[0],
        currentTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        currentDate: new Date(),
        currentDateLocal: new Date().toLocaleDateString('sv-SE'), // YYYY-MM-DD format
        mexicoTime: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' }),
        mexicoTime2: new Date().toLocaleString('sv-SE', { timeZone: 'America/Mexico_City' }).split(' ')[0]
      });
      
      debugDate('Today for check-in', new Date());
      
        console.log('[ManualCheckIn] Smart day selection:', {
          access_type: attendee.access_type,
          today,
          todayMexico,
          availableDays,
          todayAvailable: availableDays.includes(today),
          todayMexicoAvailable: availableDays.includes(todayMexico),
          currentSelection: selectedDay,
          attendeeName: attendee.attendee_name
        });

        console.log('[ManualCheckIn] Full attendee data:', {
          id: attendee.id,
          authorized_days: attendee.authorized_days,
          used_days: attendee.used_days,
          access_type: attendee.access_type
        });

        // 🎯 Lógica por tipo de acceso - usar fecha de México
        const todayToUse = todayMexico; // Usar timezone México
        switch (attendee.access_type) {
          case 'all_days':
          case 'any_single_day':
            // Para all_days y any_single_day: SIEMPRE usar hoy si está disponible
            if (availableDays.includes(todayToUse)) {
              setSelectedDay(todayToUse);
              console.log('[ManualCheckIn] Auto-selected TODAY (Mexico timezone) for', attendee.access_type, ':', todayToUse);
            } else {
              // Si hoy no está disponible, usar el primer día disponible
              setSelectedDay(availableDays[0] || '');
              console.log('[ManualCheckIn] Today not available, selected first available day:', availableDays[0]);
            }
            break;        case 'specific_days':
          // Para specific_days: preseleccionar hoy si está disponible
          if (availableDays.includes(todayToUse)) {
            setSelectedDay(todayToUse);
            console.log('[ManualCheckIn] Auto-selected TODAY (Mexico timezone) for specific_days:', todayToUse);
          } else if (availableDays.length === 1) {
            // Si solo hay un día disponible, seleccionarlo
            setSelectedDay(availableDays[0]);
            console.log('[ManualCheckIn] Auto-selected only available day for specific_days:', availableDays[0]);
          } else {
            // Para múltiples días específicos, dejar que el usuario elija
            setSelectedDay('');
            console.log('[ManualCheckIn] Multiple specific days available, user must choose');
          }
          break;
          
        default:
          // Fallback para tipos desconocidos (mantener lógica anterior)
          if (availableDays.includes(todayToUse)) {
            setSelectedDay(todayToUse);
            console.log('[ManualCheckIn] Fallback: Auto-selected today (Mexico timezone):', todayToUse);
          } else if (availableDays.length === 1) {
            setSelectedDay(availableDays[0]);
            console.log('[ManualCheckIn] Fallback: Auto-selected only available day:', availableDays[0]);
          } else {
            setSelectedDay('');
            console.log('[ManualCheckIn] Fallback: Multiple options, user must choose');
          }
      }
    }
  }, [attendee, isOpen, selectedDay]);

  if (!attendee) return null;

  // 🎯 Determinar días disponibles según access_type (igual que API QR)
  const todayMexicoForAnalysis = getTodayInMexicoTimezone();
  let availableDays: string[] = [];

  switch (attendee.access_type) {
    case 'specific_days':
      // Solo días autorizados que no hayan sido usados
      availableDays = attendee.authorized_days.filter(day => 
        !attendee.used_days.includes(day)
      );
      break;
      
    case 'any_single_day':
      // Si ya usó un día, no hay más disponibles
      if (attendee.used_days.length > 0) {
        availableDays = [];
      } else {
        // Todos los días autorizados están disponibles hasta que use uno
        availableDays = attendee.authorized_days;
      }
      break;
      
    case 'all_days':
      // ✅ Para all_days: cualquier día está disponible, solo verificar que no sea hoy si ya lo usó
      availableDays = attendee.used_days.includes(todayMexicoForAnalysis) 
        ? [] // Si ya hizo check-in hoy, no puede hacer otro hoy
        : [todayMexicoForAnalysis]; // Solo puede hacer check-in hoy
      break;
      
    default:
      // Fallback a lógica anterior
      availableDays = attendee.authorized_days.filter(day => 
        !attendee.used_days.includes(day)
      );
  }

  // DEBUG: Analizar disponibilidad de días
  console.log('[ManualCheckIn] Day availability analysis (FIXED):', {
    access_type: attendee.access_type,
    authorized_days: attendee.authorized_days,
    used_days: attendee.used_days,
    used_days_types: attendee.used_days.map(d => typeof d),
    availableDays,
    todayMexico: todayMexicoForAnalysis,
    todayMexicoType: typeof todayMexicoForAnalysis,
    hasUsedAllDays: attendee.used_days.length === attendee.authorized_days.length,
    todayIsAuthorized: attendee.authorized_days.includes(todayMexicoForAnalysis),
    todayIsUsed: attendee.used_days.includes(todayMexicoForAnalysis),
    // Comparación exacta string por string
    comparisonResults: attendee.used_days.map(day => ({
      day,
      equals: day === todayMexicoForAnalysis,
      dayLength: day.length,
      todayLength: todayMexicoForAnalysis.length
    }))
  });

  // Formatear fecha para mostrar (ya no necesario, usar formatDateForDisplayMexico directamente)
  // const formatDisplayDate = (dateStr: string) => {
  //   try {
  //     const date = new Date(dateStr);
  //     return format(date, "EEEE d 'de' MMMM", { locale: es });
  //   } catch {
  //     return dateStr;
  //   }
  // };

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

      // 🎯 Validación inteligente según access_type
      if (!selectedDay) {
        // Para specific_days con múltiples opciones, requerir selección manual
        if (attendee.access_type === 'specific_days' && availableDays.length > 1) {
          toast({
            variant: "destructive",
            title: "Selecciona un día específico",
            description: "Este boleto requiere selección manual del día autorizado.",
          });
          return;
        }
        
        // Para otros casos, debería haberse autoseleccionado
        toast({
          variant: "destructive",
          title: "Error de selección",
          description: "No se pudo determinar el día para el check-in.",
        });
        return;
      }

      // Determinar día para el check-in
      const today = getTodayInMexicoTimezone(); // Usar timezone México
      const availableDaysForCheckIn = attendee.authorized_days.filter(day => 
        !attendee.used_days.includes(day)
      );
      
      // Priorizar hoy si está disponible, de lo contrario usar la selección actual o el primer disponible
      let dayToCheckIn = selectedDay;
      if (!dayToCheckIn) {
        if (availableDaysForCheckIn.includes(today)) {
          dayToCheckIn = today;
        } else {
          dayToCheckIn = availableDaysForCheckIn[0];
        }
      }

      console.log('[ManualCheckIn] Final check-in decision:', {
        selectedDay,
        availableDaysForCheckIn,
        todayMexico: today,
        todayAvailable: availableDaysForCheckIn.includes(today),
        fallbackDay: availableDaysForCheckIn[0],
        finalDayToCheckIn: dayToCheckIn,
        todayAgain: getTodayInMexicoTimezone()
      });

      debugDate('Day to check-in', dayToCheckIn);

      console.log('[ManualCheckIn] Manual check-in:', {
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

      console.log('[ManualCheckIn] Manual check-in successful:', result);

      // Mostrar éxito con mensaje inteligente según access_type
      const getSuccessMessage = () => {
        switch (attendee.access_type) {
          case 'all_days':
            return `${attendee.attendee_name} registrado para hoy (acceso todos los días)`;
          case 'any_single_day':
            return `${attendee.attendee_name} - único uso registrado para ${formatSelectDate(dayToCheckIn)}`;
          case 'specific_days':
            return `${attendee.attendee_name} registrado para día específico: ${formatSelectDate(dayToCheckIn)}`;
          default:
            return `${attendee.attendee_name} registrado para ${formatSelectDate(dayToCheckIn)}`;
        }
      };

      toast({
        title: "¡Check-in exitoso!",
        description: getSuccessMessage(),
        className: "bg-green-50 border-green-200",
      });

      // ✅ Actualización optimista local
      if (onTicketUpdated && result.checkin_data) {
        onTicketUpdated(attendee.id, {
          used_days: [...attendee.used_days, result.checkin_data.day_checked],
          last_checkin: result.checkin_data.check_in_time,
          can_undo_until: result.checkin_data.can_undo_until,
          check_in_status: 'checked_in'
        });
      }

      // Cerrar modal
      onClose();
      
      // ❌ Ya NO invalidar cache ni llamar onSuccess (doble recarga)
      // invalidateEvent(eventId);
      // onSuccess();

      // Limpiar formulario
      setSelectedDay('');
      setNotes('');

    } catch (error) {
      console.error('[ManualCheckIn] Error in manual check-in:', error);
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
    // Para all_days: color basado en si hizo check-in hoy
    if (attendee.access_type === 'all_days') {
      const todayMexico = getTodayInMexicoTimezone();
      const hasCheckedInToday = attendee.used_days.includes(todayMexico);
      return hasCheckedInToday ? 'text-green-600' : 'text-blue-600';
    }
    
    // Para otros tipos: usar estado tradicional
    switch (attendee.check_in_status) {
      case 'checked_in': return 'text-green-600';
      case 'partial': return 'text-yellow-600';
      case 'not_arrived': return 'text-gray-500';
      default: return 'text-gray-500';
    }
  };

  // Obtener texto del estado
  const getStatusText = () => {
    // Para all_days: mostrar estado simplificado
    if (attendee.access_type === 'all_days') {
      const todayMexico = getTodayInMexicoTimezone();
      const hasCheckedInToday = attendee.used_days.includes(todayMexico);
      
      if (hasCheckedInToday) {
        return `Registrado hoy (${attendee.used_days.length} días asistidos)`;
      } else if (attendee.used_days.length > 0) {
        return `Disponible (${attendee.used_days.length} días asistidos)`;
      } else {
        return 'No ha llegado';
      }
    }
    
    // Para specific_days y any_single_day: mostrar conteo tradicional
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
            {attendee.access_type === 'all_days' ? (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Válido todos los días del evento
              </Badge>
            ) : (
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
            )}
          </div>

          {/* Check-in Form */}
          {(() => {
            // 🔧 FIX: Para tickets all_days, verificar si ya hizo check-in HOY específicamente
            // No usar check_in_status porque all_days siempre es 'partial'
            const todayMexico = getTodayInMexicoTimezone();
            const hasCheckedInToday = attendee.used_days.includes(todayMexico);
            
            // DEBUG: Log detallado de la validación
            console.log('[ManualCheckIn] 🔍 FORM VISIBILITY CHECK:', {
              attendee_name: attendee.attendee_name,
              access_type: attendee.access_type,
              todayMexico,
              used_days: attendee.used_days,
              hasCheckedInToday,
              availableDays_length: availableDays.length,
              check_in_status: attendee.check_in_status,
              // Comparación detallada
              used_days_comparison: attendee.used_days.map(day => ({
                day,
                matches_today: day === todayMexico
              }))
            });
            
            // Mostrar formulario si:
            // 1. Hay días disponibles Y
            // 2. (Para all_days: no ha hecho check-in hoy) O (Para otros: no está completamente registrado)
            const shouldShowForm = availableDays.length > 0 && (
              attendee.access_type === 'all_days' 
                ? !hasCheckedInToday  // Para all_days: verificar si ya registró HOY
                : attendee.check_in_status !== 'checked_in' // Para otros: usar estado tradicional
            );
            
            console.log('[ManualCheckIn] ➡️ shouldShowForm:', shouldShowForm);
            
            if (!shouldShowForm) return null;
            
            return (
            <div className="space-y-4">
              
              {/* 🎯 Smart Day Selection Logic */}
              {(() => {
                // Para all_days y any_single_day: NO mostrar selector, solo confirmar día
                if (attendee.access_type === 'all_days' || attendee.access_type === 'any_single_day') {
                  // Para all_days: SIEMPRE mostrar hoy usando timezone de México
                  const dayToShow = attendee.access_type === 'all_days' 
                    ? getTodayInMexicoTimezone() 
                    : (selectedDay || availableDays[0]);
                  
                  return (
                    <Alert className="bg-blue-50 border-blue-200">
                      <Calendar className="h-4 w-4" />
                      <AlertDescription className="text-blue-800">
                        <p className="font-medium">
                          {attendee.access_type === 'all_days' 
                            ? 'Registrando para hoy:' 
                            : 'Registrando único uso para:'}
                        </p>
                        <p>{formatDateForDisplayMexico(dayToShow)}</p>
                        {attendee.access_type === 'all_days' && (
                          <p className="text-xs mt-1 opacity-75">
                            Este boleto es válido para todos los días del evento
                          </p>
                        )}
                      </AlertDescription>
                    </Alert>
                  );
                }
                
                // Para specific_days: mostrar selector solo si hay múltiples opciones
                if (attendee.access_type === 'specific_days') {
                  if (availableDays.length > 1 && !selectedDay) {
                    return (
                      <div>
                        <Label htmlFor="day-select" className="text-sm font-medium">
                          Seleccionar día específico *
                        </Label>
                        <Select value={selectedDay} onValueChange={setSelectedDay}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Elige el día autorizado" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableDays.map((day) => (
                              <SelectItem key={day} value={day}>
                                {formatDateForDisplayMexico(day)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500 mt-1">
                          Este boleto solo es válido para días específicos
                        </p>
                      </div>
                    );
                  } else {
                    // Un solo día específico disponible
                    const dayToShow = selectedDay || availableDays[0];
                    return (
                      <Alert className="bg-amber-50 border-amber-200">
                        <Calendar className="h-4 w-4" />
                        <AlertDescription className="text-amber-800">
                          <p className="font-medium">Día específico autorizado:</p>
                          <p>{formatDateForDisplayMexico(dayToShow)}</p>
                        </AlertDescription>
                      </Alert>
                    );
                  }
                }
                
                // Fallback para tipos desconocidos (lógica anterior)
                if (availableDays.length > 1) {
                  return (
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
                              {formatDateForDisplayMexico(day)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                } else {
                  // Un solo día disponible
                  return (
                    <Alert className="bg-blue-50 border-blue-200">
                      <Calendar className="h-4 w-4" />
                      <AlertDescription className="text-blue-800">
                        <p className="font-medium">Día del check-in:</p>
                        <p>{formatDateForDisplayMexico(availableDays[0])}</p>
                      </AlertDescription>
                    </Alert>
                  );
                }
              })()} 

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
                  disabled={isProcessing || (
                    // Solo requerir selección para specific_days con múltiples opciones
                    attendee.access_type === 'specific_days' && 
                    availableDays.length > 1 && 
                    !selectedDay
                  )}
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
                      {attendee.access_type === 'any_single_day' 
                        ? 'Registrar único uso'
                        : 'Registrar entrada'
                      }
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
            );
          })()}

          {/* Already checked in or no available days */}
          {(() => {
            const todayMexico = getTodayInMexicoTimezone();
            const hasCheckedInToday = attendee.used_days.includes(todayMexico);
            
            // Mostrar mensaje si:
            // 1. (Para all_days: ya hizo check-in hoy) O
            // 2. (Para otros: está completamente registrado O no hay días disponibles)
            const shouldShowMessage = (
              attendee.access_type === 'all_days' 
                ? hasCheckedInToday  // Para all_days: mostrar si ya registró HOY
                : (attendee.check_in_status === 'checked_in' || availableDays.length === 0)
            );
            
            if (!shouldShowMessage) return null;
            
            return (
            <div className="text-center py-4">
              {(attendee.check_in_status === 'checked_in' || hasCheckedInToday) ? (
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
                    {attendee.access_type === 'all_days' ? (
                      <>
                        <p className="font-medium">Ya registrado hoy</p>
                        <p>Este asistente ya hizo check-in el día de hoy.</p>
                        {attendee.last_checkin && (
                          <p className="text-sm mt-2">
                            Registrado: {format(new Date(attendee.last_checkin), "d 'de' MMMM 'a las' HH:mm", { locale: es })}
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="font-medium">Sin días disponibles</p>
                        <p>Este asistente ya usó todos sus días autorizados.</p>
                        {attendee.last_checkin && (
                          <p className="text-xs mt-1">
                            Último registro: {format(new Date(attendee.last_checkin), "d MMM 'a las' HH:mm", { locale: es })}
                          </p>
                        )}
                      </>
                    )}
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
            );
          })()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
