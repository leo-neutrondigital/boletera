// src/components/dashboard/UserTable.tsx
'use client';

import { useEffect, useState } from 'react';
import { getAuth } from "firebase/auth";
import { useToast } from "@/hooks/use-toast"
import { db } from '@/lib/firebase/client';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Input } from '@/components/ui/input';

type User = {
  uid: string;
  name: string;
  email: string;
  roles: string[];
  created_at: string; // asumiendo que viene como string desde Firestore
};

interface UserTableProps {
  refreshKey?: number;
}

export default function UserTable({ refreshKey }: UserTableProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [sortKey, setSortKey] = useState<'name' | 'email' | 'roles' | 'created_at'>('created_at');
  const [sortAsc, setSortAsc] = useState(true);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { toast } = useToast();

  // Estado para controlar qué modal de diálogo está abierto (por uid)
  const [openDialogUid, setOpenDialogUid] = useState<string | null>(null);
  const [deletingUid, setDeletingUid] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      const snapshot = await getDocs(collection(db, 'users'));
      const data: User[] = snapshot.docs.map((doc) => ({
        uid: doc.id,
        ...doc.data(),
        created_at: (doc.data().created_at?.toDate?.() ?? new Date()).toISOString(),
      })) as User[];
      data.sort((a, b) => {
        if (sortKey === 'created_at') {
          return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * (sortAsc ? 1 : -1);
        }
        return (Array.isArray(a[sortKey]) ? a[sortKey][0] : a[sortKey]).localeCompare(Array.isArray(b[sortKey]) ? b[sortKey][0] : b[sortKey]) * (sortAsc ? 1 : -1);
      });
      setUsers(data);
      setLoading(false);
    };

    fetchUsers();
  }, [sortKey, sortAsc, refreshKey]);

  const usersFiltered = users
    .filter((u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortKey === 'created_at') {
        return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * (sortAsc ? 1 : -1);
      }
      return (Array.isArray(a[sortKey]) ? a[sortKey][0] : a[sortKey]).localeCompare(Array.isArray(b[sortKey]) ? b[sortKey][0] : b[sortKey]) * (sortAsc ? 1 : -1);
    });

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = usersFiltered.slice(startIndex, endIndex);

  if (loading) return <p className="p-4">Cargando...</p>;

  return (
    <>
      <div className="mb-4 max-w-sm">
        <Input
          placeholder="Buscar por nombre o correo"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                onClick={() => {
                  setSortKey('name');
                  setSortAsc((prev) => (sortKey === 'name' ? !prev : true));
                }}
                className="cursor-pointer"
              >
                Nombre {sortKey === 'name' ? (sortAsc ? '↑' : '↓') : ''}
              </TableHead>
              <TableHead
                onClick={() => {
                  setSortKey('email');
                  setSortAsc((prev) => (sortKey === 'email' ? !prev : true));
                }}
                className="cursor-pointer"
              >
                Correo {sortKey === 'email' ? (sortAsc ? '↑' : '↓') : ''}
              </TableHead>
              <TableHead
                onClick={() => {
                  setSortKey('roles');
                  setSortAsc((prev) => (sortKey === 'roles' ? !prev : true));
                }}
                className="cursor-pointer"
              >
                Roles {sortKey === 'roles' ? (sortAsc ? '↑' : '↓') : ''}
              </TableHead>
              <TableHead
                onClick={() => {
                  setSortKey('created_at');
                  setSortAsc((prev) => (sortKey === 'created_at' ? !prev : true));
                }}
                className="cursor-pointer"
              >
                Fecha de creación {sortKey === 'created_at' ? (sortAsc ? '↑' : '↓') : ''}
              </TableHead>
              <TableHead>UID</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedUsers.map((user) => (
              <TableRow key={user.uid}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Select
                    defaultValue={user.roles[0]}
                    onValueChange={async (newRole) => {
                      const ref = doc(db, 'users', user.uid);
                      await updateDoc(ref, { roles: [newRole] });
                      setUsers((prev) =>
                        prev.map((u) =>
                          u.uid === user.uid ? { ...u, roles: [newRole] } : u
                        )
                      );
                    }}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Rol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">admin</SelectItem>
                      <SelectItem value="gestor">gestor</SelectItem>
                      <SelectItem value="comprobador">comprobador</SelectItem>
                      <SelectItem value="usuario">usuario</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(user.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{user.uid}</TableCell>
                <TableCell>
                  <Dialog
                    open={openDialogUid === user.uid}
                    onOpenChange={(open) => setOpenDialogUid(open ? user.uid : null)}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setOpenDialogUid(user.uid)}
                      >
                        Eliminar
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>¿Estás seguro?</DialogTitle>
                        <p className="text-sm text-muted-foreground">
                          Esta acción no se puede deshacer. Esto eliminará permanentemente al usuario del sistema.
                        </p>
                      </DialogHeader>
                      <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setOpenDialogUid(null)} disabled={deletingUid === user.uid}>
                          Cancelar
                        </Button>
                        <Button
                          variant="destructive"
                          disabled={deletingUid === user.uid}
                          onClick={async () => {
                            try {
                              setDeletingUid(user.uid);
                              // Obtener el token del usuario autenticado
                              const auth = getAuth();
                              const currentUser = auth.currentUser;
                              if (!currentUser) throw new Error("No hay usuario autenticado");
                              const token = await currentUser.getIdToken();

                              const res = await fetch("/api/admin/delete-user", {
                                method: "DELETE",
                                headers: {
                                  "Content-Type": "application/json",
                                  "Authorization": `Bearer ${token}`,
                                },
                                body: JSON.stringify({ uid: user.uid }),
                              });

                              if (!res.ok) throw new Error("No se pudo eliminar el usuario");

                              setUsers((prev) => prev.filter((u) => u.uid !== user.uid));
                              toast({
                                title: "Usuario eliminado",
                                description: `${user.name} ha sido eliminado.`,
                              });
                              setOpenDialogUid(null);
                            } catch (error) {
                              toast({
                                title: "Error al eliminar",
                                description: (error as Error).message,
                                variant: "destructive",
                              });
                            } finally {
                              setDeletingUid(null);
                            }
                          }}
                        >
                          Eliminar
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <div className="mt-4 flex justify-center">
        <Pagination>
          <PaginationContent>
            {currentPage > 1 && (
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentPage(currentPage - 1);
                  }}
                />
              </PaginationItem>
            )}

            {currentPage > 2 && (
              <PaginationItem>
                <PaginationLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentPage(1);
                  }}
                >
                  1
                </PaginationLink>
              </PaginationItem>
            )}

            {currentPage > 3 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}

            {Array.from(
              { length: Math.ceil(usersFiltered.length / itemsPerPage) },
              (_, i) => i + 1
            )
              .filter(
                (pageNum) =>
                  pageNum === currentPage ||
                  pageNum === currentPage - 1 ||
                  pageNum === currentPage + 1
              )
              .map((pageNum) => (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    href="#"
                    isActive={currentPage === pageNum}
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage(pageNum);
                    }}
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              ))}

            {currentPage < Math.ceil(usersFiltered.length / itemsPerPage) - 2 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}

            {currentPage < Math.ceil(usersFiltered.length / itemsPerPage) - 1 && (
              <PaginationItem>
                <PaginationLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentPage(Math.ceil(usersFiltered.length / itemsPerPage));
                  }}
                >
                  {Math.ceil(usersFiltered.length / itemsPerPage)}
                </PaginationLink>
              </PaginationItem>
            )}

            {currentPage < Math.ceil(usersFiltered.length / itemsPerPage) && (
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentPage(currentPage + 1);
                  }}
                />
              </PaginationItem>
            )}
          </PaginationContent>
        </Pagination>
      </div>
    </>
  );
}