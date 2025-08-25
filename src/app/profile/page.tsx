'use client';

import { ProfileHeader } from './components/ProfileHeader';
import { ProfileForm } from './components/ProfileForm';
import { PasswordChangeForm } from './components/PasswordChangeForm';
import { ClientAuthGuard } from '@/components/auth/ClientAuthGuard';

function ProfilePageContent() {
  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header con información del usuario */}
        <ProfileHeader />

        {/* Contenido principal en dos columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Columna izquierda: Información personal */}
          <div>
            <ProfileForm />
          </div>

          {/* Columna derecha: Cambio de contraseña */}
          <div>
            <PasswordChangeForm />
          </div>

        </div>

        {/* Información adicional */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-medium text-blue-900 mb-2">
            💡 Información sobre tu cuenta
          </h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Tu información personal se mantiene privada y segura</li>
            <li>• Los cambios en tu perfil se reflejarán en futuras compras</li>
            <li>• Si cambias tu contraseña, deberás usarla para iniciar sesión</li>
            <li>• Para cambios en tu email, contacta al administrador</li>
          </ul>
        </div>

      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ClientAuthGuard requireAuth={true}>
      <ProfilePageContent />
    </ClientAuthGuard>
  );
}
