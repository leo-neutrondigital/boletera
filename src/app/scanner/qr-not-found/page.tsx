'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { 
  QrCode,
  ArrowLeft,
  Search,
  AlertTriangle,
  Shield
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function QRNotFoundPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const qrId = searchParams.get('qr');
  const error = searchParams.get('error');
  const details = searchParams.get('details');

  return (
    <AuthGuard requiredRole={['admin', 'gestor', 'comprobador']}>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-12 w-12 text-red-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🚫 Código QR no encontrado
            </h1>
            <p className="text-gray-600">
              Este código QR no está registrado en nuestro sistema
            </p>
          </div>

          {/* Alerta de seguridad */}
          <Alert className="mb-6 bg-red-50 border-red-200">
            <Shield className="h-4 w-4 text-red-600" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium text-red-800">
                  Posible boleto no válido
                </p>
                <p className="text-sm text-red-700">
                  {details || 'Este código QR no existe en nuestra base de datos de boletos válidos.'}
                </p>
              </div>
            </AlertDescription>
          </Alert>

          {/* Información del QR escaneado */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Código escaneado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* QR ID */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Código QR:</span>
                <Badge variant="destructive" className="font-mono text-xs">
                  {qrId || 'No disponible'}
                </Badge>
              </div>

              {/* Estado */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Estado:</span>
                <Badge variant="destructive">
                  No registrado
                </Badge>
              </div>

              {/* Hora del escaneo */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Escaneado:</span>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Search className="h-4 w-4" />
                  {new Date().toLocaleTimeString()}
                </div>
              </div>
              
            </CardContent>
          </Card>

          {/* Posibles causas */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Posibles causas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700">
              
              <div className="flex items-start gap-3">
                <div className="bg-yellow-100 p-1 rounded-full mt-1">
                  <AlertTriangle className="h-3 w-3 text-yellow-600" />
                </div>
                <div>
                  <p className="font-medium">Boleto no oficial</p>
                  <p className="text-gray-600">El código QR no fue generado por nuestro sistema oficial.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 p-1 rounded-full mt-1">
                  <QrCode className="h-3 w-3 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">QR de otro evento o sistema</p>
                  <p className="text-gray-600">Podría ser un código QR válido pero de otro evento o plataforma.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="bg-red-100 p-1 rounded-full mt-1">
                  <Shield className="h-3 w-3 text-red-600" />
                </div>
                <div>
                  <p className="font-medium">Posible falsificación</p>
                  <p className="text-gray-600">En casos graves, podría tratarse de un boleto falsificado.</p>
                </div>
              </div>
              
            </CardContent>
          </Card>

          {/* Recomendaciones */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">¿Qué hacer?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700">
              
              <div className="bg-blue-50 border-l-4 border-blue-400 p-3">
                <p className="font-medium text-blue-800">1. Verificar con el asistente</p>
                <p className="text-blue-700">Pregunta al asistente dónde obtuvo el boleto y verifica que sea de fuente oficial.</p>
              </div>
              
              <div className="bg-green-50 border-l-4 border-green-400 p-3">
                <p className="font-medium text-green-800">2. Buscar en la lista manual</p>
                <p className="text-green-700">Puedes buscar al asistente en la lista de boletos registrados por nombre.</p>
              </div>
              
              <div className="bg-orange-50 border-l-4 border-orange-400 p-3">
                <p className="font-medium text-orange-800">3. Contactar administrador</p>
                <p className="text-orange-700">Si hay dudas sobre la validez, consulta con el administrador del evento.</p>
              </div>
              
            </CardContent>
          </Card>

          {/* Acciones */}
          <div className="space-y-3">
            <Button 
              onClick={() => router.push('/scanner/scan')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6"
              size="lg"
            >
              <QrCode className="w-5 h-5 mr-2" />
              Escanear otro boleto
            </Button>
            
            <Button 
              onClick={() => router.push('/scanner/events')}
              variant="outline"
              className="w-full text-lg py-4"
              size="lg"
            >
              <Search className="w-5 h-5 mr-2" />
              Buscar por nombre
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
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500">
              Por seguridad, todos los escaneos son registrados para auditoría.
            </p>
          </div>

        </div>
      </div>
    </AuthGuard>
  );
}
