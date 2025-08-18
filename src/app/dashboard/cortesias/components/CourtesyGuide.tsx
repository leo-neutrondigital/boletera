import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Gift } from 'lucide-react';

import type { CourtesyType } from './types';

interface CourtesyGuideProps {
  courtesyTypes: CourtesyType[];
}

export function CourtesyGuide({ courtesyTypes }: CourtesyGuideProps) {
  return (
    <div className="mt-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Gift className="h-5 w-5 text-green-500" />
            Guía de gestión de cortesías
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">¿Qué son las cortesías?</h4>
              <p className="text-gray-600 mb-4">
                Son boletos gratuitos que puedes crear para invitados especiales, prensa, 
                staff, sponsors o cualquier persona que deba tener acceso sin costo.
              </p>
              
              <h4 className="font-medium text-gray-900 mb-2">Tipos disponibles:</h4>
              <div className="space-y-1">
                {courtesyTypes.slice(0, 4).map((type) => (
                  <div key={type.value} className="flex items-center gap-2">
                    <Badge className={`${type.color} text-xs`}>
                      {type.label}
                    </Badge>
                  </div>
                ))}
                <p className="text-xs text-gray-500 mt-2">Y más tipos disponibles...</p>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Proceso de cortesías:</h4>
              <ol className="text-gray-600 space-y-1 list-decimal list-inside">
                <li>Selecciona el evento y tipo de boleto</li>
                <li>Completa los datos del invitado</li>
                <li>Elige el tipo de cortesía apropiado</li>
                <li>Se crea el boleto con valor $0</li>
                <li>El invitado recibe instrucciones por email</li>
                <li>Se vincula automáticamente cuando se registre</li>
              </ol>
              
              <Alert className="mt-4 bg-blue-50 border-blue-200">
                <AlertDescription className="text-blue-800 text-xs">
                  💡 Las cortesías aparecen con un texto especial en el PDF y tienen 
                  un seguimiento separado para control administrativo.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
