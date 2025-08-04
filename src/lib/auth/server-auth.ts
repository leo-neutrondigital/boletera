// src/lib/auth/server-auth.ts
import { NextRequest } from "next/server";

import { adminAuth, adminDb } from "@/lib/firebase/admin";

type AppUser = {
  name: string;
  roles: ("admin" | "gestor" | "comprobador" | "usuario")[];
  email?: string;
};

export async function getAuthFromRequest(req: NextRequest | Request): Promise<(AppUser & { uid: string }) | null> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split("Bearer ")[1];
  
  // 🔐 Log de seguridad
  const clientIP = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";
  
  console.log("🔐 Auth attempt:", {
    hasToken: !!token,
    ip: clientIP,
    userAgent: userAgent.substring(0, 100) + "...",
    url: req.url
  });

  if (!token) {
    console.warn("❌ No authorization token provided");
    return null;
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    console.log("✅ Token verified for user:", decoded.uid);
    
    const userDoc = await adminDb.doc(`users/${decoded.uid}`).get();
    
    if (!userDoc.exists) {
      console.warn("⚠️ Valid token but user not found in database:", decoded.uid);
      return null;
    }

    const userData = userDoc.data() as AppUser;
    
    // 🔐 Log de acceso exitoso
    console.log("✅ User authenticated:", {
      uid: decoded.uid,
      email: decoded.email,
      roles: userData.roles,
      ip: clientIP
    });

    return {
      uid: decoded.uid,
      email: decoded.email,
      ...userData,
    };
  } catch (err) {
    // 🔐 Log de intento de acceso fallido
    console.error("❌ Authentication failed:", {
      error: err instanceof Error ? err.message : "Unknown error",
      ip: clientIP,
      userAgent: userAgent.substring(0, 50) + "...",
      tokenPreview: token ? token.substring(0, 20) + "..." : "none"
    });
    return null;
  }
}

/**
 * Verifica que el usuario tenga al menos uno de los roles requeridos
 */
export function requireRoles(userRoles: string[], requiredRoles: string[]): boolean {
  if (!userRoles || userRoles.length === 0) {
    console.warn("⚠️ User has no roles assigned");
    return false;
  }

  const hasRequiredRole = userRoles.some(role => requiredRoles.includes(role));
  
  if (!hasRequiredRole) {
    console.warn("⛔ Access denied:", {
      userRoles,
      requiredRoles,
      hasAccess: false
    });
  }

  return hasRequiredRole;
}

/**
 * Middleware de autenticación y autorización para APIs
 */
export async function withAuth(
  req: Request,
  requiredRoles: string[] = [],
  handler: (user: AppUser & { uid: string }) => Promise<Response>
): Promise<Response> {
  try {
    const user = await getAuthFromRequest(req);
    
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized - No valid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (requiredRoles.length > 0 && !requireRoles(user.roles, requiredRoles)) {
      return new Response(JSON.stringify({ 
        error: "Forbidden - Insufficient permissions",
        required: requiredRoles,
        current: user.roles
      }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    return await handler(user);
  } catch (error) {
    console.error("❌ Auth middleware error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
