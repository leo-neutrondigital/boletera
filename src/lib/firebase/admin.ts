// lib/firebase/admin.ts
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Validar que las credenciales están disponibles
if (!process.env.FIREBASE_ADMIN_CREDENTIALS_BASE64) {
  console.warn('⚠️ FIREBASE_ADMIN_CREDENTIALS_BASE64 not found');
  throw new Error('Firebase Admin credentials not configured');
}

const serviceAccount = JSON.parse(
  Buffer.from(process.env.FIREBASE_ADMIN_CREDENTIALS_BASE64!, "base64").toString("utf8")
);

// Validar que el project ID está disponible
if (!serviceAccount.project_id) {
  console.warn('⚠️ Project ID not found in service account');
  throw new Error('Firebase project ID not configured');
}

if (getApps().length === 0) {
  console.log(`🔥 Initializing Firebase Admin for project: ${serviceAccount.project_id}`);
  initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id, // Explicit project ID
  });
}

const adminAuth = getAuth();
const adminDb = getFirestore();

export { adminAuth, adminDb };
