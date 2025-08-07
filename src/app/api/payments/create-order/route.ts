import { NextRequest, NextResponse } from 'next/server';

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET!;
const PAYPAL_BASE_URL = process.env.PAYPAL_SANDBOX_MODE === 'true' 
  ? 'https://api-m.sandbox.paypal.com' 
  : 'https://api-m.paypal.com';

interface CreateOrderRequest {
  tickets: Array<{
    ticket_type_id: string;
    ticket_type_name: string;
    quantity: number;
    unit_price: number;
    currency: string;
    total_price: number;
  }>;
  customer: {
    name: string;
    email: string;
    phone: string;
    company?: string;
  };
  eventId: string;
  totalAmount: number;
  currency: string;
}

// Obtener access token de PayPal
async function getPayPalAccessToken(): Promise<string> {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  
  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${auth}`,
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.error('PayPal Auth Error:', data);
    throw new Error('Failed to get PayPal access token');
  }

  return data.access_token;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Creating PayPal order...');

    // Parsear body
    const body: CreateOrderRequest = await request.json();
    const { tickets, customer, eventId, totalAmount, currency } = body;

    console.log('📦 Order data:', {
      ticketsCount: tickets.length,
      totalAmount,
      currency,
      customer: customer.email
    });

    // Validaciones básicas
    if (!tickets || tickets.length === 0) {
      return NextResponse.json({ error: 'No tickets provided' }, { status: 400 });
    }

    if (!customer.email || !customer.name) {
      return NextResponse.json({ error: 'Customer data incomplete' }, { status: 400 });
    }

    if (totalAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Obtener access token
    const accessToken = await getPayPalAccessToken();

    // Crear la orden en PayPal
    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: `event_${eventId}_${Date.now()}`,
          description: `Boletos para evento - ${tickets.length} ticket${tickets.length > 1 ? 's' : ''}`,
          amount: {
            currency_code: currency,
            value: totalAmount.toFixed(2),
            breakdown: {
              item_total: {
                currency_code: currency,
                value: totalAmount.toFixed(2)
              }
            }
          },
          items: tickets.map(ticket => ({
            name: ticket.ticket_type_name,
            description: `Boleto para evento`,
            unit_amount: {
              currency_code: ticket.currency,
              value: ticket.unit_price.toFixed(2)
            },
            quantity: ticket.quantity.toString(),
            category: 'DIGITAL_GOODS'
          })),
          payee: {
            email_address: process.env.PAYPAL_MERCHANT_EMAIL || 'merchant@boletera.com'
          }
        }
      ],
      application_context: {
        brand_name: 'Boletera',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/cancel`,
        shipping_preference: 'NO_SHIPPING'
      },
      // Metadata personalizada
      custom_id: JSON.stringify({
        eventId,
        customerEmail: customer.email,
        ticketCount: tickets.length,
        timestamp: Date.now()
      })
    };

    console.log('🔄 Sending order to PayPal...');
    const createOrderResponse = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'PayPal-Request-Id': `order_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      },
      body: JSON.stringify(orderData),
    });

    const orderResult = await createOrderResponse.json();

    if (!createOrderResponse.ok) {
      console.error('❌ PayPal Order Creation Error:', orderResult);
      return NextResponse.json(
        { error: 'Failed to create PayPal order', details: orderResult },
        { status: 500 }
      );
    }

    console.log('✅ PayPal order created:', orderResult.id);

    // Almacenar orden temporal en base de datos para referencia
    // TODO: Guardar en Firestore para tracking

    return NextResponse.json({
      orderID: orderResult.id,
      status: orderResult.status,
      links: orderResult.links
    });

  } catch (error) {
    console.error('❌ Create order error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
