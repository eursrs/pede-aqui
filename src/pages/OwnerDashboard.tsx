import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import { api } from '../api'
import ReportsPanel from '../components/ReportsPanel'
import { useAuth } from '../auth/AuthContext'
import CategoryManager from '../components/CategoryManager'
import DishImageCell from '../components/DishImageCell'
import TableQRManager from '../components/TableQRManager'
import { useCategories } from '../hooks/useCategories'
import { useDishes } from '../hooks/useDishes'
import { useOrders } from '../hooks/useOrders'
import { fileToDataUrl } from '../utils/image'
import type { Dish, OrderStatus } from '../types'

const emptyForm = { name: '', description: '', price: '', category: '', image: '' }
const statuses: OrderStatus[] = ['new', 'preparing', 'done']
const statusLabels: Record<OrderStatus, string> = {
  new: 'Novo', preparing: 'Preparando', done: 'Pronto',
}

function PriceInput({ dish, onSave }: { dish: Dish; onSave: (price: number) => void }) {
  const [value, setValue] = useState(String(dish.price))
  useEffect(() => setValue(String(dish.price)), [dish.price])

  function commit() {
    const next = Number(value)
    if (Number.isFinite(next) && next >= 0 && next !== dish.price) onSave(next)
    else setValue(String(dish.price))
  }

  return (
    <input
      className="price-input"
      type="number"
      step="0.01"
      min="0"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
    />
  )
}

