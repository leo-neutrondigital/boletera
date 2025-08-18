import { Suspense } from 'react';
import { CourtesyOrderPageContent } from './components/CourtesyOrderPageContent';

interface CourtesyOrderPageProps {
  params: {
    orderId: string;
  };
}

export default function CourtesyOrderPage({ params }: CourtesyOrderPageProps) {
  return (
    <Suspense fallback={<div>Cargando orden...</div>}>
      <CourtesyOrderPageContent orderId={params.orderId} />
    </Suspense>
  );
}
