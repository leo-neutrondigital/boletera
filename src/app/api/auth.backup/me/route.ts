// src/app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/auth/server-auth";

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    console.log("👤 GET /api/auth/me");
    
    const user = await getAuthFromRequest(req);
    
    if (!user) {
      console.log("❌ No authenticated user");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Retornar datos del usuario sin información sensible
    const userData = {
      uid: user.uid,
      email: user.email,
      name: user.name,
      roles: user.roles,
    };

    console.log("✅ User data retrieved:", userData);
    return NextResponse.json(userData);
    
  } catch (error) {
    console.error("❌ Error fetching user data:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
