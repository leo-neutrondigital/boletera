import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getPublicEventBySlug } from '@/lib/api/events';
import { EventLandingClient } from './event-landing-client';

interface EventPageProps {
  params: {
    slug: string;
  };
}

// Generar metadata dinámicamente
export async function generateMetadata(
  { params }: EventPageProps
): Promise<Metadata> {
  const event = await getPublicEventBySlug(params.slug);

  if (!event) {
    return {
      title: 'Evento no encontrado',
    };
  }

  return {
    title: `${event.name} | Boletos`,
    description: event.public_description || event.description || `Compra boletos para ${event.name}`,
    openGraph: {
      title: event.name,
      description: event.public_description || event.description || '',
      images: event.featured_image_url ? [event.featured_image_url] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: event.name,
      description: event.public_description || event.description || '',
      images: event.featured_image_url ? [event.featured_image_url] : [],
    },
  };
}

export default async function EventPage({ params }: EventPageProps) {
  const event = await getPublicEventBySlug(params.slug);

  if (!event) {
    notFound();
  }

  // Verificar que el evento esté disponible para compra
  const now = new Date();
  const isEventExpired = event.end_date < now;
  const isEventNotPublished = !event.published;

  if (isEventExpired || isEventNotPublished) {
    notFound();
  }

  return <EventLandingClient event={event} />;
}

// Opcional: Pre-generar páginas estáticas para eventos populares
export async function generateStaticParams() {
  // En producción, podrías pre-generar los eventos más populares
  // Por ahora, dejamos que se generen dinámicamente
  return [];
}
