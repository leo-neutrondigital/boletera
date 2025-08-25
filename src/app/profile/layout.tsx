import { ClientAuthGuard } from '@/components/auth/ClientAuthGuard';
import { ClientHeader } from '@/components/navigation/ClientHeader';

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientAuthGuard requireAuth={true}>
      <div className="min-h-screen bg-gray-50">
        <ClientHeader currentPage="profile" />
        <main>
          {children}
        </main>
      </div>
    </ClientAuthGuard>
  );
}
