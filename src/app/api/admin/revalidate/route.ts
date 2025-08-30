import { NextResponse } from "next/server";
import { revalidatePath } from 'next/cache';
import { getAuthFromRequest } from "@/lib/auth/server-auth";

// ✅ Forzar modo dinámico
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    console.log("🔄 POST /api/admin/revalidate triggered");
    
    const user = await getAuthFromRequest(req);
    console.log("👤 User from token:", user);
    
    if (!user || (!user.roles.includes("admin") && !user.roles.includes("gestor"))) {
      console.warn("⛔ Unauthorized revalidation attempt", user);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { paths } = body;

    if (!paths || !Array.isArray(paths)) {
      return NextResponse.json({ 
        error: "Se requiere un array de paths para revalidar" 
      }, { status: 400 });
    }

    console.log("🔄 Revalidating paths:", paths);

    // Revalidar cada path proporcionado
    const results = [];
    for (const path of paths) {
      try {
        await revalidatePath(path);
        results.push({ path, success: true });
        console.log(`✅ Revalidated: ${path}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({ path, success: false, error: errorMessage });
        console.error(`❌ Failed to revalidate ${path}:`, error);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: "Revalidation completed",
      results
    });
    
  } catch (error) {
    console.error("❌ Error during revalidation:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
