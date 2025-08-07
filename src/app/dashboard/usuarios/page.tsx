"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Button } from "@/components/ui/button";
import { UserFormDialog } from "@/components/dashboard/UserFormDialog";
import { UsersTable } from "@/components/dashboard/UsersTable";
import { useUsers } from "@/hooks/use-users";
import { Users, UserPlus, Shield, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { User } from "@/types";

export default function UsersPage() {
  const { userData } = useAuth();
  const { users, loading, error, refreshUsers, deleteUser, updateUser, addUser } = useUsers();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">Error: {error}</div>
        <Button onClick={refreshUsers}>Reintentar</Button>
      </div>
    );
  }

  return (
    <AuthGuard allowedRoles={["admin"]}>
      <div className="space-y-6">
        {/* Breadcrumb simple */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Link 
            href="/dashboard" 
            className="hover:text-gray-900 transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Usuarios</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
              <p className="text-gray-600">
                {users.length} usuario{users.length !== 1 ? 's' : ''} registrado{users.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

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

        {/* Tabla de usuarios */}
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
    </AuthGuard>
  );
}
