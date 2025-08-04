//src/lib/api/events.ts
import { adminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import type { Event } from "@/types"

export type EventData = {
  name: string;
  start_date: Date;
  end_date: Date;
  location: string;
  description?: string;
  internal_notes?: string;
  published: boolean;
};

export async function getAllEvents(): Promise<Event[]> {
  const snapshot = await adminDb.collection("events").orderBy("start_date", "desc").get();
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      start_date: data.start_date?.toDate?.() ?? new Date(data.start_date),
      end_date: data.end_date?.toDate?.() ?? new Date(data.end_date),
      location: data.location,
      description: data.description,
      internal_notes: data.internal_notes,
      published: data.published,
      created_at: data.created_at?.toDate?.() ?? new Date(data.created_at),
      updated_at: data.updated_at?.toDate?.() ?? new Date(data.updated_at),
    };
  });
}

export async function createEvent(data: EventData) {
  const newDoc = await adminDb.collection("events").add({
    ...data,
    start_date: Timestamp.fromDate(new Date(data.start_date)),
    end_date: Timestamp.fromDate(new Date(data.end_date)),
    created_at: Timestamp.now(),
  });
  return newDoc.id;
}

export async function updateEvent(id: string, data: Partial<EventData>) {
  const updateData: any = { ...data };
  
  // Convertir fechas si están presentes
  if (data.start_date) {
    updateData.start_date = Timestamp.fromDate(new Date(data.start_date));
  }
  if (data.end_date) {
    updateData.end_date = Timestamp.fromDate(new Date(data.end_date));
  }
  
  updateData.updated_at = Timestamp.now();
  
  await adminDb.collection("events").doc(id).update(updateData);
}
