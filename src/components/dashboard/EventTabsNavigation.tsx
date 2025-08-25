"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Settings, Ticket, ShoppingCart, BarChart3, RefreshCw, Download, Plus, Edit, Eye, EyeOff, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { PageHeader } from "@/components/shared/PageHeader";
import { Can } from "@/components/auth/Can";
import { useSalesPage } from "@/contexts/SalesPageContext";
import { getEventDateInfo } from "@/lib/utils/event-dates";
import { cn } from "@/lib/utils";
import type { Event } from "@/types";

interface EventTabsNavigationProps {
  event: Event;
}

export function EventTabsNavigation({ event }: EventTabsNavigationProps) {
  const pathname = usePathname();
  const { salesActions, ticketTypesActions, configActions, preregistrosActions } = useSalesPage();
  const eventDateInfo = getEventDateInfo(event);

  const tabs = [
    {
      id: "config",
      name: "Configuración",
      href: `/dashboard/eventos/${event.id}`,
      icon: Settings,
      description: "Detalles del evento",
      permission: { do: "read", on: "events" },
    },
    {
      id: "boletos",
      name: "Tipos de Boletos",
      href: `/dashboard/eventos/${event.id}/boletos`,
      icon: Ticket,
      description: "Tipos y precios de boletos",
      permission: { do: "read", on: "ticketTypes" },
    },
    {
      id: "vendidos",
      name: "Boletos Vendidos",
      href: `/dashboard/eventos/${event.id}/boletos-vendidos`,
      icon: ShoppingCart,
      description: "Ventas y cortesías",
      permission: { do: "read", on: "tickets" },
    },
    {
      id: "preregistros",
      name: "Preregistros",
      href: `/dashboard/eventos/${event.id}/preregistros`,
      icon: Users,
      description: "Gestión de prerregistros",
      permission: { do: "read", on: "events" }, // 🔄 Usar permisos de eventos por ahora
    },
  ];

  const breadcrumbItems = [
    { label: "Eventos", href: "/dashboard/eventos" },
    { label: event.name, current: true },
  ];

  // Determinar pestaña activa
  const getActiveTab = () => {
    if (pathname === `/dashboard/eventos/${event.id}`) return "config";
    if (pathname.includes("/boletos-vendidos")) return "vendidos";
    if (pathname.includes("/preregistros")) return "preregistros";
    if (pathname.includes("/boletos")) return "boletos";
    return "config"; // Default
  };

  const activeTab = getActiveTab();
  const isOnSalesPage = pathname.includes("/boletos-vendidos");
  const isOnTicketTypesPage = pathname.includes("/boletos") && !pathname.includes("/boletos-vendidos");
  const isOnConfigPage = pathname === `/dashboard/eventos/${event.id}`;
  const isOnPreregistrosPage = pathname.includes("/preregistros");

  // Renderizar header personalizado para la página de ventas
  if (isOnSalesPage) {
    return (
      <div>
        {/* Header usando PageHeader component */}
        <PageHeader
          icon={ShoppingCart}
          title={`Ventas - ${event.name}`}
          description="Gestión de ventas y cortesías del evento"
          iconColor="orange"
          badgeColor="orange"
          actions={
            salesActions && (
              <>
                <Button
                  variant="outline"
                  onClick={salesActions.onRefresh}
                  disabled={salesActions.isRefreshing}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${salesActions.isRefreshing ? "animate-spin" : ""}`} />
                  {salesActions.isRefreshing ? "Actualizando..." : "Actualizar"}
                </Button>

                <Can do="read" on="events">
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2"
                    onClick={salesActions.onExport}
                    disabled={salesActions.isRefreshing}
                  >
                    <Download className="w-4 h-4" />
                    Exportar CSV
                  </Button>
                </Can>
              </>
            )
          }
        />

        {/* Información del evento */}
        <div className="bg-gray-50 border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                <span>{eventDateInfo.dateRange}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>📍 {event.location}</span>
              </div>
              {eventDateInfo.isMultiDay && (
                <div className="flex items-center gap-2">
                  <span>📅 {eventDateInfo.duration} días</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navegación por pestañas */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <Can key={tab.id} do={tab.permission.do} on={tab.permission.on}>
                    <Link
                      href={tab.href}
                      className={cn(
                        "group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm",
                        isActive
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-5 h-5 mr-2",
                          isActive
                            ? "text-blue-500"
                            : "text-gray-400 group-hover:text-gray-500"
                        )}
                      />
                      <span>{tab.name}</span>
                      {tab.badge && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {tab.badge}
                        </Badge>
                      )}
                    </Link>
                  </Can>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    );
  }

  // 🆕 Renderizar header personalizado para la página de preregistros
  if (isOnPreregistrosPage) {
    return (
      <div>
        {/* Header usando PageHeader component */}
        <PageHeader
          icon={Users}
          title={`Preregistros - ${event.name}`}
          description="Gestión de prerregistros e interesados"
          iconColor="purple"
          badgeColor="purple"
          actions={
            preregistrosActions && (
              <>
                <Button
                  variant="outline"
                  onClick={preregistrosActions.onRefresh}
                  disabled={preregistrosActions.isRefreshing}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${preregistrosActions.isRefreshing ? "animate-spin" : ""}`} />
                  {preregistrosActions.isRefreshing ? "Actualizando..." : "Actualizar"}
                </Button>

                <Can do="read" on="events">
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2"
                    onClick={preregistrosActions.onExport}
                    disabled={preregistrosActions.isRefreshing}
                  >
                    <Download className="w-4 h-4" />
                    Exportar CSV
                  </Button>
                </Can>
              </>
            )
          }
        />

        {/* Información del evento */}
        <div className="bg-gray-50 border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                <span>{eventDateInfo.dateRange}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>📍 {event.location}</span>
              </div>
              {eventDateInfo.isMultiDay && (
                <div className="flex items-center gap-2">
                  <span>📅 {eventDateInfo.duration} días</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navegación por pestañas */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <Can key={tab.id} do={tab.permission.do} on={tab.permission.on}>
                    <Link
                      href={tab.href}
                      className={cn(
                        "group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm",
                        isActive
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-5 h-5 mr-2",
                          isActive
                            ? "text-blue-500"
                            : "text-gray-400 group-hover:text-gray-500"
                        )}
                      />
                      <span>{tab.name}</span>
                      {tab.badge && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {tab.badge}
                        </Badge>
                      )}
                    </Link>
                  </Can>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    );
  }

  // Renderizar header personalizado para la página de configuración
  if (isOnConfigPage) {
    return (
      <div>
        {/* Header usando PageHeader component */}
        <PageHeader
          icon={Settings}
          title={`Configuración - ${event.name}`}
          description="Detalles y configuración del evento"
          iconColor="blue"
          badgeColor="blue"
          actions={
            configActions && (
              <>
                <Can do="update" on="events">
                  <Button
                    variant="outline"
                    onClick={configActions.onEdit}
                    className="flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Editar evento
                  </Button>
                </Can>

                <Can do="update" on="events">
                  <Button 
                    className="flex items-center gap-2"
                    onClick={configActions.onTogglePublished}
                    disabled={configActions.isUpdating}
                  >
                    {event.published ? (
                      <>
                        <EyeOff className="w-4 h-4" />
                        Despublicar
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4" />
                        Publicar
                      </>
                    )}
                  </Button>
                </Can>
              </>
            )
          }
        />

        {/* Información del evento */}
        <div className="bg-gray-50 border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                <span>{eventDateInfo.dateRange}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>📍 {event.location}</span>
              </div>
              {eventDateInfo.isMultiDay && (
                <div className="flex items-center gap-2">
                  <span>📅 {eventDateInfo.duration} días</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navegación por pestañas */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <Can key={tab.id} do={tab.permission.do} on={tab.permission.on}>
                    <Link
                      href={tab.href}
                      className={cn(
                        "group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm",
                        isActive
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-5 h-5 mr-2",
                          isActive
                            ? "text-blue-500"
                            : "text-gray-400 group-hover:text-gray-500"
                        )}
                      />
                      <span>{tab.name}</span>
                      {tab.badge && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {tab.badge}
                        </Badge>
                      )}
                    </Link>
                  </Can>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    );
  }

  // Renderizar header personalizado para la página de tipos de boletos
  if (isOnTicketTypesPage) {
    return (
      <div>
        {/* Header usando PageHeader component */}
        <PageHeader
          icon={Ticket}
          title={`Tipos de Boletos - ${event.name}`}
          description="Configuración de precios y características de boletos"
          iconColor="blue"
          badgeColor="blue"
          actions={
            ticketTypesActions && (
              <>
                <Button
                  variant="outline"
                  onClick={ticketTypesActions.onRefresh}
                  disabled={ticketTypesActions.isRefreshing}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${ticketTypesActions.isRefreshing ? "animate-spin" : ""}`} />
                  {ticketTypesActions.isRefreshing ? "Actualizando..." : "Actualizar"}
                </Button>

                <Can do="create" on="ticketTypes">
                  <Button 
                    className="flex items-center gap-2"
                    onClick={ticketTypesActions.onNewType}
                  >
                    <Plus className="w-4 h-4" />
                    Nuevo tipo
                  </Button>
                </Can>
              </>
            )
          }
        />

        {/* Información del evento */}
        <div className="bg-gray-50 border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                <span>{eventDateInfo.dateRange}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>📍 {event.location}</span>
              </div>
              {eventDateInfo.isMultiDay && (
                <div className="flex items-center gap-2">
                  <span>📅 {eventDateInfo.duration} días</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navegación por pestañas */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <Can key={tab.id} do={tab.permission.do} on={tab.permission.on}>
                    <Link
                      href={tab.href}
                      className={cn(
                        "group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm",
                        isActive
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-5 h-5 mr-2",
                          isActive
                            ? "text-blue-500"
                            : "text-gray-400 group-hover:text-gray-500"
                        )}
                      />
                      <span>{tab.name}</span>
                      {tab.badge && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {tab.badge}
                        </Badge>
                      )}
                    </Link>
                  </Can>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="px-6 pt-6">
        <Breadcrumb items={breadcrumbItems} />
      </div>

      {/* Header del evento */}
      <div className="px-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">{event.name}</h1>
              <Badge variant={event.published ? "default" : "secondary"}>
                {event.published ? "Publicado" : "Borrador"}
              </Badge>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                <span>{eventDateInfo.dateRange}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>📍 {event.location}</span>
              </div>
              {eventDateInfo.isMultiDay && (
                <div className="flex items-center gap-2">
                  <span>📅 {eventDateInfo.duration} días</span>
                </div>
              )}
            </div>

            {event.description && (
              <p className="text-gray-600 max-w-2xl">{event.description}</p>
            )}
          </div>
        </div>

        {/* Navegación por pestañas */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <Can key={tab.id} do={tab.permission.do} on={tab.permission.on}>
                  <Link
                    href={tab.href}
                    className={cn(
                      "group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm",
                      isActive
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-5 h-5 mr-2",
                        isActive
                          ? "text-blue-500"
                          : "text-gray-400 group-hover:text-gray-500"
                      )}
                    />
                    <span>{tab.name}</span>
                    {tab.badge && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {tab.badge}
                      </Badge>
                    )}
                  </Link>
                </Can>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
