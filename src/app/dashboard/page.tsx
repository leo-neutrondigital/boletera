// src/app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase/client';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      const ref = doc(db, 'users', user.uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        auth.signOut();
        router.push('/login');
        return;
      }

      const roles: string[] = snap.data().roles || [];

      if (roles.includes('admin')) setRole('admin');
      else if (roles.includes('gestor')) setRole('gestor');
      else if (roles.includes('comprobador')) setRole('comprobador');
      else setRole('usuario');

      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) return <div className="p-4">Cargando...</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-2">Dashboard ({role})</h1>
      {role === 'admin' && <p>👑 Acceso de administrador</p>}
      {role === 'gestor' && <p>📋 Acceso de gestor</p>}
      {role === 'comprobador' && <p>📱 Acceso de comprobador</p>}
      {role === 'usuario' && <p>🎟️ Acceso de usuario</p>}
    </div>
  );
}