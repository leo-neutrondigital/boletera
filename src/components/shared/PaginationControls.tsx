import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  label?: string;
}

export function PaginationControls({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  label = "elementos"
}: PaginationControlsProps) {
  
  /*
   * 🚨 IMPORTANTE: Por qué usamos <span> en lugar de <Button>
   * 
   * Los botones de navegación (‹ ›) usan elementos <span> simples 
   * en lugar del componente Button de shadcn/ui porque:
   * 
   * PROBLEMA ENCONTRADO:
   * Button + SVG iconos (ChevronLeft/Right) + clase [&_svg]:size-4 
   * causaba problemas misteriosos de scroll y espacios en blanco
   * en páginas con paginación.
   * 
   * SOLUCIÓN:
   * Elementos HTML básicos con estilos simples funcionan perfectamente
   * y mantienen la funcionalidad sin interferir con el layout.
   * 
   * Ver: LAYOUT_ISSUES.md para documentación completa
   */
  
  // Calcular rango de elementos mostrados
  const startItem = Math.min((currentPage - 1) * itemsPerPage + 1, totalItems);
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  
  // Opciones de elementos por página
  const pageSizeOptions = [5, 10, 20, 50];
  
  // Generar números de página para mostrar
  const getPageNumbers = () => {
    const delta = 2; // Páginas a mostrar a cada lado de la actual
    const pages: (number | string)[] = [];
    
    // Siempre mostrar primera página
    pages.push(1);
    
    // Calcular rango alrededor de la página actual
    const startPage = Math.max(2, currentPage - delta);
    const endPage = Math.min(totalPages - 1, currentPage + delta);
    
    // Agregar puntos suspensivos si hay gap
    if (startPage > 2) {
      pages.push('...');
    }
    
    // Agregar páginas del rango
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    // Agregar puntos suspensivos si hay gap
    if (endPage < totalPages - 1) {
      pages.push('...');
    }
    
    // Siempre mostrar última página (si no es la primera)
    if (totalPages > 1) {
      pages.push(totalPages);
    }
    
    return pages;
  };
  
  if (totalItems === 0) {
    return (
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-muted-foreground">
          No hay {label} para mostrar
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex items-center space-x-2">
        <p className="text-sm font-medium">Elementos por página</p>
        <Select
          value={`${itemsPerPage}`}
          onValueChange={(value) => onItemsPerPageChange(Number(value))}
        >
          <SelectTrigger className="h-8 w-[70px]">
            <SelectValue placeholder={itemsPerPage} />
          </SelectTrigger>
          <SelectContent side="top">
            {pageSizeOptions.map((pageSize) => (
              <SelectItem key={pageSize} value={`${pageSize}`}>
                {pageSize}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          {startItem}-{endItem} de {totalItems}
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Botón anterior - SIN BUTTON */}
          <span
            className={`h-8 w-8 flex items-center justify-center rounded-md border text-sm cursor-pointer select-none ${
              currentPage === 1 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:bg-gray-100'
            }`}
            onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
          >
            ‹
          </span>
          
          <div className="flex items-center space-x-1">
            {getPageNumbers().map((page, index) => (
              page === '...' ? (
                <span key={index} className="h-8 w-8 flex items-center justify-center text-sm">
                  ...
                </span>
              ) : (
                <Button
                  key={index}
                  variant={currentPage === page ? "default" : "outline"}
                  className="h-8 w-8 p-0"
                  onClick={() => onPageChange(page as number)}
                >
                  {page}
                </Button>
              )
            ))}
          </div>
          
          {/* Botón siguiente - SIN BUTTON */}
          <span
            className={`h-8 w-8 flex items-center justify-center rounded-md border text-sm cursor-pointer select-none ${
              currentPage === totalPages 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:bg-gray-100'
            }`}
            onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
          >
            ›
          </span>
        </div>
      </div>
    </div>
  );
}
