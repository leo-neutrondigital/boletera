'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSalesPage } from '@/contexts/SalesPageContext';
import { useToast } from '@/hooks/use-toast';
import { usePreregistrations } from '@/hooks/use-preregistrations'; // 🆕 Hook con cache especializado
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  CardContent
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { User, Mail, Phone, Building, Calendar, Search, MessageCircle, Copy, CheckCircle, Trash2, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { openWhatsApp, copyEmailToClipboard, formatInterestedTickets, generateWhatsAppMessage } from '@/lib/utils/preregistros-utils';
import type { Preregistration } from '@/types';

interface PreregistrosPageClientProps {
  eventId: string;
}

interface PreregistroStats {
  total: number;
  activos: number;
  nuevo: number;
  contactado: number;
  interesado: number;
  no_interesado: number;
  convertido: number;
  conversion_rate: number;
}

const statusColors = {
  nuevo: 'bg-green-100 text-green-800 border-green-300',
  contactado: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  interesado: 'bg-blue-100 text-blue-800 border-blue-300',
  no_interesado: 'bg-red-100 text-red-800 border-red-300',
  convertido: 'bg-purple-100 text-purple-800 border-purple-300',
};

const statusLabels = {
  nuevo: 'Nuevo',
  contactado: 'Contactado',
  interesado: 'Interesado',
  no_interesado: 'No interesado',
  convertido: 'Convertido',
};

export function PreregistrosPageClient({ eventId }: PreregistrosPageClientProps) {
  const { setPreregistrosActions } = useSalesPage();
  const { user, userData } = useAuth();
  const { toast } = useToast();
  
  // 🆕 Hook con cache especializado
  const { 
    preregistrations, 
    loading: isLoading, 
    stats, 
    refreshPreregistrations,
    updatePreregistrationStatus,
    deletePreregistrations 
  } = usePreregistrations();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  // 🆕 Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  // 🆕 Estado para manejar copia de emails
  const [copiedEmails, setCopiedEmails] = useState<Set<string>>(new Set());
  // 🆕 Estados para selección múltiple
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtrar preregistros - MOVER ANTES de handleExport
  const filteredPreregistros = preregistrations.filter(p => {
    const matchesSearch = searchTerm === '' || 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.company && p.company.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // 🆕 Paginación
  const totalPages = Math.ceil(filteredPreregistros.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPreregistros = filteredPreregistros.slice(startIndex, endIndex);
  // 🆕 Funciones para selección múltiple
  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(paginatedPreregistros.map(p => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleDeleteSelected = useCallback(async (ids: string[]) => {
    setIsDeleting(true);
    try {
      console.log('🗑️ Eliminando preregistros:', ids);
      
      await deletePreregistrations(ids); // 🆕 Usar hook
      
      toast({
        title: "Preregistros eliminados",
        description: `Se han eliminado ${ids.length} preregistro${ids.length !== 1 ? 's' : ''} correctamente`,
      });
      
      // Limpiar selección (datos se recargan automáticamente por cache)
      setSelectedIds(new Set());
    } catch (error) {
      console.error('❌ Error eliminando preregistros:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron eliminar los preregistros",
      });
    } finally {
      setIsDeleting(false);
    }
  }, [deletePreregistrations, toast]); // 🔧 Dependencias estables

  // 🆕 Función para cambiar estado de un preregistro usando cache
  const handleChangeStatus = useCallback(async (id: string, newStatus: string) => {
    try {
      console.log('🔄 Cambiando estado:', { id, newStatus });
      
      await updatePreregistrationStatus(
        id, 
        newStatus as 'nuevo' | 'contactado' | 'interesado' | 'no_interesado' | 'convertido',
        user?.uid // Para trackear quién hizo el cambio
      );
      
      toast({
        title: "Estado actualizado",
        description: "El estado del preregistro se ha actualizado correctamente",
      });
      
      // Los datos se actualizan automáticamente por el cache
    } catch (error) {
      console.error('❌ Error cambiando estado:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el estado",
      });
    }
  }, [updatePreregistrationStatus, user, toast]); // 🔧 Dependencias estables

  // 🆕 Función para exportar CSV usando cache
  const handleExport = useCallback(() => {
    try {
      console.log('📥 Exportando preregistros a CSV');
      
      // 🆕 Usar datos del cache directamente
      const csvData = filteredPreregistros.map(p => {
        const interestedTicketsText = p.interested_tickets && p.interested_tickets.length > 0
          ? p.interested_tickets.map(t => `${t.quantity}x ${t.ticket_type_name} (${t.unit_price})`).join('; ')
          : '';
          
        return {
          Nombre: p.name,
          Email: p.email,
          Teléfono: p.phone,
          Empresa: p.company || '',
          Estado: statusLabels[p.status],
          'Boletos de interés': interestedTicketsText,
          Origen: p.source === 'landing_page' ? 'Página web' : 'Importado',
          'Fecha registro': p.created_at.toLocaleDateString('es-ES'),
          'Email enviado': p.email_sent ? 'Sí' : 'No'
        };
      });
      
      // Convertir a CSV
      const headers = Object.keys(csvData[0] || {});
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => headers.map(header => `"${row[header as keyof typeof row] || ''}"`).join(','))
      ].join('\n');
      
      // Descargar archivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `preregistros-evento-${eventId}-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Exportación exitosa",
        description: `Se han exportado ${csvData.length} preregistros`,
      });
      
    } catch (error) {
      console.error('❌ Error exportando CSV:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo exportar el archivo CSV",
      });
    }
  }, [filteredPreregistros, eventId, toast]); // 🔧 Dependencias estables

  // 🆕 Configurar acciones del header usando cache
  useEffect(() => {
    setPreregistrosActions({
      onRefresh: refreshPreregistrations, // 🆕 Usar función del hook
      onExport: handleExport,
      onChangeStatus: handleChangeStatus,
      onDeleteSelected: handleDeleteSelected,
      isRefreshing: isLoading
    });

    return () => setPreregistrosActions(null);
  }, [isLoading]); // Solo depender de isLoading

  // Los datos se cargan automáticamente por el hook - no necesita useEffect manual

  // Reset página cuando cambian filtros
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set()); // 🆕 Limpiar selección también
  }, [searchTerm, filterStatus]);

  // 🆕 Funciones para WhatsApp y copiar email
  const handleOpenWhatsApp = (preregistro: Preregistration) => {
    const message = generateWhatsAppMessage(preregistro);
    openWhatsApp(preregistro.phone, message);
  };

  const handleCopyEmail = async (email: string) => {
    const success = await copyEmailToClipboard(email);
    if (success) {
      setCopiedEmails(prev => new Set([...prev, email]));
      toast({
        title: "Email copiado",
        description: "El email se ha copiado al portapapeles",
      });
      
      // Quitar el estado de copiado después de 2 segundos
      setTimeout(() => {
        setCopiedEmails(prev => {
          const newSet = new Set(prev);
          newSet.delete(email);
          return newSet;
        });
      }, 2000);
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo copiar el email",
      });
    }
  };

  if (isLoading && preregistrations.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando preregistros...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Estadísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <p className="text-sm text-gray-600">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{stats.nuevo}</div>
              <p className="text-sm text-gray-600">Nuevos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.contactado}</div>
              <p className="text-sm text-gray-600">Contactados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.interesado}</div>
              <p className="text-sm text-gray-600">Interesados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">{stats.convertido}</div>
              <p className="text-sm text-gray-600">Convertidos</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar por nombre, email o empresa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="nuevo">Nuevos</SelectItem>
                  <SelectItem value="contactado">Contactados</SelectItem>
                  <SelectItem value="interesado">Interesados</SelectItem>
                  <SelectItem value="no_interesado">No interesados</SelectItem>
                  <SelectItem value="convertido">Convertidos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 🆕 Barra de selección múltiple (solo admin) */}
      {userData?.roles?.includes('admin') && selectedIds.size > 0 && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="text-red-800 font-medium">
                  {selectedIds.size} preregistro{selectedIds.size !== 1 ? 's' : ''} seleccionado{selectedIds.size !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteSelected(Array.from(selectedIds))}
                  disabled={isDeleting}
                  className="flex items-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Eliminando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Eliminar seleccionados
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de preregistros */}
      {paginatedPreregistros.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || filterStatus !== 'all' ? 'No se encontraron preregistros' : 'Sin preregistros aún'}
            </h3>
            <p className="text-gray-600">
              {searchTerm || filterStatus !== 'all' 
                ? 'Intenta cambiar los filtros de búsqueda'
                : 'Los preregistros aparecerán aquí cuando las personas se registren'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 🆕 Header de selección (solo admin) */}
          {userData?.roles?.includes('admin') && paginatedPreregistros.length > 0 && (
            <div className="mb-4 flex items-center gap-3 text-sm text-gray-600">
              <Checkbox
                checked={selectedIds.size === paginatedPreregistros.length && paginatedPreregistros.length > 0}
                onCheckedChange={handleSelectAll}
                className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
              />
              <span>
                Seleccionar todos ({paginatedPreregistros.length})
              </span>
            </div>
          )}
          
          <div className="space-y-4">
            {paginatedPreregistros.map((preregistro) => {
              const formattedTickets = formatInterestedTickets(preregistro.interested_tickets || []);
              const isEmailCopied = copiedEmails.has(preregistro.email);
              const isSelected = selectedIds.has(preregistro.id);
              
              return (
                <Card key={preregistro.id} className={`hover:shadow-md transition-shadow ${
                  isSelected ? 'ring-2 ring-red-500 bg-red-50' : ''
                }`}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      {/* 🆕 Checkbox de selección (solo admin) */}
                      {userData?.roles?.includes('admin') && (
                        <div className="pt-1">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSelectOne(preregistro.id, checked as boolean)}
                            className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                          />
                        </div>
                      )}
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-purple-600" />
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900">{preregistro.name}</h3>
                                <Badge className={statusColors[preregistro.status]}>
                                  {statusLabels[preregistro.status]}
                                </Badge>
                              </div>
                            </div>
                        
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm mb-4">
                              {/* Email con botón copiar */}
                              <div className="flex items-center gap-2 text-gray-600">
                                <Mail className="w-4 h-4 flex-shrink-0" />
                                <span className="flex-1 truncate">{preregistro.email}</span>
                                <button
                                  onClick={() => handleCopyEmail(preregistro.email)}
                                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                                  title="Copiar email"
                                >
                                  {isEmailCopied ? (
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <Copy className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                                  )}
                                </button>
                              </div>
                              
                              {/* Teléfono con botón WhatsApp */}
                              <div className="flex items-center gap-2 text-gray-600">
                                <Phone className="w-4 h-4 flex-shrink-0" />
                                <span className="flex-1">{preregistro.phone}</span>
                                <button
                                  onClick={() => handleOpenWhatsApp(preregistro)}
                                  className="p-1 hover:bg-green-100 rounded transition-colors"
                                  title="Abrir WhatsApp"
                                >
                                  <MessageCircle className="w-4 h-4 text-green-600 hover:text-green-700" />
                                </button>
                              </div>
                              
                              {/* Empresa */}
                              {preregistro.company && (
                                <div className="flex items-center gap-2 text-gray-600">
                                  <Building className="w-4 h-4" />
                                  <span className="truncate">{preregistro.company}</span>
                                </div>
                              )}
                              
                              {/* Fecha */}
                              <div className="flex items-center gap-2 text-gray-600">
                                <Calendar className="w-4 h-4" />
                                <span>{formatDistanceToNow(preregistro.created_at, { addSuffix: true, locale: es })}</span>
                              </div>
                            </div>
                            
                            {/* 🆕 Boletos de interés */}
                            {formattedTickets && formattedTickets.length > 0 && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <h4 className="text-sm font-medium text-blue-900 mb-2">🎫 Boletos de interés:</h4>
                                <div className="space-y-1">
                                  {formattedTickets.map((ticket, index) => (
                                    <div key={index} className="flex justify-between items-center text-sm">
                                      <span className="text-blue-800">{ticket.formatted}</span>
                                      <span className="text-blue-700 font-medium">{ticket.priceFormatted} c/u</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex flex-col gap-2 ml-4">
                            <Select
                              value={preregistro.status}
                              onValueChange={(newStatus) => handleChangeStatus(preregistro.id, newStatus)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="nuevo">Nuevo</SelectItem>
                                <SelectItem value="contactado">Contactado</SelectItem>
                                <SelectItem value="interesado">Interesado</SelectItem>
                                <SelectItem value="no_interesado">No interesado</SelectItem>
                                <SelectItem value="convertido">Convertido</SelectItem>
                              </SelectContent>
                            </Select>
                            
                            {preregistro.email_sent && (
                              <Badge variant="outline" className="text-xs">
                                ✉️ Email enviado
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* 🆕 Componente de Paginación Seguro */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between py-6">
              <div className="text-sm text-gray-700">
                Mostrando {startIndex + 1} a {Math.min(endIndex, filteredPreregistros.length)} de {filteredPreregistros.length} preregistros
              </div>
              
              <div className="flex items-center gap-2">
                {/* Botón Anterior */}
                <span
                  className={`h-8 w-8 flex items-center justify-center rounded-md border text-sm cursor-pointer select-none ${
                    currentPage === 1
                      ? 'opacity-50 cursor-not-allowed bg-gray-50 text-gray-400'
                      : 'hover:bg-gray-100 bg-white text-gray-700 border-gray-300'
                  }`}
                  onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                >
                  ‹
                </span>
                
                {/* Números de página */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                  const isActive = page === currentPage;
                  const shouldShow = page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
                  
                  if (!shouldShow) {
                    if (page === currentPage - 2 || page === currentPage + 2) {
                      return (
                        <span key={page} className="px-2 text-gray-400">
                          ...
                        </span>
                      );
                    }
                    return null;
                  }
                  
                  return (
                    <span
                      key={page}
                      className={`h-8 w-8 flex items-center justify-center rounded-md border text-sm cursor-pointer select-none ${
                        isActive
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'hover:bg-gray-100 bg-white text-gray-700 border-gray-300'
                      }`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </span>
                  );
                })}
                
                {/* Botón Siguiente */}
                <span
                  className={`h-8 w-8 flex items-center justify-center rounded-md border text-sm cursor-pointer select-none ${
                    currentPage === totalPages
                      ? 'opacity-50 cursor-not-allowed bg-gray-50 text-gray-400'
                      : 'hover:bg-gray-100 bg-white text-gray-700 border-gray-300'
                  }`}
                  onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
                >
                  ›
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
