"use client";

import { useState } from "react";
import { Edit, Trash2, Shield, Mail, Phone, Building, Search, KeyRound } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { UserFormDialog } from "./UserFormDialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PaginationControls } from "@/components/shared/PaginationControls";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { sendPasswordReset } from "@/lib/auth/password-reset";
import type { User } from "@/types";

interface UsersTableProps {
  users: User[];
  currentUser?: { uid: string; roles: string[] } | null;
  onRefresh: () => void;
  onDeleteUser: (userId: string) => Promise<boolean>;
  onUpdateUser: (userId: string, data: Partial<User>) => Promise<boolean>;
  onAddUser: (user: User) => void;
}

export function UsersTable({
  users,
  currentUser,
  onRefresh,
  onDeleteUser,
  //onUpdateUser,
  onAddUser,
}: UsersTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [sendingReset, setSendingReset] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const { toast } = useToast();

  const handleDelete = async (userId: string) => {
    const success = await onDeleteUser(userId);
    if (success) {
      console.log("✅ User deleted and state updated");
    }
  };

  const handlePasswordReset = async (user: User) => {
    setSendingReset(user.id);
    
    try {
      const result = await sendPasswordReset(user.email);
      
      if (result.success) {
        toast({
          title: "✅ Email de reset enviado",
          description: `Se envió un email de restablecimiento a ${user.email}`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error al enviar email",
          description: result.message,
        });
      }
    } catch (error) {
      console.error('Error sending password reset:', error);
      toast({
        variant: "destructive",
        title: "Error inesperado",
        description: "No se pudo enviar el email de restablecimiento.",
      });
    } finally {
      setSendingReset(null);
    }
  };

  const handleUserSuccess = (user?: User) => {
    if (user) {
      onAddUser(user);
    } else {
      onRefresh();
    }
  };

  const getRoleBadge = (roles: string[]) => {
    const primaryRole = roles[0] || "usuario";
    const colors = {
      admin: "bg-red-100 text-red-800",
      gestor: "bg-yellow-100 text-yellow-800",
      comprobador: "bg-blue-100 text-blue-800",
      usuario: "bg-green-100 text-green-800",
    };

    return (
      <Badge className={colors[primaryRole as keyof typeof colors] || colors.usuario}>
        {primaryRole.charAt(0).toUpperCase() + primaryRole.slice(1)}
      </Badge>
    );
  };

  // Filtrar usuarios
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.company && user.company.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = roleFilter === "all" || user.roles.includes(roleFilter);
    
    return matchesSearch && matchesRole;
  });

  // Paginación
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Reset página cuando cambian los filtros
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleRoleChange = (value: string) => {
    setRoleFilter(value);
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  if (users.length === 0) {
    return (
      <div className="w-full p-8 text-center text-muted-foreground">
        <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg mb-2">No hay usuarios registrados</p>
        <p className="text-sm">Crea el primer usuario para comenzar</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar por nombre, email o empresa..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="sm:w-48">
          <Select value={roleFilter} onValueChange={handleRoleChange}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por rol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los roles</SelectItem>
              <SelectItem value="admin">Administradores</SelectItem>
              <SelectItem value="gestor">Gestores</SelectItem>
              <SelectItem value="comprobador">Comprobadores</SelectItem>
              <SelectItem value="usuario">Usuarios</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabla */}
      {filteredUsers.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No se encontraron usuarios con los filtros aplicados</p>
          <Button 
            variant="outline" 
            onClick={() => { 
              setSearchTerm(""); 
              setRoleFilter("all");
              setCurrentPage(1);
            }}
            className="mt-2"
          >
            Limpiar filtros
          </Button>
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.map((user) => {
                const isCurrentUser = currentUser?.uid === user.id;
                const canDelete = !isCurrentUser && currentUser?.roles.includes('admin');
                const canEdit = currentUser?.roles.includes('admin');

                return (
                  <TableRow key={user.id} className={isCurrentUser ? "bg-blue-50" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-600">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">
                            {user.name}
                            {isCurrentUser && (
                              <span className="text-xs text-blue-600 ml-2">(Tú)</span>
                            )}
                          </div>
                          {user.address?.city && (
                            <div className="text-xs text-gray-500">
                              {user.address.city}, {user.address.country}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-gray-400" />
                        <span className="text-sm">{user.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getRoleBadge(user.roles)}
                    </TableCell>
                    <TableCell>
                      {user.phone ? (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-gray-400" />
                          <span className="text-sm">{user.phone}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.company ? (
                        <div className="flex items-center gap-1">
                          <Building className="w-3 h-3 text-gray-400" />
                          <span className="text-sm">{user.company}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {format(user.created_at, "dd MMM yyyy", { locale: es })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {canEdit && (
                          <UserFormDialog
                            userToEdit={user}
                            onSuccess={handleUserSuccess}
                            trigger={
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Edit className="h-4 w-4" />
                              </Button>
                            }
                          />
                        )}

                        {/* Botón Reset Contraseña - Solo admin y no para el usuario actual */}
                        {canEdit && !isCurrentUser && (
                          <ConfirmDialog
                            trigger={
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                disabled={sendingReset === user.id}
                              >
                                {sendingReset === user.id ? (
                                  <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <KeyRound className="h-4 w-4" />
                                )}
                              </Button>
                            }
                            title="¿Enviar reset de contraseña?"
                            description={`Se enviará un email a "${user.email}" con instrucciones para restablecer su contraseña. ¿Estás seguro?`}
                            onConfirm={() => handlePasswordReset(user)}
                            confirmText="Enviar Email"
                            cancelText="Cancelar"
                          />
                        )}

                        {canDelete && (
                          <ConfirmDialog
                            trigger={
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            }
                            title="¿Eliminar usuario?"
                            description={`¿Estás seguro de que quieres eliminar a "${user.name}"? Esta acción eliminará su cuenta y no se puede deshacer.`}
                            onConfirm={() => handleDelete(user.id)}
                            confirmText="Eliminar"
                            cancelText="Cancelar"
                            destructive
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              </TableBody>
              </Table>
              </div>
          
          {/* Paginación */}
          {totalPages > 1 && (
            <div className="mt-4">
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredUsers.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={handleItemsPerPageChange}
                label="usuarios"
              />
            </div>
          )}
        </>
      )}

      {/* Información adicional */}
      <div className="text-xs text-gray-500 text-center pt-4 border-t">
        Mostrando {paginatedUsers.length} de {filteredUsers.length} usuarios{filteredUsers.length !== users.length ? ` (filtrado de ${users.length} total)` : ''}
      </div>
    </div>
  );
}
