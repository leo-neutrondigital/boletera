// Página temporal para debug de rutas públicas
import { getAllEvents } from '@/lib/api/events';

export default async function EventsDebugPage() {
  const events = await getAllEvents();
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug - Eventos disponibles</h1>
      
      <div className="space-y-4">
        {events.map((event) => (
          <div key={event.id} className="border p-4 rounded">
            <h2 className="font-bold">{event.name}</h2>
            <div className="text-sm text-gray-600 space-y-1">
              <div><strong>ID:</strong> {event.id}</div>
              <div><strong>Slug:</strong> {event.slug || 'NO SLUG'}</div>
              <div><strong>Published:</strong> {event.published ? 'Sí' : 'No'}</div>
              <div><strong>URL esperada:</strong> /events/{event.slug}</div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 p-4 bg-yellow-100 rounded">
        <h3 className="font-bold mb-2">Instrucciones:</h3>
        <p>1. Si ves "NO SLUG", necesitas actualizar el evento desde el dashboard.</p>
        <p>2. Si el slug no es "congreso-5", usa la URL correcta.</p>
        <p>3. Si published es "No", habilita la publicación.</p>
      </div>
    </div>
  );
}
