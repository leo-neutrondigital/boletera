// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Definir rutas protegidas y sus roles requeridos
const PROTECTED_ROUTES = {
  // Rutas de administración - Solo admin y gestor
  '/dashboard/eventos': ['admin', 'gestor'],
  '/dashboard/eventos/crear': ['admin', 'gestor'],
  '/dashboard/usuarios': ['admin'],
  '/dashboard/configuracion': ['admin'],
  
  // APIs de administración
  '/api/admin/create-event': ['admin', 'gestor'],
  '/api/admin/update-event': ['admin', 'gestor'],
  '/api/admin/delete-event': ['admin'], // Solo admin puede eliminar
  '/api/admin/events': ['admin', 'gestor'],
  '/api/admin/ticket-types': ['admin', 'gestor'],
  '/api/admin/create-user': ['admin'],
  '/api/admin/update-user': ['admin'],
  '/api/admin/delete-user': ['admin'],
  
  // APIs de tickets - requieren autenticación
  '/api/tickets/user': ['admin', 'gestor', 'comprobador', 'usuario'],
  '/api/tickets/order': ['admin', 'gestor', 'comprobador', 'usuario'],
  
  // Rutas de comprobador - Solo lectura
  '/dashboard/validacion': ['admin', 'gestor', 'comprobador'],
  '/api/comprobador': ['admin', 'gestor', 'comprobador'],
  
  // Dashboard general - Todos los roles autenticados
  '/dashboard': ['admin', 'gestor', 'comprobador', 'usuario'],
  
  // Rutas de usuario autenticado
  '/my-tickets': ['admin', 'gestor', 'comprobador', 'usuario'],
} as const;

// Rutas públicas que no requieren autenticación
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/events', // Vista pública de eventos
  '/api/public', // APIs públicas
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  console.log(`🛡️ Middleware: ${request.method} ${pathname}`);

  // Permitir rutas públicas
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    console.log(`✅ Public route allowed: ${pathname}`);
    return NextResponse.next();
  }

  // Verificar rutas protegidas
  const matchedRoute = Object.keys(PROTECTED_ROUTES).find(route => {
    // Manejar rutas dinámicas como /dashboard/eventos/[id]/boletos
    if (route.includes('[') || pathname.startsWith(route)) {
      return true;
    }
    return pathname === route;
  });

  if (matchedRoute) {
    const requiredRoles = PROTECTED_ROUTES[matchedRoute as keyof typeof PROTECTED_ROUTES];
    console.log(`🔐 Protected route ${pathname} requires roles:`, requiredRoles);
    
    // Para rutas API, la validación se hace en el handler
    if (pathname.startsWith('/api/')) {
      console.log(`🔗 API route - validation handled in route handler`);
      return NextResponse.next();
    }
    
    // Para rutas de páginas, verificar autenticación básica
    // (La verificación de roles específicos se hará en los componentes)
    const authToken = request.cookies.get('auth-token')?.value;
    
    if (!authToken) {
      console.log(`❌ No auth token found, redirecting to login`);
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    console.log(`✅ Auth token found, proceeding to page`);
    return NextResponse.next();
  }

  // Si no coincide con ninguna ruta protegida, permitir acceso
  console.log(`➡️ Unmatched route, allowing access: ${pathname}`);
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
