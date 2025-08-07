import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getPublicEventBySlug } from '@/lib/api/events';
import { EventLandingClient } from './event-landing-client';
import { EventStatusPage } from './components/EventStatusPage';

interface EventPageProps {
  params: {
    slug: string;
  };
}

// Calcular estado del evento
function getEventStatus(event: any) {
  const now = new Date();
  const isExpired = event.end_date < now;
  const isStarted = event.start_date <= now;
  const isNotPublished = !event.published;
  
  if (isNotPublished) return 'not_published';
  if (isExpired) return 'expired';
  if (isStarted) return 'in_progress';
  return 'upcoming';
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

  const eventStatus = getEventStatus(event);
  
  console.log('📅 Event status check:', {
    name: event.name,
    status: eventStatus,
    start: event.start_date,
    end: event.end_date,
    now: new Date(),
    published: event.published
  });

  // Solo permitir compras para eventos próximos
  if (eventStatus === 'upcoming') {
    return <EventLandingClient event={event} />;
  }

  // Para otros estados, mostrar página informativa
  return <EventStatusPage event={event} status={eventStatus} />;
}

export async function generateStaticParams() {
  return [];
}
