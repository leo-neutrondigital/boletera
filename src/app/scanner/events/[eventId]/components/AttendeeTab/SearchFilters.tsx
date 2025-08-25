'use client';

import { Search, Users, CheckCircle2, Circle, Minus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { StatusFilter, EventStats } from '../../types';

interface SearchFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (status: StatusFilter) => void;
  totalAttendees: number;
  stats: EventStats | null;
}

export function SearchFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  totalAttendees,
  stats
}: SearchFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Buscar invitados..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          onClick={() => onStatusFilterChange('all')}
          size="sm"
          className="flex items-center gap-2"
        >
          <Users className="w-4 h-4" />
          Todos ({totalAttendees})
        </Button>
        
        <Button
          variant={statusFilter === 'checked_in' ? 'default' : 'outline'}
          onClick={() => onStatusFilterChange('checked_in')}
          size="sm"
          className="flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          Registrados ({stats?.checked_in_count || 0})
        </Button>
        
        <Button
          variant={statusFilter === 'not_arrived' ? 'default' : 'outline'}
          onClick={() => onStatusFilterChange('not_arrived')}
          size="sm"
          className="flex items-center gap-2"
        >
          <Circle className="w-4 h-4 text-gray-400" />
          Pendientes ({stats?.not_arrived_count || 0})
        </Button>
        
        <Button
          variant={statusFilter === 'partial' ? 'default' : 'outline'}
          onClick={() => onStatusFilterChange('partial')}
          size="sm"
          className="flex items-center gap-2"
        >
          <Minus className="w-4 h-4 text-yellow-600" />
          Parcial
        </Button>
      </div>
    </div>
  );
}
