// src/components/auth/RoleGuard.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase/client"; // ✅ Usar client db
import { doc, getDoc } from "firebase/firestore";
import { User } from "firebase/auth";
import { AlertCircle, Loader2, ShieldAlert } from "lucide-react";

type UserRole = "admin" | "gestor" | "comprobador" | "usuario";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallback?: React.ReactNode;
  redirectTo?: string;
}

interface UserData {
  roles: UserRole[];
  name: string;
  email: string;
}

export function RoleGuard({ 
  children, 
  allowedRoles, 
  fallback,
  redirectTo = "/dashboard" 
}: RoleGuardProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
      console.log("🔐 RoleGuard: Auth state changed", authUser?.uid);
      
      if (!authUser) {
        console.log("❌ No authenticated user, redirecting to login");
        router.push("/login");
        return;
      }

      setUser(authUser);

      try {
        // 🔧 OPTIMIZACIÓN: Usar Firestore client-side directamente
        const userDocRef = doc(db, "users", authUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
          console.error("❌ User document not found:", authUser.uid);
          router.push("/login");
          return;
        }

        const userInfo = userDocSnap.data() as UserData;
        console.log("👤 User data loaded:", userInfo);
        setUserData(userInfo);

        // Verificar permisos
        const hasRequiredRole = userInfo.roles.some(role => 
          allowedRoles.includes(role)
        );

        console.log("🔍 Permission check:", {
          userRoles: userInfo.roles,
          requiredRoles: allowedRoles,
          hasPermission: hasRequiredRole
        });

        setHasPermission(hasRequiredRole);

        if (!hasRequiredRole) {
          console.log("⛔ Access denied, redirecting to:", redirectTo);
          router.push(redirectTo);
        }
      } catch (error) {
        console.error("❌ Error fetching user data:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [allowedRoles, redirectTo, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  if (!user || !userData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">Error de autenticación</p>
        </div>
      </div>
    );
  }

  if (!hasPermission) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <ShieldAlert className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Acceso Restringido</h1>
          <p className="text-muted-foreground mb-4">
            No tienes permisos para acceder a esta sección.
          </p>
          <p className="text-sm text-muted-foreground">
            <strong>Tu rol:</strong> {userData.roles.join(", ")}
          </p>
          <p className="text-sm text-muted-foreground">
            <strong>Roles requeridos:</strong> {allowedRoles.join(", ")}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
