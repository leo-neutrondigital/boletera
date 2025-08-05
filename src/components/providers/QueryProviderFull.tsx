// src/components/providers/QueryProvider.tsx
"use client";

// USAR ESTA VERSIÓN UNA VEZ QUE REACT QUERY ESTÉ INSTALADO
// npm install @tanstack/react-query

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Cache por 5 minutos
            staleTime: 5 * 60 * 1000,
            // Mantener en cache por 10 minutos
            gcTime: 10 * 60 * 1000,
            // No refetch automático en focus
            refetchOnWindowFocus: false,
            // Retry solo 1 vez en errores
            retry: 1,
          },
          mutations: {
            // Retry solo 1 vez en errores
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
