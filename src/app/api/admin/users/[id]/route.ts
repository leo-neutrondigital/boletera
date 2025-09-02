// src/app/api/admin/users/[id]/route.ts
import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { getAuthFromRequest } from "@/lib/auth/server-auth";

// ✅ Forzar modo dinámico para usar request.headers
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`🔄 PUT /api/admin/users/${params.id}`);
    
    const user = await getAuthFromRequest(req);
    if (!user || !user.roles.includes("admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    console.log("📦 Update request body:", body);

    // Verificar que el usuario existe
    const userDoc = await adminDb.collection("users").doc(id).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data();
    const userUid = userData?.uid;

    // No permitir que un admin se quite a sí mismo el rol de admin
    if (userUid === user.uid && body.roles && !body.roles.includes('admin')) {
      return NextResponse.json({ 
        error: "No puedes quitarte el rol de administrador a ti mismo" 
      }, { status: 400 });
    }

    // Validar roles si se proporcionan
    if (body.roles) {
      const validRoles = ['admin', 'gestor', 'comprobador', 'usuario'];
  if (!Array.isArray(body.roles) || !body.roles.every((role: string) => validRoles.includes(role))) {
        return NextResponse.json({ 
          error: `Roles inválidos. Debe ser uno de: ${validRoles.join(', ')}` 
        }, { status: 400 });
      }
    }

    // Validar teléfono si se proporciona
    if (body.phone && !/^[\+]?[1-9][\d]{0,15}$/.test(body.phone.replace(/\s/g, ''))) {
      return NextResponse.json({ 
        error: "Número de teléfono inválido" 
      }, { status: 400 });
    }

    // Preparar datos de actualización
    const updateData: any = {};
    
    if (body.name) updateData.name = body.name.trim();
    if (body.roles) updateData.roles = body.roles;
    if (body.phone !== undefined) updateData.phone = body.phone || "";
    if (body.company !== undefined) updateData.company = body.company || "";
    if (body.address) updateData.address = body.address;
    if (body.marketing_consent !== undefined) updateData.marketing_consent = body.marketing_consent;
    
    updateData.updated_at = new Date();

    // Actualizar en Firestore
    console.log("📝 Updating user with payload:", updateData);
    await adminDb.collection("users").doc(id).update(updateData);

    // Actualizar displayName en Firebase Auth si cambió el nombre
    if (body.name && userUid) {
      try {
        await adminAuth.updateUser(userUid, {
          displayName: body.name.trim()
        });
        console.log("✅ Updated displayName in Firebase Auth");
      } catch (authError) {
        console.warn("⚠️ Could not update displayName in Firebase Auth:", authError);
        // No fallar por esto, solo loguear
      }
    }

    console.log("✅ User updated successfully");

    return NextResponse.json({ 
      success: true, 
      message: "User updated successfully" 
    });

  } catch (error) {
    console.error("❌ Error updating user:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`🗑️ DELETE /api/admin/users/${params.id}`);
    
    const user = await getAuthFromRequest(req);
    if (!user || !user.roles.includes("admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    // Verificar que el usuario exists
    const userDoc = await adminDb.collection("users").doc(id).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data();
    const userUid = userData?.uid;

    // No permitir que un admin se elimine a sí mismo
    if (userUid === user.uid) {
      return NextResponse.json({ 
        error: "No puedes eliminarte a ti mismo" 
      }, { status: 400 });
    }

    // Obtener todos los boletos del usuario para borrado en cascada
    const ticketsSnapshot = await adminDb
      .collection("tickets")
      .where("user_id", "==", id)
      .get();

    // Contar boletos por tipo para actualizar sold_count
    const ticketTypeCounts = new Map<string, number>();
    
    ticketsSnapshot.forEach(doc => {
      const ticket = doc.data();
      const typeId = ticket.ticket_type_id;
      ticketTypeCounts.set(typeId, (ticketTypeCounts.get(typeId) || 0) + 1);
    });

    console.log(`🎫 Found ${ticketsSnapshot.size} tickets to delete for user ${id}`);
    console.log("📊 Ticket counts by type:", Object.fromEntries(ticketTypeCounts));

    // Eliminar de Firebase Auth
    if (userUid) {
      try {
        await adminAuth.deleteUser(userUid);
        console.log("✅ Deleted user from Firebase Auth");
      } catch (authError) {
        console.error("❌ Error deleting from Firebase Auth:", authError);
        return NextResponse.json({ 
          error: "Error al eliminar usuario de autenticación" 
        }, { status: 500 });
      }
    }

    // Borrar boletos en cascada y actualizar sold_count
    const batch = adminDb.batch();
    
    // 1. Eliminar todos los boletos del usuario
    ticketsSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // 2. Actualizar sold_count en cada tipo de boleto afectado
    for (const [ticketTypeId, count] of ticketTypeCounts) {
      const ticketTypeRef = adminDb.collection("ticket_types").doc(ticketTypeId);
      batch.update(ticketTypeRef, {
        sold_count: FieldValue.increment(-count)
      });
    }
    
    // 3. Eliminar el usuario de Firestore
    const userRef = adminDb.collection("users").doc(id);
    batch.delete(userRef);
    
    // Ejecutar todas las operaciones como transacción
    await batch.commit();
    
    console.log("✅ Deleted user and all associated tickets with sold_count update");

    return NextResponse.json({ 
      success: true, 
      message: "User deleted successfully" 
    });

  } catch (error) {
    console.error("❌ Error deleting user:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
