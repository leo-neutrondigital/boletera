'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, 
  Ticket as TicketIcon, 
  LogOut, 
  Settings, 
  Menu, 
  X,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

interface ClientHeaderProps {
  currentPage?: 'tickets' | 'profile' | 'home';
}

export function ClientHeader({ currentPage }: ClientHeaderProps) {
  const router = useRouter();
  const { user, userData, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const navigationItems = [
    {
      key: 'home',
      label: 'Inicio',
      href: '/',
      icon: null
    },
    {
      key: 'tickets',
      label: 'Mis boletos',
      href: '/my-tickets',
      icon: TicketIcon
    }
  ];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo */}
          <div className="flex-shrink-0">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors"
            >
              🎫 <span>Boletera</span>
            </button>
          </div>

          {/* Navegación desktop */}
          <nav className="hidden md:flex space-x-8">
            {navigationItems.map((item) => (
              <button
                key={item.key}
                onClick={() => router.push(item.href)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentPage === item.key
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                }`}
              >
                {item.icon && <item.icon className="w-4 h-4" />}
                {item.label}
              </button>
            ))}
          </nav>

          {/* Usuario desktop */}
          <div className="hidden md:flex items-center gap-4">
            
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium">
                    {userData?.name || user.email?.split('@')[0] || 'Usuario'}
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {/* Dropdown menu manual */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                    <div className="py-1">
                      <div className="px-4 py-2 text-sm text-gray-900 border-b">
                        Mi cuenta
                      </div>
                      
                      <button
                        onClick={() => {
                          router.push('/my-tickets');
                          setIsUserMenuOpen(false);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <TicketIcon className="mr-3 h-4 w-4" />
                        Mis boletos
                      </button>
                      
                      <button
                        onClick={() => {
                          router.push('/profile');
                          setIsUserMenuOpen(false);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Settings className="mr-3 h-4 w-4" />
                        Mi perfil
                      </button>
                      
                      {/* Enlace admin si tiene permisos */}
                      {userData?.roles?.some(role => ['admin', 'gestor', 'comprobador'].includes(role)) && (
                        <>
                          <div className="border-t border-gray-100"></div>
                          <button
                            onClick={() => {
                              router.push('/dashboard');
                              setIsUserMenuOpen(false);
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <Settings className="mr-3 h-4 w-4" />
                            Panel administrativo
                          </button>
                        </>
                      )}
                      
                      <div className="border-t border-gray-100"></div>
                      <button
                        onClick={() => {
                          handleSignOut();
                          setIsUserMenuOpen(false);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <LogOut className="mr-3 h-4 w-4" />
                        Cerrar sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  onClick={() => router.push('/login')}
                >
                  Iniciar sesión
                </Button>
                <Button onClick={() => router.push('/register')}>
                  Registrarse
                </Button>
              </div>
            )}
          </div>

          {/* Botón menú móvil */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Menú móvil */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            
            {/* Navegación móvil */}
            <div className="space-y-2 mb-4">
              {navigationItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => {
                    router.push(item.href);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentPage === item.key
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                  }`}
                >
                  {item.icon && <item.icon className="w-4 h-4" />}
                  {item.label}
                </button>
              ))}
            </div>

            {/* Usuario móvil */}
            <div className="border-t border-gray-200 pt-4">
              {user ? (
                <div className="space-y-2">
                  
                  {/* Info del usuario */}
                  <div className="flex items-center gap-3 px-3 py-2 text-sm">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {userData?.name || user.email?.split('@')[0] || 'Usuario'}
                      </p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>

                  {/* Opciones del usuario */}
                  <button
                    onClick={() => {
                      router.push('/my-tickets');
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
                  >
                    <TicketIcon className="w-4 h-4" />
                    Mis boletos
                  </button>

                  <button
                    onClick={() => {
                      router.push('/profile');
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
                  >
                    <Settings className="w-4 h-4" />
                    Mi perfil
                  </button>

                  {/* Enlace admin en móvil */}
                  {userData?.roles?.some(role => ['admin', 'gestor', 'comprobador'].includes(role)) && (
                    <button
                      onClick={() => {
                        router.push('/dashboard');
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
                    >
                      <Settings className="w-4 h-4" />
                      Panel administrativo
                    </button>
                  )}

                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
                  >
                    <LogOut className="w-4 h-4" />
                    Cerrar sesión
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      router.push('/login');
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Iniciar sesión
                  </button>
                  <button
                    onClick={() => {
                      router.push('/register');
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Registrarse
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Overlay para cerrar dropdown en desktop */}
      {isUserMenuOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsUserMenuOpen(false)}
        />
      )}
    </header>
  );
}
