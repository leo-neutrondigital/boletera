// src/app/api/orders/[id]/route.ts
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getAuthFromRequest } from "@/lib/auth/server-auth";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`📋 GET /api/orders/${params.id}`);
    
    const user = await getAuthFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    // Obtener la orden
    const orderDoc = await adminDb.collection("orders").doc(id).get();
    if (!orderDoc.exists) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const orderData = orderDoc.data();
    
    // Verificar que la orden pertenece al usuario (o es admin)
    if (orderData?.user_id !== user.uid && !user.roles.includes('admin')) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Convertir timestamps
    const order = {
      id: orderDoc.id,
      ...orderData,
      created_at: orderData?.created_at?.toDate?.() || new Date(),
      paid_at: orderData?.paid_at?.toDate?.() || null,
    };

    return NextResponse.json(order);

  } catch (error) {
    console.error("❌ Error fetching order:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
