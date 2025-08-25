// src/contexts/AuthContext.tsx
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, signOut as firebaseSignOut } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { hasPermission, getAccessibleRoutes } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/auth/permissions";

interface UserData {
  uid: string;
  email: string;
  name: string;
  phone?: string;
  company?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  roles: UserRole[];
  created_at: Date;
}

export interface UserPermissions {
  // Eventos
  canCreateEvents: boolean;
  canEditEvents: boolean;
  canDeleteEvents: boolean;
  canViewEvents: boolean;
  
  // Tipos de boletos
  canCreateTicketTypes: boolean;
  canEditTicketTypes: boolean;
  canDeleteTicketTypes: boolean;
  canViewTicketTypes: boolean;
  canManageCourtesy: boolean;
  
  // Usuarios
  canCreateUsers: boolean;
  canEditUsers: boolean;
  canDeleteUsers: boolean;
  canViewUsers: boolean;
  
  // Boletos y validación
  canCreateTickets: boolean;
  canEditTickets: boolean;
  canDeleteTickets: boolean;
  canViewTickets: boolean;
  canValidateTickets: boolean;
  
  // Reportes
  canViewSalesReports: boolean;
  canViewAttendanceReports: boolean;
  canViewFinancialReports: boolean;
  canExportReports: boolean;
  
  // Sistema
  canManageSettings: boolean;
  canViewLogs: boolean;
  canBackupSystem: boolean;
  
  // Rutas accesibles
  accessibleRoutes: string[];
}

interface AuthState {
  // Estados básicos
  user: User | null;
  userData: UserData | null;
  permissions: UserPermissions | null;
  
  // Estados de carga
  loading: boolean;
  userDataLoading: boolean;
  
  // Errores
  error: string | null;
  
  // Utilidades
  isAuthenticated: boolean;
  hasRole: (role: UserRole) => boolean;
  
