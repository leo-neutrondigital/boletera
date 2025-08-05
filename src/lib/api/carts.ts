import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Cart, CartItem } from "@/types";

const COLLECTION_NAME = "carts";

// ✅ Crear carrito para checkout
export async function createCartForCheckout(data: {
  user_id: string;
  event_id: string;
  items: CartItem[];
  total_amount: number;
  currency: "MXN" | "USD";
}): Promise<string> {
  try {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30); // 30 minutos

    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...data,
      expires_at: Timestamp.fromDate(expiresAt),
      created_at: serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    console.error("Error creating cart:", error);
    throw error;
  }
}

// ✅ Obtener carrito por ID
export async function getCartById(cartId: string): Promise<Cart | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, cartId);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data();
    return {
      id: snapshot.id,
      ...data,
      created_at: data.created_at?.toDate() || new Date(),
      expires_at: data.expires_at?.toDate() || new Date(),
    } as Cart;
  } catch (error) {
    console.error("Error fetching cart:", error);
    throw error;
  }
}

// ✅ Validar que el carrito no haya expirado
export async function isCartValid(cartId: string): Promise<boolean> {
  try {
    const cart = await getCartById(cartId);
    if (!cart) return false;

    const now = new Date();
    return cart.expires_at > now;
  } catch (error) {
    console.error("Error validating cart:", error);
    return false;
  }
}

// ✅ Extender tiempo de expiración del carrito
export async function extendCartExpiration(
  cartId: string,
  additionalMinutes: number = 30
): Promise<void> {
  try {
    const newExpiresAt = new Date();
    newExpiresAt.setMinutes(newExpiresAt.getMinutes() + additionalMinutes);

    const docRef = doc(db, COLLECTION_NAME, cartId);
    await updateDoc(docRef, {
      expires_at: Timestamp.fromDate(newExpiresAt),
    });
  } catch (error) {
    console.error("Error extending cart expiration:", error);
    throw error;
  }
}

// ✅ Eliminar carrito (después del pago o expiración)
export async function deleteCart(cartId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, cartId));
  } catch (error) {
    console.error("Error deleting cart:", error);
    throw error;
  }
}

// ✅ Limpiar carritos expirados (función para cron job)
export async function cleanupExpiredCarts(): Promise<number> {
  try {
    const now = Timestamp.now();
    const q = query(
      collection(db, COLLECTION_NAME),
      where("expires_at", "<", now)
    );

    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map((doc) => deleteDoc(doc.ref));

    await Promise.all(deletePromises);
    return snapshot.docs.length;
  } catch (error) {
    console.error("Error cleaning up expired carts:", error);
    throw error;
  }
}

// ✅ Obtener carritos activos de un usuario
export async function getUserActiveCarts(userId: string): Promise<Cart[]> {
  try {
    const now = Timestamp.now();
    const q = query(
      collection(db, COLLECTION_NAME),
      where("user_id", "==", userId),
      where("expires_at", ">", now),
      orderBy("expires_at", "desc"),
      orderBy("created_at", "desc")
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
          created_at: doc.data().created_at?.toDate() || new Date(),
          expires_at: doc.data().expires_at?.toDate() || new Date(),
        } as Cart)
    );
  } catch (error) {
    console.error("Error fetching user active carts:", error);
    throw error;
  }
}

// ============================================================================
// 🔧 FUNCIONES AUXILIARES PARA SESSIONSTORAGE
// ============================================================================

// Obtener carrito desde sessionStorage
export function getSessionCart(eventId: string): CartItem[] {
  try {
    const stored = sessionStorage.getItem(`cart_${eventId}`);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    return parsed.items || [];
  } catch (error) {
    console.error("Error reading session cart:", error);
    return [];
  }
}

// Guardar carrito en sessionStorage
export function saveSessionCart(eventId: string, items: CartItem[]): void {
  try {
    const cartData = {
      event_id: eventId,
      items,
      last_modified: new Date().toISOString(),
    };

    sessionStorage.setItem(`cart_${eventId}`, JSON.stringify(cartData));
  } catch (error) {
    console.error("Error saving session cart:", error);
  }
}

// Limpiar carrito de sessionStorage
export function clearSessionCart(eventId: string): void {
  try {
    sessionStorage.removeItem(`cart_${eventId}`);
  } catch (error) {
    console.error("Error clearing session cart:", error);
  }
}

// Calcular totales del carrito
export function calculateCartTotals(items: CartItem[]) {
  const totalAmount = items.reduce((sum, item) => sum + item.total_price, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  // Determinar moneda predominante
  const currencies = items.map((item) => item.currency);
  const currencyCounts = currencies.reduce((acc, curr) => {
    acc[curr] = (acc[curr] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  let predominantCurrency: "MXN" | "USD" = "MXN"; // valor por defecto

  const currencyKeys = Object.keys(currencyCounts);
  if (currencyKeys.length > 0) {
    predominantCurrency = currencyKeys.reduce((a, b) =>
      currencyCounts[a] > currencyCounts[b] ? a : b
    ) as "MXN" | "USD";
  }

  return {
    totalAmount,
    totalItems,
    currency: predominantCurrency,
    hasMixedCurrencies: Object.keys(currencyCounts).length > 1,
  };
}

// Validar items del carrito contra stock disponible
export async function validateCartItems(items: CartItem[]): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // TODO: Implementar validación contra stock real de ticket_types
    // Por ahora solo validaciones básicas

    for (const item of items) {
      if (item.quantity <= 0) {
        errors.push(`Cantidad inválida para ${item.ticket_type_name}`);
      }

      if (item.unit_price <= 0) {
        errors.push(`Precio inválido para ${item.ticket_type_name}`);
      }

      if (item.total_price !== item.quantity * item.unit_price) {
        errors.push(`Error de cálculo en ${item.ticket_type_name}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  } catch (error) {
    console.error("Error validating cart items:", error);
    return {
      isValid: false,
      errors: ["Error al validar el carrito"],
      warnings: [],
    };
  }
}
