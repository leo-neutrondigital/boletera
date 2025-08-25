'use client';

import { useAuth } from '@/contexts/AuthContext';
import { User, Mail, Calendar, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function ProfileHeader() {
  const { user, userData } = useAuth();

  if (!user || !userData) {
    return null;
  }

  const getRoleBadge = (roles: string[]) => {
    const primaryRole = roles[0] || 'usuario';
    const colors = {
      admin: 'bg-red-100 text-red-800',
      gestor: 'bg-yellow-100 text-yellow-800',
      comprobador: 'bg-blue-100 text-blue-800',
      usuario: 'bg-green-100 text-green-800',
    };

    return (
      <Badge className={colors[primaryRole as keyof typeof colors] || colors.usuario}>
        {primaryRole.charAt(0).toUpperCase() + primaryRole.slice(1)}
      </Badge>
    );
  };

  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <div className="flex items-start gap-6">
          
          {/* Avatar */}
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-10 h-10 text-white" />
          </div>

          {/* Información principal */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900 truncate">
                {userData.name || 'Usuario'}
              </h1>
              {getRoleBadge(userData.roles)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              
              {/* Email */}
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="truncate">{user.email}</span>
              </div>

              {/* Fecha de registro */}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>
                  Miembro desde {format(userData.created_at, "MMMM 'de' yyyy", { locale: es })}
                </span>
              </div>

              {/* Teléfono */}
              {userData.phone && (
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 text-gray-400">📞</span>
                  <span>{userData.phone}</span>
                </div>
              )}

              {/* Empresa */}
              {userData.company && (
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 text-gray-400">🏢</span>
                  <span>{userData.company}</span>
                </div>
              )}

              {/* Ubicación */}
              {userData.address?.city && (
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 text-gray-400">📍</span>
                  <span>
                    {userData.address.city}{userData.address.state ? `, ${userData.address.state}` : ''}
                    {userData.address.country ? `, ${userData.address.country}` : ''}
                  </span>
                </div>
              )}

              {/* Roles */}
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-gray-400" />
                <span>Roles: {userData.roles.join(', ')}</span>
              </div>

              {/* UID (para soporte técnico) */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">ID: {user.uid.slice(-8)}</span>
              </div>
            </div>
          </div>

          {/* Estadísticas adicionales (placeholder para futuro) */}
          <div className="hidden lg:block text-right">
            <div className="text-sm text-gray-500">
              <p>Estado de la cuenta</p>
              <p className="text-green-600 font-medium">Activa</p>
            </div>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}
