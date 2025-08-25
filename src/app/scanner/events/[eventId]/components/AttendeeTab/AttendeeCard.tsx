'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle2, Minus, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { AttendeeTicket } from '../../types';

interface AttendeeCardProps {
  attendee: AttendeeTicket;
  onClick: (attendee: AttendeeTicket) => void;
}

export function AttendeeCard({ attendee, onClick }: AttendeeCardProps) {
  // Formatear hora
  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return format(date, "HH:mm", { locale: es });
    } catch {
      return '';
    }
  };

  // Obtener color del punto de estado
  const getStatusDotColor = (status: AttendeeTicket['check_in_status']) => {
    switch (status) {
      case 'checked_in':
        return 'bg-green-500';
      case 'partial':
        return 'bg-yellow-500';
      case 'not_arrived':
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-sm transition-all duration-200 border-l-4 border-l-transparent hover:border-l-blue-500"
      onClick={() => onClick(attendee)}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {/* Info del asistente */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Punto de estado */}
            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getStatusDotColor(attendee.check_in_status)}`} />
            
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 truncate">
                {attendee.attendee_name}
              </h3>
              
              <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                <span className="truncate">{attendee.ticket_type_name}</span>
                
                {attendee.check_in_status === 'checked_in' && attendee.last_checkin && (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="w-3 h-3" />
                    <span className="text-xs">
                      {formatTime(attendee.last_checkin)}
                    </span>
                  </div>
                )}
                
                {attendee.check_in_status === 'partial' && (
                  <div className="flex items-center gap-1 text-yellow-600">
                    <Minus className="w-3 h-3" />
                    <span className="text-xs">
                      {attendee.used_days.length}/{attendee.authorized_days.length} días
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Acción */}
          <div className="flex items-center gap-2">
            {attendee.check_in_status === 'not_arrived' && (
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                Registrar
              </Button>
            )}
            
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
