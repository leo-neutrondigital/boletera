'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Calendar,
  QrCode,
  ArrowLeft,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function EventTimingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const qrId = searchParams.get('qr');
  const error = searchParams.get('error');
  const details = searchParams.get('details');
  
  const isNotStarted = error === 'Event not started';
  const isEnded = error === 'Event ended';

  return (
  <AuthGuard allowedRoles={['admin', 'gestor', 'comprobador']}>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
              isNotStarted ? 'bg-blue-100' : 'bg-orange-100'
            }`}>
              <Calendar className={`h-12 w-12 ${
                isNotStarted ? 'text-blue-600' : 'text-orange-600'
              }`} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {isNotStarted ? '⏰ Evento aún no inicia' : '📅 Evento ya terminó'}
            </h1>
            <p className="text-gray-600">
              {isNotStarted 
                ? 'Este boleto es válido, pero el evento aún no ha comenzado'
                : 'El período de validez de este boleto ya expiró'
              }
            </p>
          </div>

          {/* Información del timing */}
          <Alert className={`mb-6 ${
            isNotStarted ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'
          }`}>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className={`font-medium ${
                  isNotStarted ? 'text-blue-800' : 'text-orange-800'
                }`}>
                  {isNotStarted ? 'El evento iniciará próximamente' : 'El evento ya concluyó'}
                </p>
                <p className={`text-sm ${
                  isNotStarted ? 'text-blue-700' : 'text-orange-700'
                }`}>
                  {details}
                </p>
              </div>
            </AlertDescription>
          </Alert>

          {/* Información del QR */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Información del boleto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* QR ID */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">QR Code:</span>
                <Badge variant="outline" className="font-mono text-xs">
                  {qrId}
                </Badge>
              </div>

              {/* Estado del boleto */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Estado del boleto:</span>
                <Badge variant="secondary" className={`${
                  isNotStarted ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                }`}>
                  {isNotStarted ? 'Válido (futuro)' : 'Expirado'}
                </Badge>
              </div>

              {/* Hora del escaneo */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Escaneado:</span>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  {new Date().toLocaleString()}
                </div>
              </div>
              
            </CardContent>
          </Card>

          {/* Instrucciones específicas */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">
                {isNotStarted ? '¿Cuándo será válido?' : '¿Qué significa esto?'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700">
              
              {isNotStarted ? (
                <>
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 p-1 rounded-full mt-1">
                      <Calendar className="h-3 w-3 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">Boleto válido para el futuro</p>
                      <p className="text-gray-600">Este boleto podrá ser usado cuando inicie el evento según las fechas programadas.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="bg-green-100 p-1 rounded-full mt-1">
                      <Clock className="h-3 w-3 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Revisa las fechas del evento</p>
                      <p className="text-gray-600">Confirma que las fechas del evento estén configuradas correctamente.</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <div className="bg-orange-100 p-1 rounded-full mt-1">
                      <AlertTriangle className="h-3 w-3 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium">Período de validez expirado</p>
                      <p className="text-gray-600">El evento ya terminó según las fechas programadas en el sistema.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 p-1 rounded-full mt-1">
                      <Calendar className="h-3 w-3 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">Verificar fechas del evento</p>
                      <p className="text-gray-600">Si el evento sigue activo, verifica que las fechas estén actualizadas en el sistema.</p>
                    </div>
                  </div>
                </>
              )}
              
            </CardContent>
          </Card>

          {/* Acciones - Desktop */}
          <div className="hidden sm:block space-y-3">
            <Button 
              onClick={() => router.push('/scanner/scan')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6"
              size="lg"
            >
              <QrCode className="w-5 h-5 mr-2" />
              Escanear otro boleto
            </Button>
            
            <Button 
              onClick={() => router.push('/scanner')}
              variant="ghost"
              className="w-full text-gray-600 hover:text-gray-800 text-sm py-2"
              size="sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al dashboard
            </Button>
          </div>

          {/* Información adicional */}
          <div className="mt-8 text-center pb-32 sm:pb-8">
            <p className="text-xs text-gray-500">
              {isNotStarted 
                ? 'Si crees que el evento debería estar activo, contacta al administrador.'
                : 'Si el evento sigue activo, contacta al administrador para actualizar las fechas.'
              }
            </p>
          </div>

        </div>

        {/* Botones flotantes - Mobile */}
        <div className="sm:hidden fixed bottom-20 left-4 right-4 z-40 space-y-3">
          <Button 
            onClick={() => router.push('/scanner/scan')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-4 shadow-lg"
            size="lg"
          >
            <QrCode className="w-5 h-5 mr-2" />
            Escanear otro boleto
          </Button>
          
          <Button 
            onClick={() => router.push('/scanner')}
            variant="ghost"
            className="w-full bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-800 text-sm py-3 shadow-lg border"
            size="sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al dashboard
          </Button>
        </div>
      </div>
    </AuthGuard>
  );
}
