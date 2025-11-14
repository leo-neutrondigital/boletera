import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { DataCacheProvider } from "@/contexts/DataCacheContext"; // Cache viejo (preregistros, usuarios, etc)
import { SWRProvider } from "@/lib/swr-provider"; // 🆕 Cache SWR persistente (ventas, cortesías, offline)
import { Toaster } from "@/components/ui/toaster";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { PayPalProvider } from "@/components/providers/PayPalProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Boletera - Sistema de Venta de Boletos",
  description: "Plataforma de venta y gestión de boletos para eventos",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <PayPalProvider>
          <QueryProvider>
            <SWRProvider>
              <AuthProvider>
                <DataCacheProvider>
                  {children}
                  <Toaster />
                </DataCacheProvider>
              </AuthProvider>
            </SWRProvider>
          </QueryProvider>
        </PayPalProvider>
      </body>
    </html>
  );
}
