// src/hooks/use-dashboard-stats.ts
"use client"

import { useState, useCallback } from 'react'
import { auth } from '@/lib/firebase/client'
import { useToast } from '@/hooks/use-toast'
import type { Event, OrderSummary } from '@/types'

interface DashboardStats {
  totalEvents: number;
  totalTicketsSold: number;
  totalRevenue: number;
  totalPreregistrations: number;
  recentEvents: Event[];
  recentOrders: OrderSummary[];
}

export function useDashboardStats(initialStats: DashboardStats) {
  const [stats, setStats] = useState<DashboardStats>(initialStats)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const refreshStats = useCallback(async () => {
    try {
      setIsLoading(true)
      
      const currentUser = auth.currentUser
      if (!currentUser) {
        console.warn('No authenticated user for refresh')
        return
      }

      const token = await currentUser.getIdToken()
      console.log('🔄 Refreshing dashboard stats with token')
      
      const response = await fetch('/api/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats')
      }
      
      const updatedStats = await response.json()
      console.log('✅ Refreshed dashboard stats:', {
        events: updatedStats.totalEvents,
        tickets: updatedStats.totalTicketsSold,
        revenue: updatedStats.totalRevenue,
        preregistrations: updatedStats.totalPreregistrations
      })
      
      setStats(updatedStats)
    } catch (error) {
      console.error('Error refreshing dashboard stats:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron actualizar las estadísticas",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  // Función para actualizar stats localmente si fuera necesario
  const updateStatsLocally = useCallback((updatedStats: Partial<DashboardStats>) => {
    setStats(prev => ({
      ...prev,
      ...updatedStats
    }))
  }, [])

  return {
    stats,
    isLoading,
    refreshStats,
    updateStatsLocally,
  }
}
