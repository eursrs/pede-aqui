import type { ReactNode } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

type Props = {
  children: ReactNode
  role?: 'owner' | 'platform_admin'
}

export default function ProtectedRoute({ children, role }: Props) {
  const { user, loading, logout } = useAuth()

  if (loading) return <main className="page"><p className="muted">Carregando…</p></main>
  if (!user) return <Navigate to="/entrar" replace />

  if (role && user.role !== role) {
    return <Navigate to={user.role === 'platform_admin' ? '/admin' : '/painel'} replace />
  }

  if (user.role === 'owner' && user.status !== 'approved') {
    return (
      <main className="page">
        <section className="panel status-panel">
          {user.status === 'pending' ? (
            <>
              <h1>Cadastro em análise</h1>
              <p>Recebemos seu cadastro. Assim que nossa equipe aprovar, você poderá entrar e montar seu cardápio.</p>
            </>
          ) : (
            <>
              <h1>Cadastro não aprovado</h1>
              <p>Seu cadastro não foi aprovado. Entre em contato com a nossa equipe para esclarecer.</p>
            </>
          )}
          <p className="muted">Conectado como {user.email}.</p>
          <button className="secondary" onClick={() => void logout()}>Sair</button>
          <p><Link to="/">Voltar ao início</Link></p>
        </section>
      </main>
    )
  }

  return <>{children}</>
}
