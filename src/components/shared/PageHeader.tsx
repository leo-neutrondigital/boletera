import { Badge } from '@/components/ui/badge';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  /** Icono principal del header */
  icon: React.ComponentType<{ className?: string }>;
  /** Título principal de la página */
  title: string;
  /** Descripción breve de la funcionalidad */
  description: string;
  /** Color del fondo del icono */
  iconColor?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  /** Elementos adicionales a mostrar en la derecha (botones, etc.) */
  actions?: React.ReactNode;
  /** Mostrar badge de rol del usuario */
  showRoleBadge?: boolean;
  /** Color personalizado del badge */
  badgeColor?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  /** Clase CSS adicional para el contenedor */
  className?: string;
}

const iconColorClasses = {
  blue: 'bg-blue-600',
  green: 'bg-green-600',
  purple: 'bg-purple-600',
  orange: 'bg-orange-600',
  red: 'bg-red-600',
};

const badgeColorClasses = {
  blue: 'bg-blue-50 text-blue-700 border-blue-300',
  green: 'bg-green-50 text-green-700 border-green-300',
  purple: 'bg-purple-50 text-purple-700 border-purple-300',
  orange: 'bg-orange-50 text-orange-700 border-orange-300',
  red: 'bg-red-50 text-red-700 border-red-300',
};

export function PageHeader({
  icon: Icon,
  title,
  description,
  iconColor = 'blue',
  actions,
  showRoleBadge = true,
  badgeColor = 'blue',
  className
}: PageHeaderProps) {
  const { userData } = useAuth();

  const getRoleDisplayName = (roles: string[] = []) => {
    if (roles.includes('admin')) return 'Administrador';
    if (roles.includes('gestor')) return 'Gestor';
    if (roles.includes('comprobador')) return 'Comprobador';
    return 'Usuario';
  };

  return (
    <div className={cn("bg-white shadow-sm border-b", className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Lado izquierdo: Icono + Título + Descripción */}
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", iconColorClasses[iconColor])}>
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {title}
              </h1>
              <p className="text-sm text-gray-500">
                {description}
              </p>
            </div>
          </div>
          
          {/* Lado derecho: Badge + Acciones */}
          <div className="flex items-center gap-3">
            {showRoleBadge && userData && (
              <Badge 
                variant="outline" 
                className={cn(badgeColorClasses[badgeColor])}
              >
                <ShieldAlert className="w-3 h-3 mr-1" />
                {getRoleDisplayName(userData.roles)}
              </Badge>
            )}
            
            {actions && (
              <div className="flex items-center gap-2">
                {actions}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}