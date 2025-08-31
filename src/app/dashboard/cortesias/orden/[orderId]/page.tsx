import { Suspense } from 'react';
import { CourtesyOrderPageContent } from './components/CourtesyOrderPageContent';

interface CourtesyOrderPageProps {
  params: {
    orderId: string;
  };
  searchParams: { eventId?: string };
}

export default function CourtesyOrderPage({ params, searchParams }: CourtesyOrderPageProps) {
  return (
    <Suspense fallback={<div>Cargando orden...</div>}>
      <CourtesyOrderPageContent orderId={params.orderId} eventId={searchParams.eventId} />
    </Suspense>
  );
}
