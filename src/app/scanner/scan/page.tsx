'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { QRCamera } from '@/components/scanner/QRCamera';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { authenticatedPost } from '@/lib/utils/api';
import { useToast } from '@/hooks/use-toast';

// Extraer QR ID de la URL completa
function extractQRId(qrUrl: string): string | null {
  try {
    // Formatos esperados:
    // https://boletera.com/validate/qr_1234567890_abc123
    // http://localhost:3000/validate/qr_1234567890_abc123
    // qr_1234567890_abc123
    
    const url = new URL(qrUrl.startsWith('http') ? qrUrl : `https://dummy.com/${qrUrl}`);
    const pathParts = url.pathname.split('/');
    const qrId = pathParts[pathParts.length - 1];
    
    // Validar formato del QR ID
    if (qrId && qrId.startsWith('qr_')) {
      return qrId;
    }
    
    return null;
  } catch (error) {
    console.warn('⚠️ Invalid QR URL format:', qrUrl);
    return null;
  }
}

export default function ScanPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleQRDetected = useCallback(async (qrData: string) => {
    if (isProcessing) return; // Evitar múltiples procesamiento
    
    try {
      setIsProcessing(true);
      console.log('📱 QR detected:', qrData);
      
      // Extraer QR ID
      const qrId = extractQRId(qrData);
      
      if (!qrId) {
        console.error('❌ Invalid QR format');
        
        // Mostrar toast de error y continuar escaneando
        toast({
          variant: "destructive",
          title: "QR inválido",
          description: "El código escaneado no tiene el formato correcto. Intenta con otro código.",
        });
        
        setIsProcessing(false);
        return;
      }
      
      console.log('🔍 Validating QR ID:', qrId);
      
      // Llamar API de validación
      const response = await authenticatedPost(`/api/validate/${qrId}`, {
        action: 'checkin',
        timestamp: new Date().toISOString()
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log('✅ Check-in successful:', result);
        
        // Redirigir a página de éxito
        router.push(`/scanner/success/${result.ticket.id}?qr=${qrId}`);
      } else {
        console.error('❌ Check-in failed:', result);
        console.error('❌ Full error response:', {
          status: response.status,
          statusText: response.statusText,
          error: result.error,
          details: result.details
        });
        
        // Manejar diferentes tipos de errores
        if (result.error === 'Already checked in today') {
          // Página específica: Ya hizo check-in hoy
          router.push(`/scanner/already-used?qr=${qrId}&error=${encodeURIComponent(result.error)}&details=${encodeURIComponent(result.details)}`);
        } else if (result.error === 'Event not started' || result.error === 'Event ended') {
          // Página específica: Problemas de fecha del evento
          router.push(`/scanner/event-timing?qr=${qrId}&error=${encodeURIComponent(result.error)}&details=${encodeURIComponent(result.details)}`);
        } else if (result.error === 'QR code not found') {
          // Página específica: QR no encontrado
          router.push(`/scanner/qr-not-found?qr=${qrId}&error=${encodeURIComponent(result.error)}&details=${encodeURIComponent(result.details)}`);
        } else if (result.error === 'Unauthorized' || result.error === 'Forbidden') {
          // Toast: Problemas de autenticación
          toast({
            variant: "destructive",
            title: "Error de autenticación",
            description: "Tu sesión expiró. Refresca la página.",
          });
          setIsProcessing(false);
        } else if (result.error === 'Internal server error') {
          // Toast: Error del servidor
          toast({
            variant: "destructive",
            title: "Error del servidor",
            description: "Problema temporal. Intenta de nuevo.",
          });
          setIsProcessing(false);
        } else {
          // Toast: Otros errores - continuar escaneando
          toast({
            variant: "destructive",
            title: "Error de validación",
            description: result.error || 'Error desconocido. Intenta de nuevo.',
          });
          setIsProcessing(false);
        }
      }
      
    } catch (error) {
      console.error('❌ Validation error:', error);
      
      // Toast para errores de red/conexión
      toast({
        variant: "destructive",
        title: "Error de conexión",
        description: "No se pudo conectar al servidor. Verifica tu conexión.",
      });
      
      setIsProcessing(false);
    }
  }, [router, isProcessing]);

  const handleClose = useCallback(() => {
    router.push('/scanner');
  }, [router]);

  return (
  <AuthGuard allowedRoles={['admin', 'gestor', 'comprobador']}>
      <QRCamera 
        onQRDetected={handleQRDetected}
        onClose={handleClose}
        isProcessing={isProcessing}
      />
    </AuthGuard>
  );
}
