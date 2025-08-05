// src/hooks/use-permissions.ts
"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase/client";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client"; // Necesitamos el client db
import { hasPermission, getAccessibleRoutes } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/auth/permissions";

interface UserPermissions {
  roles: UserRole[];
  canCreateEvents: boolean;
  canEditEvents: boolean;
  canDeleteEvents: boolean;
  canCreateTicketTypes: boolean;
  canEditTicketTypes: boolean;
  canDeleteTicketTypes: boolean;
  canManageUsers: boolean;
  canValidateTickets: boolean;
  canViewReports: boolean;
  canManageCourtesy: boolean;
  accessibleRoutes: string[];
}

export function usePermissions() {
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setPermissions(null);
        setLoading(false);
        return;
      }

      try {
        // 🔧 OPTIMIZACIÓN: Usar Firestore client-side directamente
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          const userRoles: UserRole[] = userData.roles || [];

          const userPermissions: UserPermissions = {
            roles: userRoles,
            canCreateEvents: hasPermission(userRoles, "events", "create"),
            canEditEvents: hasPermission(userRoles, "events", "update"),
            canDeleteEvents: hasPermission(userRoles, "events", "delete"),
            canCreateTicketTypes: hasPermission(userRoles, "ticketTypes", "create"),
            canEditTicketTypes: hasPermission(userRoles, "ticketTypes", "update"),
            canDeleteTicketTypes: hasPermission(userRoles, "ticketTypes", "delete"),
            canManageUsers: hasPermission(userRoles, "users", "read"),
            canValidateTickets: hasPermission(userRoles, "tickets", "validate"),
            canViewReports: hasPermission(userRoles, "reports", "sales"),
            canManageCourtesy: hasPermission(userRoles, "ticketTypes", "manageCourtesy"),
            accessibleRoutes: getAccessibleRoutes(userRoles),
          };

          setPermissions(userPermissions);
        } else {
          console.error("❌ User document not found");
          setPermissions(null);
        }
      } catch (error) {
        console.error("Error fetching permissions:", error);
        setPermissions(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return { permissions, loading };
}
