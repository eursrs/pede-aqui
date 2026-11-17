import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ApiError } from '../api'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const data = await login(email, password)
      navigate(data.user.role === 'platform_admin' ? '/admin' : '/painel', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível entrar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page auth-page">
      <section className="panel auth-card">
        <h1>Entrar</h1>
        <p className="muted">Acesse o painel do seu restaurante.</p>
        {error && <div className="banner error">{error}</div>}
        <form onSubmit={handleSubmit} className="dish-form">
          <label>E-mail<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label>Senha<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          <button className="primary" type="submit" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
        </form>
        <p className="auth-links">
          Ainda não tem conta? <Link to="/cadastro">Cadastre seu restaurante</Link>
        </p>
        <p><Link to="/">Voltar ao início</Link></p>
      </section>
    </main>
  )
}
