'use client';

import { useAuth } from '@/contexts/AuthContext';
import Sidebar from "@/components/dashboard/Sidebar";
import { AuthGuard } from "@/components/auth/AuthGuard";

export default function ScannerLayout({ children }: { children: React.ReactNode }) {
  const { userData } = useAuth();
  
  // Determinar si debe mostrar sidebar (Admin/Gestor sí, Comprobador no)
  const shouldShowSidebar = userData?.roles?.some(role => 
    ['admin', 'gestor'].includes(role)
  ) || false;

  return (
    <AuthGuard 
      allowedRoles={['admin', 'gestor', 'comprobador']}
      fallback={(
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Acceso restringido
            </h2>
            <p className="text-gray-600">
              Solo administradores, gestores y comprobadores pueden acceder al scanner.
            </p>
          </div>
        </div>
      )}
    >
      {shouldShowSidebar ? (
        // Layout con sidebar para Admin/Gestor
        <div className="flex h-screen bg-gray-50">
          <Sidebar />
          <main className="flex-1 overflow-auto bg-gray-50">
            {children}
          </main>
        </div>
      ) : (
        // Layout sin sidebar para Comprobador
        <div className="min-h-screen bg-gray-50">
          {children}
        </div>
      )}
    </AuthGuard>
  );
}
