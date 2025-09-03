'use client';

import { User, ShoppingCart, UserPlus, ArrowRight, ArrowLeft } from 'lucide-react';
import { useEventFlow, useCurrentStepInfo } from '@/components/event/EventFlowProvider';
import { useAuth } from '@/contexts/AuthContext';
import { CustomerForm, CustomerFormData } from './CustomerForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils/currency';
import { useState, useRef, useEffect, useCallback } from 'react';


export function CustomerDetails() {
  const { 
    event, 
    method, 
    selectedTickets, 
    totalAmount, 
    setCustomerData,
    customerData, // 🔧 Usar esto directamente
    goNext,
    goBack,
    canProceed
  } = useEventFlow();
  const { user, userData } = useAuth();
  const stepInfo = useCurrentStepInfo();

  const [isFormValid, setIsFormValid] = useState(false);
  const [currentFormData, setCurrentFormData] = useState<CustomerFormData | null>(null);
  const isSettingRef = useRef(false); // 🔧 Flag para evitar dobles llamadas
  const latestCustomerDataRef = useRef(customerData); // 🔧 Ref para el customerData más actualizado
  const shouldNavigateRef = useRef(false); // 🔧 Flag para controlar navegación automática

  // Mover el return null al final de los hooks

  const totalItems = selectedTickets.reduce((sum, ticket) => sum + ticket.quantity, 0);
  const currency = selectedTickets[0]?.currency || 'MXN';
  const isPreregistration = method === 'preregister';
  const isLoggedIn = !!user;


  // 🔧 Mantener el ref actualizado
  useEffect(() => {
    latestCustomerDataRef.current = customerData;
    // CustomerData ref updated
  }, [customerData]);

  // 🔧 SOLUCIÓN DEFINITIVA: useEffect que detecta cuando customerData se actualiza y navega automáticamente
  useEffect(() => {
    if (shouldNavigateRef.current && customerData) {
      console.log('🚪 CustomerDetails - Auto-navigation triggered by customerData change');
      const hasCustomerDataNow = !!customerData.name && !!customerData.email;
      const shouldProceed = isPreregistration ? hasCustomerDataNow : (hasCustomerDataNow && selectedTickets.length > 0);
      console.log('🔍 CustomerDetails - Auto-navigation check:', {
        hasCustomerDataNow,
        shouldProceed,
        isPreregistration,
        customerName: customerData.name,
        customerEmail: customerData.email
      });
      if (shouldProceed) {
        console.log('✅ CustomerDetails - Auto-navigation: calling goNext');
        shouldNavigateRef.current = false; // Reset flag
        isSettingRef.current = false; // Reset setting flag
        goNext();
      } else {
        console.log('❌ CustomerDetails - Auto-navigation: conditions not met');
        shouldNavigateRef.current = false;
        isSettingRef.current = false;
      }
    }
  }, [customerData, isPreregistration, selectedTickets.length, goNext]);

  // Datos iniciales del formulario
  const initialData: Partial<CustomerFormData> = {
    name: userData?.name || customerData?.name || '',
    email: userData?.email || customerData?.email || '',
    phone: userData?.phone || customerData?.phone || '',
    company: userData?.company || customerData?.company || '',
    createAccount: customerData?.password ? true : false,
  };

  // Callback cuando cambia la validación del formulario
  const handleValidationChange = useCallback((isValid: boolean, data?: CustomerFormData) => {
    console.log('🔄 CustomerDetails - Validation changed:', {
      isValid,
      hasData: !!data,
      isPreregistration,
      step: 'details',
      data: data ? {
        ...data,
        passwordLength: data.password?.length || 0,
        passwordProvided: !!data.password
      } : null
    });
    setIsFormValid(isValid);
    if (isValid && data) {
      console.log('✅ CustomerDetails - Setting currentFormData');
      setCurrentFormData(data);
    } else {
      console.log('🗑️ CustomerDetails - Clearing currentFormData');
      setCurrentFormData(null);
    }
  }, [isPreregistration]); // 🔧 Solo isPreregistration como dependencia

  if (!event) return null;

  // Proceder al siguiente paso
  const handleContinue = () => {
    // Handle continue button click validation
    
    if (!isFormValid || !currentFormData) {
      console.log('❌ CustomerDetails - Form not valid or no data');
      return;
    }

    // Proceeding with form data
    
    // 🔧 ARREGLO CRITICO: Guardar datos ANTES de navegar
    const customerInfo = {
      name: currentFormData.name,
      email: currentFormData.email,
      phone: currentFormData.phone,
      company: currentFormData.company || '',
      createAccount: currentFormData.createAccount || false,
      password: currentFormData.createAccount ? currentFormData.password : undefined,
      userId: isLoggedIn ? user?.uid : undefined,
    };
    
    // Setting customer data in context

    // 🔧 NUEVA ESTRATEGIA: NO usar setTimeout, activar flag para navegación automática
    if (isSettingRef.current) {
      console.warn('⚠️ CustomerDetails - setCustomerData already in progress, skipping');
      return;
    }
    
    isSettingRef.current = true;
    shouldNavigateRef.current = true; // 🔧 Activar flag para navegación automática
    
    console.log('📝 CustomerDetails - About to call setCustomerData for navigation trigger...');
    setCustomerData(customerInfo);
    console.log('📝 CustomerDetails - setCustomerData called, auto-navigation will trigger via useEffect');
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
          onValidationChange={handleValidationChange}
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
              Valid: {isFormValid ? 'Yes' : 'No'} | Data: {!!currentFormData ? 'Yes' : 'No'}
            </div>
          )}

          <Button
            onClick={handleContinue}
            disabled={!isFormValid}
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
