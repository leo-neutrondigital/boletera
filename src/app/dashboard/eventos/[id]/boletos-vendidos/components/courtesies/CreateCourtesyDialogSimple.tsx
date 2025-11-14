import { useState } from 'react';
import { useSWRConfig } from 'swr';
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
import { Gift, User, AlertTriangle } from 'lucide-react';
import { auth } from '@/lib/firebase/client';
import { useToast } from '@/hooks/use-toast';
import { useCachedTicketTypes } from '@/contexts/DataCacheContext';

interface FoundUser {
  uid: string;
  name: string;
  email: string;
}

interface CreateCourtesyDialogSimpleProps {
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateCourtesyDialogSimple({
  eventId,
  isOpen,
  onClose,
  onSuccess
}: CreateCourtesyDialogSimpleProps) {
  const { toast } = useToast();
  const { mutate } = useSWRConfig();
  const { ticketTypes, loading: loadingTicketTypes } = useCachedTicketTypes(eventId);
  
  const [form, setForm] = useState({
    ticketTypeId: '',
    attendeeName: '',
    attendeeEmail: '',
    courtesyType: '',
    notes: '',
    quantity: 1,
    sendEmail: true
  });
  
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [searchingUser, setSearchingUser] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const validateForm = (): boolean => {
    const errors: string[] = [];
    
    if (!form.ticketTypeId) errors.push('Debe seleccionar un tipo de boleto');
    if (!form.attendeeEmail || !form.attendeeEmail.includes('@')) {
      errors.push('Debe ingresar un email válido');
    }
    if (!form.courtesyType) errors.push('Debe seleccionar un tipo de cortesía');
    if (form.quantity < 1 || form.quantity > 10) {
      errors.push('La cantidad debe estar entre 1 y 10');
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

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
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setFoundUser({
            uid: data.user.uid,
            name: data.user.name,
            email: data.user.email
          });
          
          if (!form.attendeeName && data.user.name) {
            setForm(prev => ({ ...prev, attendeeName: data.user.name }));
          }
        } else {
          setFoundUser(null);
        }
      }
    } catch (error) {
      console.error('Error searching user:', error);
    } finally {
      setSearchingUser(false);
    }
  };

  const handleEmailChange = (email: string) => {
    setForm(prev => ({ ...prev, attendeeEmail: email }));
    
    const timeoutId = setTimeout(() => {
      searchUserByEmail(email);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  };

  const handleCreate = async () => {
    if (!validateForm()) return;

    setIsCreating(true);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Usuario no autenticado');

      const token = await currentUser.getIdToken();

      const payload = {
        eventId,
        ticketTypeId: form.ticketTypeId,
        attendeeName: form.attendeeName || foundUser?.name || '',
        attendeeEmail: form.attendeeEmail,
        courtesyType: form.courtesyType,
        notes: form.notes,
        quantity: form.quantity,
        sendEmail: form.sendEmail
      };

      const response = await fetch('/api/admin/courtesy-tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al crear cortesía');
      }

      // Invalidar caché de SWR
      await mutate(`/api/admin/events/${eventId}/sales?dataType=courtesies&courtesyLimit=10000`);

      toast({
        title: "Cortesías creadas",
        description: `Se crearon ${form.quantity} boleto(s) de cortesía exitosamente`
      });

      // Reset form
      setForm({
        ticketTypeId: '',
        attendeeName: '',
        attendeeEmail: '',
        courtesyType: '',
        notes: '',
        quantity: 1,
        sendEmail: true
      });
      setFoundUser(null);
      setValidationErrors([]);

      onSuccess();
      
    } catch (error) {
      console.error('Error creating courtesy:', error);
      toast({
        variant: "destructive",
        title: "Error al crear cortesía",
        description: error instanceof Error ? error.message : "Ocurrió un error inesperado"
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-green-600" />
            Crear Boletos de Cortesía
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          
          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Tipo de Boleto */}
          <div className="space-y-2">
            <Label>Tipo de Boleto *</Label>
            <Select 
              value={form.ticketTypeId} 
              onValueChange={(value) => setForm(prev => ({ ...prev, ticketTypeId: value }))}
              disabled={loadingTicketTypes}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingTicketTypes ? "Cargando..." : "Selecciona un tipo de boleto"} />
              </SelectTrigger>
              <SelectContent>
                {ticketTypes.map(type => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name} - ${type.price}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label>Email del Beneficiario *</Label>
            <Input
              type="email"
              placeholder="usuario@ejemplo.com"
              value={form.attendeeEmail}
              onChange={(e) => handleEmailChange(e.target.value)}
            />
            {searchingUser && (
              <p className="text-xs text-gray-500">Buscando usuario...</p>
            )}
            {foundUser && (
              <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded">
                <User className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-700">Usuario registrado: {foundUser.name}</span>
              </div>
            )}
          </div>

          {/* Nombre */}
          <div className="space-y-2">
            <Label>Nombre del Beneficiario</Label>
            <Input
              placeholder="Nombre completo (opcional)"
              value={form.attendeeName}
              onChange={(e) => setForm(prev => ({ ...prev, attendeeName: e.target.value }))}
            />
          </div>

          {/* Tipo de Cortesía */}
          <div className="space-y-2">
            <Label>Tipo de Cortesía *</Label>
            <Input
              placeholder="Ej: Empresa - Stand 23 - Gafete 150"
              value={form.courtesyType}
              onChange={(e) => setForm(prev => ({ ...prev, courtesyType: e.target.value }))}
            />
            <p className="text-xs text-gray-500">
              Especifica empresa, stand, gafete, espacio, etc.
            </p>
          </div>

          {/* Cantidad */}
          <div className="space-y-2">
            <Label>Cantidad de Boletos *</Label>
            <Input
              type="number"
              min="1"
              max="10"
              value={form.quantity}
              onChange={(e) => setForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
            />
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label>Notas / Observaciones</Label>
            <Textarea
              placeholder="Notas adicionales (opcional)"
              value={form.notes}
              onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Enviar Email */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="sendEmail"
              checked={form.sendEmail}
              onChange={(e) => setForm(prev => ({ ...prev, sendEmail: e.target.checked }))}
              className="w-4 h-4"
            />
            <Label htmlFor="sendEmail" className="cursor-pointer">
              Enviar email de notificación
            </Label>
          </div>

          {/* Botones */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isCreating}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isCreating || loadingTicketTypes}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isCreating ? 'Creando...' : `Crear ${form.quantity} Cortesía(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
