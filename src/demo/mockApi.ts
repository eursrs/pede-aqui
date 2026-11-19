import type {
  Category, Dish, Order, OrderStatus, PlatformRestaurant, Report,
  Restaurant, RestaurantTable, User,
} from '../types'

export const isDemo = typeof window !== 'undefined'
  && (window.location.hostname.endsWith('.github.io') || import.meta.env.VITE_DEMO === 'true')

type DemoState = {
  users: (User & { password: string })[]
  restaurants: Restaurant[]
  dishes: Dish[]
  categories: Category[]
  tables: RestaurantTable[]
  orders: Order[]
  currentUserId: string | null
}

const STORAGE_KEY = 'pedeaqui-demo-state-v1'
const uid = () => crypto.randomUUID()
const dayAgo = (days: number) => new Date(Date.now() - days * 86400000).toISOString()

function slugify(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'restaurante'
}

function seed(): DemoState {
  const now = new Date().toISOString()
  const admin: User & { password: string } = {
    id: 'admin-demo', email: 'admin@pedeaqui.com', ownerName: 'Admin Pede Aqui',
    role: 'platform_admin', status: 'approved', createdAt: now, password: 'admin12345',
  }
  const owner: User & { password: string } = {
    id: 'owner-demo', email: 'dono@pedeaqui.com', ownerName: 'Ana Souza',
    role: 'owner', status: 'approved', createdAt: now, password: 'senha12345',
  }
  const pending: User & { password: string } = {
    id: 'pending-demo', email: 'novo@pedeaqui.com', ownerName: 'Carlos Lima',
    role: 'owner', status: 'pending', createdAt: now, password: 'senha12345',
  }
  const restaurant: Restaurant = {
    id: 'rest-demo', owner_id: owner.id, name: 'Café da Ana', slug: 'cafe-da-ana',
    description: 'Café artesanal e doces caseiros.', createdAt: now,
  }
  const pendingRestaurant: Restaurant = {
    id: 'rest-pending', owner_id: pending.id, name: 'Bistrô do Carlos', slug: 'bistro-do-carlos',
    description: 'Comida caseira.', createdAt: now,
  }
  const cats: Category[] = [
    { id: 'cat-1', name: 'Bebidas', position: 0 },
    { id: 'cat-2', name: 'Doces', position: 1 },
  ]
  const dishes: Dish[] = [
    { id: 'dish-1', restaurant_id: restaurant.id, name: 'Café coado', description: 'Café fresco da manhã', price: 12, category: 'Bebidas', available: true, image: '' },
    { id: 'dish-2', restaurant_id: restaurant.id, name: 'Capuccino', description: 'Com leite e espuma', price: 16, category: 'Bebidas', available: true, image: '' },
    { id: 'dish-3', restaurant_id: restaurant.id, name: 'Bolo de chocolate', description: 'Fatia generosa', price: 18, category: 'Doces', available: true, image: '' },
  ]
  const tables: RestaurantTable[] = [
    { id: 'table-1', label: '1', x: 20, y: 20, createdAt: now },
    { id: 'table-2', label: '2', x: 116, y: 20, createdAt: now },
  ]
  const orders: Order[] = [
    {
      id: 'pedido-1', createdAt: dayAgo(0), status: 'new', total: 28,
      items: [{ id: 'dish-1', name: 'Café coado', price: 12, qty: 1, lineTotal: 12 }, { id: 'dish-3', name: 'Bolo de chocolate', price: 18, qty: 1, lineTotal: 18 }],
      note: 'Sem açúcar', tableLabel: '2',
    },
    {
      id: 'pedido-2', createdAt: dayAgo(1), status: 'done', total: 32,
      items: [{ id: 'dish-2', name: 'Capuccino', price: 16, qty: 2, lineTotal: 32 }],
      note: '', tableLabel: '1',
    },
  ]
  return { users: [admin, owner, pending], restaurants: [restaurant, pendingRestaurant], dishes, categories: cats, tables, orders, currentUserId: null }
}

