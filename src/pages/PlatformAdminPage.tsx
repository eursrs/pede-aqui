import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError } from '../api'
import { useAuth } from '../auth/AuthContext'
import type { PlatformRestaurant, UserStatus } from '../types'

const statusLabels: Record<UserStatus, string> = {
  pending: 'Aguardando aprovação', approved: 'Aprovado', rejected: 'Recusado',
}

export default function PlatformAdminPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [rows, setRows] = useState<PlatformRestaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')

  const refresh = useCallback(async () => {
    try {
      setRows(await api.getPlatformRestaurants())
      setMessage('')
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : 'Não foi possível carregar os cadastros.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  async function decide(row: PlatformRestaurant, action: 'approve' | 'reject') {
    setBusy(row.userId)
    setMessage('')
    try {
      if (action === 'approve') await api.approveRestaurant(row.userId)
      else await api.rejectRestaurant(row.userId)
      await refresh()
      setMessage(action === 'approve'
        ? `${row.restaurant.name} aprovado com sucesso.`
        : `Cadastro de ${row.restaurant.name} recusado.`)
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : 'Não foi possível atualizar.')
    } finally {
      setBusy('')
    }
  }

  const pending = rows.filter((row) => row.status === 'pending').length

  return (
    <main className="page">
      <header className="page-header dashboard-header">
        <div>
          <h1>Administração da plataforma</h1>
          <p>Olá, {user?.ownerName}. Aprove ou recuse os restaurantes cadastrados.</p>
        </div>
        <div className="header-actions">
          <button className="secondary" onClick={() => void refresh()}>Atualizar</button>
          <button className="secondary" onClick={() => void logout().then(() => navigate('/entrar'))}>Sair</button>
        </div>
      </header>

      {message && <div className="banner success">{message}</div>}
      <p className="muted">{pending} cadastro(s) aguardando aprovação.</p>

      {loading && <p className="muted">Carregando…</p>}
      {!loading && rows.length === 0 && <p className="empty">Nenhum restaurante cadastrado.</p>}

      <div className="platform-list">
        {rows.map((row) => (
          <article key={row.userId} className={`order-card status-${row.status}`}>
            <div className="order-card-head">
              <div>
                <strong>{row.restaurant.name}</strong>
                <span className="muted"> · {row.ownerName} · {row.email}</span>
              </div>
              <span className={`pill pill-${row.status}`}>{statusLabels[row.status]}</span>
            </div>
            <p className="muted">Endereço público: /cardapio/{row.restaurant.slug} · {row.restaurant.dishCount} prato(s) · {row.restaurant.orderCount} pedido(s)</p>
            <p className="muted">Cadastrado em {new Date(row.createdAt).toLocaleString('pt-BR')}</p>
            <div className="order-actions">
              <div className="status-buttons">
                <button className="approve" disabled={busy === row.userId} onClick={() => void decide(row, 'approve')}>Aprovar</button>
                <button disabled={busy === row.userId} onClick={() => void decide(row, 'reject')}>Recusar</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  )
}
