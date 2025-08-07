// src/hooks/use-users.ts
"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { auth } from "@/lib/firebase/client";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@/types";

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Cargar usuarios en tiempo real
  useEffect(() => {
    console.log("👥 Setting up users listener");

    const q = query(
      collection(db, "users"),
      orderBy("created_at", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const usersData = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            uid: data.uid,
            email: data.email,
            name: data.name,
            roles: data.roles || [],
            phone: data.phone || "",
            company: data.company || "",
            address: data.address || { city: "", country: "México" },
            marketing_consent: data.marketing_consent || false,
            created_via: data.created_via || "unknown",
            created_at: data.created_at?.toDate() || new Date(),
            updated_at: data.updated_at?.toDate(),
          } as User;
        });

        console.log("👥 Users loaded:", usersData.length);
        setUsers(usersData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("❌ Error loading users:", err);
        setError("Error al cargar usuarios");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Crear usuario
  const createUser = async (userData: {
    email: string;
    name: string;
    role: string;
    phone?: string;
    company?: string;
    city?: string;
    country?: string;
    marketing_consent?: boolean;
  }) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Usuario no autenticado");

      const token = await currentUser.getIdToken();
      
      const response = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al crear usuario");
      }

      const result = await response.json();

      toast({
        title: "Usuario creado correctamente",
        description: `${userData.name} (${userData.email})`,
      });

      return result;
    } catch (error: any) {
      console.error("❌ Error creating user:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo crear el usuario",
      });
      throw error;
    }
  };

  // Actualizar usuario
  const updateUser = async (userId: string, updateData: Partial<User>) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Usuario no autenticado");

      const token = await currentUser.getIdToken();
      
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al actualizar usuario");
      }

      toast({
        title: "Usuario actualizado",
        description: "Los cambios se han guardado correctamente",
      });

      // La actualización optimista se hará a través del listener de Firestore
      return true;
    } catch (error: any) {
      console.error("❌ Error updating user:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo actualizar el usuario",
      });
      return false;
    }
  };

  // Eliminar usuario
  const deleteUser = async (userId: string): Promise<boolean> => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Usuario no autenticado");

      const token = await currentUser.getIdToken();
      
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al eliminar usuario");
      }

      toast({
        title: "Usuario eliminado",
        description: "El usuario ha sido eliminado correctamente",
      });

      // La actualización se hará a través del listener de Firestore
      return true;
    } catch (error: any) {
      console.error("❌ Error deleting user:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo eliminar el usuario",
      });
      return false;
    }
  };

  // Refrescar usuarios
  const refreshUsers = () => {
    setLoading(true);
    setError(null);
    // El listener se encargará de recargar los datos
  };

  // Función para actualización optimista
  const addUser = (user: User) => {
    setUsers(prev => [user, ...prev]);
  };

  return {
    users,
    loading,
    error,
    createUser,
    updateUser,
    deleteUser,
    refreshUsers,
    addUser,
  };
}
