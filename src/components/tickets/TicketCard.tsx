'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Ticket as TicketIcon, 
  User, 
  Mail, 
  Phone, 
  Calendar,
  MapPin,
  Edit,
  Check,
  X,
  FileText,
  QrCode,
  Download,
  RefreshCw,
  Send
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Can } from '@/components/auth/Can';
import { authenticatedPost } from '@/lib/utils/api';
import type { Ticket } from '@/types';
import { formatCurrency } from '@/lib/utils/currency';
import { useTicketAutoGeneration } from '@/hooks/use-ticket-auto-generation';

interface TicketCardProps {
  ticket: Ticket;
  onUpdate: (ticketId: string, updates: any) => Promise<void>;
  isLoading?: boolean;
  canEdit?: boolean;  // 🆕 Si el usuario puede editar
  autoEdit?: boolean;  // 🆕 Si debe estar en modo edición automáticamente
}

export function TicketCard({ 
  ticket, 
  onUpdate, 
  isLoading = false, 
  canEdit = true, 
  autoEdit = false 
}: TicketCardProps) {
  const [isEditing, setIsEditing] = useState(autoEdit);
  const [formData, setFormData] = useState({
    attendee_name: ticket.attendee_name || '',
    attendee_email: ticket.attendee_email || '',
    attendee_phone: ticket.attendee_phone || '',
    special_requirements: ticket.special_requirements || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const { triggerAutoGeneration } = useTicketAutoGeneration();

  const isConfigured = ticket.status === 'configured';
  const isUsed = ticket.status === 'used';

  const handleEdit = () => {
    if (canEdit) {
      setIsEditing(true);
    }
  };

  const handleCancel = () => {
    setFormData({
      attendee_name: ticket.attendee_name || '',
      attendee_email: ticket.attendee_email || '',
      attendee_phone: ticket.attendee_phone || '',
      special_requirements: ticket.special_requirements || '',
    });
    setIsEditing(false);
  };

  const handleSave = async () => {
    let isFullyConfigured = false; // ✅ Declarar fuera del try
    
    try {
      setIsSaving(true);
      
      // 1. Verificar si está completamente configurado
      isFullyConfigured = formData.attendee_name.trim() && formData.attendee_email.trim();
      
      if (isFullyConfigured) {
        // ✨ UX OPTIMISTA: Actualizar UI inmediatamente
        console.log('✨ Optimistic update - showing immediate success');
        
        // Actualizar frontend inmediatamente (UX optimista)
        await onUpdate(ticket.id, {
          ...formData,
          status: 'generated', // Mostrar como generado inmediatamente
          pdf_url: 'generating...', // Placeholder temporal
        });
        
        setIsEditing(false);
        setIsSaving(false);
        
        // 🔄 Proceso en background (no bloquea UI)
        console.log('🚀 Starting background PDF generation...');
        triggerAutoGeneration(ticket.id, formData).then((result) => {
          if (result) {
            // Actualizar con datos reales cuando termine
            onUpdate(ticket.id, {
              ...formData,
              pdf_url: result.pdf_url,
              pdf_path: result.pdf_path,
              status: 'generated'
            });
            console.log('✅ Background generation completed');
          } else {
            // Si falla, revertir a configurado
            onUpdate(ticket.id, {
              ...formData,
              status: 'configured',
              pdf_url: undefined
            });
            console.warn('⚠️ Background generation failed, reverted to configured');
          }
        });
        
      } else {
        // Solo guardar datos parciales
        await onUpdate(ticket.id, formData);
        setIsEditing(false);
      }
      
    } catch (error) {
      console.error('Error updating ticket:', error);
    } finally {
      if (!isFullyConfigured) {
        setIsSaving(false);
      }
    }
  };

  const getStatusBadge = () => {
    switch (ticket.status) {
      case 'purchased':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Pendiente configuración</Badge>;
      case 'configured':
        return <Badge className="bg-green-100 text-green-800">Configurado</Badge>;
      case 'used':
        return <Badge className="bg-blue-100 text-blue-800">Usado</Badge>;
      default:
        return <Badge variant="outline">Desconocido</Badge>;
    }
  };

  const formatDate = (date: Date) => {
    return format(date, "d 'de' MMMM, yyyy", { locale: es });
  };

  const formatDateTime = (date: Date) => {
    return format(date, "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es });
  };

  return (
    <Card className={`${isUsed ? 'bg-gray-50' : ''} transition-all duration-200`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-full ${
              isUsed ? 'bg-blue-100' : 
              isConfigured ? 'bg-green-100' : 'bg-yellow-100'
            }`}>
              <TicketIcon className={`w-5 h-5 ${
                isUsed ? 'text-blue-600' : 
                isConfigured ? 'text-green-600' : 'text-yellow-600'
              }`} />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">{ticket.ticket_type_name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                {getStatusBadge()}
                <span className="text-sm text-gray-500">
                  {formatCurrency(ticket.amount_paid, ticket.currency)}
                </span>
              </div>
            </div>
          </div>
          
          {!isUsed && !isEditing && canEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEdit}
              disabled={isLoading}
            >
              <Edit className="w-4 h-4" />
            </Button>
          )}
          
          {!canEdit && (ticket.attendee_name || isConfigured) && (
            <Badge variant="outline" className="bg-gray-50 text-gray-600">
              Solo lectura
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        
        {/* Días autorizados */}
        {ticket.authorized_days && ticket.authorized_days.length > 0 && (
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-2">Días de acceso:</h5>
            <div className="flex flex-wrap gap-1">
              {ticket.authorized_days.map((day, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {format(day, "d MMM", { locale: es })}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Formulario de asistente */}
        <div className="border-t pt-4">
          <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <User className="w-4 h-4" />
            Datos del asistente
          </h5>

          {isEditing ? (
            <div className="space-y-4">
              
              {/* Formulario editable */}
              <div>
                <Label htmlFor={`name-${ticket.id}`} className="text-sm">
                  Nombre completo *
                </Label>
                <Input
                  id={`name-${ticket.id}`}
                  value={formData.attendee_name}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    attendee_name: e.target.value
                  }))}
                  placeholder="Nombre de quien asistirá"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor={`email-${ticket.id}`} className="text-sm">
                  Email
                </Label>
                <Input
                  id={`email-${ticket.id}`}
                  type="email"
                  value={formData.attendee_email}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    attendee_email: e.target.value
                  }))}
                  placeholder="email@ejemplo.com"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor={`phone-${ticket.id}`} className="text-sm">
                  Teléfono
                </Label>
                <Input
                  id={`phone-${ticket.id}`}
                  type="tel"
                  value={formData.attendee_phone}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    attendee_phone: e.target.value
                  }))}
                  placeholder="+52 999 123 4567"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor={`requirements-${ticket.id}`} className="text-sm">
                  Requerimientos especiales
                </Label>
                <Textarea
                  id={`requirements-${ticket.id}`}
                  value={formData.special_requirements}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    special_requirements: e.target.value
                  }))}
                  placeholder="Alergias, restricciones alimentarias, accesibilidad, etc."
                  rows={2}
                  className="mt-1"
                />
              </div>

              {/* Botones de acción */}
              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={isSaving || !formData.attendee_name.trim()}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Guardar
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSaving}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </Button>
              </div>
              
              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-blue-800 text-sm">
                  Al guardar los datos del asistente, se generará el boleto final con código QR.
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <div className="space-y-3">
              
              {/* Datos en modo lectura */}
              {ticket.attendee_name ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">{ticket.attendee_name}</span>
                  </div>
                  
                  {ticket.attendee_email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-600">{ticket.attendee_email}</span>
                    </div>
                  )}
                  
                  {ticket.attendee_phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-600">{ticket.attendee_phone}</span>
                    </div>
                  )}
                  
                  {ticket.special_requirements && (
                    <div className="mt-2 p-2 bg-yellow-50 rounded text-sm">
                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-yellow-800">Requerimientos especiales:</p>
                          <p className="text-yellow-700">{ticket.special_requirements}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertDescription className="text-yellow-800">
                    <div className="flex items-start gap-2">
                      <User className="w-4 h-4 mt-0.5" />
                      <div>
                        <p className="font-medium">
                          {canEdit ? 'Configuración pendiente' : 'Sin configurar'}
                        </p>
                        <p className="text-sm">
                          {canEdit 
                            ? 'Asigna el nombre del asistente para generar el boleto final.'
                            : 'Este boleto aún no ha sido configurado.'
                          }
                        </p>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        {/* Acciones del boleto */}
        {(isConfigured || ticket.pdf_url) && ( // ✅ Mostrar si está configurado O tiene PDF
          <div className="border-t pt-4">
            <div className="flex flex-wrap gap-2">
              {/* Botón principal: Descargar/Generar PDF */}
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                onClick={async () => {
                  try {
                    // 1. Verificar si ya existe PDF
                    let pdfUrl = ticket.pdf_url;
                    
                    // Si está generando, mostrar mensaje
                    if (pdfUrl === 'generating...') {
                      alert('🛠️ PDF generando... Esto tomará unos segundos. Recibirás el boleto por email.');
                      return;
                    }
                    
                    if (!pdfUrl) {
                      // 2. Generar PDF si no existe
                      const response = await authenticatedPost(`/api/tickets/${ticket.id}/generate-pdf`);
                      
                      if (response.ok) {
                        const result = await response.json();
                        pdfUrl = result.pdf_url;
                        
                        // Actualizar el ticket en memoria
                        if (onUpdate) {
                          await onUpdate(ticket.id, { 
                            pdf_url: result.pdf_url,
                            pdf_path: result.pdf_path,
                            qr_id: result.qr_id
                          });
                        }
                      } else {
                        const error = await response.json();
                        throw new Error(error.details || error.error || 'Error generando PDF');
                      }
                    }
                    
                    // 3. Abrir PDF en nueva ventana
                    if (pdfUrl && pdfUrl !== 'generating...') {
                      window.open(pdfUrl, '_blank');
                    }
                    
                  } catch (error) {
                    console.error('Error downloading PDF:', error);
                    alert(`Error al descargar el PDF: ${error instanceof Error ? error.message : 'Inténtalo de nuevo.'}`);
                  }
                }}
                disabled={isLoading || isSaving}
              >
                <Download className="w-4 h-4" />
                {ticket.pdf_url === 'generating...' ? 'Generando...' : 
                 ticket.pdf_url ? 'Descargar PDF' : 'Generar PDF'}
              </Button>
              
              {/* Botón Ver QR */}
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                onClick={() => {
                  if (ticket.qr_id) {
                    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
                    const qrUrl = `${baseUrl}/validate/${ticket.qr_id}`;
                    
                    // Copiar URL al clipboard
                    navigator.clipboard.writeText(qrUrl).then(() => {
                      alert('URL del QR copiada al portapapeles');
                    }).catch(() => {
                      // Fallback: mostrar URL
                      alert(`URL del QR: ${qrUrl}`);
                    });
                  } else {
                    alert('QR ID no disponible');
                  }
                }}
              >
                <QrCode className="w-4 h-4" />
                Ver QR
              </Button>
              
              {/* Botones Admin/Gestor */}
              <Can resource="ticketTypes" action="update">
                {/* Botón Regenerar PDF */}
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 text-orange-600 border-orange-300 hover:bg-orange-50"
                  onClick={async () => {
                    if (!confirm('¿Estás seguro de regenerar el PDF? Se enviará un nuevo email al asistente.')) {
                      return;
                    }
                    
                    try {
                      setIsRegenerating(true);
                      const response = await authenticatedPost(`/api/tickets/${ticket.id}/regenerate`);
                      
                      if (response.ok) {
                        const result = await response.json();
                        alert(`PDF regenerado y email enviado a ${result.email_sent_to || 'el asistente'}`);
                        
                        // Actualizar ticket
                        if (onUpdate) {
                          await onUpdate(ticket.id, {
                            pdf_url: result.pdf_url,
                            pdf_path: result.pdf_path
                          });
                        }
                      } else {
                        const error = await response.json();
                        throw new Error(error.details || error.error || 'Error regenerando PDF');
                      }
                    } catch (error) {
                      console.error('Error regenerating PDF:', error);
                      alert(`Error al regenerar PDF: ${error instanceof Error ? error.message : 'Inténtalo de nuevo.'}`);
                    } finally {
                      setIsRegenerating(false);
                    }
                  }}
                  disabled={isLoading || isSaving || isRegenerating || !ticket.pdf_url}
                >
                  {isRegenerating ? (
                    <div className="w-4 h-4 border border-orange-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Regenerar PDF
                </Button>
                
                {/* Botón Reenviar Email */}
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 text-blue-600 border-blue-300 hover:bg-blue-50"
                  onClick={async () => {
                    if (!confirm('¿Reenviar el boleto por email al asistente?')) {
                      return;
                    }
                    
                    try {
                      setIsResending(true);
                      const response = await authenticatedPost(`/api/tickets/${ticket.id}/resend-email`);
                      
                      if (response.ok) {
                        const result = await response.json();
                        alert(`Email reenviado a ${result.sent_to}`);
                      } else {
                        const error = await response.json();
                        throw new Error(error.details || error.error || 'Error reenviando email');
                      }
                    } catch (error) {
                      console.error('Error resending email:', error);
                      alert(`Error al reenviar email: ${error instanceof Error ? error.message : 'Inténtalo de nuevo.'}`);
                    } finally {
                      setIsResending(false);
                    }
                  }}
                  disabled={isLoading || isSaving || isResending || !ticket.pdf_url}
                >
                  {isResending ? (
                    <div className="w-4 h-4 border border-blue-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Reenviar Email
                </Button>
              </Can>
            </div>
          </div>
        )}

        {/* Información técnica (desarrollo) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="border-t pt-4">
            <details className="text-xs text-gray-500">
              <summary className="cursor-pointer font-medium">Debug Info</summary>
              <div className="mt-2 bg-gray-100 p-2 rounded font-mono">
                <div>ID: {ticket.id}</div>
                <div>QR: {ticket.qr_id}</div>
                <div>Order: {ticket.order_id}</div>
                <div>Status: {ticket.status}</div>
                <div>Created: {ticket.created_at ? formatDateTime(ticket.created_at) : 'N/A'}</div>
              </div>
            </details>
          </div>
        )}

      </CardContent>
    </Card>
  );
}
