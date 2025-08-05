// src/components/dashboard/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import { Menu, Home, Users, Calendar, LogOut } from "lucide-react";
import { auth } from "@/lib/firebase/client";
import { useRouter } from "next/navigation";
import { Can } from "@/components/auth/Can";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/lib/auth/permissions";

interface NavLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  public?: boolean;
  roles?: UserRole[];
}

const links: NavLink[] = [
  { 
    href: "/dashboard", 
    label: "Inicio", 
    icon: Home,
    public: true // Accesible para todos los roles autenticados
  },
  { 
    href: "/dashboard/eventos", 
    label: "Eventos", 
    icon: Calendar,
    roles: ["admin", "gestor", "comprobador"] // Eventos visibles para estos roles
  },
  { 
    href: "/dashboard/usuarios", 
    label: "Usuarios", 
    icon: Users,
    roles: ["admin"] // Solo admin puede gestionar usuarios
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { userData } = useAuth();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push("/");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const NavLinks = () => (
    <>
      {links.map((link) => {
        // Verificar si el enlace es público o si el usuario tiene los roles necesarios
        const isPublic = link.public;
        const hasAccess = isPublic || (link.roles && userData?.roles.some(role => link.roles!.includes(role)));
        
        if (!hasAccess) return null;

        const LinkContent = (
          <Link
            href={link.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors",
              {
                "bg-gray-200 font-semibold text-primary": pathname === link.href,
              }
            )}
          >
            <link.icon className="w-4 h-4" />
            {link.label}
          </Link>
        );

        // Si tiene roles específicos, usar Can para protección adicional
        if (link.roles) {
          return (
            <Can key={link.href} roles={link.roles}>
              {LinkContent}
            </Can>
          );
        }

        // Si es público, mostrar directamente
        return <div key={link.href}>{LinkContent}</div>;
      })}
    </>
  );

  return (
    <>
      {/* Versión móvil */}
      <div className="md:hidden p-4 border-b">
        <Sheet>
          <SheetTrigger className="p-2 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors">
            <Menu className="w-5 h-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px]">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="mb-6 pb-4 border-b">
                <h1 className="text-xl font-bold text-primary">Boletera</h1>
                {userData && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {userData.name} • {userData.roles.join(", ")}
                  </p>
                )}
              </div>
              
              {/* Navigation */}
              <nav className="space-y-1 flex-1">
                <NavLinks />
              </nav>
              
              {/* Logout */}
              <div className="pt-4 border-t">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar sesión
                </button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Versión desktop */}
      <aside className="hidden md:flex flex-col w-64 p-4 border-r bg-gray-50/50">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="mb-6 pb-4 border-b">
            <h1 className="text-xl font-bold text-primary">Boletera</h1>
            {userData && (
              <div className="mt-2">
                <p className="text-sm font-medium">{userData.name}</p>
                <p className="text-xs text-muted-foreground">
                  {userData.roles.join(", ")}
                </p>
              </div>
            )}
          </div>
          
          {/* Navigation */}
          <nav className="space-y-1 flex-1">
            <NavLinks />
          </nav>
          
          {/* Logout */}
          <div className="pt-4 border-t">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
