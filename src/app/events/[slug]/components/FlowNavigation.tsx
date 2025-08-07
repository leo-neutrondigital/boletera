'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEventFlow } from '@/components/event/EventFlowProvider';

interface FlowNavigationProps {
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  backLabel?: string;
  nextDisabled?: boolean;
  showBack?: boolean;
  isLoading?: boolean;
  customNextAction?: () => void; // Para ejecutar acciones personalizadas antes de avanzar
}

export function FlowNavigation({
  onBack,
  onNext,
  nextLabel = "Continuar",
  backLabel = "Atrás",
  nextDisabled = false,
  showBack = true,
  isLoading = false,
  customNextAction
}: FlowNavigationProps) {
  const { 
    goBack, 
    goNext, 
    canProceed, 
    selectedTickets, 
    currentStep,
    customerData
  } = useEventFlow();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      goBack();
    }
  };

  const handleNext = () => {
    console.log('🔄 FlowNavigation - handleNext clicked');
    
    if (customNextAction) {
      // Ejecutar acción personalizada primero
      customNextAction();
      return;
    }

    if (onNext) {
      onNext();
    } else {
      goNext();
    }
  };

  const internalCanProceed = canProceed();
  const hasSelectedTickets = selectedTickets.length > 0;
  const isNextDisabled = nextDisabled || !internalCanProceed || isLoading;

  // Debug en desarrollo
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 FlowNavigation Debug:', {
      currentStep,
      selectedTickets: selectedTickets.length,
      canProceed: internalCanProceed,
      hasSelectedTickets,
      hasCustomerData: !!customerData,
      nextDisabled,
      isNextDisabled,
      isLoading
    });
  }

  return (
    <div className="flex items-center justify-between pt-6 border-t">
      {showBack ? (
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {backLabel}
        </Button>
      ) : (
        <div></div>
      )}

      <div className="flex items-center gap-4">
        {/* Debug info en desarrollo */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-500">
            T: {selectedTickets.length} | C: {internalCanProceed ? 'Y' : 'N'} | D: {!!customerData ? 'Y' : 'N'}
          </div>
        )}

        <Button
          onClick={handleNext}
          disabled={isNextDisabled}
          className="flex items-center gap-2 px-6"
          size="lg"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Procesando...
            </>
          ) : (
            <>
              {nextLabel}
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
