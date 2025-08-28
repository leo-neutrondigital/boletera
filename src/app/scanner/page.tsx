'use client';

import { useRouter } from 'next/navigation';
import { 
  QrCode,
  Calendar,
  Users,
  Zap,
  Clock,
  LogOut
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { Can } from '@/components/auth/Can';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase/client';

// Página principal del scanner - Solo para roles autorizados
export default function ScannerDashboard() {
  const router = useRouter();
  const { userData } = useAuth();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push("/");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  // Solo comprobadores puros (sin otros roles) necesitan el botón de cerrar sesión
  // porque admin/gestor ya tienen acceso al sidebar con logout
  const isComprobadorPuro = userData?.roles?.includes('comprobador') && 
                           !userData?.roles?.includes('admin') && 
                           !userData?.roles?.includes('gestor');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header con PageHeader */}
      <PageHeader
        icon={QrCode}
        title="Event Scanner"
        description="Validación de boletos QR"
        iconColor="blue"
        actions={
          isComprobadorPuro && (
            <Button 
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar sesión
            </Button>
          )
        }
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Welcome Message */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Bienvenido al Scanner de Eventos
          </h2>
          <p className="text-gray-600">
            Valida boletos de forma rápida y eficiente. Elige una opción para comenzar.
          </p>
        </div>

        {/* Main Actions - Enfoque directo */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          
          {/* Start Scanning - Acción principal */}
          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <QrCode className="h-6 w-6 text-white" />
                </div>
                Escanear QR
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Inicia el escáner de cámara para validar boletos QR de forma rápida y automática.
              </p>
              
              <div className="bg-white/70 rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <span className="font-medium">Validación automática</span>
                </div>
                <p className="text-xs text-gray-600">
                  Los boletos se validan automáticamente al escanear. 
                  Puedes deshacer check-ins erróneos en los primeros 5 minutos.
                </p>
              </div>

              <Button 
                onClick={() => router.push('/scanner/scan')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6"
                size="lg"
              >
                <QrCode className="w-5 h-5 mr-2" />
                Comenzar escáner
              </Button>
            </CardContent>
          </Card>
          
          {/* See Events - Acción secundaria */}
          <Card className="border-2 border-gray-200 hover:border-gray-300 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="bg-gray-600 p-2 rounded-lg">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                Ver Eventos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Consulta la lista de eventos, asistentes registrados y realiza check-ins manuales.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Users className="h-4 w-4 text-blue-500" />
                  <span>Lista de asistentes por evento</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Clock className="h-4 w-4 text-green-500" />
                  <span>Check-in manual por nombre</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <QrCode className="h-4 w-4 text-purple-500" />
                  <span>Búsqueda y filtros avanzados</span>
                </div>
              </div>

              <Button 
                onClick={() => router.push('/scanner/events')}
                variant="outline"
                className="w-full border-gray-300 text-lg py-6"
                size="lg"
              >
                <Calendar className="w-5 h-5 mr-2" />
                Ver eventos
              </Button>
            </CardContent>
          </Card>
          
        </div>

        {/* Quick Tips */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Tips para un escaneo eficiente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-3">
                  <div className="bg-green-100 p-1 rounded-full mt-1">
                    <QrCode className="h-3 w-3 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Posición del QR</p>
                    <p className="text-gray-600">Centra el código QR en el cuadro de escaneo para mejor detección.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 p-1 rounded-full mt-1">
                    <Zap className="h-3 w-3 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Validación automática</p>
                    <p className="text-gray-600">El check-in se realiza automáticamente. Usa "Deshacer" si hay errores.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="bg-purple-100 p-1 rounded-full mt-1">
                    <Users className="h-3 w-3 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Búsqueda manual</p>
                    <p className="text-gray-600">Si el QR no funciona, busca al asistente en la lista de eventos.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="bg-yellow-100 p-1 rounded-full mt-1">
                    <Clock className="h-3 w-3 text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Eventos multi-día</p>
                    <p className="text-gray-600">Los boletos se marcan por día. Cada día es un check-in independiente.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
