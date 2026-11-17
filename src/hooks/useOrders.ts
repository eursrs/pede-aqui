import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import type { Order, OrderStatus } from '../types'

export function useOrders(pollMs = 5000) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      setOrders(await api.getOrders())
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    if (!pollMs) return
    const timer = window.setInterval(() => void refresh(), pollMs)
    return () => window.clearInterval(timer)
  }, [refresh, pollMs])

  const setStatus = async (id: string, status: OrderStatus) => {
    await api.setOrderStatus(id, status)
    await refresh()
  }

  const removeOrder = async (id: string) => {
    await api.deleteOrder(id)
    await refresh()
  }

  return { orders, loading, error, refresh, setStatus, removeOrder }
}
