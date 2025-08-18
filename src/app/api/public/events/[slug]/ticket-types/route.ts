import { NextRequest, NextResponse } from 'next/server';
import { getPublicEventBySlug } from '@/lib/api/events';
import { adminDb } from '@/lib/firebase/admin';
import type { TicketType } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 }
      );
    }

    // Verificar que el evento existe y es público
    const event = await getPublicEventBySlug(slug);

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Obtener tipos de boletos públicos
    const ticketTypesSnapshot = await adminDb
      .collection('ticket_types')
      .where('event_id', '==', event.id)
      .where('is_active', '==', true)
      .where('is_courtesy', '==', false) // Excluir cortesías
      .get();

    const ticketTypes: TicketType[] = ticketTypesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        event_id: data.event_id,
        name: data.name,
        description: data.description || '',
        price: data.price || 0,
        currency: data.currency || 'MXN',
        access_type: data.access_type || 'all_days',
        available_days: data.available_days?.map((d: any) => d.toDate()) || [],
        limit_per_user: data.limit_per_user,
        total_stock: data.total_stock,
        sold_count: data.sold_count || 0,
        is_active: data.is_active || false,
        sale_start: data.sale_start?.toDate(),
        sale_end: data.sale_end?.toDate(),
        is_courtesy: data.is_courtesy || false,
        sort_order: data.sort_order || 0,
        created_at: data.created_at?.toDate() || new Date(),
        updated_at: data.updated_at?.toDate(),
        // Campos públicos
        public_description: data.public_description || '',
        features: data.features || [],
        terms: data.terms || '',
      };
    });

    // Ordenar por sort_order y luego por precio
    const sortedTicketTypes = ticketTypes.sort((a, b) => {
      if (a.sort_order !== b.sort_order) {
        return (a.sort_order || 999) - (b.sort_order || 999);
      }
      return a.price - b.price;
    });

    console.log(`✅ Found ${sortedTicketTypes.length} public ticket types for event: ${event.name}`);

    return NextResponse.json({
      success: true,
      ticketTypes: sortedTicketTypes,
      event: {
        id: event.id,
        name: event.name,
        slug: event.slug
      }
    });

  } catch (error) {
    console.error('Error fetching public ticket types:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
