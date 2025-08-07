// Página de prueba simple para verificar que la ruta funciona
import { getPublicEventBySlug } from '@/lib/api/events';

interface TestPageProps {
  params: {
    slug: string;
  };
}

export default async function TestEventPage({ params }: TestPageProps) {
  console.log('🔍 TestEventPage - params:', params);
  
  try {
    const event = await getPublicEventBySlug(params.slug);
    console.log('✅ Event found:', event ? event.name : 'null');
    
    if (!event) {
      return (
        <div className="p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-4">❌ Evento no encontrado</h1>
          <div className="space-y-2 text-sm">
            <p><strong>Slug buscado:</strong> {params.slug}</p>
            <p><strong>Función:</strong> getPublicEventBySlug</p>
            <p><strong>Resultado:</strong> null</p>
          </div>
          <div className="mt-4">
            <a href="/events/debug" className="text-blue-600 underline">
              Ver eventos disponibles
            </a>
          </div>
        </div>
      );
    }

    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-green-600 mb-4">✅ Evento encontrado</h1>
        <div className="space-y-2 text-sm">
          <p><strong>Nombre:</strong> {event.name}</p>
          <p><strong>Slug:</strong> {event.slug}</p>
          <p><strong>ID:</strong> {event.id}</p>
          <p><strong>Publicado:</strong> {event.published ? 'Sí' : 'No'}</p>
          <p><strong>Fecha:</strong> {event.start_date.toLocaleDateString()}</p>
        </div>
        <div className="mt-4">
          <p className="text-green-600">🎉 La ruta funciona correctamente!</p>
          <p className="text-sm text-gray-600">Ahora puedes usar /events/{params.slug} normalmente</p>
        </div>
      </div>
    );
    
  } catch (error) {
    console.error('❌ Error in TestEventPage:', error);
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-red-600 mb-4">❌ Error del servidor</h1>
        <div className="space-y-2 text-sm">
          <p><strong>Error:</strong> {error instanceof Error ? error.message : 'Unknown error'}</p>
          <p><strong>Slug:</strong> {params.slug}</p>
        </div>
      </div>
    );
  }
}
