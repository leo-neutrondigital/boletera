import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp, getApps } from "firebase-admin/app";
import { NextRequest, NextResponse } from "next/server";

// ✅ Forzar modo dinámico para usar request.headers
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

if (getApps().length === 0) {
  initializeApp();
}

const auth = getAuth();
const db = getFirestore();

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { uid } = body;

    if (!uid) {
      return NextResponse.json({ error: "UID is required." }, { status: 400 });
    }

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split("Bearer ")[1];

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decodedToken = await auth.verifyIdToken(token);
    const requesterUid = decodedToken.uid;

    const requesterDoc = await db.collection("users").doc(requesterUid).get();
    const requesterData = requesterDoc.data();

    if (!requesterDoc.exists || requesterData?.roles?.includes("admin") !== true) {
      return NextResponse.json({ error: "Unauthorized - Admins only." }, { status: 403 });
    }

    // Eliminar del Auth
    await auth.deleteUser(uid);

    // Eliminar de Firestore
    await db.collection("users").doc(uid).delete();

    return NextResponse.json({ message: "User deleted successfully." }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error deleting user:", error.message);
    } else {
      console.error("Error deleting user:", error);
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}