// src/components/dashboard/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils"; // si usas className merge
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { logout } from "@/lib/firebase/client"; // asegúrate de importar bien
import { useRouter } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/dashboard/usuarios", label: "Usuarios" },
  { href: "/dashboard/eventos", label: "Eventos" },
  // Agrega más secciones aquí...
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <>
      {/* Versión móvil */}
      <div className="md:hidden p-4">
        <Sheet>
          <SheetTrigger className="p-2 rounded bg-gray-100">
            <Menu />
          </SheetTrigger>
          <SheetContent side="left" className="w-[240px]">
            <div className="mb-4 text-xl font-bold">Boletera</div>
            <nav className="space-y-2">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn("block px-3 py-2 rounded hover:bg-gray-100", {
                    "bg-gray-200 font-semibold": pathname === link.href,
                  })}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      {/* Versión desktop */}
      <aside className="hidden md:flex flex-col w-60 p-4">
        <div className="mb-4 text-xl font-bold">Boletera</div>
        <nav className="space-y-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn("block px-3 py-2 rounded hover:bg-gray-100", {
                "bg-gray-100 font-semibold": pathname === link.href,
              })}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div
          className="mt-auto pt-4 border-t text-sm text-gray-500 cursor-pointer hover:underline"
          onClick={async () => {
            await logout();
            router.push("/"); // redirige a la página de inicio o login
          }}
        >
          Cerrar sesión
        </div>
      </aside>
    </>
  );
}
