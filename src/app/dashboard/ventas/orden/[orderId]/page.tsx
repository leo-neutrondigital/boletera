import { SalesOrderPageContent } from "./components/SalesOrderPageContent";

interface SalesOrderPageProps {
  params: { orderId: string };
  searchParams: { eventId?: string };
}

export default function SalesOrderPage({ params, searchParams }: SalesOrderPageProps) {
  const { orderId } = params;
  const { eventId } = searchParams;

  return <SalesOrderPageContent orderId={orderId} eventId={eventId} />;
}
