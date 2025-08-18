import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, AlertTriangle } from 'lucide-react';

interface DeleteOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  orderInfo: {
    order_id: string;
    total_tickets: number;
    customer_name: string;
    event_name: string;
  };
}

export function DeleteOrderDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  orderInfo 
}: DeleteOrderDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsDeleting(true);
      await onConfirm();
      onClose();
    } catch (error) {
      // Error será manejado por el parent con toast
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <Trash2 className="w-5 h-5" />
            Eliminar orden de cortesía
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <div className="space-y-2">
                <p className="font-medium">
                  Esta acción no se puede deshacer
                </p>
                <div className="text-sm space-y-1">
                  <p><strong>Orden:</strong> #{orderInfo.order_id.slice(-8).toUpperCase()}</p>
                  <p><strong>Evento:</strong> {orderInfo.event_name}</p>
                  <p><strong>Solicitante:</strong> {orderInfo.customer_name}</p>
                  <p className="text-red-700 font-medium">
                    <strong>Se eliminarán {orderInfo.total_tickets} boleto{orderInfo.total_tickets > 1 ? 's' : ''} de cortesía</strong>
                  </p>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Eliminar orden
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
