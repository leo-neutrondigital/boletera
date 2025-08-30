import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getAuthFromRequest } from "@/lib/auth/server-auth";

// ✅ Forzar modo dinámico para usar request.headers
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function DELETE(req: NextRequest) {
  try {
    console.log("🗑️ DELETE /api/admin/delete-event triggered");
    
    const user = await getAuthFromRequest(req);
    console.log("👤 User from token:", user);
    
    if (!user || !user.roles.includes("admin")) {
      console.warn("⛔ Unauthorized delete attempt", user);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Obtener ID desde query parameters
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      console.error("❌ Missing event ID in query params");
      return NextResponse.json({ error: "Missing event ID" }, { status: 400 });
    }

    console.log("🎯 Starting CASCADE DELETE for event:", id);
    
    // Verificar que el evento existe antes de eliminarlo
    const eventDoc = await adminDb.collection("events").doc(id).get();
    if (!eventDoc.exists) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const eventData = eventDoc.data()!;
    console.log("📋 Event to delete:", { name: eventData.name, published: eventData.published });

    // 🗑️ ELIMINACIÓN EN CASCADA
    const deletionStats = {
      tickets: 0,
      ticket_types: 0,
      preregistrations: 0,
      event: 1
    };

    try {
      // 1. ELIMINAR TODOS LOS TICKETS DEL EVENTO
      console.log("🎫 Deleting tickets for event:", id);
      const ticketsSnapshot = await adminDb
        .collection("tickets")
        .where("event_id", "==", id)
        .get();
      
      console.log(`📊 Found ${ticketsSnapshot.size} tickets to delete`);
      
      if (!ticketsSnapshot.empty) {
        const ticketBatch = adminDb.batch();
        ticketsSnapshot.docs.forEach(doc => {
          ticketBatch.delete(doc.ref);
        });
        await ticketBatch.commit();
        deletionStats.tickets = ticketsSnapshot.size;
        console.log(`✅ Deleted ${ticketsSnapshot.size} tickets`);
      }

      // 2. ELIMINAR TODOS LOS TIPOS DE BOLETOS DEL EVENTO
      console.log("🎟️ Deleting ticket types for event:", id);
      const ticketTypesSnapshot = await adminDb
        .collection("ticket_types")
        .where("event_id", "==", id)
        .get();
      
      console.log(`📊 Found ${ticketTypesSnapshot.size} ticket types to delete`);
      
      if (!ticketTypesSnapshot.empty) {
        const typesBatch = adminDb.batch();
        ticketTypesSnapshot.docs.forEach(doc => {
          typesBatch.delete(doc.ref);
        });
        await typesBatch.commit();
        deletionStats.ticket_types = ticketTypesSnapshot.size;
        console.log(`✅ Deleted ${ticketTypesSnapshot.size} ticket types`);
      }

      // 3. ELIMINAR TODOS LOS PREREGISTROS DEL EVENTO
      console.log("📝 Deleting preregistrations for event:", id);
      const preregistrationsSnapshot = await adminDb
        .collection("preregistrations")
        .where("event_id", "==", id)
        .get();
      
      console.log(`📊 Found ${preregistrationsSnapshot.size} preregistrations to delete`);
      
      if (!preregistrationsSnapshot.empty) {
        const preregBatch = adminDb.batch();
        preregistrationsSnapshot.docs.forEach(doc => {
          preregBatch.delete(doc.ref);
        });
        await preregBatch.commit();
        deletionStats.preregistrations = preregistrationsSnapshot.size;
        console.log(`✅ Deleted ${preregistrationsSnapshot.size} preregistrations`);
      }

      // 4. ELIMINAR EL EVENTO
      console.log("🎪 Deleting main event document:", id);
      await adminDb.collection("events").doc(id).delete();
      console.log("✅ Event deleted successfully");

      // 📊 Log de auditoría completo
      console.log("📊 CASCADE DELETION SUMMARY:", {
        event_id: id,
        event_name: eventData.name,
        deleted_by: user.uid,
        deleted_at: new Date().toISOString(),
        stats: deletionStats
      });

      return NextResponse.json({ 
        success: true, 
        message: `Event and all related data deleted successfully`,
        event_name: eventData.name,
        deletion_stats: deletionStats,
        details: {
          tickets_deleted: deletionStats.tickets,
          ticket_types_deleted: deletionStats.ticket_types,
          preregistrations_deleted: deletionStats.preregistrations,
          total_operations: deletionStats.tickets + deletionStats.ticket_types + deletionStats.preregistrations + 1
        }
      });

    } catch (cascadeError) {
      console.error("❌ Error during cascade deletion:", cascadeError);
      
      // Log de error detallado para debugging
      console.error("❌ CASCADE ERROR DETAILS:", {
        event_id: id,
        event_name: eventData.name,
        error: cascadeError instanceof Error ? cascadeError.message : 'Unknown error',
        partial_stats: deletionStats
      });
      
      return NextResponse.json({ 
        error: "Failed to delete event and related data",
        details: cascadeError instanceof Error ? cascadeError.message : 'Unknown error',
        partial_deletion: deletionStats
      }, { status: 500 });
    }

  } catch (error) {
    console.error("❌ Error in delete event API:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
