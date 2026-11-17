import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import type { Category } from '../types'

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      setCategories(await api.getCategories())
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar as categorias.')
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const addCategory = async (name: string) => {
    await api.addCategory(name)
    await refresh()
  }

  const renameCategory = async (id: string, name: string) => {
    await api.updateCategory(id, { name })
    await refresh()
  }

  // Troca a posição com a categoria vizinha, mantendo a ordem consistente.
  const moveCategory = async (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= categories.length) return
    const current = categories[index]!
    const neighbour = categories[target]!
    await Promise.all([
      api.updateCategory(current.id, { position: neighbour.position }),
      api.updateCategory(neighbour.id, { position: current.position }),
    ])
    await refresh()
  }

  const deleteCategory = async (id: string) => {
    await api.deleteCategory(id)
    await refresh()
  }

  return { categories, error, refresh, addCategory, renameCategory, moveCategory, deleteCategory }
}
