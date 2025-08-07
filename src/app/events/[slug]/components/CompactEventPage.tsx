'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useEventFlow } from '@/components/event/EventFlowProvider';

// Componentes del flujo
import { MethodSelector } from './MethodSelector';
import { TicketSelection } from './TicketSelection';
import { CustomerDetails } from './CustomerDetails';
import { PaymentStep } from './PaymentStep';

export function CompactEventPage() {
  const router = useRouter();
  const { 
    event, 
    currentStep, 
    availableTicketTypes, 
    isLoading 
  } = useEventFlow();

  console.log('🔍 CompactEventPage rendered with:', {
    event: !!event,
    eventId: event?.id,
    currentStep,
    availableTicketTypes: availableTicketTypes.length,
    isLoading
  });

  // Si el evento no está disponible en el contexto, mostrar mensaje de debug
  if (!event) {
    console.log('❌ No event in useEventFlow context');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-300 rounded-lg p-4">
            <h3 className="font-bold text-red-800 mb-2">❌ CONTEXT ERROR</h3>
            <p className="text-red-700">Event not available in EventFlow context</p>
            <p className="text-xs text-red-600 mt-2">
              Check EventFlowProvider initialization
            </p>
          </div>
        </div>
      </div>
    );
  }

  console.log('✅ Event available, rendering main content');

  // Renderizar el paso actual
  const renderCurrentStep = () => {
    console.log('🎯 Rendering step:', currentStep);
    switch (currentStep) {
      case 'method':
        return <MethodSelector />;
      case 'selection':
        return <TicketSelection />;
      case 'details':
        return <CustomerDetails />;
      case 'payment':
        return <PaymentStep />;
      default:
        return <MethodSelector />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>

            <h1 className="text-lg font-semibold text-gray-900 truncate max-w-md">
              {event.name}
            </h1>
            
            <div className="flex items-center gap-4">
              {event.contact_email && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`mailto:${event.contact_email}`}>
                    <Mail className="h-4 w-4 mr-2" />
                    Contacto
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Layout Principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Para el paso de pago, usar layout completo */}
        {currentStep === 'payment' ? (
          <Card>
            <CardContent className="p-6">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Cargando paso...</p>
                </div>
              ) : (
                renderCurrentStep()
              )}
            </CardContent>
          </Card>
        ) : (
          /* Layout de 2 columnas para otros pasos */
          <div className="grid lg:grid-cols-2 gap-8">
            
            {/* COLUMNA IZQUIERDA - Info del Evento */}
            <div>
              <Card>
                <CardContent className="p-6">
                  <h1 className="text-2xl font-bold text-gray-900 mb-4">
                    {event.name}
                  </h1>
                  
                  <div className="space-y-2 text-gray-600">
                    <div>📅 {event.start_date.toLocaleDateString()}</div>
                    <div>📍 {event.location}</div>
                    <div>🎫 {availableTicketTypes.length} tipos de boletos</div>
                    <div>✅ Preregistro: {event.allow_preregistration ? 'Sí' : 'No'}</div>
                  </div>
                  
                  {event.public_description && (
                    <div className="mt-4">
                      <p className="text-gray-600">
                        {event.public_description}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* COLUMNA DERECHA - Flujo de Compra */}
            <div>
              <Card>
                <CardContent className="p-6">
                  {isLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
                      <p className="text-gray-600 mt-2">Cargando paso...</p>
                    </div>
                  ) : (
                    renderCurrentStep()
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
