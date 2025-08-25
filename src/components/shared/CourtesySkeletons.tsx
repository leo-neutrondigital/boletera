import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// Skeleton para tarjetas de eventos agrupados
export function EventGroupSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Título del evento */}
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-6 w-48" />
            </div>
            
            {/* Fecha y ubicación */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Skeleton className="w-4 h-4 rounded" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="flex items-center gap-1">
                <Skeleton className="w-4 h-4 rounded" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
          </div>
          
          <div className="text-right">
            {/* Número de boletos */}
            <Skeleton className="h-8 w-8 mb-1 ml-auto" />
            <Skeleton className="h-4 w-16 mb-2" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
        
        {/* Estadísticas */}
        <div className="grid grid-cols-3 gap-4 mt-4 p-3 bg-white/70 rounded-lg">
          {[1, 2, 3].map(i => (
            <div key={i} className="text-center">
              <Skeleton className="h-6 w-8 mx-auto mb-1" />
              <Skeleton className="h-3 w-16 mx-auto" />
            </div>
          ))}
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        {/* Header de órdenes */}
        <Skeleton className="h-4 w-32 mb-4" />
        
        {/* Órdenes individuales */}
        <div className="space-y-4">
          {[1, 2].map(orderIndex => (
            <div key={orderIndex} className="border-l-4 border-gray-200 pl-4 py-3 bg-gray-50 rounded-r-lg">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  {/* Header de orden */}
                  <div className="flex items-center gap-2 mb-2">
                    <Skeleton className="w-4 h-4 rounded" />
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-20 rounded" />
                  </div>
                  
                  {/* Stats de orden */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map(statIndex => (
                      <div key={statIndex}>
                        <Skeleton className="h-3 w-12 mb-1" />
                        <Skeleton className="h-4 w-6" />
                      </div>
                    ))}
                  </div>
                  
                  {/* Vista previa de boletos */}
                  <div className="mt-3">
                    <Skeleton className="h-3 w-24 mb-2" />
                    <div className="flex gap-1">
                      {[1, 2, 3].map(ticketIndex => (
                        <Skeleton key={ticketIndex} className="h-5 w-16 rounded" />
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Botones de acción */}
                <div className="ml-4 flex gap-2">
                  <Skeleton className="h-8 w-20 rounded" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Skeleton para estadísticas
export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      {[1, 2, 3, 4].map(i => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Skeleton className="p-2 w-10 h-10 rounded-full" />
              <div className="ml-4">
                <Skeleton className="h-8 w-12 mb-2" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Skeleton para filtros
export function FiltersSkeleton() {
  return (
    <div className="mb-6">
      <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between mb-4">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <Skeleton className="h-10 w-full sm:w-80" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-8 w-8 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}

// Skeleton completo para la página
export function CourtesyPageSkeleton() {
  return (
    <div className="space-y-6">
      <StatsSkeleton />
      <FiltersSkeleton />
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <EventGroupSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
