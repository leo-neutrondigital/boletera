'use client';

import { Card, CardContent } from '@/components/ui/card';
import type { EventStats } from '../../types';

interface StatsCardsProps {
  stats: EventStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.total_tickets}</div>
          <div className="text-sm text-gray-600">Total</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.checked_in_count}</div>
          <div className="text-sm text-gray-600">Registrados</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-gray-600">{stats.not_arrived_count}</div>
          <div className="text-sm text-gray-600">Pendientes</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.attendance_rate}%</div>
          <div className="text-sm text-gray-600">Asistencia</div>
        </CardContent>
      </Card>
    </div>
  );
}
