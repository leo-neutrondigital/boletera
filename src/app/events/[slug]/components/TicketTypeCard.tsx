'use client';

import { useState, useEffect } from 'react';
import { Plus, Minus, Calendar, Info, Users, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useEventFlow } from '@/components/event/EventFlowProvider';
import { formatCurrency } from '@/lib/utils/currency';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { TicketType } from '@/types';

interface TicketTypeCardProps {
  ticketType: TicketType;
}

export function TicketTypeCard({ ticketType }: TicketTypeCardProps) {
  const { 
    event,
    selectedTickets, 
    addTicket, 
    updateTicketQuantity, 
    removeTicket 
  } = useEventFlow();

  // Estado local
  const [quantity, setQuantity] = useState(0);
  const [selectedDays, setSelectedDays] = useState<Date[]>([]);

  // Buscar si este tipo ya está en el carrito
  const existingTicket = selectedTickets.find(t => t.ticket_type_id === ticketType.id);

  // Sincronizar cantidad con el estado global
  useEffect(() => {
    if (existingTicket) {
      setQuantity(existingTicket.quantity);
      setSelectedDays(existingTicket.selected_days || []);
    } else {
      setQuantity(0);
      setSelectedDays([]);
    }
  }, [existingTicket]);

  // Calcular disponibilidad
  const availableStock = ticketType.total_stock 
    ? ticketType.total_stock - ticketType.sold_count 
    : 999;
  
  const maxQuantity = Math.min(
    availableStock,
    ticketType.limit_per_user || 10 // Respeta configuración individual o usa default 10
  );

  const isOutOfStock = availableStock <= 0;
  const isLowStock = availableStock <= 5 && availableStock > 0;

  // Verificar si necesita selección de días
  const needsDaySelection = ticketType.access_type === 'specific_days' && quantity > 0;
  const isMultiDay = event && event.start_date.toDateString() !== event.end_date.toDateString();

  // Handlers
  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity < 0 || newQuantity > maxQuantity) return;

    setQuantity(newQuantity);

    if (newQuantity === 0) {
      removeTicket(ticketType.id);
    } else {
      // Para eventos de un día o "all_days", auto-seleccionar días
      let daysToSelect: Date[] = [];
      if (ticketType.access_type === 'all_days' && event) {
        daysToSelect = [event.start_date, event.end_date];
      } else if (ticketType.access_type === 'specific_days') {
        daysToSelect = selectedDays;
      }

      addTicket(ticketType, newQuantity, daysToSelect);
    }
  };

  const handleDayToggle = (day: Date, checked: boolean) => {
    const newSelectedDays = checked
      ? [...selectedDays, day]
      : selectedDays.filter(d => d.getTime() !== day.getTime());
    
    setSelectedDays(newSelectedDays);
    
    if (quantity > 0) {
      addTicket(ticketType, quantity, newSelectedDays);
    }
  };

  const getAccessDescription = () => {
    switch (ticketType.access_type) {
      case 'all_days':
        return isMultiDay ? 'Acceso todos los días del evento' : 'Acceso al evento';
      case 'specific_days':
        return 'Selecciona los días de acceso';
      case 'any_single_day':
        return 'Acceso un día a elegir';
      default:
        return 'Acceso al evento';
    }
  };

  const getAvailableDays = (): Date[] => {
    if (!event) return [];
    
    if (ticketType.available_days && ticketType.available_days.length > 0) {
      return ticketType.available_days;
    }
    
    // Generar días del evento
    const days: Date[] = [];
    const startDate = new Date(event.start_date);
    const endDate = new Date(event.end_date);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    
    return days;
  };

  if (isOutOfStock) {
    return (
      <Card className="opacity-75 border-gray-300">
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-medium text-gray-600">{ticketType.name}</h3>
            <Badge variant="destructive">Agotado</Badge>
          </div>
          <p className="text-sm text-gray-500">
            {formatCurrency(ticketType.price, ticketType.currency as 'MXN' | 'USD' | 'EUR' | 'GBP')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`transition-all duration-200 ${
      quantity > 0 ? 'ring-2 ring-blue-500 border-blue-500' : 'hover:shadow-md'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg">{ticketType.name}</CardTitle>
            {ticketType.description && (
              <p className="text-sm text-gray-600 mt-1">
                {ticketType.description}
              </p>
            )}
          </div>
          <div className="text-right ml-4">
            <div className="text-xl font-bold text-gray-900">
              {formatCurrency(ticketType.price, ticketType.currency as 'MXN' | 'USD' | 'EUR' | 'GBP')}
            </div>
            {isLowStock && (
              <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Solo {availableStock}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Información de acceso */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Info className="h-4 w-4" />
          <span>{getAccessDescription()}</span>
        </div>

        {/* Límites */}
        {ticketType.limit_per_user && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Users className="h-4 w-4" />
            <span>Máximo {ticketType.limit_per_user} por persona</span>
          </div>
        )}

        {/* Selector de cantidad */}
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-900">Cantidad:</span>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuantityChange(quantity - 1)}
              disabled={quantity <= 0}
              className="h-8 w-8 p-0"
            >
              <Minus className="h-3 w-3" />
            </Button>
            
            <span className="font-medium min-w-[2rem] text-center text-lg">
              {quantity}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuantityChange(quantity + 1)}
              disabled={quantity >= maxQuantity}
              className="h-8 w-8 p-0"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Selección de días específicos */}
        {needsDaySelection && (
          <div className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-800">
              <Calendar className="h-4 w-4" />
              <span>Selecciona los días de acceso:</span>
            </div>
            
            <div className="grid gap-2">
              {getAvailableDays().map((day) => (
                <div key={day.getTime()} className="flex items-center space-x-2">
                  <Checkbox
                    id={`day-${ticketType.id}-${day.getTime()}`}
                    checked={selectedDays.some(d => d.getTime() === day.getTime())}
                    onCheckedChange={(checked) => handleDayToggle(day, checked as boolean)}
                  />
                  <label
                    htmlFor={`day-${ticketType.id}-${day.getTime()}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {format(day, 'EEEE, dd MMMM', { locale: es })}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Subtotal */}
        {quantity > 0 && (
          <div className="flex justify-between items-center pt-3 border-t">
            <span className="font-medium text-gray-900">Subtotal:</span>
            <span className="text-lg font-bold text-green-600">
              {formatCurrency(ticketType.price * quantity, ticketType.currency as 'MXN' | 'USD' | 'EUR' | 'GBP')}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
