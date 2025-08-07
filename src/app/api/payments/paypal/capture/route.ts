// src/app/api/payments/paypal/capture/route.ts
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getAuthFromRequest } from "@/lib/auth/server-auth";
import { getCartById, deleteCart } from "@/lib/api/carts";
import { v4 as uuidv4 } from 'uuid';

interface PayPalCaptureRequest {
  orderID: string;
  cartId: string;
  eventId: string;
}

// Capturar pago de PayPal y generar boletos
export async function POST(req: Request) {
  try {
    console.log("💳 POST /api/payments/paypal/capture triggered");
    
    const user = await getAuthFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: PayPalCaptureRequest = await req.json();
    const { orderID, cartId, eventId } = body;

    console.log("📦 Capture request:", { orderID, cartId, eventId, userId: user.uid });

    // Validar datos requeridos
    if (!orderID || !cartId || !eventId) {
      return NextResponse.json({ 
        error: "Missing required fields: orderID, cartId, eventId" 
      }, { status: 400 });
    }

    // 1. Verificar que el carrito existe y es válido
    const cart = await getCartById(cartId);
    if (!cart) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 });
    }

    if (cart.user_id !== user.uid) {
      return NextResponse.json({ error: "Cart does not belong to user" }, { status: 403 });
    }

    if (cart.event_id !== eventId) {
      return NextResponse.json({ error: "Cart event mismatch" }, { status: 400 });
    }

    // Verificar que el carrito no haya expirado
    const now = new Date();
    if (cart.expires_at < now) {
      return NextResponse.json({ error: "Cart has expired" }, { status: 400 });
    }

    // 2. Capturar pago con PayPal
    const paypalResponse = await capturePayPalOrder(orderID);
    
    if (paypalResponse.status !== 'COMPLETED') {
      return NextResponse.json({ 
        error: "Payment not completed", 
        details: paypalResponse 
      }, { status: 400 });
    }

    // 3. Crear orden en Firestore
    const orderData = {
      user_id: user.uid,
      event_id: eventId,
      cart_snapshot: cart,
      status: 'paid',
      payment_provider: 'paypal',
      payment_id: orderID,
      payment_details: paypalResponse,
      total_amount: cart.total_amount,
      currency: cart.currency,
      created_at: new Date(),
      paid_at: new Date(),
    };

    const orderDocRef = await adminDb.collection("orders").add(orderData);
    const orderId = orderDocRef.id;

    console.log("📋 Order created:", orderId);

    // 4. Generar boletos individuales
    const ticketPromises = cart.items.map(async (item) => {
      const ticketsForItem: any[] = [];
      
      for (let i = 0; i < item.quantity; i++) {
        const ticketData = {
          order_id: orderId,
          user_id: user.uid,
          event_id: eventId,
          ticket_type_id: item.ticket_type_id,
          
          // Información del asistente (inicialmente igual al comprador)
          attendee_name: user.name,
          attendee_email: user.email,
          attendee_company: user.company || "",
          
          // Estado del boleto
          status: 'active',
          
          // Códigos únicos
          qr_code: generateUniqueQRCode(),
          pdf_url: "", // Se generará después
          
          // Control de acceso (se determinará según el tipo de boleto)
          access_days: item.selected_days || [],
          used_days: [],
          
          created_at: new Date(),
        };

        const ticketDocRef = await adminDb.collection("tickets").add(ticketData);
        ticketsForItem.push({ id: ticketDocRef.id, ...ticketData });
      }
      
      return ticketsForItem;
    });

    const allTickets = (await Promise.all(ticketPromises)).flat();
    console.log("🎫 Generated tickets:", allTickets.length);

    // 5. Actualizar conteo de boletos vendidos
    for (const item of cart.items) {
      const ticketTypeRef = adminDb.collection("ticket_types").doc(item.ticket_type_id);
      await ticketTypeRef.update({
        sold_count: adminDb.FieldValue.increment(item.quantity)
      });
    }

    // 6. Generar PDFs y enviar por email (proceso asíncrono)
    generateAndSendTickets(orderId, allTickets, eventId, user).catch(error => {
      console.error("⚠️ Error generating PDFs (non-critical):", error);
    });

    // 7. Limpiar carrito
    await deleteCart(cartId);
    console.log("🧹 Cart cleaned up");

    return NextResponse.json({
      success: true,
      orderId,
      ticketCount: allTickets.length,
      totalAmount: cart.total_amount,
      currency: cart.currency,
      message: "Payment processed successfully"
    });

  } catch (error) {
    console.error("❌ Error processing PayPal capture:", error);
    return NextResponse.json({ 
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

// Función para capturar orden de PayPal
async function capturePayPalOrder(orderID: string) {
  const paypalClientId = process.env.PAYPAL_CLIENT_ID;
  const paypalClientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const paypalBaseURL = process.env.NODE_ENV === 'production' 
    ? 'https://api.paypal.com' 
    : 'https://api.sandbox.paypal.com';

  if (!paypalClientId || !paypalClientSecret) {
    throw new Error('PayPal credentials not configured');
  }

  // 1. Obtener token de acceso
  const authResponse = await fetch(`${paypalBaseURL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Accept-Language': 'en_US',
      'Authorization': `Basic ${Buffer.from(`${paypalClientId}:${paypalClientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials'
  });

  if (!authResponse.ok) {
    throw new Error('Failed to get PayPal access token');
  }

  const authData = await authResponse.json();
  const accessToken = authData.access_token;

  // 2. Capturar la orden
  const captureResponse = await fetch(`${paypalBaseURL}/v2/checkout/orders/${orderID}/capture`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'PayPal-Request-Id': `capture-${Date.now()}`,
    },
  });

  if (!captureResponse.ok) {
    const errorData = await captureResponse.json();
    throw new Error(`PayPal capture failed: ${JSON.stringify(errorData)}`);
  }

  return await captureResponse.json();
}

// Generar código QR único
function generateUniqueQRCode(): string {
  return `TICKET_${uuidv4().replace(/-/g, '').toUpperCase()}`;
}

// Generar PDFs y enviar por email (función placeholder)
async function generateAndSendTickets(
  orderId: string, 
  tickets: any[], 
  eventId: string, 
  user: any
) {
  try {
    console.log("📧 Starting ticket generation and email process");
    
    // TODO: Implementar generación de PDFs
    // 1. Obtener información completa del evento
    // 2. Generar PDFs con QR para cada boleto
    // 3. Subir PDFs a Firebase Storage
    // 4. Actualizar URLs en tickets
    // 5. Enviar email con boletos adjuntos
    
    console.log("📧 Tickets generation completed (placeholder)");
  } catch (error) {
    console.error("❌ Error in ticket generation:", error);
    throw error;
  }
}
