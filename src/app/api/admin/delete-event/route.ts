import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getAuthFromRequest } from "@/lib/auth/server-auth";

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

    console.log("🎯 Deleting event with ID:", id);
    
    // Verificar que el evento existe antes de eliminarlo
    const eventDoc = await adminDb.collection("events").doc(id).get();
    if (!eventDoc.exists) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    await adminDb.collection("events").doc(id).delete();
    console.log("✅ Event deleted successfully");

    return NextResponse.json({ success: true, message: "Event deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting event:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
