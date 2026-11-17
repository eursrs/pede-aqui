import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../api'
import { useAuth } from '../auth/AuthContext'

const empty = { ownerName: '', restaurantName: '', email: '', password: '', description: '' }

export default function OwnerRequestForm() {
  const { register } = useAuth()
  const [form, setForm] = useState(empty)
  const [done, setDone] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = await register(form)
      setDone(result.message)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível enviar a solicitação.')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="request-success">
        <div className="banner success">{done}</div>
        <p className="muted">Guarde seu e-mail e senha. Depois da aprovação, entre com eles.</p>
        <Link className="button primary" to="/entrar">Ir para o login</Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="dish-form request-form">
      {error && <div className="banner error">{error}</div>}
      <label>Seu nome<input value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} /></label>
      <label>Nome do restaurante<input value={form.restaurantName} onChange={(e) => setForm({ ...form, restaurantName: e.target.value })} /></label>
      <label>E-mail<input type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
      <label>Senha (mínimo 8 caracteres)<input type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
      <label>Descrição do restaurante (opcional)<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
      <button className="primary" type="submit" disabled={busy}>{busy ? 'Enviando…' : 'Solicitar acesso'}</button>
      <p className="muted">Sua solicitação passa por análise antes de liberar o painel.</p>
    </form>
  )
}
