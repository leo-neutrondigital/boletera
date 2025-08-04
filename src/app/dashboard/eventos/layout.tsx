import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Eventos | Panel",
  description: "Administración de eventos en Boletera",
}

export default function EventosLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
