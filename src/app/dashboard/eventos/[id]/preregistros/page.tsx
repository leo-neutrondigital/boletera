import { AuthGuard } from "@/components/auth/AuthGuard";
import { PreregistrosPageClient } from "./preregistros-page-client";

interface PreregistrosPageProps {
  params: {
    id: string;
  };
}

export default function PreregistrosPage({ params }: PreregistrosPageProps) {
  return (
    <AuthGuard minRole="gestor">
      <PreregistrosPageClient eventId={params.id} />
    </AuthGuard>
  );
}
