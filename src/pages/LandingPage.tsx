import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import OwnerRequestForm from '../components/OwnerRequestForm'

export default function LandingPage() {
  const { user } = useAuth()
  const { hash } = useLocation()
  const painel = user?.role === 'platform_admin' ? '/admin' : '/painel'

  useEffect(() => {
    if (hash === '#solicitar') {
      document.getElementById('solicitar')?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [hash])

  return (
    <main className="page landing">
      <section className="hero">
        <span className="eyebrow">carda.io</span>
        <h1>Cardápio digital para o seu restaurante</h1>
        <p>
          Crie seu cardápio online, receba pedidos pelo celular dos clientes e mantenha
          tudo atualizado em um só lugar. Basta gerar o QR Code e colocar na mesa.
        </p>
        <div className="hero-actions">
          {user ? (
            <Link className="button primary" to={painel}>Ir para meu painel</Link>
          ) : (
            <>
              <a className="button primary" href="#solicitar">Solicitar acesso</a>
              <Link className="button secondary" to="/entrar">Já tenho conta</Link>
            </>
          )}
        </div>
      </section>

      <section className="steps">
        <article className="panel">
          <span className="step-number">1</span>
          <h2>Solicite acesso</h2>
          <p>Preencha o formulário abaixo e aguarde a aprovação da nossa equipe.</p>
        </article>
        <article className="panel">
          <span className="step-number">2</span>
          <h2>Monte seu cardápio</h2>
          <p>Adicione pratos, fotos, categorias e preços quando quiser.</p>
        </article>
        <article className="panel">
          <span className="step-number">3</span>
          <h2>Receba pedidos</h2>
          <p>Os clientes escaneiam o QR Code, fazem o pedido e ele chega até você.</p>
        </article>
      </section>

      <section id="solicitar" className="panel request-section">
        <div className="request-heading">
          <h2>Quer seu restaurante aqui?</h2>
          <p className="muted">
            Envie seus dados para solicitar acesso ao aplicativo. Assim que aprovarmos,
            você recebe a liberação para entrar e criar seu cardápio.
          </p>
        </div>
        <OwnerRequestForm />
      </section>
    </main>
  )
}
