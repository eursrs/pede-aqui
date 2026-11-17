import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function LandingPage() {
  const { user } = useAuth()
  const painel = user?.role === 'platform_admin' ? '/admin' : '/painel'

  return (
    <main className="page landing">
      <section className="hero">
        <span className="eyebrow">Pede Aqui</span>
        <h1>Cardápio digital para o seu restaurante</h1>
        <p>
          Monte seu cardápio, adicione pratos, fotos e preços, e compartilhe o link
          ou o QR Code com seus clientes. Eles fazem o pedido direto pelo celular.
        </p>
        <div className="hero-actions">
          {user ? (
            <Link className="button primary" to={painel}>Ir para meu painel</Link>
          ) : (
            <>
              <Link className="button primary" to="/entrar">Entrar no painel</Link>
              <Link className="button secondary" to="/cardapio/cafe-da-ana">Ver cardápio de exemplo</Link>
            </>
          )}
        </div>
      </section>

      <section className="steps">
        <article className="panel">
          <span className="step-number">1</span>
          <h2>Receba seu acesso</h2>
          <p>O acesso é liberado pelo site de cadastro da equipe. Depois, entre com seu e-mail e senha.</p>
        </article>
        <article className="panel">
          <span className="step-number">2</span>
          <h2>Monte seu cardápio</h2>
          <p>Adicione pratos, fotos, categorias e preços quando quiser.</p>
        </article>
        <article className="panel">
          <span className="step-number">3</span>
          <h2>Receba pedidos</h2>
          <p>Gere o QR Code, coloque na mesa ou envie o link. Os clientes pedem e você recebe no painel.</p>
        </article>
      </section>
    </main>
  )
}
