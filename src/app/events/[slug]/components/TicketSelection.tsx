'use client';

import { ShoppingCart, AlertTriangle, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEventFlow, useCurrentStepInfo } from '@/components/event/EventFlowProvider';
import { TicketTypeCard } from './TicketTypeCard';
import { FlowNavigation } from './FlowNavigation';
import { formatCurrency } from '@/lib/utils/currency';

export function TicketSelection() {
  const { 
    event, 
    availableTicketTypes, 
    selectedTickets, 
    totalAmount,
    method 
  } = useEventFlow();
  const stepInfo = useCurrentStepInfo();

  if (!event) return null;

  const totalItems = selectedTickets.reduce((sum, ticket) => sum + ticket.quantity, 0);
  const currency = availableTicketTypes[0]?.currency || 'MXN';

  // Diferentes estados según disponibilidad
  const hasTicketTypes = availableTicketTypes.length > 0;
  const hasPreregistration = event.allow_preregistration;

  // Caso 1: No hay boletos Y no hay preregistro
  if (!hasTicketTypes && !hasPreregistration) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="text-sm text-gray-500 mb-2">
            EVENTO NO DISPONIBLE
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Sin boletos disponibles
          </h2>
        </div>

        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto text-amber-500 mb-4" />
            <h3 className="text-lg font-medium text-amber-800 mb-2">
              Este evento no está disponible
            </h3>
            <p className="text-amber-700 mb-4">
              No hay boletos configurados y el preregistro no está habilitado para este evento.
            </p>
            {event.contact_email && (
              <Button variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100" asChild>
                <a href={`mailto:${event.contact_email}`}>
                  Contactar organizador
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Caso 2: No hay boletos PERO sí hay preregistro  
  if (!hasTicketTypes && hasPreregistration) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="text-sm text-gray-500 mb-2">
            PASO {stepInfo.step} DE {stepInfo.total}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Solo preregistro disponible
          </h2>
          <p className="text-gray-600">
            Los boletos aún no están disponibles para compra, pero puedes preregistrarte.
          </p>
        </div>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-8 text-center">
            <ShoppingCart className="w-12 h-12 mx-auto text-blue-500 mb-4" />
            <h3 className="text-lg font-medium text-blue-800 mb-2">
              Preregistro disponible
            </h3>
            <p className="text-blue-700 mb-4">
              Los boletos no están listos aún, pero puedes preregistrarte para recibir información cuando estén disponibles.
            </p>
            <p className="text-sm text-blue-600">
              Te contactaremos con los detalles de compra cuando los boletos estén listos.
            </p>
          </CardContent>
        </Card>

        <FlowNavigation 
          nextLabel="Continuar con Preregistro"
          nextDisabled={false} // Permitir continuar sin seleccionar boletos para preregistro
        />
      </div>
    );
  }

  // Caso 3: Sí hay boletos disponibles (flujo normal)
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
          {method === 'preregister' 
            ? 'Elige los boletos que te interesan para tu preregistro'
            : 'Selecciona la cantidad y tipo de boletos que deseas comprar'
          }
        </p>
      </div>

      {/* Lista de tipos de boletos */}
      <div className="space-y-4">
        {availableTicketTypes.map((ticketType) => (
          <TicketTypeCard 
            key={ticketType.id} 
            ticketType={ticketType}
          />
        ))}
      </div>

      {/* Resumen de selección */}
      {selectedTickets.length > 0 && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-full">
                  <ShoppingCart className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <div className="font-medium text-green-800">
                    {totalItems} boleto{totalItems !== 1 ? 's' : ''} seleccionado{totalItems !== 1 ? 's' : ''}
                  </div>
                  <div className="text-sm text-green-600">
                    {selectedTickets.map(ticket => (
                      <span key={ticket.ticket_type_id} className="mr-2">
                        {ticket.quantity}× {ticket.ticket_type_name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-sm text-green-600">
                  {method === 'preregister' ? 'Preregistro para:' : 'Total:'}
                </div>
                <div className="text-2xl font-bold text-green-800">
                  {method === 'preregister' 
                    ? `${totalItems} boleto${totalItems !== 1 ? 's' : ''}`
                    : formatCurrency(totalAmount, currency as 'MXN' | 'USD' | 'EUR' | 'GBP')
                  }
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Información adicional según el método */}
      {method === 'preregister' && selectedTickets.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="p-1 bg-blue-100 rounded-full mt-0.5">
              <ShoppingCart className="w-3 h-3 text-blue-600" />
            </div>
            <div className="text-sm">
              <p className="font-medium text-blue-800 mb-1">
                Sobre tu preregistro:
              </p>
              <ul className="text-blue-700 space-y-1">
                <li>• Te contactaremos con los detalles de compra</li>
                <li>• No se realizará ningún cobro en este momento</li>
                <li>• Recibirás información sobre disponibilidad y precios</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Mensaje si no ha seleccionado boletos */}
      {selectedTickets.length === 0 && method === 'purchase' && (
        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="p-6 text-center">
            <Plus className="w-8 h-8 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600">
              Selecciona al menos un boleto para continuar con la compra
            </p>
          </CardContent>
        </Card>
      )}

      {/* Navegación */}
      <FlowNavigation 
        nextLabel={method === 'preregister' ? 'Continuar con Preregistro' : 'Continuar con Compra'}
        nextDisabled={method === 'purchase' ? selectedTickets.length === 0 : false}
      />
    </div>
  );
}
