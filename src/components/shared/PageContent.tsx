import { cn } from '@/lib/utils';

interface PageContentProps {
  /** Contenido de la página */
  children: React.ReactNode;
  /** Clase CSS adicional para el contenedor */
  className?: string;
  /** Si debe tener scroll interno (para páginas largas) */
  scrollable?: boolean;
  /** Padding personalizado */
  padding?: 'sm' | 'md' | 'lg' | 'xl';
  /** Ancho máximo del contenedor */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl' | '7xl' | 'full';
}

const paddingClasses = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
  xl: 'p-12',
};

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full',
};

export function PageContent({
  children,
  className,
  scrollable = true,
  padding = 'lg',
  maxWidth = '7xl'
}: PageContentProps) {
  return (
    <div className={cn(
      "bg-gray-50",
      scrollable ? "min-h-screen" : "h-full",
      className
    )}>
      <div className={cn(
        "mx-auto px-4 sm:px-6 lg:px-8",
        paddingClasses[padding],
        maxWidthClasses[maxWidth]
      )}>
        {children}
      </div>
    </div>
  );
}