import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Preregistration } from '@/types';

const COLLECTION_NAME = 'preregistrations';

// ✅ Crear prerregistro
export async function createPreregistration(data: {
  user_id: string;
  event_id: string;
  source?: 'landing_page' | 'admin_import';
}): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...data,
      source: data.source || 'landing_page',
      status: 'active',
      created_at: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating preregistration:', error);
    throw error;
  }
}

// ✅ Obtener prerregistros por evento
export async function getPreregistrationsByEvent(eventId: string): Promise<Preregistration[]> {
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
    } as Preregistration));
  } catch (error) {
    console.error('Error fetching preregistrations:', error);
    throw error;
  }
}

// ✅ Obtener prerregistros por usuario
export async function getPreregistrationsByUser(userId: string): Promise<Preregistration[]> {
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
    } as Preregistration));
  } catch (error) {
    console.error('Error fetching user preregistrations:', error);
    throw error;
  }
}

// ✅ Verificar si usuario ya está prerregistrado
export async function isUserPreregistered(userId: string, eventId: string): Promise<boolean> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('user_id', '==', userId),
      where('event_id', '==', eventId),
      where('status', '==', 'active')
    );
    
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking preregistration:', error);
    return false;
  }
}

// ✅ Convertir prerregistro a compra
export async function convertPreregistrationToPurchase(userId: string, eventId: string): Promise<void> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('user_id', '==', userId),
      where('event_id', '==', eventId),
      where('status', '==', 'active')
    );
    
    const snapshot = await getDocs(q);
    
    // Actualizar todos los prerregistros activos de este usuario para este evento
    const updatePromises = snapshot.docs.map(doc => 
      updateDoc(doc.ref, {
        status: 'converted_to_purchase',
        converted_at: serverTimestamp(),
      })
    );
    
    await Promise.all(updatePromises);
  } catch (error) {
    console.error('Error converting preregistration:', error);
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

// ✅ Obtener estadísticas de prerregistros por evento
export async function getPreregistrationStats(eventId: string) {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('event_id', '==', eventId)
    );
    
    const snapshot = await getDocs(q);
    const preregistrations = snapshot.docs.map(doc => doc.data());
    
    const active = preregistrations.filter(p => p.status === 'active').length;
    const converted = preregistrations.filter(p => p.status === 'converted_to_purchase').length;
    const total = preregistrations.length;
    
    return {
      total,
      active,
      converted,
      conversion_rate: total > 0 ? (converted / total) * 100 : 0,
    };
  } catch (error) {
    console.error('Error getting preregistration stats:', error);
    throw error;
  }
}
