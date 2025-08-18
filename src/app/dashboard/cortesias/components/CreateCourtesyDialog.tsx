import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert'; // 🆕 Para validaciones
import { Gift, Plus, User, CheckCircle, AlertCircle, Search, AlertTriangle } from 'lucide-react';
import { auth } from '@/lib/firebase/client';
import { useToast } from '@/hooks/use-toast'; // 🆕 Toast notifications

import type { Event, TicketType, CourtesyType } from './types';

// 🆕 Tipo para usuario encontrado
interface FoundUser {
  uid: string;
  name: string;
  email: string;
}

interface CreateCourtesyDialogProps {
  events: Event[];
  ticketTypes: TicketType[];
  courtesyTypes: CourtesyType[];
  onEventChange: (eventId: string) => void;
  onCreateCourtesy: (formData: any) => Promise<void>;
  isCreating: boolean;
}

export function CreateCourtesyDialog({
  events,
  ticketTypes,
  courtesyTypes,
  onEventChange,
  onCreateCourtesy,
  isCreating
}: CreateCourtesyDialogProps) {
  const { toast } = useToast(); // 🆕 Toast notifications
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    eventId: '',
    ticketTypeId: '',
    attendeeName: '',
    attendeeEmail: '',
    attendeePhone: '',
    courtesyType: '',
    notes: '',
    quantity: 1,
    sendEmail: true,
    autoLink: true
  });
  
  // Estados para búsqueda de usuario
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [searchingUser, setSearchingUser] = useState(false);
  const [emailSearched, setEmailSearched] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // 🆕 Estados para validaciones
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // 🆕 Función de validación completa
  const validateForm = (): boolean => {
    const errors: string[] = [];
    
    // Validaciones básicas
    if (!form.eventId) errors.push('Debe seleccionar un evento');
    if (!form.ticketTypeId) errors.push('Debe seleccionar un tipo de boleto');
    if (!form.attendeeEmail || !form.attendeeEmail.includes('@')) {
      errors.push('Debe ingresar un email válido');
    }
    if (!form.courtesyType) errors.push('Debe seleccionar un tipo de cortesía');
    
    // 🆕 Validación clave: Cantidad vs Vinculación
    if (form.quantity > 1 && !form.autoLink) {
      errors.push('Para crear más de 1 cortesía debe habilitar la vinculación automática');
    }
    
    // Validaciones condicionales según tipo de cortesía
    if (!form.autoLink) {
      // Cortesía standalone: requiere nombre (teléfono opcional)
      if (!form.attendeeName?.trim()) {
        errors.push('El nombre es obligatorio para cortesías independientes');
      }
      // Forzar cantidad = 1 para cortesías standalone
      if (form.quantity !== 1) {
        errors.push('Las cortesías independientes solo permiten cantidad 1');
      }
    }
    // Para cortesías vinculadas no se requiere nombre ni teléfono
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleEventChange = (eventId: string) => {
    setForm(prev => ({ ...prev, eventId, ticketTypeId: '' }));
    onEventChange(eventId);
    // Limpiar errores cuando cambie evento
    setValidationErrors([]);
  };

  // 🆕 Función para buscar usuario por email
  const searchUserByEmail = async (email: string) => {
    if (!email || !email.includes('@')) {
      setFoundUser(null);
      setEmailSearched('');
      return;
    }

    try {
      setSearchingUser(true);
      
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      
      const token = await currentUser.getIdToken();
      
      // Buscar en la API de usuarios (necesitaremos crearla)
      const response = await fetch(`/api/admin/users/search?email=${encodeURIComponent(email)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setFoundUser({
            uid: data.user.uid,
            name: data.user.name,
            email: data.user.email
          });
          
          // Auto-rellenar nombre si está vacío
          if (!form.attendeeName && data.user.name) {
            setForm(prev => ({ ...prev, attendeeName: data.user.name }));
          }
        } else {
          setFoundUser(null);
        }
      } else {
        setFoundUser(null);
      }
      
      setEmailSearched(email);
    } catch (error) {
      console.error('Error searching user:', error);
      setFoundUser(null);
    } finally {
      setSearchingUser(false);
    }
  };

  // Manejar cambio de email con debounce
  const handleEmailChange = (email: string) => {
    setForm(prev => ({ ...prev, attendeeEmail: email }));
    setValidationErrors([]); // 🆕 Limpiar errores
    
    // Limpiar timeout anterior
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Buscar después de 500ms sin cambios
    const newTimeout = setTimeout(() => {
      searchUserByEmail(email);
    }, 500);
    
    setSearchTimeout(newTimeout);
  };

  // Resetear ticketTypeId cuando cambian los ticketTypes
  useEffect(() => {
    if (ticketTypes.length === 0 && form.eventId) {
      // Solo resetear si había un evento seleccionado pero no hay tipos
      setForm(prev => ({ ...prev, ticketTypeId: '' }));
    }
  }, [ticketTypes, form.eventId]);

  const handleCreate = async () => {
    // 🆕 Validar formulario antes de enviar
    if (!validateForm()) {
      toast({
        variant: "destructive",
        title: "Datos incompletos",
        description: "Por favor corrige los errores antes de continuar.",
      });
      return;
    }
    
    try {
      await onCreateCourtesy(form);
      
      // Toast de éxito
      toast({
        title: "Cortesía creada exitosamente",
        description: `Se ${form.quantity > 1 ? 'crearon' : 'creó'} ${form.quantity} cortesía${form.quantity > 1 ? 's' : ''} para ${form.attendeeEmail}`,
      });
      
      // Reset form y estados
      setForm({
        eventId: '',
        ticketTypeId: '',
        attendeeName: '',
        attendeeEmail: '',
        attendeePhone: '',
        courtesyType: '',
        notes: '',
        quantity: 1,
        sendEmail: true,
        autoLink: true
      });
      
      // Limpiar estados de búsqueda y validación
      setFoundUser(null);
      setSearchingUser(false);
      setEmailSearched('');
      setValidationErrors([]);
      if (searchTimeout) {
        clearTimeout(searchTimeout);
        setSearchTimeout(null);
      }
      
      setShowDialog(false);
      
    } catch (error) {
      // Toast de error
      toast({
        variant: "destructive",
        title: "Error al crear cortesía",
        description: error instanceof Error ? error.message : "Ocurrió un error inesperado",
      });
    }
  };

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4" />
          Nueva Cortesía
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-green-600" />
            Crear Boletos de Cortesía
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 py-2">
          
          {/* 🆕 Alert de validaciones */}
          {validationErrors.length > 0 && (
            <Alert className="bg-red-50 border-red-200">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-red-800">
                <div className="font-medium mb-1">Corrige los siguientes errores:</div>
                <ul className="text-sm space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          {/* 🆕 Fila 1: Evento y Tipo de Boleto */}
          <div className="grid grid-cols-2 gap-3">
            {/* Seleccionar Evento */}
            <div>
              <Label className="text-sm font-medium">Evento *</Label>
              <Select value={form.eventId} onValueChange={handleEventChange}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Seleccionar evento..." />
                </SelectTrigger>
                <SelectContent>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Seleccionar Tipo de Boleto */}
            <div>
              <Label className="text-sm font-medium">Tipo de Boleto *</Label>
              <Select 
                value={form.ticketTypeId} 
                onValueChange={(value) => setForm(prev => ({ ...prev, ticketTypeId: value }))}
                disabled={!form.eventId || ticketTypes.length === 0}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={ticketTypes.length === 0 ? "Primero selecciona evento" : "Seleccionar tipo..."} />
                </SelectTrigger>
                <SelectContent>
                  {ticketTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name} - ${type.price} {type.currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.eventId && ticketTypes.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Cargando tipos de boletos...
                </p>
              )}
            </div>
          </div>

          {/* 🆕 Fila 2: Nombre y Cantidad (condicionales) */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label className="text-sm font-medium">
                Nombre del solicitante {!form.autoLink && '*'}
              </Label>
              <Input
                value={form.attendeeName}
                onChange={(e) => {
                  setForm(prev => ({ ...prev, attendeeName: e.target.value }));
                  setValidationErrors([]);
                }}
                placeholder={form.autoLink 
                  ? "Quien solicita las cortesías (opcional)" 
                  : "Nombre de quien solicita"
                }
                className="h-9"
                disabled={form.autoLink} // 🆕 Bloqueado si está vinculado
              />
              {form.autoLink && (
                <p className="text-xs text-blue-600 mt-1">
                  Cada asistente configurará sus datos individuales después
                </p>
              )}
            </div>
            <div>
              <Label className="text-sm font-medium">Cantidad</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={form.quantity}
                onChange={(e) => {
                  const newQuantity = parseInt(e.target.value) || 1;
                  setForm(prev => ({ ...prev, quantity: newQuantity }));
                  setValidationErrors([]);
                }}
                className="h-9"
                disabled={!form.autoLink} // 🆕 Bloqueado si NO está vinculado
                title={form.autoLink ? "Máximo 10 cortesías" : "Solo 1 cortesía sin vinculación"}
              />
              {!form.autoLink && (
                <p className="text-xs text-blue-600 mt-1">
                  Cortesías independientes: solo 1 por vez
                </p>
              )}
            </div>
          </div>

          {/* 🆕 Fila 3: Email (ancho completo para mostrar indicadores) */}
          <div>
            <Label className="text-sm font-medium">Email del solicitante *</Label>
            <div className="space-y-2">
              <div className="relative">
                <Input
                  type="email"
                  value={form.attendeeEmail}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  placeholder="email@ejemplo.com"
                  className={`h-9 ${foundUser ? 'border-green-500' : ''}`}
                />
                {searchingUser && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Search className="w-4 h-4 animate-spin text-gray-400" />
                  </div>
                )}
              </div>
              
              {/* Indicador de usuario encontrado/no encontrado */}
              {emailSearched && form.attendeeEmail === emailSearched && (
                <div className="flex items-center gap-2 text-sm flex-wrap">
                  {foundUser ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-green-700">
                        Usuario encontrado: <strong>{foundUser.name}</strong>
                      </span>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                        <User className="w-3 h-3 mr-1" />
                        Cuenta existente
                      </Badge>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-orange-500" />
                      <span className="text-orange-700">
                        Usuario no encontrado
                      </span>
                      {form.autoLink && (
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
                          Se creará al registrarse
                        </Badge>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 🆕 Fila 4: Teléfono y Tipo de Cortesía (teléfono condicional) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium">Teléfono del solicitante</Label>
              <Input
                value={form.attendeePhone}
                onChange={(e) => {
                  setForm(prev => ({ ...prev, attendeePhone: e.target.value }));
                  setValidationErrors([]);
                }}
                placeholder={form.autoLink 
                  ? "El usuario lo configurará (opcional)" 
                  : "Opcional"
                }
                className="h-9"
                disabled={form.autoLink} // 🆕 Bloqueado si está vinculado
              />
              {form.autoLink && (
                <p className="text-xs text-blue-600 mt-1">
                  El usuario puede agregar su teléfono después
                </p>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium">Tipo de Cortesía *</Label>
              <Select 
                value={form.courtesyType} 
                onValueChange={(value) => setForm(prev => ({ ...prev, courtesyType: value }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Seleccionar tipo..." />
                </SelectTrigger>
                <SelectContent>
                  {courtesyTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 🆕 Notas (más compactas) */}
          <div>
            <Label className="text-sm font-medium">Notas</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Notas adicionales (opcional)"
              rows={2}
              className="text-sm"
            />
          </div>

          {/* 🆕 Opciones (Switch de Vinculación + Email) */}
          <div className="space-y-3 border rounded-lg p-3 bg-gray-50">
            {/* Switch de Vinculación */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoLink"
                  checked={form.autoLink}
                  onChange={(e) => {
                    const autoLink = e.target.checked;
                    setForm(prev => ({ 
                      ...prev, 
                      autoLink,
                      // Si deshabilita autoLink, resetear cantidad a 1 y limpiar campos
                      quantity: !autoLink ? 1 : prev.quantity,
                      // Si habilita autoLink, limpiar campos que el usuario llenará
                      attendeeName: autoLink ? '' : prev.attendeeName,
                      attendeePhone: autoLink ? '' : prev.attendeePhone
                    }));
                    setValidationErrors([]);
                  }}
                  className="rounded"
                />
                <Label htmlFor="autoLink" className="text-sm font-medium">
                  Vincular automáticamente a cuenta de usuario
                </Label>
              </div>
              <p className="text-xs text-gray-600 pl-6">
                {form.autoLink 
                  ? foundUser 
                    ? "🔗 Se vinculará inmediatamente a la cuenta existente de " + foundUser.name
                    : "🔗 Si existe una cuenta con este email, se vinculará automáticamente. Si no existe, se vinculará cuando se registre."
                  : "🎫 Cortesía independiente. Solo se enviará por email sin vincular a cuenta."
                }
              </p>
            </div>
            
            {/* Enviar Email */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sendEmail"
                checked={form.sendEmail}
                onChange={(e) => setForm(prev => ({ ...prev, sendEmail: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="sendEmail" className="text-sm">
                Enviar email de notificación
              </Label>
            </div>
          </div>

          {/* 🆕 Botones (más compactos) */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              className="flex-1 h-9"
              disabled={isCreating}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isCreating}
              className="flex-1 h-9 bg-green-600 hover:bg-green-700"
            >
              {isCreating ? (
                <>
                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Creando...
                </>
              ) : (
                <>
                  <Gift className="w-3 h-3 mr-2" />
                  Crear {form.quantity > 1 ? `${form.quantity} ` : ''}Cortesía{form.quantity > 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
