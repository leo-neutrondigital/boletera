import { HubSpotClient } from './client';
import { PreregistrationData, HubSpotContactData } from './types';

/**
 * Sincronizar preregistro con HubSpot
 * Esta función maneja todo el flujo: buscar contacto existente, crear o actualizar
 */
export async function syncPreregistrationToHubSpot(data: PreregistrationData): Promise<void> {
  // Validar configuración
  if (!HubSpotClient.isConfigured()) {
    console.log('🔧 HubSpot not configured, skipping sync');
    return;
  }

  try {
    console.log('🚀 Starting HubSpot sync for:', data.email);
    
    const client = new HubSpotClient();
    
    // Buscar contacto existente por email
    const existingContact = await client.searchContactByEmail(data.email);
    
    // Mapear datos del preregistro a formato HubSpot
    const hubspotData = mapPreregistrationToHubSpot(data);
    
    if (existingContact) {
      // Actualizar contacto existente
      console.log('📝 Updating existing HubSpot contact:', existingContact.id);
      await client.updateContact(existingContact.id, hubspotData);
      console.log('✅ HubSpot contact updated successfully:', data.email);
    } else {
      // Crear nuevo contacto
      console.log('➕ Creating new HubSpot contact');
      const newContact = await client.createContact(hubspotData);
      console.log('✅ HubSpot contact created successfully:', {
        email: data.email,
        contactId: newContact.id
      });
    }
  } catch (error) {
    // ⚠️ IMPORTANTE: Solo log del error, NO fallar ni reintentar
    console.error('❌ HubSpot sync failed (continuing anyway):', {
      email: data.email,
      eventName: data.eventName,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorDetails: error
    });
    
    // No lanzar el error para que no afecte el flujo principal
  }
}

/**
 * Mapear datos de preregistro al formato requerido por HubSpot
 * Usando solo propiedades estándar para máxima compatibilidad
 */
function mapPreregistrationToHubSpot(data: PreregistrationData): HubSpotContactData {
  // Extraer nombre y apellido
  const nameParts = data.name.trim().split(' ');
  const firstname = nameParts[0] || '';
  const lastname = nameParts.slice(1).join(' ') || '';

  return {
    properties: {
      email: data.email,
      firstname,
      lastname: lastname || undefined,
      phone: data.phone || undefined,
      company: data.company || undefined,
      
      // Solo propiedades estándar de HubSpot
      hs_lead_status: 'NEW',
      lifecyclestage: 'lead'
    }
  };
}

/**
 * Función de utilidad para validar datos antes de enviar
 */
export function validatePreregistrationData(data: Partial<PreregistrationData>): data is PreregistrationData {
  return !!(
    data.email &&
    data.name &&
    data.eventName &&
    data.eventId &&
    // Validar formato de email básico
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)
  );
}

// Re-exportar tipos para fácil acceso
export type { 
  PreregistrationData, 
  HubSpotContactData, 
  HubSpotResponse 
} from './types';

// Re-exportar cliente para uso avanzado si es necesario
export { HubSpotClient } from './client';
