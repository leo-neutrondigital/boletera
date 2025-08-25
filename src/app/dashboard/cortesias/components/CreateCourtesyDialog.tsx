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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Gift, Plus, User, CheckCircle, AlertCircle, Search, AlertTriangle } from 'lucide-react';
import { auth } from '@/lib/firebase/client';
import { useToast } from '@/hooks/use-toast';

import type { Event, TicketType, CourtesyType } from './types';

// Tipo para usuario encontrado
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
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    eventId: '',
    ticketTypeId: '',
    attendeeName: '',
    attendeeEmail: '',
    courtesyType: '',
    notes: '',
    quantity: 1,
    sendEmail: true
  });
  
  // Estados para búsqueda de usuario
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [searchingUser, setSearchingUser] = useState(false);
  const [emailSearched, setEmailSearched] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Estados para validaciones
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Función de validación simplificada
  const validateForm = (): boolean => {
    const errors: string[] = [];
    
    if (!form.eventId) errors.push('Debe seleccionar un evento');
    if (!form.ticketTypeId) errors.push('Debe seleccionar un tipo de boleto');
    if (!form.attendeeEmail || !form.attendeeEmail.includes('@')) {
      errors.push('Debe ingresar un email válido');
    }
    if (!form.courtesyType) errors.push('Debe seleccionar un tipo de cortesía');
    if (form.quantity < 1 || form.quantity > 10) {
      errors.push('La cantidad debe estar entre 1 y 10');
    }
    // 🆕 attendeeName YA NO es requerido
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleEventChange = (eventId: string) => {
    setForm(prev => ({ ...prev, eventId, ticketTypeId: '' }));
    onEventChange(eventId);
    setValidationErrors([]);
  };

  // 🎯 Función para buscar usuario por email (MANTENER)
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
    setValidationErrors([]);
    
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    const newTimeout = setTimeout(() => {
      searchUserByEmail(email);
    }, 500);
    
    setSearchTimeout(newTimeout);
  };

  // Resetear ticketTypeId cuando cambian los ticketTypes
  useEffect(() => {
    if (ticketTypes.length === 0 && form.eventId) {
      setForm(prev => ({ ...prev, ticketTypeId: '' }));
    }
  }, [ticketTypes, form.eventId]);

  const handleCreate = async () => {
    if (!validateForm()) {
      toast({
        variant: "destructive",
        title: "Datos incompletos",
        description: "Por favor corrige los errores antes de continuar.",
      });
      return;
    }
    
    try {
      const payload = {
        // 🆕 Mapear campos al formato esperado por la API
        eventId: form.eventId,
        ticketTypeId: form.ticketTypeId,
        attendeeEmail: form.attendeeEmail,
        attendeeName: form.attendeeName || 'Solicitante de cortesía', // 🆕 Valor por defecto
        courtesyType: form.courtesyType,
        quantity: form.quantity,
        notes: form.notes,
        sendEmail: form.sendEmail,
        autoLink: true // 🆕 Siempre habilitar autoLink
      };
      
      console.log('📤 Sending courtesy data:', payload);
      await onCreateCourtesy(payload);
      
      toast({
        title: "Cortesía creada exitosamente",
        description: `Se ${form.quantity > 1 ? 'crearon' : 'creó'} ${form.quantity} cortesía${form.quantity > 1 ? 's' : ''} para ${form.attendeeEmail}`,
      });
      
      // Reset form
      setForm({
        eventId: '',
        ticketTypeId: '',
        attendeeName: '',
        attendeeEmail: '',
        courtesyType: '',
        notes: '',
        quantity: 1,
        sendEmail: true
      });
      
      // Limpiar estados de búsqueda
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
        
        <div className="space-y-4 py-2">
          
          {/* Alert de validaciones */}
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

          {/* Fila 1: Evento y Tipo de Boleto */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Evento *</Label>
              <Select value={form.eventId} onValueChange={handleEventChange}>
                <SelectTrigger>
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

            <div>
              <Label className="text-sm font-medium">Tipo de Boleto *</Label>
              <Select 
                value={form.ticketTypeId} 
                onValueChange={(value) => setForm(prev => ({ ...prev, ticketTypeId: value }))}
                disabled={!form.eventId || ticketTypes.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !form.eventId ? "Primero selecciona evento" :
                    ticketTypes.length === 0 ? "Cargando tipos de boletos..." :
                    "Seleccionar tipo..."
                  } />
                </SelectTrigger>
                <SelectContent>
                  {ticketTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name} - ${type.price} {type.currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Fila 2: Email (ancho completo con búsqueda de usuario) */}
          <div>
            <Label className="text-sm font-medium">Email del solicitante *</Label>
            <div className="space-y-2">
              <div className="relative">
                <Input
                  type="email"
                  value={form.attendeeEmail}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  placeholder="email@ejemplo.com"
                  className={foundUser ? 'border-green-500' : ''}
                />
                {searchingUser && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Search className="w-4 h-4 animate-spin text-gray-400" />
                  </div>
                )}
              </div>
              
              {/* 🎯 Indicador de usuario encontrado/no encontrado (MANTENER) */}
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
                      <span className="text-orange-700">Usuario no encontrado</span>
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
                        Cuenta nueva
                      </Badge>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Fila 3: Nombre (opcional) y Cantidad */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Label className="text-sm font-medium">Nombre del solicitante</Label>
              <Input
                value={form.attendeeName}
                onChange={(e) => {
                  setForm(prev => ({ ...prev, attendeeName: e.target.value }));
                  setValidationErrors([]);
                }}
                placeholder="Quien solicita las cortesías (opcional)"
              />
              <p className="text-xs text-blue-600 mt-1">
                Cada asistente configurará sus datos individuales después
              </p>
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
              />
            </div>
          </div>

          {/* Fila 4: Tipo de Cortesía */}
          <div>
            <Label className="text-sm font-medium">Tipo de Cortesía *</Label>
            <Select 
              value={form.courtesyType} 
              onValueChange={(value) => setForm(prev => ({ ...prev, courtesyType: value }))}
            >
              <SelectTrigger>
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

          {/* Notas */}
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

          {/* Opciones simplificadas */}
          <div className="border rounded-lg p-3 bg-gray-50">
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
            <p className="text-xs text-gray-600 mt-2">
              📧 Los usuarios recibirán un email con instrucciones para configurar sus boletos
            </p>
          </div>

          {/* Botones */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              className="flex-1"
              disabled={isCreating}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isCreating}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isCreating ? (
                <>
                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Creando...
                </>
              ) : (
                <>
                  <Gift className="w-4 h-4 mr-2" />
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
