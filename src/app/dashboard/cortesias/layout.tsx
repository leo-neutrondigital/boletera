'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';

export default function CourtesyLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard 
      allowedRoles={['admin', 'gestor']} 
      requireAuth={true}
      fallback="/dashboard"
    >
      {children}
    </AuthGuard>
  );
}
