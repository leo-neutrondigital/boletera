'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { CourtesyPageContent } from './components/CourtesyPageContent';

export default function CourtesyPage() {
  return (
    <AuthGuard 
      allowedRoles={['admin', 'gestor']} 
      requireAuth={true}
      fallback="/dashboard"
    >
      <CourtesyPageContent />
    </AuthGuard>
  );
}
