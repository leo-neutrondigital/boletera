'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, AlertCircle, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { authenticatedGet } from '@/lib/utils/api';
import { useCan } from '@/components/auth/Can';
import type { UserRole } from '@/lib/auth/permissions';

interface ClientAuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean; // Si es true, requiere login
  allowedRoles?: UserRole[]; // Roles permitidos (default: ['usuario'])
  fallbackUrl?: string; // A dónde redirigir si no tiene acceso
}

export function ClientAuthGuard({ 
  children, 
  requireAuth = true,
  allowedRoles = ['usuario', 'admin', 'gestor'],
  fallbackUrl = '/login'
}: ClientAuthGuardProps) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    async function checkAccess() {
      console.log('🔒 ClientAuthGuard checking access...', {
        requireAuth,
        user: !!user,
        userData: !!userData,
        loading
      });

      // Esperar a que termine la carga de auth
      if (loading) {
        return;
      }

      // Si no requiere autenticación, permitir acceso
      if (!requireAuth) {
        setHasAccess(true);
        setIsCheckingAccess(false);
        return;
      }

      // Verificar si está loggeado
      if (!user) {
        console.log('❌ No user logged in, redirecting to login');
        router.push(fallbackUrl);
        return;
      }

      // Verificar roles si se especifican
      if (userData && allowedRoles.length > 0) {
        const userRoles = userData.roles || [];
        const hasValidRole = allowedRoles.some(role => (userRoles as string[]).includes(role));
        
        if (!hasValidRole) {
          console.log('❌ User does not have required role', {
            userRoles,
            allowedRoles
          });
          setHasAccess(false);
          setIsCheckingAccess(false);
          return;
        }
      }

      console.log('✅ Access granted');
      setHasAccess(true);
      setIsCheckingAccess(false);
    }

    checkAccess();
  }, [user, userData, loading, requireAuth, allowedRoles, router, fallbackUrl]);

  // Loading state
  if (loading || isCheckingAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Verificando acceso...
          </h2>
          <p className="text-gray-600">
            Un momento por favor
          </p>
        </div>
      </div>
    );
  }

  // Sin acceso por roles
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                Acceso denegado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-red-50 border-red-200">
                <AlertDescription className="text-red-800">
                  No tienes permisos para acceder a esta página.
                </AlertDescription>
              </Alert>

              <div className="text-sm text-gray-600">
                <p><strong>Roles requeridos:</strong> {allowedRoles.join(', ')}</p>
                <p><strong>Tus roles:</strong> {userData?.roles?.join(', ') || 'Ninguno'}</p>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => router.back()}
                  className="flex-1"
                >
                  Volver
                </Button>
                <Button 
                  onClick={() => router.push('/')}
                  className="flex-1"
                >
                  Ir al inicio
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Usuario tiene acceso
  return <>{children}</>;
}

// 🆕 Hook para validar si un usuario puede acceder a una orden específica
export function useOrderAccess(orderId: string) {
  const { user, userData } = useAuth();
  const canReadUsers = useCan('read', 'users'); // Usar useCan existente en lugar de hasPermission
  const [canAccess, setCanAccess] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function checkOrderAccess() {
      if (!user || !orderId || orderId === 'undefined') {
        console.log('❌ Invalid parameters for order access check:', { user: !!user, orderId });
        setCanAccess(false);
        setIsChecking(false);
        return;
      }

      try {
        console.log('🔍 Checking access to order:', orderId);
        console.log('👤 User info:', {
          email: user.email,
          roles: userData?.roles,
          hasAdminPermissions: canReadUsers
        });

        // 🆕 PRIMERO: Admin siempre puede acceder
        if (userData?.roles?.includes('admin') || canReadUsers) {
          console.log('✅ Admin access granted - user has admin role or permissions');
          setCanAccess(true);
          setIsChecking(false);
          return;
        }

        // SEGUNDO: Verificar si el usuario es propietario de la orden
        console.log('🔍 Checking ownership for non-admin user...');
        const response = await authenticatedGet(`/api/tickets/order/${orderId}`);
        
        if (!response.ok) {
          console.log('❌ Order API error:', response.status);
          // Si es 404, significa que no existe la orden
          if (response.status === 404) {
            setCanAccess(false);
          } else {
            // Para otros errores, también denegar acceso
            setCanAccess(false);
          }
          setIsChecking(false);
          return;
        }

        const orderData = await response.json();
        console.log('📦 Order data received:', {
          success: orderData.success,
          ticketsCount: orderData.tickets?.length || 0,
          firstTicketEmail: orderData.tickets?.[0]?.customer_email
        });
        
        // Verificar si algún ticket pertenece al usuario actual
        const userEmail = user.email?.toLowerCase();
        const hasTickets = orderData.tickets?.some((ticket: any) => {
          const ticketEmail = ticket.customer_email?.toLowerCase();
          const ticketUserId = ticket.user_id;
          
          console.log('🎫 Checking ticket:', {
            ticketId: ticket.id,
            ticketEmail,
            userEmail,
            ticketUserId,
            userUid: user.uid,
            emailMatch: ticketEmail === userEmail,
            userIdMatch: ticketUserId === user.uid
          });
          
          // Comparar por email O por user_id
          return ticketEmail === userEmail || ticketUserId === user.uid;
        });

        console.log('🔍 Ownership check result:', {
          userEmail,
          hasTickets,
          ticketsCount: orderData.tickets?.length || 0
        });

        setCanAccess(hasTickets);
        
      } catch (error) {
        console.error('❌ Error checking order access:', error);
        setCanAccess(false);
      } finally {
        setIsChecking(false);
      }
    }

    checkOrderAccess();
  }, [user, userData, orderId, canReadUsers]);

  return { canAccess, isChecking };
}
