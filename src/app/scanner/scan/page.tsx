'use client';

import { useState, useCallback, useRef } from 'react';
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
  const isProcessingRef = useRef(false); // 🔒 Referencia inmutable para bloqueo inmediato
  const [scanStats, setScanStats] = useState({
    total: 0,
    valid: 0,
    invalid: 0,
    successful: 0,
    failed: 0
  });

  // 🔓 Función helper para liberar el bloqueo completamente
  const releaseProcessing = () => {
    isProcessingRef.current = false;
    releaseProcessing();
  };

  const handleQRDetected = useCallback(async (qrData: string) => {
    console.log('🎯 handleQRDetected called with isProcessing:', isProcessing, 'ref:', isProcessingRef.current);
    
    // 🔒 BLOQUEO INMEDIATO con useRef (no depende de re-renders)
    if (isProcessingRef.current) {
      console.log('🚫 Blocking handleQRDetected - already processing (ref check)');
      return;
    }
    
    // 🔒 BLOQUEO SECUNDARIO con estado
    if (isProcessing) {
      console.log('🚫 Blocking handleQRDetected - already processing (state check)');
      return;
    }
    
    try {
      console.log('🚀 Starting QR processing...');
      isProcessingRef.current = true; // 🔒 Bloqueo inmediato
      setIsProcessing(true);
      console.log('📱 QR detected:', qrData);
      
      // Actualizar estadísticas
      setScanStats(prev => ({
        ...prev,
        total: prev.total + 1
      }));
      
      // Extraer QR ID
      const qrId = extractQRId(qrData);
      
      if (!qrId) {
        console.error('❌ Invalid QR format:', qrData);
        
        // Actualizar estadísticas de inválidos
        setScanStats(prev => ({
          ...prev,
          invalid: prev.invalid + 1
        }));
        
        // Analizar el tipo de QR inválido para dar mejor feedback
        let errorTitle = "QR inválido";
        let errorDescription = "El código escaneado no tiene el formato correcto.";
        let errorSuggestion = "Intenta con otro código QR de Boletera.";
        
        if (qrData.includes('http') || qrData.includes('www')) {
          errorTitle = "QR de sitio web";
          errorDescription = "Este parece ser un enlace web, no un boleto.";
          errorSuggestion = "Busca el código QR específico del boleto.";
        } else if (qrData.length < 10) {
          errorTitle = "QR muy corto";
          errorDescription = "El código es demasiado corto para ser un boleto válido.";
          errorSuggestion = "Asegúrate de escanear todo el código QR.";
        } else if (!qrData.includes('qr_')) {
          errorTitle = "Formato incorrecto";
          errorDescription = "Los boletos de Boletera tienen un formato específico.";
          errorSuggestion = "Busca un QR que contenga el texto del boleto.";
        }
        
        // Toast mejorado con más información
        toast({
          variant: "destructive",
          title: errorTitle,
          description: `${errorDescription} ${errorSuggestion}`,
        });
        
        console.log('📊 Scan stats:', {
          total: scanStats.total + 1,
          invalid: scanStats.invalid + 1,
          invalidRate: ((scanStats.invalid + 1) / (scanStats.total + 1) * 100).toFixed(1) + '%'
        });
        
        releaseProcessing();
        return;
      }
      
      // Actualizar estadísticas de válidos
      setScanStats(prev => ({
        ...prev,
        valid: prev.valid + 1
      }));
      
      console.log('🔍 Validating QR ID:', qrId);
      
      // Llamar API de validación
      const response = await authenticatedPost(`/api/validate/${qrId}`, {
        action: 'checkin',
        timestamp: new Date().toISOString()
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log('✅ Check-in successful:', result);
        
        // Actualizar estadísticas de éxito
        setScanStats(prev => ({
          ...prev,
          successful: prev.successful + 1
        }));
        
        console.log('📊 Success! Stats:', {
          total: scanStats.total + 1,
          valid: scanStats.valid + 1,
          successful: scanStats.successful + 1,
          successRate: ((scanStats.successful + 1) / (scanStats.valid + 1) * 100).toFixed(1) + '%'
        });
        
        // Redirigir a página de éxito
        router.push(`/scanner/success/${result.ticket.id}?qr=${qrId}`);
      } else {
        console.error('❌ Check-in failed:', result);
        
        // Actualizar estadísticas de fallas
        setScanStats(prev => ({
          ...prev,
          failed: prev.failed + 1
        }));
        
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
          releaseProcessing();
        } else if (result.error === 'Internal server error') {
          // Toast: Error del servidor
          toast({
            variant: "destructive",
            title: "Error del servidor",
            description: "Problema temporal. Intenta de nuevo.",
          });
          releaseProcessing();
        } else {
          // Toast: Otros errores - continuar escaneando
          toast({
            variant: "destructive",
            title: "Error de validación",
            description: result.error || 'Error desconocido. Intenta de nuevo.',
          });
          releaseProcessing();
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
      
      releaseProcessing();
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
        isProcessingRef={isProcessingRef}
        scanStats={scanStats}
      />
    </AuthGuard>
  );
}
