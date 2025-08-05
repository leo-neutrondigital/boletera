// src/components/providers/QueryProvider.tsx
"use client";

// Temporal: QueryProvider simplificado sin React Query
// Para usar React Query, instalar: npm install @tanstack/react-query

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Por ahora, solo pasamos los children sin React Query
  // Una vez instalado React Query, descomenta el código abajo:
  
  /*
  import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
  import { useState } from "react";
  
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
          mutations: {
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
  */
  
  return <>{children}</>;
}
