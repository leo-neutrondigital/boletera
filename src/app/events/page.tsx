import { getUpcomingPublicEvents } from '@/lib/api/public-events';
import { EventsPageClient } from './events-page-client';

export const metadata = {
  title: 'Eventos Disponibles | Boletera',
  description: 'Descubre todos los eventos disponibles y compra tus boletos fácilmente.',
};

export default async function EventsPage() {
  let events = [];
  let error = null;

  try {
    // Obtener eventos públicos (límite mayor para la página principal)
    events = await getUpcomingPublicEvents(50);
  } catch (err) {
    console.error('Error loading events for public page:', err);
    error = 'Error al cargar eventos. Inténtalo más tarde.';
  }

  return <EventsPageClient initialEvents={events} error={error} />;
}
