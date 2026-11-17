import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { api, ApiError } from '../api'
import type { Dish, Restaurant } from '../types'

export default function PublicMenuPage() {
  const { slug = '' } = useParams()
  const [searchParams] = useSearchParams()
  const table = (searchParams.get('mesa') ?? '').slice(0, 30)
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [dishes, setDishes] = useState<Dish[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [orderError, setOrderError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([api.getPublicRestaurant(slug), api.getPublicDishes(slug)])
      .then(([info, items]) => {
        if (!active) return
        setRestaurant(info)
        setDishes(items)
        setError('')
      })
      .catch((err) => {
        if (active) setError(err instanceof ApiError ? err.message : 'Não foi possível carregar o cardápio.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [slug])

  const categories = useMemo(
    () => [...new Set(dishes.map((dish) => dish.category))],
    [dishes],
  )
  const itemCount = Object.values(cart).reduce((a, b) => a + b, 0)
  const total = dishes.reduce((sum, dish) => sum + (cart[dish.id] ?? 0) * dish.price, 0)

  function changeQty(id: string, delta: number) {
    setConfirmation('')
    setCart((current) => {
      const next = { ...current }
      const qty = Math.max(0, (next[id] ?? 0) + delta)
      if (qty === 0) delete next[id]
      else next[id] = qty
      return next
    })
  }

  async function placeOrder() {
    const items = Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => ({ id, qty }))
    if (items.length === 0) return
    setSubmitting(true)
    setOrderError('')
    try {
      const order = await api.placeOrder(slug, items, note, table)
      setCart({})
      setNote('')
      setConfirmation(`Pedido enviado! Número #${order.id.slice(0, 8).toUpperCase()}. O restaurante já recebeu.`)
    } catch (err) {
      setOrderError(err instanceof ApiError ? err.message : 'Não foi possível enviar o pedido.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="page public-menu">
      <header className="page-header">
        {table && <span className="table-badge">Mesa {table}</span>}
        <h1>{restaurant?.name ?? 'Cardápio'}</h1>
        {restaurant?.description && <p>{restaurant.description}</p>}
      </header>

      {loading && <p className="muted">Carregando cardápio…</p>}
      {error && <div className="banner error">{error}</div>}
      {confirmation && <div className="banner success">{confirmation}</div>}
      {orderError && <div className="banner error">{orderError}</div>}
      {!loading && dishes.length === 0 && !error && <p className="empty">Este restaurante ainda não tem pratos disponíveis.</p>}

      {categories.map((category) => (
        <section key={category} className="category">
          <h2>{category}</h2>
          <div className="dish-grid">
            {dishes
              .filter((dish) => dish.category === category)
              .map((dish) => (
                <article key={dish.id} className="dish-card">
                  {dish.image && <img className="dish-image" src={dish.image} alt={`Foto de ${dish.name}`} />}
                  <h3>{dish.name}</h3>
                  <p className="description">{dish.description}</p>
                  <div className="dish-footer">
                    <span className="price">R$ {dish.price.toFixed(2).replace('.', ',')}</span>
                    <div className="qty-controls">
                      <button onClick={() => changeQty(dish.id, -1)} aria-label={`Remover um ${dish.name}`}>−</button>
                      <span>{cart[dish.id] ?? 0}</span>
                      <button onClick={() => changeQty(dish.id, 1)} aria-label={`Adicionar um ${dish.name}`}>+</button>
                    </div>
                  </div>
                </article>
              ))}
          </div>
        </section>
      ))}

      <div className="order-bar">
        <div className="order-summary">
          <span>{itemCount} {itemCount === 1 ? 'item' : 'itens'}</span>
          <strong>R$ {total.toFixed(2).replace('.', ',')}</strong>
        </div>
        <input
          className="note-input"
          placeholder="Observação (opcional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button className="primary" disabled={submitting || itemCount === 0} onClick={() => void placeOrder()}>
          {submitting ? 'Enviando…' : 'Fazer pedido'}
        </button>
      </div>

      <footer className="public-footer">
        <span className="footer-brand">Pede Aqui</span>
        <span>Cardápio digital e pedidos pelo celular.</span>
      </footer>
    </main>
  )
}
