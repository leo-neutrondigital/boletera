'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useOrphanTickets } from '@/hooks/use-orphan-tickets'; // 🆕 Hook con cache
import { PageHeader } from '@/components/shared/PageHeader'; // 🆕 Header consistente
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  LifeBuoy,
  AlertTriangle,
  Ticket,
  Clock,
  ArrowLeft,
  X,
  Download,
  Trash2,
  CheckCircle,
  ShieldAlert,
  DollarSign,
  Search,
  RefreshCw,
  Mail,
  User,
  ExternalLink,
  Link
} from 'lucide-react';

// Tipos
interface OrphanTicket {
  id: string;
  user_id: null;
  customer_email: string;
  customer_name: string;
  customer_phone: string;
  order_id: string;
  ticket_type_name: string;
  amount_paid: number;
  currency: string;
  event_id: string;
  authorized_days: Date[];
  orphan_recovery_data: {
    recovery_status: 'pending' | 'recovered' | 'expired';
    customer_email: string;
    customer_name: string;
    customer_phone: string;
    order_id: string;
    failure_timestamp: Date;
    account_requested: boolean;
    password_provided: boolean;
  };
  purchase_date: Date;
  qr_id: string;
}

interface UserOption {
  id: string;
  email: string;
  name: string;
}

function SoportePageContent() {
  const { user, userData } = useAuth();
  const { 
    orphanTickets, 
    loading, 
    refreshOrphanTickets, 
    searchUsersForTicket, 
    linkTicketToUser 
  } = useOrphanTickets(); // 🆕 Hook con cache
  
  const [selectedUsers, setSelectedUsers] = useState<Record<string, UserOption | null>>({});
  const [usersForTickets, setUsersForTickets] = useState<Record<string, UserOption[]>>({});
  const [linkingTicketId, setLinkingTicketId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false); // 🆕 Estado para botón refresh

  // Funciones para manejar selección de usuarios por boleto
  const setSelectedUserForTicket = (ticketId: string, user: UserOption | null) => {
    setSelectedUsers(prev => ({
      ...prev,
      [ticketId]: user
    }));
  };

  const getSelectedUserForTicket = (ticketId: string): UserOption | null => {
    return selectedUsers[ticketId] || null;
  };

  // Funciones para manejar usuarios encontrados por boleto
  const setUsersForTicket = (ticketId: string, users: UserOption[]) => {
    setUsersForTickets(prev => ({
      ...prev,
      [ticketId]: users
    }));
  };

  const getUsersForTicket = (ticketId: string): UserOption[] => {
    return usersForTickets[ticketId] || [];
  };

  // 🆕 Función de refresh usando cache
  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshOrphanTickets(); // Forzar recarga desde API
    setRefreshing(false);
  };
  
  // Buscar usuarios para un boleto específico (usando hook)
  const handleSearchUsersForTicket = async (ticketId: string, email: string) => {
    const users = await searchUsersForTicket(ticketId, email);
    setUsersForTicket(ticketId, users);
  };

  // Vincular boleto a usuario (usando hook)
  const handleLinkTicketToUser = async (ticketId: string, userId: string) => {
    setLinkingTicketId(ticketId);
    
    try {
      const success = await linkTicketToUser(ticketId, userId);
      if (success) {
        setSelectedUserForTicket(ticketId, null);
        alert('Boleto vinculado exitosamente');
      } else {
        alert('Error al vincular boleto');
      }
    } catch (error) {
      console.error('Error linking ticket:', error);
      alert('Error al vincular boleto');
    } finally {
      setLinkingTicketId(null);
    }
  };

  // Estadísticas calculadas
  const stats = {
    total: orphanTickets.length,
    pending: orphanTickets.filter(t => t.orphan_recovery_data?.recovery_status === 'pending').length,
    recovered: orphanTickets.filter(t => t.orphan_recovery_data?.recovery_status === 'recovered').length,
    totalAmount: orphanTickets.reduce((sum, t) => sum + (t.amount_paid || 0), 0)
  };

  // Filtrar boletos
  const filteredTickets = orphanTickets.filter(ticket => {
    const searchLower = searchTerm.toLowerCase();
    return (
      ticket.customer_email.toLowerCase().includes(searchLower) ||
      ticket.customer_name.toLowerCase().includes(searchLower) ||
      ticket.order_id.toLowerCase().includes(searchLower) ||
      ticket.ticket_type_name.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-orange-600 p-2 rounded-lg">
                <LifeBuoy className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Centro de Soporte
                </h1>
                <p className="text-sm text-gray-500">
                  Gestión de boletos huérfanos y recuperación
                </p>
              </div>
            </div>
            
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
              <ShieldAlert className="w-3 h-3 mr-1" />
              {userData?.roles?.includes('admin') ? 'Administrador' : 'Soporte'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="bg-orange-100 p-3 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  <p className="text-sm text-gray-600">Boletos huérfanos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="bg-yellow-100 p-3 rounded-full">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                  <p className="text-sm text-gray-600">Pendientes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="bg-green-100 p-3 rounded-full">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.recovered}</p>
                  <p className="text-sm text-gray-600">Recuperados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="bg-purple-100 p-3 rounded-full">
                  <DollarSign className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    ${stats.totalAmount.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">Monto total</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por email, nombre, order ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Actualizando...' : 'Actualizar'}
          </Button>
        </div>

        {/* Content */}
        {loading ? (
          // Loading State
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded" />
                    <div>
                      <Skeleton className="h-5 w-32 mb-1" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredTickets.length === 0 ? (
          // Empty State
          <Card className="text-center py-12">
            <CardContent>
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                {orphanTickets.length === 0 ? '¡Todo en orden!' : 'No se encontraron resultados'}
              </h3>
              
              <p className="text-gray-600 mb-6">
                {orphanTickets.length === 0 
                  ? 'No hay boletos huérfanos en este momento. Todos los boletos están correctamente vinculados.'
                  : 'No hay boletos que coincidan con tu búsqueda. Intenta con otros términos.'
                }
              </p>

              {searchTerm && (
                <Button
                  variant="outline"
                  onClick={() => setSearchTerm('')}
                >
                  Limpiar búsqueda
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          // Tickets List
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Boletos huérfanos ({filteredTickets.length})
              </h2>
            </div>

            {filteredTickets.map((ticket) => (
              <Card key={ticket.id} className="border-l-4 border-orange-500">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="bg-orange-100 p-3 rounded-full">
                        <Ticket className="h-6 w-6 text-orange-600" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900">
                            {ticket.ticket_type_name}
                          </h3>
                          <Badge variant="destructive">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Huérfano
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-gray-500" />
                            <span className="text-gray-600">{ticket.customer_email}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3 text-gray-500" />
                            <span className="text-gray-600">{ticket.customer_name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ExternalLink className="w-3 h-3 text-gray-500" />
                            <span className="text-gray-600 font-mono text-xs">
                              {ticket.order_id}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3 text-gray-500" />
                            <span className="text-gray-600 font-semibold">
                              ${ticket.amount_paid} {ticket.currency}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="border-t bg-gray-50">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* Información del boleto */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Información del boleto</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">ID del boleto:</span>
                          <span className="font-mono text-xs">{ticket.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">QR ID:</span>
                          <span className="font-mono text-xs">{ticket.qr_id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Teléfono:</span>
                          <span>{ticket.customer_phone}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Fecha de compra:</span>
                          <span>{new Date(ticket.purchase_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Estado:</span>
                          <Badge variant="outline" className="text-xs">
                            {ticket.orphan_recovery_data?.recovery_status || 'pending'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Vincular a usuario */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Vincular a usuario</h4>
                      
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm">Buscar usuario por email:</Label>
                          <Input
                            placeholder="Buscar usuario por email..."
                            onChange={(e) => handleSearchUsersForTicket(ticket.id, e.target.value)}
                            className="mt-1"
                            size="sm"
                          />
                        </div>
                        
                        {getUsersForTicket(ticket.id).length > 0 && (
                          <div className="border rounded-md max-h-32 overflow-y-auto">
                            {getUsersForTicket(ticket.id).map((user) => (
                              <div
                                key={user.id}
                                className={`p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 text-sm ${
                                  getSelectedUserForTicket(ticket.id)?.id === user.id ? 'bg-blue-50' : ''
                                }`}
                                onClick={() => setSelectedUserForTicket(ticket.id, user)}
                              >
                                <div className="font-medium">{user.name}</div>
                                <div className="text-xs text-gray-500">{user.email}</div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {getSelectedUserForTicket(ticket.id) && (
                          <div className="p-3 bg-blue-50 rounded-md">
                            <div className="text-sm font-medium mb-1">Usuario seleccionado:</div>
                            <div className="text-sm mb-3">
                              {getSelectedUserForTicket(ticket.id)!.name} ({getSelectedUserForTicket(ticket.id)!.email})
                            </div>
                            <Button
                              onClick={() => handleLinkTicketToUser(ticket.id, getSelectedUserForTicket(ticket.id)!.id)}
                              disabled={linkingTicketId === ticket.id}
                              size="sm"
                              className="w-full"
                            >
                              {linkingTicketId === ticket.id ? (
                                <>
                                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-2" />
                                  Vinculando...
                                </>
                              ) : (
                                <>
                                  <Link className="h-3 w-3 mr-2" />
                                  Vincular Boleto
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Tips Section */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <LifeBuoy className="h-5 w-5 text-orange-500" />
                Guía de recuperación de boletos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">¿Qué son los boletos huérfanos?</h4>
                  <p className="text-gray-600 mb-4">
                    Son boletos pagados exitosamente pero que no pudieron vincularse automáticamente 
                    a una cuenta de usuario debido a fallos en la creación de cuenta.
                  </p>
                  
                  <h4 className="font-medium text-gray-900 mb-2">Proceso de recuperación:</h4>
                  <ol className="text-gray-600 space-y-1 list-decimal list-inside">
                    <li>El cliente recibe email con instrucciones</li>
                    <li>Se registra con el mismo email de compra</li>
                    <li>Los boletos se vinculan automáticamente</li>
                    <li>Si falla, se hace vinculación manual aquí</li>
                  </ol>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Vinculación manual:</h4>
                  <ol className="text-gray-600 space-y-1 list-decimal list-inside">
                    <li>Buscar usuario por email en el campo de búsqueda</li>
                    <li>Seleccionar el usuario correcto de la lista</li>
                    <li>Hacer clic en "Vincular Boleto"</li>
                    <li>El boleto desaparecerá de esta lista</li>
                  </ol>
                  
                  <Alert className="mt-4 bg-blue-50 border-blue-200">
                    <AlertDescription className="text-blue-800 text-xs">
                      💡 Si no encuentras al usuario, puede que necesite crear una cuenta primero 
                      con el email exacto que usó para comprar.
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}

export default function SoportePage() {
  return (
    <AuthGuard 
      allowedRoles={['admin']} 
      requireAuth={true}
      fallback="/dashboard"
    >
      <SoportePageContent />
    </AuthGuard>
  );
}
