import { adminDb } from '@/lib/firebase/admin';
import type { Event } from '@/types';

const COLLECTION_NAME = 'events';

// ✅ Obtener todos los eventos (usando Admin SDK)
export async function getAllEventsAdmin(): Promise<Event[]> {
  try {
    const snapshot = await adminDb
      .collection(COLLECTION_NAME)
      .orderBy('created_at', 'desc')
      .get();
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        start_date: data.start_date?.toDate() || new Date(),
        end_date: data.end_date?.toDate() || new Date(),
        created_at: data.created_at?.toDate() || new Date(),
        updated_at: data.updated_at?.toDate(),
      } as Event;
    });
  } catch (error) {
    console.error('Error fetching all events (Admin SDK):', error);
    throw error;
  }
}

// ✅ Obtener evento por ID (usando Admin SDK)
export async function getEventByIdAdmin(eventId: string): Promise<Event | null> {
  try {
    const doc = await adminDb.collection(COLLECTION_NAME).doc(eventId).get();
    
    if (!doc.exists) {
      return null;
    }
    
    const data = doc.data()!;
    return {
      id: doc.id,
      ...data,
      start_date: data.start_date?.toDate() || new Date(),
      end_date: data.end_date?.toDate() || new Date(),
      created_at: data.created_at?.toDate() || new Date(),
      updated_at: data.updated_at?.toDate(),
    } as Event;
  } catch (error) {
    console.error('Error fetching event by ID (Admin SDK):', error);
    throw error;
  }
}

// ✅ Obtener eventos publicados (usando Admin SDK)
export async function getPublishedEventsAdmin(): Promise<Event[]> {
  try {
    const snapshot = await adminDb
      .collection(COLLECTION_NAME)
      .where('published', '==', true)
      .orderBy('start_date', 'asc')
      .get();
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        start_date: data.start_date?.toDate() || new Date(),
        end_date: data.end_date?.toDate() || new Date(),
        created_at: data.created_at?.toDate() || new Date(),
        updated_at: data.updated_at?.toDate(),
      } as Event;
    });
  } catch (error) {
    console.error('Error fetching published events (Admin SDK):', error);
    throw error;
  }
}
