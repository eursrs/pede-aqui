import { useCallback, useEffect, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { api } from './api'
import { useAuth } from './auth/AuthContext'
import type { Category, Dish, Order, OrderStatus, RestaurantTable, TableSeats, TableShape } from './types'

const money = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`
const clock = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
const clamp = (value: number, max: number) => Math.max(0, Math.min(max, value))
const THEME_KEY = 'pede-aqui-theme'
const TABLE_SIZE = 116
const SEAT_OPTIONS: TableSeats[] = [2, 4, 6]

// Cadeiras distribuídas ao redor do tampo, começando no topo.
function seatAngles(seats: TableSeats) {
  return Array.from({ length: seats }, (_, index) => -Math.PI / 2 + (index * 2 * Math.PI) / seats)
}

function useTheme() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'dark' || saved === 'light') return saved === 'dark'
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  })

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light')
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#181a1d' : '#d92d20')
  }, [dark])

  return { dark, toggle: () => setDark((value) => !value) }
}

type IconName = 'menu' | 'tables' | 'orders' | 'sun' | 'moon' | 'logout' | 'plus'

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': 'true' as const,
  }
  switch (name) {
    case 'menu':
      return <svg {...common}><path d="M4 6h16M4 12h16M4 18h10" /><circle cx="19" cy="18" r="1" fill="currentColor" stroke="none" /></svg>
    case 'tables':
      return <svg {...common}><rect x="3" y="3" width="8" height="8" rx="2" /><rect x="13" y="3" width="8" height="8" rx="2" /><rect x="3" y="13" width="8" height="8" rx="2" /><rect x="13" y="13" width="8" height="8" rx="2" /></svg>
    case 'orders':
      return <svg {...common}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></svg>
    case 'sun':
      return <svg {...common}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
    case 'moon':
      return <svg {...common}><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" /></svg>
    case 'logout':
      return <svg {...common}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></svg>
    case 'plus':
      return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>
  }
}

function ThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className="icon-btn theme-toggle"
      onClick={onToggle}
      aria-label={dark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      title={dark ? 'Modo claro' : 'Modo escuro'}
    >
      <Icon name={dark ? 'sun' : 'moon'} />
    </button>
  )
}

type Tab = 'menu' | 'tables' | 'orders'
const tabs: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'menu', label: 'Cardápio', icon: <Icon name="menu" /> },
  { id: 'tables', label: 'Mesas', icon: <Icon name="tables" /> },
  { id: 'orders', label: 'Pedidos', icon: <Icon name="orders" /> },
]

function LoginScreen({ dark, onToggleTheme }: { dark: boolean; onToggleTheme: () => void }) {
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
        <div className="login-card-top">
          <div className="login-mark">PA</div>
          <ThemeToggle dark={dark} onToggle={onToggleTheme} />
        </div>
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
          {adding ? 'Fechar' : <><Icon name="plus" size={16} /> Novo produto</>}
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

function ShapePicker({ value, onChange }: { value: TableShape; onChange: (value: TableShape) => void }) {
  return (
    <div className="field-group">
      <span className="field-label">Formato</span>
      <div className="segmented" role="group" aria-label="Formato da mesa">
        <button type="button" className={value === 'round' ? 'active' : ''} onClick={() => onChange('round')}>Redonda</button>
        <button type="button" className={value === 'square' ? 'active' : ''} onClick={() => onChange('square')}>Quadrada</button>
      </div>
    </div>
  )
}

function SeatPicker({ value, onChange }: { value: TableSeats; onChange: (value: TableSeats) => void }) {
  return (
    <div className="field-group">
      <span className="field-label">Lugares</span>
      <div className="segmented" role="group" aria-label="Número de lugares">
        {SEAT_OPTIONS.map((seats) => (
          <button type="button" key={seats} className={value === seats ? 'active' : ''} onClick={() => onChange(seats)}>{seats}</button>
        ))}
      </div>
    </div>
  )
}

function TablesTab() {
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [labelDraft, setLabelDraft] = useState('')
  const [shapeDraft, setShapeDraft] = useState<TableShape>('round')
  const [seatsDraft, setSeatsDraft] = useState<TableSeats>(4)
  const [adding, setAdding] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newShape, setNewShape] = useState<TableShape>('round')
  const [newSeats, setNewSeats] = useState<TableSeats>(4)
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

  function openAddForm() {
    setNewLabel(String(tables.length + 1))
    setNewShape('round')
    setNewSeats(4)
    setAdding(true)
    setSelectedId(null)
  }

  async function addTable(event: FormEvent) {
    event.preventDefault()
    const label = newLabel.trim() || String(tables.length + 1)
    try {
      await api.addTable(label, newShape, newSeats)
      setAdding(false)
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
    setShapeDraft(table.shape)
    setSeatsDraft(table.seats)
    setAdding(false)
  }

  function onPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current
    const map = mapRef.current
    if (!drag || !map) return
    const x = clamp(drag.originX + event.clientX - drag.startX, map.clientWidth - TABLE_SIZE)
    const y = clamp(drag.originY + event.clientY - drag.startY, map.clientHeight - TABLE_SIZE)
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

  async function saveTable() {
    if (!selected || !labelDraft.trim()) return
    try {
      await api.updateTable(selected.id, { label: labelDraft.trim(), shape: shapeDraft, seats: seatsDraft })
      setSelectedId(null)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar a mesa.')
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
        <button className="btn primary" onClick={openAddForm}><Icon name="plus" size={16} /> Nova mesa</button>
      </div>
      {error && <div className="alert error">{error}</div>}
      <p className="hint">Arraste as mesas para organizar o salão. Toque em uma mesa para editar o formato, os lugares ou remover.</p>

      {adding && (
        <form className="card form-card" onSubmit={addTable}>
          <h2>Nova mesa</h2>
          <div className="form-grid">
            <label className="wide">Número ou nome
              <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} autoFocus />
            </label>
            <ShapePicker value={newShape} onChange={setNewShape} />
            <SeatPicker value={newSeats} onChange={setNewSeats} />
          </div>
          <div className="form-actions">
            <button className="btn primary" type="submit">Adicionar mesa</button>
            <button className="btn" type="button" onClick={() => setAdding(false)}>Cancelar</button>
          </div>
        </form>
      )}
      <div className="map-card" ref={mapRef}>
        <span className="map-label">Salão</span>
        {tables.map((table) => (
          <button
            key={table.id}
            className={`table-tile ${selectedId === table.id ? 'selected' : ''}`}
            style={{ left: table.x, top: table.y }}
            aria-label={`Mesa ${table.label}`}
            onPointerDown={(event) => onPointerDown(event, table)}
            onPointerMove={onPointerMove}
            onPointerUp={() => void onPointerUp()}
          >
            {seatAngles(table.seats).map((angle, index) => (
              <span
                key={index}
                className="chair"
                style={{
                  left: `${50 + 38 * Math.cos(angle)}%`,
                  top: `${50 + 38 * Math.sin(angle)}%`,
                  transform: `translate(-50%, -50%) rotate(${angle * 180 / Math.PI + 90}deg)`,
                }}
              />
            ))}
            <span className={`tabletop ${table.shape}`}><span className="table-number">{table.label}</span></span>
          </button>
        ))}
        {tables.length === 0 && <span className="map-empty">Nenhuma mesa ainda. Toque em Nova mesa.</span>}
      </div>
      {selected && (
        <div className="card table-editor">
          <h2>Editar mesa {selected.label}</h2>
          <div className="form-grid">
            <label className="wide">Número ou nome
              <input value={labelDraft} onChange={(e) => setLabelDraft(e.target.value)} aria-label="Número da mesa" />
            </label>
            <ShapePicker value={shapeDraft} onChange={setShapeDraft} />
            <SeatPicker value={seatsDraft} onChange={setSeatsDraft} />
          </div>
          <div className="form-actions">
            <button className="btn small primary" onClick={() => void saveTable()}>Salvar</button>
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
  const { dark, toggle: toggleTheme } = useTheme()

  if (loading) return <div className="splash"><div className="login-mark">PA</div><p>Carregando…</p></div>
  if (!user) return <LoginScreen dark={dark} onToggleTheme={toggleTheme} />
  if (user.role === 'owner' && user.status !== 'approved') {
    return (
      <div className="splash">
        <div className="login-card-top"><div className="login-mark">PA</div><ThemeToggle dark={dark} onToggle={toggleTheme} /></div>
        <h1>{user.status === 'pending' ? 'Aguardando aprovação' : 'Acesso não aprovado'}</h1>
        <p>Seu cadastro ainda não está liberado para usar o app.</p>
        <button className="btn primary" onClick={() => void logout()}>Sair</button>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-brand"><span className="brand-mark">PA</span><span className="brand-text">Pede Aqui <small>Gestão</small></span></div>
        <div className="header-right">
          <span className="restaurant-name">{restaurant?.name ?? user.ownerName}</span>
          <ThemeToggle dark={dark} onToggle={toggleTheme} />
          <button className="icon-btn logout" onClick={() => void logout()} aria-label="Sair" title="Sair"><Icon name="logout" /></button>
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
