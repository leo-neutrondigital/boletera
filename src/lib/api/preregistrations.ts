import { 
  collection, 
  doc,
  addDoc,
  getDocs, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Preregistration } from '@/types';

const COLLECTION_NAME = 'preregistrations';

// ✅ Crear prerregistro completo con datos del usuario
export async function createPreregistrationWithUserData(data: {
  user_id: string | null; // 🆕 Permitir preregistros sin usuario
  event_id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  interested_tickets?: {
    ticket_type_id: string;
    ticket_type_name: string;
    quantity: number;
    unit_price: number;
    currency: string;
    total_price: number;
  }[];
  source?: 'landing_page' | 'admin_import';
}): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...data,
      source: data.source || 'landing_page',
      status: 'nuevo',
      email_sent: false,
      created_at: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating preregistration with user data:', error);
    throw error;
  }
}

// ✅ Crear prerregistro (función original mantenida para compatibilidad)
export async function createPreregistration(data: {
  user_id: string | null; // 🆕 Permitir preregistros sin usuario
  event_id: string;
  source?: 'landing_page' | 'admin_import';
}): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...data,
      source: data.source || 'landing_page',
      status: 'nuevo', // 🔄 Cambiado para coincidir con interface
      email_sent: false,
      created_at: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating preregistration:', error);
    throw error;
  }
}

// ✅ Obtener prerregistros por evento
export async function getPreregistrationsByEvent(eventId: string): Promise<any[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('event_id', '==', eventId),
      orderBy('created_at', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().created_at?.toDate() || new Date(),
      converted_at: doc.data().converted_at?.toDate(),
    }));
  } catch (error) {
    console.error('Error fetching preregistrations:', error);
    throw error;
  }
}

// ✅ Obtener prerregistros por usuario (solo para usuarios registrados)
export async function getPreregistrationsByUser(userId: string): Promise<any[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('user_id', '==', userId),
      orderBy('created_at', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().created_at?.toDate() || new Date(),
      converted_at: doc.data().converted_at?.toDate(),
    }));
  } catch (error) {
    console.error('Error fetching user preregistrations:', error);
    throw error;
  }
}

// ✅ Verificar si usuario ya está prerregistrado (solo para usuarios registrados)
export async function isUserPreregistered(userId: string, eventId: string): Promise<boolean> {
  try {
    // Si userId es null, no puede estar prerregistrado como usuario
    if (!userId) return false;
    
    const q = query(
      collection(db, COLLECTION_NAME),
      where('user_id', '==', userId),
      where('event_id', '==', eventId),
      where('status', 'in', ['nuevo', 'contactado', 'interesado']) // 🔄 Estados activos
    );
    
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking preregistration:', error);
    return false;
  }
}

// ✅ Convertir prerregistro a compra (solo para usuarios registrados)
export async function convertPreregistrationToPurchase(userId: string, eventId: string): Promise<void> {
  try {
    // Si userId es null, no hay prerregistros de usuario que convertir
    if (!userId) return;
    
    const q = query(
      collection(db, COLLECTION_NAME),
      where('user_id', '==', userId),
      where('event_id', '==', eventId),
      where('status', 'in', ['nuevo', 'contactado', 'interesado']) // 🔄 Estados activos
    );
    
    const snapshot = await getDocs(q);
    
    // Actualizar todos los prerregistros activos de este usuario para este evento
    const updatePromises = snapshot.docs.map(doc => 
      updateDoc(doc.ref, {
        status: 'convertido', // 🔄 Cambiar a convertido cuando se convierte a compra
        updated_at: serverTimestamp(),
      })
    );
    
    await Promise.all(updatePromises);
  } catch (error) {
    console.error('Error converting preregistration:', error);
    throw error;
  }
}

// ✅ Actualizar estado de un prerregistro
export async function updatePreregistrationStatus(id: string, status: 'nuevo' | 'contactado' | 'interesado' | 'no_interesado' | 'convertido', contactedBy?: string): Promise<void> {
  try {
    const updateData: any = {
      status,
      updated_at: serverTimestamp(),
    };
    
    // Si cambia a contactado, agregar metadata
    if (status === 'contactado' && contactedBy) {
      updateData.contacted_at = serverTimestamp();
      updateData.contacted_by = contactedBy;
    }
    
    await updateDoc(doc(db, COLLECTION_NAME, id), updateData);
  } catch (error) {
    console.error('Error updating preregistration status:', error);
    throw error;
  }
}

// ✅ Eliminar prerregistro
export async function deletePreregistration(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (error) {
    console.error('Error deleting preregistration:', error);
    throw error;
  }
}

// 🆕 Eliminar múltiples prerregistros
export async function deleteMultiplePreregistrations(ids: string[]): Promise<void> {
  try {
    const deletePromises = ids.map(id => deleteDoc(doc(db, COLLECTION_NAME, id)));
    await Promise.all(deletePromises);
  } catch (error) {
    console.error('Error deleting multiple preregistrations:', error);
    throw error;
  }
}

// ✅ Obtener estadísticas de prerregistros por evento
export async function getPreregistrationStats(eventId: string) {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('event_id', '==', eventId)
    );
    
    const snapshot = await getDocs(q);
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
    console.error('Error getting preregistration stats:', error);
    throw error;
  }
}
