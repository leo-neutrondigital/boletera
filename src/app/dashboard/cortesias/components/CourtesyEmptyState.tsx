import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gift } from 'lucide-react';

interface CourtesyEmptyStateProps {
  hasData: boolean;
  searchTerm: string;
  selectedType: string;
  onClearFilters: () => void;
}

export function CourtesyEmptyState({ 
  hasData, 
  searchTerm, 
  selectedType, 
  onClearFilters
}: CourtesyEmptyStateProps) {
  const hasFilters = searchTerm || selectedType !== 'all';
  
  return (
    <Card className="text-center py-12">
      <CardContent>
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Gift className="w-12 h-12 text-green-600" />
        </div>
        
        <h3 className="text-xl font-medium text-gray-900 mb-2">
          {!hasData ? 'No hay cortesías creadas' : 'No se encontraron resultados'}
        </h3>
        
        <p className="text-gray-600 mb-6">
          {!hasData 
            ? 'Crea tu primera cortesía usando el botón "Nueva Cortesía" en la parte superior'
            : 'No hay cortesías que coincidan con tu búsqueda. Intenta con otros términos.'
          }
        </p>

        <Button
          variant="outline"
          onClick={onClearFilters}
          className={hasFilters ? '' : 'invisible'}
        >
          Limpiar filtros
        </Button>
      </CardContent>
    </Card>
  );
}