export default function OwnerDashboard() {
  const { user, restaurant, refresh: refreshAuth, logout } = useAuth()
  const navigate = useNavigate()
  const { dishes, error: dishError, addDish, updateDish, removeDish } = useDishes()
  const categoryState = useCategories()
  const { categories } = categoryState
  const { orders, error: orderError, setStatus, removeOrder } = useOrders()
  const [form, setForm] = useState(emptyForm)
  const [settings, setSettings] = useState({ name: '', description: '' })
  const [qr, setQr] = useState('')
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  useEffect(() => {
    if (restaurant) setSettings({ name: restaurant.name, description: restaurant.description })
  }, [restaurant])

  const menuUrl = `${window.location.origin}/cardapio/${restaurant?.slug ?? ''}`

  useEffect(() => {
    if (!restaurant) return
    QRCode.toDataURL(menuUrl, { width: 220, margin: 1 }).then(setQr).catch(() => setQr(''))
  }, [menuUrl, restaurant])

  async function run(action: () => Promise<void>, label: string) {
    setBusy(label)
    setMessage('')
    try {
      await action()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Algo deu errado.')
    } finally {
      setBusy('')
    }
  }

  async function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setMessage('')
    try {
      const image = await fileToDataUrl(file)
      setForm((current) => ({ ...current, image }))
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Não foi possível usar a imagem.')
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const price = Number(form.price)
    if (!form.name.trim() || !Number.isFinite(price) || price < 0) return
    void run(async () => {
      await addDish({
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category.trim() || 'Geral',
        price,
        available: true,
        image: form.image,
      })
      setForm(emptyForm)
      setMessage('Prato adicionado ao cardápio.')
    }, 'adicionando')
  }

  function saveSettings(event: FormEvent) {
    event.preventDefault()
    void run(async () => {
      await api.updateMyRestaurant(settings)
      await refreshAuth()
      setMessage('Dados do restaurante atualizados.')
    }, 'salvando')
  }

  const newCount = orders.filter((order) => order.status === 'new').length
  const filteredOrders = orders.filter((order) => {
    const day = order.createdAt.slice(0, 10)
    return (statusFilter === 'all' || order.status === statusFilter)
      && (!fromDate || day >= fromDate)
      && (!toDate || day <= toDate)
  })

  return (
    <main className="page">
      <header className="page-header dashboard-header">
        <div>
          <h1>Painel do restaurante</h1>
          <p>Olá, {user?.ownerName}. Gerencie seu cardápio e acompanhe os pedidos.</p>
        </div>
        <button className="secondary" onClick={() => void logout().then(() => navigate('/entrar'))}>Sair</button>
      </header>

      {(message || dishError || orderError) && (
        <div className={`banner ${dishError || orderError ? 'error' : 'success'}`}>
          {dishError || orderError || message}
        </div>
      )}

      <div className="admin-layout">
        <section className="panel">
          <h2>Adicionar prato</h2>
          <form onSubmit={handleSubmit} className="dish-form">
            <label>Nome<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label>
              Categoria
              <input
                list="category-options"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Ex.: Bebidas"
              />
              <datalist id="category-options">
                {categories.map((category) => <option key={category.id} value={category.name} />)}
              </datalist>
            </label>
            <label>Descrição<input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            <label>Preço (R$)<input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label>
            <label>
              Foto do prato
              <input type="file" accept="image/*" onChange={(event) => void handlePhoto(event)} />
            </label>
            {form.image && (
              <div className="photo-preview">
                <img src={form.image} alt="Prévia da foto do prato" />
                <button type="button" className="mini-button danger" onClick={() => setForm({ ...form, image: '' })}>Remover foto</button>
              </div>
            )}
            <button className="primary" type="submit" disabled={busy === 'adicionando'}>Adicionar prato</button>
          </form>
        </section>

        <section className="panel">
          <h2>QR Code dos clientes</h2>
          <p className="muted">Abra este painel pelo endereço da rede para o QR funcionar no celular.</p>
          <code className="url">{menuUrl}</code>
          {qr && <img className="qr" src={qr} alt="QR Code do cardápio" />}
          <p><Link to={`/cardapio/${restaurant?.slug ?? ''}`} target="_blank">Ver cardápio público</Link></p>
        </section>
      </div>

      <TableQRManager slug={restaurant?.slug ?? ''} />

      <CategoryManager {...categoryState} />

      <section className="panel">
        <h2>Dados do restaurante</h2>
        <form onSubmit={saveSettings} className="settings-form">
          <label>Nome<input value={settings.name} onChange={(e) => setSettings({ ...settings, name: e.target.value })} /></label>
          <label>Descrição<textarea value={settings.description} onChange={(e) => setSettings({ ...settings, description: e.target.value })} /></label>
          <button className="secondary" type="submit" disabled={busy === 'salvando'}>Salvar dados</button>
        </form>
      </section>

      <section className="panel">
        <h2>Cardápio atual</h2>
        {dishes.length === 0 && <p className="empty">Nenhum prato cadastrado ainda.</p>}
        <div className="table-scroll">
          <table className="dish-table">
            <thead>
              <tr><th>Foto</th><th>Prato</th><th>Categoria</th><th>Preço</th><th>Disponível</th><th></th></tr>
            </thead>
            <tbody>
              {dishes.map((dish) => (
                <tr key={dish.id}>
                  <td>
                    <DishImageCell
                      image={dish.image}
                      name={dish.name}
                      disabled={busy === `photo-${dish.id}`}
                      onSave={(image) => run(() => updateDish(dish.id, { image }), `photo-${dish.id}`)}
                    />
                  </td>
                  <td>{dish.name}</td>
                  <td>{dish.category}</td>
                  <td>
                    <PriceInput
                      dish={dish}
                      onSave={(price) => void run(() => updateDish(dish.id, { price }), `price-${dish.id}`)}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={dish.available}
                      onChange={(e) => void run(() => updateDish(dish.id, { available: e.target.checked }), `available-${dish.id}`)}
                    />
                  </td>
                  <td>
                    <button className="danger" disabled={busy === `delete-${dish.id}`} onClick={() => void run(() => removeDish(dish.id), `delete-${dish.id}`)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Pedidos recebidos</h2>
          {newCount > 0 && <span className="badge">{newCount} novo(s)</span>}
        </div>
        <p className="muted">Atualiza automaticamente a cada alguns segundos.</p>
        <div className="order-filters">
          <div className="period-tabs">
            {([['all', 'Todos'], ['new', 'Novos'], ['preparing', 'Preparando'], ['done', 'Concluídos']] as const).map(([value, label]) => (
              <button
                key={value}
                className={statusFilter === value ? 'active' : ''}
                onClick={() => setStatusFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="date-filters">
            <label>De <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></label>
            <label>Até <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></label>
          </div>
        </div>
        {filteredOrders.length === 0 && <p className="empty">Nenhum pedido encontrado com esses filtros.</p>}
        <div className="order-list">
          {filteredOrders.map((order) => (
            <article key={order.id} className={`order-card status-${order.status}`}>
              <div className="order-card-head">
                <div>
                  <strong>#{order.id.slice(0, 8).toUpperCase()}</strong>
                  {order.tableLabel && <span className="badge table-order-badge">Mesa {order.tableLabel}</span>}
                  <span className="muted"> · {new Date(order.createdAt).toLocaleString('pt-BR')}</span>
                </div>
                <strong>R$ {order.total.toFixed(2).replace('.', ',')}</strong>
              </div>
              <ul>
                {order.items.map((item) => (
                  <li key={item.id}>{item.qty} × {item.name} <span className="muted">(R$ {item.lineTotal.toFixed(2).replace('.', ',')})</span></li>
                ))}
              </ul>
              {order.note && <p className="order-note">Observação: {order.note}</p>}
              <div className="order-actions">
                <div className="status-buttons">
                  {statuses.map((status) => (
                    <button
                      key={status}
                      className={order.status === status ? 'active' : ''}
                      disabled={busy === `status-${order.id}`}
                      onClick={() => void run(() => setStatus(order.id, status), `status-${order.id}`)}
                    >
                      {statusLabels[status]}
                    </button>
                  ))}
                </div>
                <button className="danger" disabled={busy === `order-${order.id}`} onClick={() => void run(() => removeOrder(order.id), `order-${order.id}`)}>Excluir</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <ReportsPanel />
    </main>
  )
}
