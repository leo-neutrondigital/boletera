import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, requireRoles } from '@/lib/auth/server-auth';
import { PreregistroEmailService } from '@/lib/email/preregistro-email-service';
import { adminDb } from '@/lib/firebase/admin';

interface CreatePreregistrationRequest {
  event_id: string;
  customer_data: {
    name: string;
    email: string;
    phone: string;
    company?: string;
    user_id?: string; // Para usuarios loggeados
  };
  interested_tickets: Array<{
    ticket_type_id: string;
    ticket_type_name: string;
    quantity: number;
    unit_price: number;
    currency: string;
    total_price: number;
  }>;
}

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  console.log('🎆 API CALL START:', requestId, 'at', Date.now());
  
  try {
    console.log('🎯 Creating preregistration via API...');

    const body: CreatePreregistrationRequest = await request.json();
    const { event_id, customer_data, interested_tickets } = body;

    console.log('📦 Preregistration data:', {
      requestId, // 🐛 ID de esta request
      eventId: event_id,
      customerEmail: customer_data.email,
      customerName: customer_data.name,
      ticketsCount: interested_tickets.length,
      isLoggedUser: !!customer_data.user_id,
      hasSpecificTickets: interested_tickets.length > 0,
      timestamp: Date.now()
    });

    // Validaciones
    if (!event_id) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
    }

    if (!customer_data.name || !customer_data.email) {
      return NextResponse.json({ error: 'Customer name and email required' }, { status: 400 });
    }

    if (!interested_tickets) {
      return NextResponse.json({ error: 'Interested tickets array required (can be empty)' }, { status: 400 });
    }
    
    // 📝 Para preregistros, el array puede estar vacío (interés general)

    // Obtener datos del evento
    console.log('📚 Fetching event data...');
    const eventDoc = await adminDb.collection('events').doc(event_id).get();
    if (!eventDoc.exists) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const eventData = eventDoc.data()!;
    const eventStartDate = eventData.start_date.toDate();
    const eventEndDate = eventData.end_date.toDate();

    // Crear preregistro en la base de datos usando adminDb
    console.log('💾 Creating preregistration record...');
    const preregistrationRef = adminDb.collection('preregistrations').doc();
    await preregistrationRef.set({
      user_id: customer_data.user_id || null,
      event_id,
      name: customer_data.name,
      email: customer_data.email,
      phone: customer_data.phone,
      company: customer_data.company,
      interested_tickets: interested_tickets || [],
      source: 'landing_page',
      status: 'nuevo',
      email_sent: false,
      created_at: new Date(),
    });
    
    const preregistrationId = preregistrationRef.id;

    console.log('✅ Preregistration created with ID:', preregistrationId, 'for request:', requestId);

    // 📧 Enviar email de marketing usando el servicio existente
    try {
      console.log('📧 Sending preregistration marketing email...');
      
      // Usar el slug del evento o generar uno simple como fallback
      const eventSlug = eventData.slug || event_id;
      
      const emailService = new PreregistroEmailService();
      await emailService.sendPreregistroMarketingEmail({
        customer_name: customer_data.name,
        customer_email: customer_data.email,
        event_name: eventData.name,
        event_start_date: eventStartDate,
        event_end_date: eventEndDate,
        event_location: eventData.location,
        event_description: eventData.description,
        interested_tickets: interested_tickets.map(ticket => ({
          ticket_type_name: ticket.ticket_type_name,
          quantity: ticket.quantity,
          unit_price: ticket.unit_price,
          currency: ticket.currency
        })), // 📝 Puede ser array vacío - el template lo maneja
        app_url: process.env.NEXT_PUBLIC_APP_URL!,
        event_slug: eventSlug
      });

      console.log('✅ Marketing email sent successfully');

      // Marcar email como enviado en el preregistro
      await adminDb.collection('preregistrations').doc(preregistrationId).update({
        email_sent: true,
        email_sent_at: new Date()
      });

    } catch (emailError) {
      console.error('❌ Error sending marketing email:', emailError);
      // No fallar todo el proceso si falla el email
    }

    // Respuesta exitosa
    return NextResponse.json({
      success: true,
      preregistration_id: preregistrationId,
      message: 'Preregistration created successfully',
      details: {
        event_name: eventData.name,
        customer_email: customer_data.email,
        interested_tickets_count: interested_tickets.length,
        email_sent: true
      }
    });

  } catch (error) {
    console.error('❌ Create preregistration error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create preregistration', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET para obtener preregistrations (opcional, para el futuro)
export async function GET(request: NextRequest) {
  try {
    // Validar autenticación para lectura de preregistros
    const user = await getAuthFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!requireRoles(user.roles, ['admin', 'gestor', 'comprobador'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Obtener parámetros de query
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('event_id');

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
    }

    // Usar función existente de la API
    const { getPreregistrationsByEvent } = await import('@/lib/api/preregistrations');
    const preregistrations = await getPreregistrationsByEvent(eventId);

    return NextResponse.json({
      success: true,
      preregistrations,
      count: preregistrations.length
    });

  } catch (error) {
    console.error('❌ Get preregistrations error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get preregistrations', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
