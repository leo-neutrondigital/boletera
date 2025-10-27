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
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Banknote, User, AlertTriangle, Calendar, CreditCard } from 'lucide-react';
import { auth } from '@/lib/firebase/client';
import { useToast } from '@/hooks/use-toast';
import { useCachedTicketTypes } from '@/contexts/DataCacheContext';
import type { PaymentMethod } from '@/types';

// Métodos de pago disponibles
const PAYMENT_METHODS = [
  { value: 'cash', label: 'Efectivo', icon: '💵' },
  { value: 'transfer', label: 'Transferencia', icon: '🏦' },
  { value: 'card', label: 'Tarjeta', icon: '💳' },
  { value: 'other', label: 'Otro', icon: '📋' }
] as const;

interface FoundUser {
  uid: string;
  name: string;
  email: string;
}

interface CreateOfflineSaleDialogProps {
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateOfflineSaleDialog({
  eventId,
  isOpen,
  onClose,
  onSuccess
}: CreateOfflineSaleDialogProps) {
  const { toast } = useToast();
  const { ticketTypes, loading: loadingTicketTypes } = useCachedTicketTypes(eventId);
  
  const [form, setForm] = useState({
    ticketTypeId: '',
    attendeeName: '',
    attendeeEmail: '',
    attendeePhone: '',
    amount_paid: '',
    payment_method: '' as PaymentMethod | '',
    payment_reference: '',
    sale_date: new Date().toISOString().slice(0, 16), // formato yyyy-MM-ddTHH:mm
    quantity: 1,
    notes: '',
    sendEmail: true,
    autoLink: true
  });
  
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [searchingUser, setSearchingUser] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calcular precio total automáticamente
  const selectedTicketType = ticketTypes.find(t => t.id === form.ticketTypeId);
  const calculatedTotal = selectedTicketType 
    ? (selectedTicketType.price * form.quantity)
    : 0;

  // Validación del formulario
  const validateForm = (): boolean => {
    const errors: string[] = [];
    
    if (!form.ticketTypeId) errors.push('Debe seleccionar un tipo de boleto');
    if (!form.attendeeEmail || !form.attendeeEmail.includes('@')) {
      errors.push('Debe ingresar un email válido');
    }
    if (!form.attendeeName.trim()) {
      errors.push('Debe ingresar el nombre del cliente');
    }
    
    const amount = parseFloat(form.amount_paid);
    if (!form.amount_paid || isNaN(amount) || amount <= 0) {
      errors.push('El monto debe ser mayor a 0');
    }
    
    if (!form.payment_method) {
      errors.push('Debe seleccionar un método de pago');
    }
    
    if (form.quantity < 1 || form.quantity > 10) {
      errors.push('La cantidad debe estar entre 1 y 10');
    }
    
    // Validar fecha
    const saleDate = new Date(form.sale_date);
    const now = new Date();
    if (saleDate > now) {
      errors.push('La fecha de venta no puede ser futura');
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Buscar usuario por email
  const searchUserByEmail = async (email: string) => {
    if (!email || !email.includes('@')) {
      setFoundUser(null);
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
    } catch (error) {
      console.error('[CreateOfflineSaleDialog] Error searching user:', error);
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

  // Auto-llenar monto con precio sugerido
  useEffect(() => {
    if (selectedTicketType && !form.amount_paid) {
      setForm(prev => ({ 
        ...prev, 
        amount_paid: (selectedTicketType.price * form.quantity).toString()
      }));
    }
  }, [selectedTicketType, form.quantity, form.amount_paid]);

  const handleCreate = async () => {
    if (!validateForm()) {
      toast({
        variant: "destructive",
        title: "Datos incompletos",
        description: "Por favor corrige los errores antes de continuar.",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user');
      }
      
      const token = await currentUser.getIdToken();
      
      const payload = {
        eventId,
        ticketTypeId: form.ticketTypeId,
        attendeeEmail: form.attendeeEmail,
        attendeeName: form.attendeeName,
        attendeePhone: form.attendeePhone || undefined,
        amount_paid: parseFloat(form.amount_paid),
        payment_method: form.payment_method,
        payment_reference: form.payment_reference || undefined,
        sale_date: new Date(form.sale_date).toISOString(),
        quantity: form.quantity,
        notes: form.notes || undefined,
        sendEmail: form.sendEmail,
        autoLink: form.autoLink
      };
      
      console.log('[CreateOfflineSaleDialog] Creating offline sale:', payload);
      
      const response = await fetch('/api/admin/offline-sales', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al crear venta offline');
      }
      
      await response.json(); // Venta creada exitosamente
      
      toast({
        title: "Venta offline registrada exitosamente",
        description: `Se ${form.quantity > 1 ? 'registraron' : 'registró'} ${form.quantity} boleto${form.quantity > 1 ? 's' : ''} para ${form.attendeeEmail}`,
      });
      
      // Reset form
      setForm({
        ticketTypeId: '',
        attendeeName: '',
        attendeeEmail: '',
        attendeePhone: '',
        amount_paid: '',
        payment_method: '',
        payment_reference: '',
        sale_date: new Date().toISOString().slice(0, 16),
        quantity: 1,
        notes: '',
        sendEmail: true,
        autoLink: true
      });
      
      setFoundUser(null);
      setValidationErrors([]);
      if (searchTimeout) {
        clearTimeout(searchTimeout);
        setSearchTimeout(null);
      }
      
      onSuccess();
      onClose();
      
    } catch (error) {
      console.error('[CreateOfflineSaleDialog] Error:', error);
      toast({
        variant: "destructive",
        title: "Error al crear venta offline",
        description: error instanceof Error ? error.message : "Ocurrió un error inesperado",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="w-5 h-5 text-blue-600" />
            Registrar Venta Offline
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

          {/* Usuario encontrado */}
          {foundUser && (
            <Alert className="bg-green-50 border-green-200">
              <User className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <div className="font-medium">Usuario registrado encontrado</div>
                <p className="text-sm">{foundUser.name} - Los boletos se vincularán automáticamente</p>
              </AlertDescription>
            </Alert>
          )}

          {/* Tipo de Boleto */}
          <div>
            <Label className="text-sm font-medium">Tipo de Boleto *</Label>
            <Select 
              value={form.ticketTypeId} 
              onValueChange={(value) => setForm(prev => ({ ...prev, ticketTypeId: value }))}
              disabled={loadingTicketTypes}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  loadingTicketTypes ? "Cargando tipos de boletos..." : "Seleccionar tipo..."
                } />
              </SelectTrigger>
              <SelectContent>
                {ticketTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name} - ${type.price}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cantidad */}
          <div>
            <Label className="text-sm font-medium">Cantidad *</Label>
            <Input
              type="number"
              min="1"
              max="10"
              value={form.quantity}
              onChange={(e) => setForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
            />
            {calculatedTotal > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                Precio sugerido: ${calculatedTotal.toFixed(2)}
              </p>
            )}
          </div>

          {/* Grid: Email y Nombre */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Email del Cliente *</Label>
              <Input
                type="email"
                placeholder="cliente@ejemplo.com"
                value={form.attendeeEmail}
                onChange={(e) => handleEmailChange(e.target.value)}
              />
              {searchingUser && (
                <p className="text-xs text-gray-500 mt-1">Buscando usuario...</p>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium">Nombre del Cliente *</Label>
              <Input
                placeholder="Nombre completo"
                value={form.attendeeName}
                onChange={(e) => setForm(prev => ({ ...prev, attendeeName: e.target.value }))}
              />
            </div>
          </div>

          {/* Teléfono (opcional) */}
          <div>
            <Label className="text-sm font-medium">Teléfono (opcional)</Label>
            <Input
              type="tel"
              placeholder="+52 123 456 7890"
              value={form.attendeePhone}
              onChange={(e) => setForm(prev => ({ ...prev, attendeePhone: e.target.value }))}
            />
          </div>

          {/* Grid: Monto y Método de Pago */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium flex items-center gap-1">
                <CreditCard className="w-4 h-4" />
                Monto Pagado *
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.amount_paid}
                onChange={(e) => setForm(prev => ({ ...prev, amount_paid: e.target.value }))}
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Método de Pago *</Label>
              <Select 
                value={form.payment_method} 
                onValueChange={(value) => setForm(prev => ({ ...prev, payment_method: value as PaymentMethod }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar método..." />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      <span className="flex items-center gap-2">
                        {method.icon} {method.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Grid: Referencia y Fecha */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Referencia de Pago (opcional)</Label>
              <Input
                placeholder="Ej: TRX-123456"
                value={form.payment_reference}
                onChange={(e) => setForm(prev => ({ ...prev, payment_reference: e.target.value }))}
              />
            </div>

            <div>
              <Label className="text-sm font-medium flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Fecha de Venta *
              </Label>
              <Input
                type="datetime-local"
                value={form.sale_date}
                max={new Date().toISOString().slice(0, 16)}
                onChange={(e) => setForm(prev => ({ ...prev, sale_date: e.target.value }))}
              />
            </div>
          </div>

          {/* Notas */}
          <div>
            <Label className="text-sm font-medium">Notas (opcional)</Label>
            <Textarea
              placeholder="Información adicional sobre la venta..."
              value={form.notes}
              onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Opciones */}
          <div className="space-y-2 border-t pt-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.sendEmail}
                onChange={(e) => setForm(prev => ({ ...prev, sendEmail: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm">Enviar email de confirmación al cliente</span>
            </label>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.autoLink}
                onChange={(e) => setForm(prev => ({ ...prev, autoLink: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm">Vincular automáticamente si el usuario se registra</span>
            </label>
          </div>

          {/* Botones */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isSubmitting || loadingTicketTypes}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? 'Registrando...' : 'Registrar Venta'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
