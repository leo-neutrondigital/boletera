import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// ✅ Forzar modo dinámico para usar request.json()
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Inicializar Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

interface CreateIntentRequest {
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
    createAccount?: boolean;
    password?: string;
    userId?: string;
  };
  eventId: string;
  totalAmount: number;
  currency: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Creating Stripe Payment Intent...');

    const body: CreateIntentRequest = await request.json();
    const { tickets, customer, eventId, totalAmount, currency } = body;

    // Validaciones
    if (!tickets || tickets.length === 0) {
      return NextResponse.json({ error: 'No tickets provided' }, { status: 400 });
    }

    if (!customer.email || !customer.name) {
      return NextResponse.json({ error: 'Customer data incomplete' }, { status: 400 });
    }

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
    }

    if (totalAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Calcular cantidad en centavos (Stripe requiere centavos)
    const amountInCents = Math.round(totalAmount * 100);

    // Crear descripción del pago
    const ticketsSummary = tickets.map(t => `${t.quantity}x ${t.ticket_type_name}`).join(', ');
    const description = `Boletos: ${ticketsSummary}`;

    // Crear Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency.toLowerCase(),
      description,
      receipt_email: customer.email,
      metadata: {
        eventId,
        customerEmail: customer.email,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerCompany: customer.company || '',
        customerCreateAccount: customer.createAccount ? 'true' : 'false',
        customerUserId: customer.userId || '',
        ticketsCount: tickets.reduce((sum, t) => sum + t.quantity, 0).toString(),
        ticketsData: JSON.stringify(tickets.map(t => ({
          type_id: t.ticket_type_id,
          type_name: t.ticket_type_name,
          quantity: t.quantity,
          price: t.unit_price
        })))
      },
      automatic_payment_methods: {
        enabled: true,
      },
      // Configurar para captura automática
      capture_method: 'automatic',
    });

    console.log('✅ Stripe Payment Intent created:', paymentIntent.id);

    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount: totalAmount,
      currency: currency.toUpperCase(),
      description,
    });

  } catch (error) {
    console.error('❌ Stripe create intent error:', error);
    
    // Manejar errores específicos de Stripe
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { 
          error: 'Stripe error', 
          message: error.message,
          type: error.type 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Payment intent creation failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
