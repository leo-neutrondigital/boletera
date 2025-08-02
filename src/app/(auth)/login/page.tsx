// src/app/(auth)/login/page.tsx
"use client";

import { auth } from "@/lib/firebase/client";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      alert("Login exitoso: " + userCred.user.email);
    } catch (err) {
      alert("Error: " + (err as any).message);
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-20 space-y-4">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Correo"
        className="w-full border px-4 py-2"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Contraseña"
        className="w-full border px-4 py-2"
      />
      <button
        onClick={handleLogin}
        className="bg-black text-white px-4 py-2 w-full"
      >
        Iniciar sesión
      </button>
    </div>
  );
}