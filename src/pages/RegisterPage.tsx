import { Link } from 'react-router-dom'
import OwnerRequestForm from '../components/OwnerRequestForm'

export default function RegisterPage() {
  return (
    <main className="page auth-page">
      <section className="panel auth-card">
        <h1>Solicitar acesso</h1>
        <p className="muted">Cadastre seu restaurante para usar o aplicativo.</p>
        <OwnerRequestForm />
        <p className="auth-links">Já tem conta? <Link to="/entrar">Entrar</Link></p>
        <p><Link to="/">Voltar ao início</Link></p>
      </section>
    </main>
  )
}
