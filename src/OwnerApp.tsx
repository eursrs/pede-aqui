import { useCallback, useEffect, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { api } from './api'
import { useAuth } from './auth/AuthContext'
import type { Category, Dish, Order, OrderStatus, RestaurantTable } from './types'

const money = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`
const clock = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
const clamp = (value: number, max: number) => Math.max(0, Math.min(max, value))

type Tab = 'menu' | 'tables' | 'orders'
const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'menu', label: 'Cardápio', icon: '☰' },
  { id: 'tables', label: 'Mesas', icon: '▦' },
  { id: 'orders', label: 'Pedidos', icon: '🔔' },
]

function LoginScreen() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-mark">PA</div>
        <p className="login-eyebrow">Pede Aqui · Gestão</p>
        <h1>Entrar</h1>
        <p className="login-sub">Acesse o painel do seu restaurante.</p>
        {error && <div className="alert error">{error}</div>}
        <form onSubmit={submit} className="app-form">
          <label>E-mail
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>Senha
            <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <button className="btn primary block" type="submit" disabled={busy}>
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
        <p className="login-hint">Conta de teste: teste@pedeaqui.com · teste12345</p>
      </div>
    </div>
  )
}

function MenuTab() {
  const [dishes, setDishes] = useState<Dish[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')
  const [category, setCategory] = useState('Todos')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', category: '', price: '' })
  const [newCategory, setNewCategory] = useState('')
  const [showCategoryInput, setShowCategoryInput] = useState(false)
  const [priceEdit, setPriceEdit] = useState<{ id: string; value: string } | null>(null)

  const refresh = useCallback(async () => {
    try {
      const [dishList, categoryList] = await Promise.all([api.getDishes(), api.getCategories()])
      setDishes(dishList)
      setCategories(categoryList)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar o cardápio.')
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  async function run(action: () => Promise<unknown>) {
    try {
      await action()
      await refresh()
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Algo deu errado.')
    }
  }

  async function addDish(event: FormEvent) {
    event.preventDefault()
    const price = Number(form.price)
    if (!form.name.trim() || !Number.isFinite(price) || price < 0) return
    await run(async () => {
      await api.addDish({
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category.trim() || 'Geral',
        price,
        available: true,
        image: '',
      })
    })
    setForm({ name: '', description: '', category: '', price: '' })
    setAdding(false)
  }

  async function savePrice(dish: Dish) {
    const next = Number(priceEdit?.value)
    setPriceEdit(null)
    if (!Number.isFinite(next) || next < 0 || next === dish.price) return
    await run(() => api.updateDish(dish.id, { price: next }))
  }

  function moveCategory(dish: Dish, direction: -1 | 1) {
    const names = ['Geral', ...categories.map((c) => c.name)]
    const index = names.indexOf(dish.category)
    const next = names[index + direction]
    if (next) void run(() => api.updateDish(dish.id, { category: next }))
  }

  const visible = dishes.filter((dish) => {
    const matchesText = dish.name.toLowerCase().includes(filter.toLowerCase().trim())
    const matchesCategory = category === 'Todos' || dish.category === category
    return matchesText && matchesCategory
  })

  return (
    <section className="tab-panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Gestão</p>
          <h1>Cardápio</h1>
        </div>
        <button className="btn primary" onClick={() => setAdding((value) => !value)}>
          {adding ? 'Fechar' : '+ Produto'}
        </button>
      </div>
      {error && <div className="alert error">{error}</div>}

      {adding && (
        <form className="card form-card" onSubmit={addDish}>
          <h2>Novo produto</h2>
          <div className="form-grid">
            <label>Nome<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label>Categoria
              <input list="app-categories" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Geral" />
              <datalist id="app-categories">{categories.map((c) => <option key={c.id} value={c.name} />)}</datalist>
            </label>
            <label className="wide">Descrição<input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            <label>Preço (R$)<input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label>
          </div>
          <button className="btn primary" type="submit">Adicionar</button>
        </form>
      )}

      <div className="card tools-card">
        <input className="search" placeholder="Buscar produto…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <div className="chips">
          {['Todos', ...categories.map((c) => c.name)].map((name) => (
            <button key={name} className={`chip ${category === name ? 'active' : ''}`} onClick={() => setCategory(name)}>{name}</button>
          ))}
          <button className="chip add" onClick={() => setShowCategoryInput((value) => !value)}>+ categoria</button>
        </div>
        {showCategoryInput && (
          <form className="inline-add" onSubmit={(event) => {
            event.preventDefault()
            const name = newCategory.trim()
            if (!name) return
            void run(async () => { await api.addCategory(name) })
            setNewCategory('')
            setShowCategoryInput(false)
          }}>
            <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Nome da categoria" autoFocus />
            <button className="btn small" type="submit">Salvar</button>
          </form>
        )}
      </div>

      <div className="dish-list">
        {visible.length === 0 && <div className="empty">Nenhum produto encontrado.</div>}
        {visible.map((dish) => (
          <article className={`card dish-card ${dish.available ? '' : 'off'}`} key={dish.id}>
            <div className="dish-main">
              <strong>{dish.name}</strong>
              <span className="muted">{dish.description || 'Sem descrição'}</span>
              <span className="tag">{dish.category}</span>
            </div>
            <div className="dish-side">
              {priceEdit?.id === dish.id ? (
                <input
                  className="price-field"
                  type="number"
                  step="0.01"
                  autoFocus
                  value={priceEdit.value}
                  onChange={(e) => setPriceEdit({ id: dish.id, value: e.target.value })}
                  onBlur={() => void savePrice(dish)}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                />
              ) : (
                <button className="price" onClick={() => setPriceEdit({ id: dish.id, value: String(dish.price) })}>{money(dish.price)}</button>
              )}
              <label className="switch">
                <input type="checkbox" checked={dish.available} onChange={(e) => void run(() => api.updateDish(dish.id, { available: e.target.checked }))} />
                <span>{dish.available ? 'Disponível' : 'Indisponível'}</span>
              </label>
              <div className="row-actions">
                <button className="mini" onClick={() => moveCategory(dish, -1)} aria-label="Categoria anterior">‹</button>
                <button className="mini" onClick={() => moveCategory(dish, 1)} aria-label="Próxima categoria">›</button>
                <button className="mini danger" onClick={() => void run(() => api.deleteDish(dish.id))}>Excluir</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function TablesTab() {
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [labelDraft, setLabelDraft] = useState('')
  const mapRef = useRef<HTMLDivElement>(null)
  const positionsRef = useRef<RestaurantTable[]>([])
  const dragRef = useRef<{ id: string; startX: number; startY: number; originX: number; originY: number } | null>(null)

  const refresh = useCallback(async () => {
    try {
      const data = await api.getTables()
      setTables(data)
      positionsRef.current = data
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar as mesas.')
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const selected = tables.find((table) => table.id === selectedId) ?? null

  async function addTable() {
    try {
      await api.addTable(String(tables.length + 1))
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível adicionar a mesa.')
    }
  }

  function onPointerDown(event: ReactPointerEvent<HTMLButtonElement>, table: RestaurantTable) {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { id: table.id, startX: event.clientX, startY: event.clientY, originX: table.x, originY: table.y }
    setSelectedId(table.id)
    setLabelDraft(table.label)
  }

  function onPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current
    const map = mapRef.current
    if (!drag || !map) return
    const x = clamp(drag.originX + event.clientX - drag.startX, map.clientWidth - 80)
    const y = clamp(drag.originY + event.clientY - drag.startY, map.clientHeight - 80)
    const next = tables.map((table) => table.id === drag.id ? { ...table, x, y } : table)
    positionsRef.current = next
    setTables(next)
  }

  async function onPointerUp() {
    const drag = dragRef.current
    dragRef.current = null
    if (!drag) return
    const table = positionsRef.current.find((item) => item.id === drag.id)
    if (!table) return
    try {
      await api.updateTable(table.id, { x: table.x, y: table.y })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar a posição.')
    }
  }

  async function saveLabel() {
    if (!selected || !labelDraft.trim()) return
    try {
      await api.updateTable(selected.id, { label: labelDraft.trim() })
      setSelectedId(null)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível renomear a mesa.')
    }
  }

  async function removeSelected() {
    if (!selected) return
    try {
      await api.deleteTable(selected.id)
      setSelectedId(null)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível remover a mesa.')
    }
  }

  return (
    <section className="tab-panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Salão</p>
          <h1>Mapa de mesas</h1>
        </div>
        <button className="btn primary" onClick={() => void addTable()}>+ Mesa</button>
      </div>
      {error && <div className="alert error">{error}</div>}
      <p className="hint">Arraste as mesas para organizar o salão. Toque em uma mesa para renomear ou remover.</p>
      <div className="map-card" ref={mapRef}>
        {tables.map((table) => (
          <button
            key={table.id}
            className={`table-tile ${selectedId === table.id ? 'selected' : ''}`}
            style={{ left: table.x, top: table.y }}
            onPointerDown={(event) => onPointerDown(event, table)}
            onPointerMove={onPointerMove}
            onPointerUp={() => void onPointerUp()}
          >
            <span className="table-number">{table.label}</span>
          </button>
        ))}
        {tables.length === 0 && <span className="map-empty">Nenhuma mesa ainda. Toque em + Mesa.</span>}
      </div>
      {selected && (
        <div className="card table-editor">
          <h2>Editar mesa</h2>
          <div className="inline-add">
            <input value={labelDraft} onChange={(e) => setLabelDraft(e.target.value)} />
            <button className="btn small" onClick={() => void saveLabel()}>Salvar</button>
            <button className="btn small danger" onClick={() => void removeSelected()}>Remover</button>
          </div>
        </div>
      )}
    </section>
  )
}

const statusLabels: Record<OrderStatus, string> = { new: 'Novo', preparing: 'Preparando', done: 'Pronto' }
const statusOrder: OrderStatus[] = ['new', 'preparing', 'done']

function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([])
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState('')

  const refresh = useCallback(async () => {
    try {
      setOrders(await api.getOrders())
      setUpdatedAt(new Date().toLocaleTimeString('pt-BR'))
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os pedidos.')
    }
  }, [])

  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => void refresh(), 4000)
    return () => window.clearInterval(timer)
  }, [refresh])

  async function setStatus(order: Order, status: OrderStatus) {
    try {
      await api.setOrderStatus(order.id, status)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível atualizar o pedido.')
    }
  }

  async function remove(order: Order) {
    try {
      await api.deleteOrder(order.id)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível remover o pedido.')
    }
  }

  return (
    <section className="tab-panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Tempo real</p>
          <h1>Pedidos</h1>
        </div>
        <span className="live"><span className="dot" /> {updatedAt || 'conectando…'}</span>
      </div>
      {error && <div className="alert error">{error}</div>}
      {statusOrder.map((status) => {
        const group = orders.filter((order) => order.status === status)
        return (
          <div className={`order-group ${status}`} key={status}>
            <div className="group-head">
              <h2>{statusLabels[status]}</h2>
              <span className="count">{group.length}</span>
            </div>
            {group.length === 0 && <p className="group-empty">Nenhum pedido aqui.</p>}
            {group.map((order) => (
              <article className="card order-card" key={order.id}>
                <div className="order-top">
                  <strong>#{order.id.slice(0, 6).toUpperCase()}</strong>
                  {order.tableLabel && <span className="table-badge">Mesa {order.tableLabel}</span>}
                  <span className="muted">{clock(order.createdAt)}</span>
                  <strong className="order-total">{money(order.total)}</strong>
                </div>
                <ul className="order-items">
                  {order.items.map((item) => (
                    <li key={item.id}>{item.qty}× {item.name} <span>{money(item.lineTotal)}</span></li>
                  ))}
                </ul>
                {order.note && <p className="note">Obs.: {order.note}</p>}
                <div className="order-actions">
                  {status === 'new' && <button className="btn small primary" onClick={() => void setStatus(order, 'preparing')}>Preparar</button>}
                  {status === 'preparing' && <button className="btn small primary" onClick={() => void setStatus(order, 'done')}>Pronto</button>}
                  {status === 'done' && <button className="btn small" onClick={() => void setStatus(order, 'new')}>Reabrir</button>}
                  <button className="btn small danger" onClick={() => void remove(order)}>Excluir</button>
                </div>
              </article>
            ))}
          </div>
        )
      })}
    </section>
  )
}

export default function OwnerApp() {
  const { user, restaurant, loading, logout } = useAuth()
  const [tab, setTab] = useState<Tab>('orders')

  if (loading) return <div className="splash"><div className="login-mark">PA</div><p>Carregando…</p></div>
  if (!user) return <LoginScreen />
  if (user.role === 'owner' && user.status !== 'approved') {
    return (
      <div className="splash">
        <div className="login-mark">PA</div>
        <h1>{user.status === 'pending' ? 'Aguardando aprovação' : 'Acesso não aprovado'}</h1>
        <p>Seu cadastro ainda não está liberado para usar o app.</p>
        <button className="btn primary" onClick={() => void logout()}>Sair</button>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-brand"><span className="brand-mark">PA</span><span>Pede Aqui <small>Gestão</small></span></div>
        <div className="header-right">
          <span className="restaurant-name">{restaurant?.name ?? user.ownerName}</span>
          <button className="logout" onClick={() => void logout()} aria-label="Sair">⏻</button>
        </div>
      </header>
      <main className="app-content">
        {tab === 'menu' && <MenuTab />}
        {tab === 'tables' && <TablesTab />}
        {tab === 'orders' && <OrdersTab />}
      </main>
      <nav className="tab-bar">
        {tabs.map((item) => (
          <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}>
            <span className="tab-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