function load(): DemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as DemoState
  } catch { /* usa o seed */ }
  return seed()
}

let state = load()
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch { /* ignora */ }
}

function publicUser(user: User | undefined): User | null {
  if (!user) return null
  const { password: _password, ...rest } = user as User & { password: string }
  return rest
}

function session() {
  const user = state.users.find((u) => u.id === state.currentUserId)
  if (!user) return null
  const restaurant = state.restaurants.find((r) => r.owner_id === user.id) ?? null
  return { user, restaurant }
}

function ownerRestaurant() {
  const current = session()
  if (!current) return null
  if (current.user.role === 'platform_admin') return state.restaurants[0] ?? null
  return current.restaurant
}

function fail(message: string, status = 400): never {
  throw Object.assign(new Error(message), { status })
}

function localDay(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

export async function demoRequest<T>(url: string, init?: RequestInit): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, 40))
  const [pathname, search = ''] = url.split('?')
  const params = new URLSearchParams(search)
  const method = init?.method ?? 'GET'
  const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {}
  const parts = pathname.split('/').filter(Boolean)
  const current = session()
  const restaurant = ownerRestaurant()

  const requireAuth = () => { if (!current) fail('Faça login para continuar.', 401); return current! }
  const requireOwner = () => {
    const auth = requireAuth()
    if (auth.user.role !== 'platform_admin' && auth.user.status !== 'approved') {
      fail('Seu cadastro ainda está aguardando aprovação.', 403)
    }
    if (!restaurant) fail('Restaurante não encontrado.', 404)
    return restaurant!
  }

  // Autenticação
  if (pathname === '/api/auth/register' && method === 'POST') {
    const email = String(body.email ?? '').toLowerCase().trim()
    if (state.users.some((u) => u.email === email)) fail('Já existe uma conta com esse e-mail.', 409)
    if (String(body.password ?? '').length < 8) fail('A senha precisa ter pelo menos 8 caracteres.')
    if (!String(body.ownerName ?? '').trim() || !String(body.restaurantName ?? '').trim()) fail('Preencha todos os campos.')
    const user: User & { password: string } = {
      id: uid(), email, password: String(body.password), ownerName: String(body.ownerName).trim(),
      role: 'owner', status: 'pending', createdAt: new Date().toISOString(),
    }
    const createdRestaurant: Restaurant = {
      id: uid(), owner_id: user.id, name: String(body.restaurantName).trim(),
      slug: slugify(String(body.restaurantName)), description: String(body.description ?? ''),
      createdAt: new Date().toISOString(),
    }
    state.users.push(user)
    state.restaurants.push(createdRestaurant)
    save()
    return { message: 'Cadastro enviado! Você poderá entrar assim que sua conta for aprovada.', restaurant: createdRestaurant } as T
  }

  if (pathname === '/api/auth/login' && method === 'POST') {
    const email = String(body.email ?? '').toLowerCase().trim()
    const user = state.users.find((u) => u.email === email)
    if (!user || user.password !== String(body.password ?? '')) fail('E-mail ou senha incorretos.', 401)
    state.currentUserId = user.id
    save()
    const found = state.restaurants.find((r) => r.owner_id === user.id) ?? null
    return { user: publicUser(user), restaurant: found } as T
  }

  if (pathname === '/api/auth/logout' && method === 'POST') {
    state.currentUserId = null
    save()
    return { ok: true } as T
  }

  if (pathname === '/api/auth/me') {
    return { user: publicUser(current?.user), restaurant: current?.restaurant ?? null } as T
  }

  // Site público
  if (parts[1] === 'restaurants' && parts[2]) {
    const found = state.restaurants.find((r) => r.slug === parts[2])
    const owner = state.users.find((u) => u.id === found?.owner_id)
    if (!found || owner?.status !== 'approved') fail('Restaurante não encontrado.', 404)

    if (parts[3] === 'dishes' && !parts[4]) {
      return state.dishes.filter((d) => d.restaurant_id === found.id && d.available) as T
    }
    if (parts[3] === 'orders' && method === 'POST') {
      const items = Array.isArray(body.items) ? body.items as { id: string; qty: number }[] : []
      if (items.length === 0) fail('O pedido precisa ter pelo menos um item.')
      const lines = items.map((item) => {
        const dish = state.dishes.find((d) => d.id === item.id && d.restaurant_id === found.id)
        if (!dish) fail('Item inválido no pedido.')
        return { id: dish!.id, name: dish!.name, price: dish!.price, qty: item.qty, lineTotal: dish!.price * item.qty }
      })
      const order: Order = {
        id: uid(), createdAt: new Date().toISOString(), status: 'new',
        total: lines.reduce((sum, line) => sum + line.lineTotal, 0), items: lines,
        note: String(body.note ?? ''), tableLabel: String(body.table ?? ''),
      }
      state.orders.push(order)
      save()
      return order as T
    }
    if (!parts[3]) return found as T
  }

  // Área do dono
  if (parts[1] === 'me') {
    requireAuth()
    if (!parts[2]) return { user: publicUser(current!.user), restaurant: current!.restaurant } as T

    if (parts[2] === 'restaurant' && method === 'PATCH') {
      const own = requireOwner()
      if (body.name !== undefined) own.name = String(body.name)
      if (body.description !== undefined) own.description = String(body.description)
      save()
      return own as T
    }

    if (parts[2] === 'dishes') {
      const own = requireOwner()
      if (!parts[3] && method === 'GET') return state.dishes.filter((d) => d.restaurant_id === own.id) as T
      if (!parts[3] && method === 'POST') {
        const dish: Dish = {
          id: uid(), restaurant_id: own.id, name: String(body.name),
          description: String(body.description ?? ''), category: String(body.category ?? 'Geral'),
          price: Number(body.price), available: Boolean(body.available), image: String(body.image ?? ''),
        }
        state.dishes.push(dish); save(); return dish as T
      }
      const dish = state.dishes.find((d) => d.id === parts[3] && d.restaurant_id === own.id)
      if (!dish) fail('Prato não encontrado.', 404)
      if (method === 'PATCH') { Object.assign(dish, body); save(); return dish as T }
      if (method === 'DELETE') {
        state.dishes = state.dishes.filter((d) => d.id !== dish.id); save(); return undefined as T
      }
    }

    if (parts[2] === 'categories') {
      requireOwner()
      if (!parts[3] && method === 'GET') return state.categories as T
      if (!parts[3] && method === 'POST') {
        const category: Category = { id: uid(), name: String(body.name), position: state.categories.length }
        state.categories.push(category); save(); return category as T
      }
      const category = state.categories.find((c) => c.id === parts[3])
      if (!category) fail('Categoria não encontrada.', 404)
      if (method === 'PATCH') {
        const oldName = category.name
        Object.assign(category, body)
        if (body.name && body.name !== oldName) {
          state.dishes.filter((d) => d.category === oldName).forEach((d) => { d.category = String(body.name) })
        }
        save(); return category as T
      }
      if (method === 'DELETE') {
        state.dishes.filter((d) => d.category === category.name).forEach((d) => { d.category = 'Geral' })
        state.categories = state.categories.filter((c) => c.id !== category.id); save(); return undefined as T
      }
    }

    if (parts[2] === 'tables') {
      requireOwner()
      if (!parts[3] && method === 'GET') return state.tables as T
      if (!parts[3] && method === 'POST') {
        const table: RestaurantTable = {
          id: uid(), label: String(body.label), x: 20 + state.tables.length * 24, y: 20,
          createdAt: new Date().toISOString(),
        }
        state.tables.push(table); save(); return table as T
      }
      const table = state.tables.find((t) => t.id === parts[3])
      if (!table) fail('Mesa não encontrada.', 404)
      if (method === 'PATCH') {
        if (body.label !== undefined) table.label = String(body.label)
        if (body.x !== undefined) table.x = Number(body.x)
        if (body.y !== undefined) table.y = Number(body.y)
        save(); return table as T
      }
      if (method === 'DELETE') {
        state.tables = state.tables.filter((t) => t.id !== parts[3]); save(); return undefined as T
      }
    }

    if (parts[2] === 'orders') {
      const own = requireOwner()
      let list = state.orders.filter((o) => o.items.some((i) => state.dishes.some((d) => d.id === i.id && d.restaurant_id === own.id)) || own.id === 'rest-demo')
      if (params.get('status')) list = list.filter((o) => o.status === params.get('status'))
      if (params.get('from')) list = list.filter((o) => localDay(new Date(o.createdAt)) >= params.get('from')!)
      if (params.get('to')) list = list.filter((o) => localDay(new Date(o.createdAt)) <= params.get('to')!)
      if (!parts[3]) return list as T
      const order = list.find((o) => o.id === parts[3])
      if (!order) fail('Pedido não encontrado.', 404)
      if (method === 'PATCH') { order.status = body.status as OrderStatus; save(); return order as T }
      if (method === 'DELETE') { state.orders = state.orders.filter((o) => o.id !== order.id); save(); return undefined as T }
    }

    if (parts[2] === 'reports') {
      const own = requireOwner()
      const days = Math.min(365, Math.max(1, Number(params.get('days')) || 7))
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const dailyMap = new Map<string, { day: string; orders: number; revenue: number }>()
      for (let offset = days - 1; offset >= 0; offset--) {
        const day = new Date(today); day.setDate(today.getDate() - offset)
        const key = localDay(day)
        dailyMap.set(key, { day: key, orders: 0, revenue: 0 })
      }
      const topMap = new Map<string, { name: string; qty: number; revenue: number }>()
      for (const order of state.orders) {
        if (own.id !== 'rest-demo') continue
        const entry = dailyMap.get(localDay(new Date(order.createdAt)))
        if (!entry) continue
        entry.orders++; entry.revenue += order.total
        for (const item of order.items) {
          const top = topMap.get(item.name) ?? { name: item.name, qty: 0, revenue: 0 }
          top.qty += item.qty; top.revenue += item.lineTotal
          topMap.set(item.name, top)
        }
      }
      const daily = [...dailyMap.values()]
      const report: Report = {
        daily,
        topDishes: [...topMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 5),
        totals: {
          orders: daily.reduce((s, d) => s + d.orders, 0),
          revenue: daily.reduce((s, d) => s + d.revenue, 0),
          avgTicket: 0,
        },
      }
      report.totals.avgTicket = report.totals.orders ? report.totals.revenue / report.totals.orders : 0
      return report as T
    }
  }

  // Administração da plataforma
  if (parts[1] === 'admin' && parts[2] === 'restaurants') {
    const auth = requireAuth()
    if (auth.user.role !== 'platform_admin') fail('Acesso restrito.', 403)
    if (!parts[3] && method === 'GET') {
      const rows: PlatformRestaurant[] = state.users.filter((u) => u.role === 'owner').map((u) => {
        const r = state.restaurants.find((item) => item.owner_id === u.id)!
        return {
          userId: u.id, email: u.email, ownerName: u.ownerName, status: u.status,
          createdAt: u.createdAt,
          restaurant: { ...r, dishCount: state.dishes.length, orderCount: state.orders.length },
        }
      })
      return rows as T
    }
    const user = state.users.find((u) => u.id === parts[3])
    if (!user) fail('Restaurante não encontrado.', 404)
    if (parts[4] === 'approve') { user.status = 'approved'; save(); return { ok: true } as T }
    if (parts[4] === 'reject') { user.status = 'rejected'; save(); return { ok: true } as T }
  }

  fail(`Endpoint não encontrado: ${url}`, 404)
}
