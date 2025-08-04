// src/app/dashboard/usuarios/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase/client';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import UserTable from '@/components/dashboard/UserTable';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export default function UsuariosPage() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdPassword, setCreatedPassword] = useState('');
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const router = useRouter();

  const { toast } = useToast();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/dashboard');
        return;
      }

      const ref = doc(db, 'users', user.uid);
      const snap = await getDoc(ref);
      const data = snap.data();
      const roles = data?.roles || [];

      if (roles.includes('admin')) {
        setIsAuthorized(true);
      } else {
        router.push('/dashboard');
      }

      setCheckingAuth(false);
    });

    return () => unsub();
  }, [router]);

  if (checkingAuth) return <p className="p-4">Cargando...</p>;
  if (!isAuthorized) return null;

  return (
    <div className="p-6">
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogTrigger asChild>
          <button className="mb-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90">
            Crear nuevo usuario
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo usuario</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setIsSubmitting(true);
              const form = e.currentTarget;
              const formData = new FormData(form);
              const email = formData.get('email') as string;
              const name = formData.get('name') as string;
              const role = formData.get('role') as string;

              try {
                const user = auth.currentUser;
                if (!user) throw new Error('Usuario no autenticado');

                const idToken = await user.getIdToken();

                const res = await fetch('/api/admin/create-user', {
                  method: 'POST',
                  body: JSON.stringify({ email, name, role }),
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`,
                  },
                });

                if (!res.ok) throw new Error('Error al crear el usuario');

                const json = await res.json();
                const password = json.generatedPassword;

                setShowModal(false);
                setCreatedPassword(password);
                setShowPasswordDialog(true);

                toast({
                  title: "Usuario creado correctamente",
                  description: `El usuario ${name} fue creado con éxito.`,
                });
                setRefreshKey(prev => prev + 1);
              } catch (err) {
                console.error(err);
                alert('No se pudo crear el usuario');
              } finally {
                setIsSubmitting(false);
              }
            }}
            className="space-y-4 mt-4"
          >
            <div>
              <label className="block text-sm font-medium">Nombre</label>
              <input
                type="text"
                name="name"
                required
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Correo electrónico</label>
              <input
                type="email"
                name="email"
                required
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Rol</label>
              <select
                name="role"
                required
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              >
                <option value="usuario">Usuario</option>
                <option value="gestor">Gestor</option>
                <option value="comprobador">Comprobador</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <DialogFooter className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creando...' : 'Crear'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contraseña generada</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-4">
            <p className="text-sm">Copia y entrega esta contraseña al usuario. No podrá recuperarla luego.</p>
            <div className="flex items-center justify-between bg-gray-100 rounded px-3 py-2">
              <span className="font-mono text-sm break-all">{createdPassword}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(createdPassword);
                  toast({ title: 'Contraseña copiada al portapapeles' });
                }}
                className="ml-4 px-2 py-1 bg-primary text-white rounded hover:bg-primary/90 text-sm"
              >
                Copiar
              </button>
            </div>
          </div>
          <DialogFooter className="flex justify-end">
            <button
              onClick={() => setShowPasswordDialog(false)}
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
            >
              Cerrar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <h1 className="text-2xl font-bold mb-4">Usuarios registrados</h1>
      <UserTable refreshKey={refreshKey} />
    </div>
  );
}