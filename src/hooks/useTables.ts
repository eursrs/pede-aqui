import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import type { RestaurantTable } from '../types'

export function useTables() {
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      setTables(await api.getTables())
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar as mesas.')
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const addTable = async (label: string) => {
    await api.addTable(label)
    await refresh()
  }

  const deleteTable = async (id: string) => {
    await api.deleteTable(id)
    await refresh()
  }

  return { tables, error, refresh, addTable, deleteTable }
}
