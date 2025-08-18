'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  QrCode,
  Calendar,
  Users,
  Zap,
  Shield,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

// Página principal del scanner - Solo para roles autorizados
export default function ScannerDashboard() {
  const router = useRouter();
  const { userData } = useAuth();

  // Quick stats mockup - después conectaremos con data real
  const stats = {
    activeEvents: 3,
    todayCheckIns: 127,
    pendingTickets: 425
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <QrCode className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Event Scanner
                </h1>
                <p className="text-sm text-gray-500">
                  Validación de boletos QR
                </p>
              </div>
            </div>
            
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
              {userData?.roles?.includes('admin') ? 'Administrador' :
               userData?.roles?.includes('gestor') ? 'Gestor' : 'Comprobador'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="bg-blue-100 p-3 rounded-full">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeEvents}</p>
                  <p className="text-sm text-gray-600">Eventos activos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="bg-green-100 p-3 rounded-full">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.todayCheckIns}</p>
                  <p className="text-sm text-gray-600">Check-ins hoy</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="bg-yellow-100 p-3 rounded-full">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingTickets}</p>
                  <p className="text-sm text-gray-600">Boletos pendientes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
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
