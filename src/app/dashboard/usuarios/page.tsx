"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Button } from "@/components/ui/button";
import { UserFormDialog } from "@/components/dashboard/UserFormDialog";
import { UsersTable } from "@/components/dashboard/UsersTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { useCachedUsers } from "@/contexts/DataCacheContext"; // 🆕 Hook con cache
import { Users, UserPlus, RefreshCw } from "lucide-react";

export default function UsersPage() {
  const { userData } = useAuth();
  const { users, loading, error, refreshUsers, deleteUser, updateUser, addUser } = useCachedUsers(); // 🆕 Hook cacheado (auto-carga)
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshUsers(); // Forzar recarga desde API
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">Error: {error}</div>
          <Button onClick={refreshUsers}>Reintentar</Button>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard allowedRoles={["admin"]}>
      <div className="space-y-8">
        {/* Header */}
        <PageHeader
          icon={Users}
          title="Gestión de Usuarios"
          description={`${users.length} usuario${users.length !== 1 ? 's' : ''} registrado${users.length !== 1 ? 's' : ''}`}
          iconColor="blue"
          actions={
            <div className="flex items-center gap-2">
              <Button 
                onClick={handleRefresh}
                variant="outline"
                size="sm"
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Actualizando...' : 'Actualizar'}
              </Button>
              
              <UserFormDialog
                onSuccess={addUser}
                trigger={
                  <Button className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    Crear Usuario
                  </Button>
                }
              />
            </div>
          }
        />

        {/* Tabla de usuarios */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg border">
            <UsersTable
              users={users}
              currentUser={userData}
              onRefresh={refreshUsers}
              onDeleteUser={deleteUser}
              onUpdateUser={updateUser}
              onAddUser={addUser}
            />
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
