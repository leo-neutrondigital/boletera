import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// ✅ Forzar modo dinámico para usar request.json()
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Inicializar Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

interface ConfirmIntentRequest {
  payment_intent_id: string;
  payment_method_id?: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Confirming Stripe Payment Intent...');

    const body: ConfirmIntentRequest = await request.json();
    const { payment_intent_id, payment_method_id } = body;

    // Validaciones
    if (!payment_intent_id) {
      return NextResponse.json({ error: 'Payment Intent ID required' }, { status: 400 });
    }

    // Obtener el Payment Intent
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    // Verificar estado
    if (paymentIntent.status === 'succeeded') {
      console.log('✅ Payment already succeeded:', payment_intent_id);
      return NextResponse.json({
        success: true,
        status: paymentIntent.status,
        payment_intent: paymentIntent,
        message: 'Payment already completed'
      });
    }

    // Si necesita confirmación y tenemos payment_method_id
    if (paymentIntent.status === 'requires_confirmation' && payment_method_id) {
      const confirmedIntent = await stripe.paymentIntents.confirm(payment_intent_id, {
        payment_method: payment_method_id,
      });

      console.log('✅ Payment Intent confirmed:', confirmedIntent.id, 'Status:', confirmedIntent.status);

      return NextResponse.json({
        success: true,
        status: confirmedIntent.status,
        payment_intent: confirmedIntent,
        message: 'Payment confirmed successfully'
      });
    }

    // Retornar estado actual
    return NextResponse.json({
      success: ['succeeded', 'processing'].includes(paymentIntent.status),
      status: paymentIntent.status,
      payment_intent: paymentIntent,
      message: `Payment status: ${paymentIntent.status}`
    });

  } catch (error) {
    console.error('❌ Stripe confirm intent error:', error);
    
    // Manejar errores específicos de Stripe
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { 
          error: 'Stripe error', 
          message: error.message,
          type: error.type,
          code: error.code
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Payment confirmation failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
