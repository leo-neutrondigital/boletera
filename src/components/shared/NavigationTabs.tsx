import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface NavigationTabsProps {
  /** ID del evento para construir las URLs */
  eventId: string;
  /** Tabs disponibles */
  tabs: Array<{
    /** ID único del tab */
    id: string;
    /** Texto a mostrar */
    label: string;
    /** Icono del tab */
    icon: LucideIcon;
    /** Ruta relativa desde /dashboard/eventos/[id]/ */
    href: string;
    /** Si el tab está deshabilitado */
    disabled?: boolean;
  }>;
  /** Clase CSS adicional */
  className?: string;
}

export function NavigationTabs({ eventId, tabs, className }: NavigationTabsProps) {
  const pathname = usePathname();

  return (
    <div className={cn("bg-white border-b", className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const fullHref = `/dashboard/eventos/${eventId}/${tab.href}`;
            const isActive = pathname === fullHref;
            const Icon = tab.icon;

            return (
              <Link
                key={tab.id}
                href={tab.disabled ? '#' : fullHref}
                className={cn(
                  "inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                  {
                    // Tab activo
                    "border-blue-500 text-blue-600": isActive,
                    // Tab inactivo
                    "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300": 
                      !isActive && !tab.disabled,
                    // Tab deshabilitado
                    "border-transparent text-gray-300 cursor-not-allowed": tab.disabled,
                  }
                )}
                {...(tab.disabled && { 
                  onClick: (e) => e.preventDefault(),
                  'aria-disabled': true 
                })}
              >
                <Icon className={cn(
                  "w-4 h-4 mr-2",
                  {
                    "text-blue-500": isActive,
                    "text-gray-400": !isActive && !tab.disabled,
                    "text-gray-300": tab.disabled,
                  }
                )} />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}