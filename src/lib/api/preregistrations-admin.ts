import { adminDb } from '@/lib/firebase/admin';
// import type { Preregistration } from '@/types'; // ← No usado

const COLLECTION_NAME = 'preregistrations';

// ✅ Obtener estadísticas de prerregistros por evento (usando Admin SDK)
export async function getPreregistrationStatsAdmin(eventId: string) {
  try {
    const snapshot = await adminDb
      .collection(COLLECTION_NAME)
      .where('event_id', '==', eventId)
      .get();
    
    const preregistrations = snapshot.docs.map(doc => doc.data());
    
    const nuevo = preregistrations.filter(p => p.status === 'nuevo').length;
    const contactado = preregistrations.filter(p => p.status === 'contactado').length;
    const interesado = preregistrations.filter(p => p.status === 'interesado').length;
    const noInteresado = preregistrations.filter(p => p.status === 'no_interesado').length;
    const archivado = preregistrations.filter(p => p.status === 'convertido').length;
    const total = preregistrations.length;
    const activos = nuevo + contactado + interesado;
    
    return {
      total,
      activos,
      nuevo,
      contactado,
      interesado,
      no_interesado: noInteresado,
      convertido: archivado,
      conversion_rate: total > 0 ? (archivado / total) * 100 : 0,
    };
  } catch (error) {
    console.error('Error getting preregistration stats (Admin SDK):', error);
    throw error;
  }
}

// ✅ Obtener estadísticas globales de prerregistros (usando Admin SDK)
export async function getAllPreregistrationStatsAdmin() {
  try {
    const snapshot = await adminDb
      .collection(COLLECTION_NAME)
      .get();
    
    const preregistrations = snapshot.docs.map(doc => doc.data());
    
    const nuevo = preregistrations.filter(p => p.status === 'nuevo').length;
    const contactado = preregistrations.filter(p => p.status === 'contactado').length;
    const interesado = preregistrations.filter(p => p.status === 'interesado').length;
    const noInteresado = preregistrations.filter(p => p.status === 'no_interesado').length;
    const archivado = preregistrations.filter(p => p.status === 'convertido').length;
    const total = preregistrations.length;
    const activos = nuevo + contactado + interesado;
    
    return {
      total,
      activos,
      nuevo,
      contactado,
      interesado,
      no_interesado: noInteresado,
      convertido: archivado,
      conversion_rate: total > 0 ? (archivado / total) * 100 : 0,
    };
  } catch (error) {
    console.error('Error getting all preregistration stats (Admin SDK):', error);
    throw error;
  }
}
