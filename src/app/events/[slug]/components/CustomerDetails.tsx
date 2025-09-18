'use client';

import { User, ShoppingCart, UserPlus, ArrowRight, ArrowLeft } from 'lucide-react';
import { useEventFlow, useCurrentStepInfo } from '@/components/event/EventFlowProvider';
import { useAuth } from '@/contexts/AuthContext';
import { CustomerForm, CustomerFormData } from './CustomerForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils/currency';
import { useState } from 'react';


export function CustomerDetails() {
  const {
    event, 
    method, 
    selectedTickets, 
    totalAmount, 
    setCustomerData,
    goNext,
    goBack
  } = useEventFlow();
  const { user, userData } = useAuth();
  const stepInfo = useCurrentStepInfo();

  // 🆕 V2: Estados simples y claros
  const [formData, setFormData] = useState<CustomerFormData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalItems = selectedTickets.reduce((sum, ticket) => sum + ticket.quantity, 0);
  const currency = selectedTickets[0]?.currency || 'MXN';
  const isPreregistration = method === 'preregister';
  const isLoggedIn = !!user;

  // Datos iniciales del formulario
  const initialData: Partial<CustomerFormData> = {
    name: userData?.name || '',
    email: userData?.email || '',
    phone: userData?.phone || '',
    company: userData?.company || '',
    createAccount: false,
  };

  // 🆕 V2: Un solo callback simple para recibir datos del form
  const handleFormChange = (data: CustomerFormData | null) => {
    setFormData(data);
  };

  if (!event) return null;

  // 🆕 V2: Handler simple y síncrono para continuar
  const handleSubmit = async () => {
    if (!formData || isSubmitting) {
      console.log('🚫 CustomerDetails - Submit blocked:', { hasFormData: !!formData, isSubmitting });
      return;
    }
    
    console.log('🚀 CustomerDetails - Starting submit process');
    setIsSubmitting(true);
    try {
      const customerInfo = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        company: formData.company || '',
        createAccount: formData.createAccount || false,
        password: formData.createAccount ? formData.password : undefined,
        userId: isLoggedIn ? user?.uid : undefined,
      };
      
      console.log('📝 CustomerDetails - Setting customer data:', customerInfo);
      setCustomerData(customerInfo);
      
      // 🆕 Delay mínimo para que React procese el setState
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('🎯 CustomerDetails - Proceeding to next step');
      goNext(); // Navegación directa - UN SOLO SISTEMA
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStepTitle = () => {
    if (isPreregistration) {
      return 'Datos para preregistro';
    }
    return isLoggedIn ? 'Confirmar datos' : 'Tus datos';
  };

  const getStepDescription = () => {
    if (isPreregistration) {
      return 'Completa tus datos para que podamos contactarte';
    }
    return isLoggedIn 
      ? 'Verifica que tus datos sean correctos antes de proceder al pago'
      : 'Completa tus datos para proceder con la compra';
  };

  const getButtonText = () => {
    if (isPreregistration) {
      return 'Completar Preregistro';
    }
    return 'Continuar al Pago';
  };

  return (
    <div className="space-y-6">
      {/* Header del paso */}
      <div className="text-center">
        <div className="text-sm text-gray-500 mb-2">
          PASO {stepInfo.step} DE {stepInfo.total}
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {getStepTitle()}
        </h2>
        <p className="text-gray-600">
          {getStepDescription()}
        </p>
      </div>

      {/* Resumen de la selección */}
      {selectedTickets.length > 0 && (
        <div className="bg-gray-50 border rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 rounded-full">
              {isPreregistration ? (
                <UserPlus className="w-4 h-4 text-blue-600" />
              ) : (
                <ShoppingCart className="w-4 h-4 text-blue-600" />
              )}
            </div>
            <div>
              <h3 className="font-medium text-gray-900">
                {isPreregistration ? 'Preregistro para:' : 'Resumen de compra:'}
              </h3>
              <p className="text-sm text-gray-600">
                {totalItems} boleto{totalItems !== 1 ? 's' : ''} seleccionado{totalItems !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            {selectedTickets.map((ticket) => (
              <div key={ticket.ticket_type_id} className="flex justify-between items-center">
                <span className="text-gray-700">
                  {ticket.quantity}× {ticket.ticket_type_name}
                </span>
                <Badge variant="outline">
                  {isPreregistration 
                    ? `${ticket.quantity} boleto${ticket.quantity !== 1 ? 's' : ''}`
                    : formatCurrency(ticket.total_price, ticket.currency as 'MXN' | 'USD' | 'EUR' | 'GBP' | undefined)
                  }
                </Badge>
              </div>
            ))}
          </div>

          {!isPreregistration && (
            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-900">Total:</span>
                <span className="text-xl font-bold text-green-600">
                  {formatCurrency(totalAmount, currency as 'MXN' | 'USD' | 'EUR' | 'GBP' | undefined)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Formulario de datos */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900">
            {isLoggedIn ? 'Datos de tu cuenta' : 'Información personal'}
          </h3>
        </div>

        <CustomerForm
          initialData={initialData}
          isPreregistration={isPreregistration}
          isLoggedIn={isLoggedIn}
          onFormChange={handleFormChange}
        />
      </div>

      {/* Información de privacidad */}
      <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
        <p>
          🔒 <strong>Privacidad:</strong> Tus datos están protegidos y solo se usan para{' '}
          {isPreregistration 
            ? 'contactarte sobre el evento'
            : 'procesar tu compra y enviarte los boletos'
          }. No compartimos tu información con terceros.
        </p>
      </div>

      {/* Navegación */}
      <div className="flex items-center justify-between pt-6 border-t">
        {/* Siempre mostrar botón atrás para regresar a selección de boletos */}
        <Button
          variant="outline"
          onClick={goBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Atrás
        </Button>

        <div className="flex items-center gap-4">
          {/* Debug info en desarrollo */}
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-gray-500">
              Form Data: {!!formData ? 'Yes' : 'No'} | Submitting: {isSubmitting ? 'Yes' : 'No'}
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!formData || isSubmitting}
            className="flex items-center gap-2 px-6"
            size="lg"
          >
            {getButtonText()}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
