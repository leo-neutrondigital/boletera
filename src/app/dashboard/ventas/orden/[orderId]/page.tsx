import { CourtesyOrderPageContent } from "@/app/dashboard/cortesias/orden/[orderId]/components/CourtesyOrderPageContent";

interface SalesOrderPageProps {
  params: { orderId: string };
}

export default function SalesOrderPage({ params }: SalesOrderPageProps) {
  const { orderId } = params;

  // 🔄 Reutilizar EXACTAMENTE el mismo componente que cortesías
  // Solo cambiamos el contexto de navegación
  return (
    <CourtesyOrderPageContent 
      orderId={orderId}
      pageTitle="Detalle de Venta"
      pageDescription="Gestión administrativa de orden de venta"
      breadcrumbTitle="Ventas"
      breadcrumbPath="/dashboard/ventas"
      orderType="venta"
    />
  );
}
