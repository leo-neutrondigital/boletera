// src/app/dashboard/layout.tsx
import Sidebar from "@/components/dashboard/Sidebar";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DataCacheProvider } from "@/contexts/DataCacheContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requireAuth minRole="comprobador">
      <DataCacheProvider>
        <div className="flex h-screen bg-gray-50">
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-white">{children}</main>
        </div>
      </DataCacheProvider>
    </AuthGuard>
  );
}
