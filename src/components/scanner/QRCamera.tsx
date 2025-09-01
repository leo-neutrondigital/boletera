'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Camera, 
  X, 
  Flashlight,
  FlashlightOff,
  RotateCcw,
  Zap,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface QRCameraProps {
  onQRDetected: (qrCode: string) => void;
  onClose: () => void;
  isProcessing?: boolean;
  scanStats?: {
    total: number;
    valid: number;
    invalid: number;
    successful: number;
    failed: number;
  };
}

export function QRCamera({ onQRDetected, onClose, isProcessing = false, scanStats }: QRCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Estados para el scanner
  const [hasCamera, setHasCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [lastScanTime, setLastScanTime] = useState(0);
  const [scanCount, setScanCount] = useState(0);
  const [codeReader, setCodeReader] = useState<any>(null);

  // Cargar ZXing Browser library
  useEffect(() => {
    const loadZXing = async () => {
      try {
        const { BrowserQRCodeReader } = await import('@zxing/browser');
        const reader = new BrowserQRCodeReader();
        setCodeReader(reader);
        console.log('📷 ZXing Browser loaded successfully');
        console.log('🔍 Available methods:', Object.getOwnPropertyNames(reader));
      } catch (error) {
        console.error('❌ Error loading ZXing Browser:', error);
        setCameraError('Error cargando el lector QR');
      }
    };

    loadZXing();
  }, []);

  // Inicializar cámara
  const initCamera = useCallback(async () => {
    if (!codeReader) return;

    try {
      console.log('📷 Initializing camera...');
      setCameraError(null);

      // Solicitar permisos de cámara
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' }, // Cámara trasera preferida
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
        setHasCamera(true);
        console.log('📷 Camera started successfully');
        
        // Iniciar escaneo
        startScanning();
      }

    } catch (error: any) {
      console.error('❌ Camera initialization error:', error);
      
      if (error.name === 'NotAllowedError') {
        setCameraError('Permisos de cámara denegados. Permite el acceso a la cámara y recarga.');
      } else if (error.name === 'NotFoundError') {
        setCameraError('No se encontró ninguna cámara en este dispositivo.');
      } else if (error.name === 'NotReadableError') {
        setCameraError('La cámara está siendo usada por otra aplicación.');
      } else {
        setCameraError('Error al acceder a la cámara: ' + error.message);
      }
    }
  }, [codeReader]);

  // Escaneo QR usando canvas
  const scanQRCode = useCallback(async () => {
    // ✅ Verificación simple: solo verificar elementos básicos
    if (!videoRef.current || !canvasRef.current || !codeReader) {
      return; // Salir silenciosamente si no está listo
    }

    // 🚫 CRÍTICO: No escanear si estamos procesando
    if (isProcessing) {
      return; // El interval se detendrá automáticamente
    }

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context || video.readyState !== 4) {
        console.log('🚫 Video not ready:', {
          hasContext: !!context,
          readyState: video.readyState,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight
        });
        return;
      }

      // Configurar canvas del mismo tamaño que el video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Dibujar frame actual del video
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Debug: Log de canvas size (solo la primera vez)
      if (scanCount === 0) {
        console.log('🎨 Canvas setup:', {
          width: canvas.width,
          height: canvas.height
        });
        setScanCount(1); // Marcar que ya se hizo el setup
      }
      
      // Intentar decodificar QR con ZXing Browser
      try {
        // Usar decodeFromCanvas que está documentado en @zxing/browser
        const result = await codeReader.decodeFromCanvas(canvas);
        
        if (result && result.text) {
          console.log('📱 Raw QR detected:', result.text);
          
          // 🚫 VERIFICACIÓN SIMPLE: Solo verificar si estamos procesando
          if (isProcessing) {
            console.log('🚫 Processing in progress, ignoring QR');
            return;
          }
          
          // ⏱️ Cooldown simple contra escaneos rápidos del mismo QR
          const now = Date.now();
          if (now - lastScanTime > 2000) { // 2 segundos cooldown simple
            console.log('📱 QR Code detected and accepted:', result.text);
            setLastScanTime(now);
            setScanCount(prev => prev + 1);
            
            // Vibración si está disponible
            if ('vibrate' in navigator) {
              navigator.vibrate(100);
            }
            
            onQRDetected(result.text);
          } else {
            console.log('⏱️ QR cooldown active, ignoring duplicate scan');
          }
        }
      } catch (error: any) {
        // No QR found in this frame - esto es normal, continuar
        // Solo loggear si es un error inesperado
        if (error.message && 
            !error.message.includes('No QR code found') &&
            !error.message.includes('No MultiFormat Readers') && 
            !error.message.includes('No QR') && 
            !error.message.includes('not found')) {
          console.warn('⚠️ QR decode error:', error.message);
        }
      }

    } catch (error) {
      console.warn('⚠️ Scan frame error:', error);
    }
  }, [codeReader, onQRDetected, isProcessing, lastScanTime, scanCount]);

  // Iniciar escaneo continuo
  const startScanning = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }

    // 🚫 NO ESCANEAR si estamos procesando
    if (isProcessing) {
      console.log('🚫 Scanning paused - processing in progress');
      return;
    }

    // Escanear cada 300ms para balance entre performance y responsividad
    scanIntervalRef.current = setInterval(() => {
      // Verificar en cada iteración si debemos parar
      if (isProcessing) {
        console.log('🛑 Stopping scan interval - processing started');
        if (scanIntervalRef.current) {
          clearInterval(scanIntervalRef.current);
          scanIntervalRef.current = null;
        }
        return;
      }
      scanQRCode();
    }, 300);
    
    console.log('🔍 QR scanning started');
  }, [scanQRCode, isProcessing]);

  // Parar escaneo completamente
  const stopScanning = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
      console.log('🛑 QR scanning stopped');
    }
  }, []);

  // Reanudar escaneo
  const resumeScanning = useCallback(() => {
    console.log('▶️ Resuming QR scanning...');
    startScanning();
  }, [startScanning]);

  // Cleanup manual (para el botón cerrar)
  const manualCleanup = useCallback(() => {
    console.log('🔄 Manual cleanup triggered...');
    
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('📷 Camera track stopped manually');
      });
      setStream(null);
    }
    
    setHasCamera(false);
    onClose();
  }, [stream, onClose]);

  // Toggle flash/torch
  const toggleFlash = useCallback(async () => {
    if (!stream) return;

    try {
      const videoTrack = stream.getVideoTracks()[0];
      const capabilities = videoTrack.getCapabilities();

      if ((capabilities as any).torch) {
        await videoTrack.applyConstraints({
          advanced: [{ torch: !isFlashOn } as any]
        });
        setIsFlashOn(!isFlashOn);
        console.log('🔦 Flash toggled:', !isFlashOn);
      }
    } catch (error) {
      console.warn('⚠️ Flash not available:', error);
    }
  }, [stream, isFlashOn]);

  // Efectos
  useEffect(() => {
    if (codeReader) {
      initCamera();
    }
    
    // Solo cleanup al desmontar el componente
    return () => {
      console.log('🧹 Component unmounting, cleaning up...');
      
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      
      if (stream) {
        stream.getTracks().forEach(track => {
          track.stop();
          console.log('📷 Camera track stopped on unmount');
        });
      }
    };
  }, [codeReader]);

  // 🎯 EFECTO CRÍTICO: Pausar/reanudar escaneo según estado de procesamiento
  useEffect(() => {
    if (hasCamera) { // Solo si la cámara está inicializada
      if (isProcessing) {
        console.log('⏸️ Pausing scanning - processing started');
        stopScanning();
      } else {
        console.log('▶️ Resuming scanning - processing finished');
        // Pequeño delay para asegurar que el estado se haya actualizado
        setTimeout(() => {
          if (!isProcessing) { // Verificar nuevamente
            resumeScanning();
          }
        }, 100);
      }
    }
  }, [isProcessing, hasCamera, stopScanning, resumeScanning]);

  // Render
  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="bg-black/80 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Camera className="h-6 w-6" />
          <div>
            <h2 className="font-semibold">Escáner QR</h2>
            <p className="text-sm text-gray-300">
              {hasCamera ? 'Apunta al código QR' : 'Inicializando cámara...'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Contador de scans */}
          {scanCount > 0 && (
            <Badge variant="outline" className="bg-white/10 text-white border-white/20">
              {scanCount} scan{scanCount !== 1 ? 's' : ''}
            </Badge>
          )}
          
          {/* Estadísticas detalladas (solo en desarrollo) */}
          {process.env.NODE_ENV === 'development' && scanStats && scanStats.total > 0 && (
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="bg-green-500/20 text-white border-green-300/30 text-xs">
                ✅ {scanStats.successful}
              </Badge>
              <Badge variant="outline" className="bg-red-500/20 text-white border-red-300/30 text-xs">
                ❌ {scanStats.failed}
              </Badge>
              <Badge variant="outline" className="bg-yellow-500/20 text-white border-yellow-300/30 text-xs">
                📱 {scanStats.invalid}
              </Badge>
            </div>
          )}
          
          {/* Flash toggle */}
          {hasCamera && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFlash}
              className="text-white hover:bg-white/10"
            >
              {isFlashOn ? <FlashlightOff className="h-5 w-5" /> : <Flashlight className="h-5 w-5" />}
            </Button>
          )}
          
          {/* Close button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={manualCleanup}
            className="text-white hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative overflow-hidden">
        {cameraError ? (
          // Error State
          <div className="flex-1 flex items-center justify-center p-8">
            <Card className="bg-red-50 border-red-200 p-6 max-w-md">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-red-900 mb-2">
                  Error de cámara
                </h3>
                <p className="text-red-700 mb-4">
                  {cameraError}
                </p>
                <div className="flex gap-3">
                  <Button 
                    onClick={() => {
                      setCameraError(null);
                      initCamera();
                    }}
                    className="flex-1"
                    variant="outline"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reintentar
                  </Button>
                  <Button onClick={manualCleanup} className="flex-1">
                    Cerrar
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        ) : (
          // Camera View
          <>
            {/* Video stream */}
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            
            {/* Hidden canvas for QR processing */}
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Overlay con marco de escaneo */}
            <div className="absolute inset-0 bg-black/40">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  {/* Marco de escaneo */}
                  <div className="w-64 h-64 border-4 border-white rounded-2xl border-dashed animate-pulse" />
                  
                  {/* Esquinas del marco */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />
                  
                  {/* Línea de escaneo */}
                  {hasCamera && (
                    <div className="absolute inset-x-0 top-1/2 h-0.5 bg-white opacity-80 animate-pulse" />
                  )}
                </div>
              </div>
            </div>
            
            {/* Status indicator */}
            <div className="absolute top-20 left-4 right-4">
              {isProcessing ? (
                <div className="bg-yellow-500 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Validando boleto...</span>
                </div>
              ) : hasCamera ? (
                <div className="bg-green-500 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  <span>Listo para escanear</span>
                </div>
              ) : (
                <div className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Inicializando cámara...</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-black/80 text-white p-4 text-center">
        <p className="text-sm text-gray-300">
          {hasCamera 
            ? 'Coloca el código QR dentro del marco para escanearlo automáticamente'
            : 'Preparando la cámara para escanear códigos QR...'
          }
        </p>
        
        {/* Estadísticas resumidas y tips (solo en desarrollo) */}
        {process.env.NODE_ENV === 'development' && scanStats && scanStats.total > 0 && (
          <div className="mt-2 text-xs text-gray-400">
            <p>
              Total: {scanStats.total} | Válidos: {scanStats.valid} | 
              Éxitos: {scanStats.successful} | 
              Tasa éxito: {scanStats.valid > 0 ? ((scanStats.successful / scanStats.valid) * 100).toFixed(1) : 0}%
            </p>
          </div>
        )}
        
        {/* Tips dinámicos basados en estadísticas */}
        {scanStats && scanStats.invalid > 2 && (
          <div className="mt-2 text-xs text-yellow-300">
            💡 Tip: Asegúrate de escanear códigos QR de boletos de Boletera
          </div>
        )}
      </div>
    </div>
  );
}
