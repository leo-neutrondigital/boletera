"use client";

import { createContext, useContext, useState, ReactNode } from 'react';

interface SalesPageContextType {
  salesActions: {
    onRefresh: () => void;
    onExport: () => void;
    isRefreshing: boolean;
  } | null;
  setSalesActions: (actions: {
    onRefresh: () => void;
    onExport: () => void;
    isRefreshing: boolean;
  } | null) => void;
  ticketTypesActions: {
    onRefresh: () => void;
    onNewType: () => void;
    isRefreshing: boolean;
  } | null;
  setTicketTypesActions: (actions: {
    onRefresh: () => void;
    onNewType: () => void;
    isRefreshing: boolean;
  } | null) => void;
  configActions: {
    onEdit: () => void;
    onTogglePublished: () => void;
    isUpdating: boolean;
  } | null;
  setConfigActions: (actions: {
    onEdit: () => void;
    onTogglePublished: () => void;
    isUpdating: boolean;
  } | null) => void;
  // 🆕 Nuevo: Acciones para preregistros
  preregistrosActions: {
    onRefresh: () => void;
    onExport: () => void;
    onChangeStatus: (id: string, status: string) => void;
    onDeleteSelected: (ids: string[]) => void;
    isRefreshing: boolean;
  } | null;
  setPreregistrosActions: (actions: {
    onRefresh: () => void;
    onExport: () => void;
    onChangeStatus: (id: string, status: string) => void;
    onDeleteSelected: (ids: string[]) => void;
    isRefreshing: boolean;
  } | null) => void;
}

const SalesPageContext = createContext<SalesPageContextType | undefined>(undefined);

export function SalesPageProvider({ children }: { children: ReactNode }) {
  const [salesActions, setSalesActions] = useState<{
    onRefresh: () => void;
    onExport: () => void;
    isRefreshing: boolean;
  } | null>(null);

  const [ticketTypesActions, setTicketTypesActions] = useState<{
    onRefresh: () => void;
    onNewType: () => void;
    isRefreshing: boolean;
  } | null>(null);

  const [configActions, setConfigActions] = useState<{
    onEdit: () => void;
    onTogglePublished: () => void;
    isUpdating: boolean;
  } | null>(null);

  // 🆕 Nuevo: Estado para preregistros
  const [preregistrosActions, setPreregistrosActions] = useState<{
    onRefresh: () => void;
    onExport: () => void;
    onChangeStatus: (id: string, status: string) => void;
    onDeleteSelected: (ids: string[]) => void;
    isRefreshing: boolean;
  } | null>(null);

  return (
    <SalesPageContext.Provider value={{ 
      salesActions, 
      setSalesActions, 
      ticketTypesActions, 
      setTicketTypesActions,
      configActions,
      setConfigActions,
      preregistrosActions,
      setPreregistrosActions
    }}>
      {children}
    </SalesPageContext.Provider>
  );
}

export function useSalesPage() {
  const context = useContext(SalesPageContext);
  if (context === undefined) {
    throw new Error('useSalesPage must be used within a SalesPageProvider');
  }
  return context;
}