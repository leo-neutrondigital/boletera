'use client';

import { useState } from 'react';
import { CheckCircle, CreditCard, UserPlus, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useEventFlow, useCurrentStepInfo } from '@/components/event/EventFlowProvider';
import { formatCurrency } from '@/lib/utils/currency';

export function MethodSelector() {
  const { event, method, setMethod, goNext, canProceed, availableTicketTypes } = useEventFlow();
  const stepInfo = useCurrentStepInfo();
  
  // Estado local SIN sincronización automática
  const [selectedMethod, setSelectedMethod] = useState<'preregister' | 'purchase' | null>(method);

  if (!event) return null;

  const minPrice = Math.min(...availableTicketTypes.map(t => t.price));
  const hasPreregistration = event.allow_preregistration;

  const handleMethodSelect = (newMethod: 'preregister' | 'purchase') => {
    console.log('🔄 MethodSelector - handleMethodSelect:', newMethod);
    
    // Actualizar ambos estados de una vez
    setSelectedMethod(newMethod);
    setMethod(newMethod);
    
    console.log('🔍 After both setState calls:', {
      newMethod,
      contextMethod: newMethod // Debería ser el nuevo método
    });
  };

  const handleContinue = () => {
    console.log('🔄 MethodSelector - handleContinue clicked');
    console.log('🔍 Current state when continue clicked:', {
      selectedMethod,
      contextMethod: method,
      canProceedResult: canProceed()
    });
    
    if (selectedMethod && canProceed()) {
      console.log('✅ Proceeding to next step');
      goNext();
    } else {
      console.log('❌ Cannot proceed:', {
        hasSelectedMethod: !!selectedMethod,
        canProceedResult: canProceed()
      });
    }
  };

  // Si no hay preregistración, no mostrar este paso
  if (!hasPreregistration) {
    return null;
  }

  const isButtonEnabled = selectedMethod !== null;

  return (
    <div className="space-y-6">
      {/* Header del paso */}
      <div className="text-center">
        <div className="text-sm text-gray-500 mb-2">
          PASO {stepInfo.step} DE {stepInfo.total}
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {stepInfo.title}
        </h2>
        <p className="text-gray-600">
          ¿Qué te gustaría hacer?
        </p>
      </div>

      {/* Debug info MÁS DETALLADA */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-yellow-100 border border-yellow-300 p-4 rounded text-xs">
          <div><strong>🐛 DETAILED DEBUG:</strong></div>
          <div>Local Selected Method: {selectedMethod || 'null'}</div>
          <div>Context Method: {method || 'null'}</div>
          <div>Can Proceed: {canProceed() ? 'Yes' : 'No'}</div>
          <div>Button Enabled: {isButtonEnabled ? 'Yes' : 'No'}</div>
          <div>Event ID: {event?.id}</div>
          <div>Has Preregistration: {hasPreregistration ? 'Yes' : 'No'}</div>
          <div>Available Ticket Types: {availableTicketTypes.length}</div>
          <div>Current Step: {stepInfo.step}</div>
        </div>
      )}

      {/* Opciones */}
      <div className="space-y-4">
        {/* Opción: Preregistro */}
        <Card 
          className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
            selectedMethod === 'preregister' 
              ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50' 
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => handleMethodSelect('preregister')}
        >
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-full ${
                selectedMethod === 'preregister' 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                <UserPlus className="w-6 h-6" />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Preregistrarme
                  </h3>
                  {selectedMethod === 'preregister' && (
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                
                <p className="text-gray-600 text-sm mb-3">
                  Reserva tu lugar sin pagar. Te contactaremos posteriormente con los detalles de compra.
                </p>
                
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>Sin pago inmediato</span>
                  </div>
                  <div className="flex items-center gap-1 text-blue-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>Contacto posterior</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Opción: Comprar */}
        <Card 
          className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
            selectedMethod === 'purchase' 
              ? 'ring-2 ring-green-500 border-green-500 bg-green-50' 
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => handleMethodSelect('purchase')}
        >
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-full ${
                selectedMethod === 'purchase' 
                  ? 'bg-green-100 text-green-600' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                <CreditCard className="w-6 h-6" />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Comprar boletos
                  </h3>
                  {selectedMethod === 'purchase' && (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  )}
                </div>
                
                <p className="text-gray-600 text-sm mb-3">
                  Selecciona y compra tus boletos ahora. Pago seguro con PayPal.
                </p>
                
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>Acceso inmediato</span>
                  </div>
                  <div className="flex items-center gap-1 text-blue-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>Desde {formatCurrency(minPrice, availableTicketTypes[0]?.currency || 'MXN')}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Botón Continuar */}
      <div className="flex justify-center pt-4">
        <Button
          onClick={handleContinue}
          disabled={!isButtonEnabled}
          size="lg"
          className={`px-8 py-3 text-base transition-all ${
            isButtonEnabled 
              ? 'opacity-100 cursor-pointer bg-blue-600 hover:bg-blue-700' 
              : 'opacity-50 cursor-not-allowed bg-gray-400'
          }`}
        >
          {isButtonEnabled ? 'Continuar' : 'Selecciona una opción'}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {/* Información adicional */}
      {selectedMethod && (
        <div className="text-center text-sm text-gray-500">
          {selectedMethod === 'preregister' 
            ? 'Podrás elegir los boletos que te interesan en el siguiente paso'
            : 'En el siguiente paso seleccionarás tus boletos'
          }
        </div>
      )}
    </div>
  );
}
