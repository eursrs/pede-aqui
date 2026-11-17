import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import type { Report } from '../types'

export function useReports(days: number) {
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setReport(await api.getReport(days))
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar o relatório.')
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => { void refresh() }, [refresh])

  return { report, loading, error, refresh }
}
