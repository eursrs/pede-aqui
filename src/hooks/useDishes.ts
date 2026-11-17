import { useCallback, useEffect, useState } from 'react'
import { api, type DishInput } from '../api'
import type { Dish } from '../types'

export function useDishes() {
  const [dishes, setDishes] = useState<Dish[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      const data = await api.getDishes()
      setDishes(data)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dishes.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const addDish = async (dish: DishInput) => {
    await api.addDish(dish)
    await refresh()
  }

  const updateDish = async (id: string, patch: Partial<DishInput>) => {
    await api.updateDish(id, patch)
    await refresh()
  }

  const removeDish = async (id: string) => {
    await api.deleteDish(id)
    await refresh()
  }

  return { dishes, loading, error, refresh, addDish, updateDish, removeDish }
}
