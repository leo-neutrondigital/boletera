import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, RefreshCw, Calendar, List, ChevronLeft, ChevronRight } from 'lucide-react';
import type { CourtesyType } from './types';

interface CourtesyFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedType: string;
  onTypeChange: (value: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
  courtesyTypes: CourtesyType[];
  showAllEvents: boolean; // 🆕
  onToggleAllEvents: (value: boolean) => void; // 🆕
  totalResults: number; // 🆕
  currentPage: number; // 🆕
  totalPages: number; // 🆕
  onPageChange: (page: number) => void; // 🆕
}

export function CourtesyFilters({
  searchTerm,
  onSearchChange,
  selectedType,
  onTypeChange,
  onRefresh,
  isLoading,
  courtesyTypes,
  showAllEvents, // 🆕
  onToggleAllEvents, // 🆕
  totalResults, // 🆕
  currentPage, // 🆕
  totalPages, // 🆕
  onPageChange // 🆕
}: CourtesyFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Filtros principales */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar por nombre, email, tipo..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select value={selectedType} onValueChange={onTypeChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por tipo..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {courtesyTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button 
          onClick={onRefresh}
          disabled={isLoading}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Actualizando...' : 'Actualizar'}
        </Button>
      </div>
      
      {/* 🆕 Filtros adicionales y info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant={showAllEvents ? "default" : "outline"}
            size="sm"
            onClick={() => onToggleAllEvents(!showAllEvents)}
            className="flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            {showAllEvents ? 'Mostrando todos' : 'Solo eventos futuros'}
          </Button>
          
          <Badge variant="secondary" className="flex items-center gap-1">
            <List className="w-3 h-3" />
            {totalResults} resultado{totalResults !== 1 ? 's' : ''}
          </Badge>
        </div>
        
        {/* 🆕 Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <span className="text-sm text-gray-600 px-2">
              Página {currentPage} de {totalPages}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