  // Acciones
  refreshUserData: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [userDataLoading, setUserDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Función para calcular permisos basado en roles
  const calculatePermissions = (roles: UserRole[]): UserPermissions => {
    return {
      // Eventos
      canCreateEvents: hasPermission(roles, "events", "create"),
      canEditEvents: hasPermission(roles, "events", "update"),
      canDeleteEvents: hasPermission(roles, "events", "delete"),
      canViewEvents: hasPermission(roles, "events", "read"),
      
      // Tipos de boletos
      canCreateTicketTypes: hasPermission(roles, "ticketTypes", "create"),
      canEditTicketTypes: hasPermission(roles, "ticketTypes", "update"),
      canDeleteTicketTypes: hasPermission(roles, "ticketTypes", "delete"),
      canViewTicketTypes: hasPermission(roles, "ticketTypes", "read"),
      canManageCourtesy: hasPermission(roles, "ticketTypes", "manageCourtesy"),
      
      // Usuarios
      canCreateUsers: hasPermission(roles, "users", "create"),
      canEditUsers: hasPermission(roles, "users", "update"),
      canDeleteUsers: hasPermission(roles, "users", "delete"),
      canViewUsers: hasPermission(roles, "users", "read"),
      
      // Boletos
      canCreateTickets: hasPermission(roles, "tickets", "create"),
      canEditTickets: hasPermission(roles, "tickets", "update"),
      canDeleteTickets: hasPermission(roles, "tickets", "delete"),
      canViewTickets: hasPermission(roles, "tickets", "read"),
      canValidateTickets: hasPermission(roles, "tickets", "validate"),
      
      // Reportes
      canViewSalesReports: hasPermission(roles, "reports", "sales"),
      canViewAttendanceReports: hasPermission(roles, "reports", "attendance"),
      canViewFinancialReports: hasPermission(roles, "reports", "financial"),
      canExportReports: hasPermission(roles, "reports", "export"),
      
      // Sistema
      canManageSettings: hasPermission(roles, "system", "settings"),
      canViewLogs: hasPermission(roles, "system", "logs"),
      canBackupSystem: hasPermission(roles, "system", "backup"),
      
      // Rutas
      accessibleRoutes: getAccessibleRoutes(roles),
    };
  };

  // Función para obtener datos del usuario
  const fetchUserData = async (authUser: User): Promise<UserData | null> => {
    try {
      setUserDataLoading(true);
      const userDocRef = doc(db, "users", authUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        setError("Datos de usuario no encontrados");
        return null;
      }

      const data = userDocSnap.data();
      const userData: UserData = {
        uid: authUser.uid,
        email: authUser.email || "",
        name: data.name || "",
        phone: data.phone || undefined,
        company: data.company || undefined,
        address: data.address || undefined,
        roles: data.roles || [],
        created_at: data.created_at?.toDate() || new Date(),
      };

      return userData;
    } catch (err) {
      console.error("Error fetching user data:", err);
      setError("Error al cargar datos del usuario");
      return null;
    } finally {
      setUserDataLoading(false);
    }
  };

  // Función para refrescar datos del usuario
  const refreshUserData = async (): Promise<void> => {
    if (!user) return;
    
    const newUserData = await fetchUserData(user);
    if (newUserData) {
      setUserData(newUserData);
      setPermissions(calculatePermissions(newUserData.roles));
    }
  };

  // Función para cerrar sesión
  const signOut = async (): Promise<void> => {
    try {
      await firebaseSignOut(auth);
      // Los estados se limpiarán automáticamente por el listener
      console.log('🔐 User signed out successfully');
    } catch (error) {
      console.error('❌ Error signing out:', error);
      throw error;
    }
  };

  // Escuchar cambios de autenticación
  useEffect(() => {
    console.log("🔐 AuthProvider: Setting up auth listener");
    
    const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
      console.log("🔐 Auth state changed:", authUser?.uid);
      setError(null);
      
      if (!authUser) {
        // Usuario no autenticado
        setUser(null);
        setUserData(null);
        setPermissions(null);
        setLoading(false);
        return;
      }

      // Usuario autenticado
      setUser(authUser);
      
      // Obtener datos del usuario
      const newUserData = await fetchUserData(authUser);
      if (newUserData) {
        setUserData(newUserData);
        
        // Calcular permisos
        const newPermissions = calculatePermissions(newUserData.roles);
        setPermissions(newPermissions);
        
        console.log("✅ User authenticated with permissions:", {
          uid: newUserData.uid,
          roles: newUserData.roles,
          permissions: Object.keys(newPermissions).filter(key => 
            newPermissions[key as keyof UserPermissions] === true
          )
        });
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Escuchar cambios en el documento del usuario (si otro admin cambia roles)
  useEffect(() => {
    if (!user?.uid) return;

    console.log("👂 Setting up user data listener for:", user.uid);
    
    const unsubscribe = onSnapshot(
      doc(db, "users", user.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const updatedUserData: UserData = {
            uid: user.uid,
            email: user.email || "",
            name: data.name || "",
            phone: data.phone || undefined,
            company: data.company || undefined,
            address: data.address || undefined,
            roles: data.roles || [],
            created_at: data.created_at?.toDate() || new Date(),
          };
          
          setUserData(updatedUserData);
          setPermissions(calculatePermissions(updatedUserData.roles));
          
          console.log("🔄 User data updated:", updatedUserData.roles);
        }
      },
      (error) => {
        console.error("Error listening to user data:", error);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Utilidades internas (no expuestas)
  const hasRole = (role: UserRole): boolean => {
    return userData?.roles.includes(role) || false;
  };

  const value: AuthState = {
    // Estados básicos
    user,
    userData,
    permissions,
    
    // Estados de carga
    loading,
    userDataLoading,
    
    // Errores
    error,
    
    // Utilidades
    isAuthenticated: !!user && !!userData,
    hasRole,
    
    // Acciones
    refreshUserData,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook para usar el contexto
export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Hook de conveniencia para permisos
export function usePermissions() {
  const { permissions, loading } = useAuth();
  return { permissions, loading };
}

// Hook de conveniencia para verificar roles
export function useRole(role: UserRole) {
  const { hasRole, loading } = useAuth();
  return { hasRole: hasRole(role), loading };
}
