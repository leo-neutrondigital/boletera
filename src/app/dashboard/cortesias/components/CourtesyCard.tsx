import { 
  Gift,
  Ticket as TicketIcon, 
  User, 
  Mail, 
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  FileText,
  Trash2 // 🆕 Ícono de eliminar
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

import type { CourtesyTicket, CourtesyType } from './types';

interface CourtesyCardProps {
  ticket: CourtesyTicket;
  courtesyTypes: CourtesyType[];
  onDelete?: (ticketId: string) => void; // 🆕 Callback para eliminar
}

export function CourtesyCard({ ticket, courtesyTypes, onDelete }: CourtesyCardProps) {
  // Obtener información del tipo de cortesía
  const getCourtesyTypeInfo = (type: string) => {
    return courtesyTypes.find(ct => ct.value === type) || courtesyTypes.find(ct => ct.value === 'otro')!;
  };

  const courtesyTypeInfo = getCourtesyTypeInfo(ticket.courtesy_type);

  return (
    <Card className="border-l-4 border-green-500">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="bg-green-100 p-3 rounded-full">
              <TicketIcon className="h-6 w-6 text-green-600" />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-gray-900">
                  {ticket.ticket_type_name}
                </h3>
                <Badge className={courtesyTypeInfo.color}>
                  <Gift className="w-3 h-3 mr-1" />
                  {courtesyTypeInfo.label}
                </Badge>
                {ticket.user_id ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Vinculada
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                    <Clock className="w-3 h-3 mr-1" />
                    Pendiente
                  </Badge>
                )}
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3 text-gray-500" />
                  <span className="text-gray-600">{ticket.attendee_name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Mail className="w-3 h-3 text-gray-500" />
                  <span className="text-gray-600">{ticket.attendee_email}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-gray-500" />
                  <span className="text-gray-600">
                    {ticket.created_at ? (
                      (() => {
                        // Soportar Firestore Timestamp y Date
                        let dateObj: Date;
                        if (typeof ticket.created_at === 'object' && ticket.created_at !== null) {
                          if ('toDate' in ticket.created_at && typeof ticket.created_at.toDate === 'function') {
                            dateObj = ticket.created_at.toDate();
                          } else if ('seconds' in ticket.created_at && typeof ticket.created_at.seconds === 'number') {
                            dateObj = new Date(ticket.created_at.seconds * 1000);
                          } else {
                            dateObj = new Date(ticket.created_at as any);
                          }
                        } else {
                          dateObj = new Date(ticket.created_at as any);
                        }
                        return dateObj.toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        });
                      })()
                    ) : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-gray-500" />
                  <span className="text-gray-600 font-semibold">
                    GRATIS
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="border-t bg-gray-50">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Información del boleto */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Información del boleto</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Orden:</span>
                <span className="font-mono text-xs">#{ticket.order_id?.slice(-8).toUpperCase() || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">ID del boleto:</span>
                <span className="font-mono text-xs">{ticket.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">QR ID:</span>
                <span className="font-mono text-xs">{ticket.qr_id}</span>
              </div>
              {ticket.attendee_phone && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Teléfono:</span>
                  <span>{ticket.attendee_phone}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Estado:</span>
                <Badge variant="outline" className="text-xs">
                  {ticket.status}
                </Badge>
              </div>
              {ticket.courtesy_notes && (
                <div className="pt-2">
                  <span className="text-gray-600 text-xs block mb-1">Notas:</span>
                  <p className="text-gray-800 text-sm bg-white p-2 rounded border">
                    {ticket.courtesy_notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Acciones y estado */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Estado y acciones</h4>
            
            <div className="space-y-3">
              {ticket.user_id ? (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <div>
                      <p className="font-medium">Cortesía vinculada</p>
                      <p className="text-sm">
                        Este boleto ya está asociado a una cuenta de usuario.
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="bg-yellow-50 border-yellow-200">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    <div>
                      <p className="font-medium">Pendiente de vinculación</p>
                      <p className="text-sm">
                        El usuario debe crear una cuenta con el email: <br />
                        <code className="bg-yellow-100 px-1 rounded">{ticket.attendee_email}</code>
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="flex gap-2">
                {/* 🆕 Botón de descarga PDF (solo si existe PDF) */}
                {ticket.pdf_url ? (
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1 text-xs bg-green-600 hover:bg-green-700"
                    onClick={() => window.open(ticket.pdf_url, '_blank')}
                  >
                    <FileText className="w-3 h-3 mr-1" />
                    Descargar PDF
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    disabled
                  >
                    <FileText className="w-3 h-3 mr-1" />
                    PDF no generado
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  disabled
                >
                  <Mail className="w-3 h-3 mr-1" />
                  Reenviar (Próximamente)
                </Button>
              </div>
              
              {/* 🆕 Botón de eliminar (solo para admin) */}
              {onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs text-red-600 border-red-300 hover:bg-red-50"
                  onClick={async () => {
                    if (confirm(`¿Estás seguro de eliminar la cortesía de ${ticket.attendee_name}?`)) {
                      try {
                        await onDelete(ticket.id);
                        // Toast manejado por el parent component
                      } catch (error) {
                        console.error('Error deleting courtesy:', error);
                        // El error será manejado por el parent
                      }
                    }
                  }}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Eliminar cortesía
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
