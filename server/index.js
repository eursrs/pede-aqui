import express from 'express'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  db, hashPassword, verifyPassword, slugify, uniqueSlug, createSession,
  userToPublic, restaurantToPublic, dishToPublic, categoryToPublic, orderToPublic, tableToPublic,
} from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const app = express()
app.use(express.json())

// ---------- Session helpers ----------

function readCookie(req, name) {
  const header = req.headers.cookie ?? ''
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return decodeURIComponent(rest.join('='))
  }
  return null
}

function currentSession(req) {
  const token = readCookie(req, 'menu_session')
  if (!token) return null
  const session = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token)
  if (!session || new Date(session.expires_at) < new Date()) return null
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(session.user_id)
  if (!user) return null
  const restaurant = db.prepare('SELECT * FROM restaurants WHERE owner_id = ?').get(user.id) ?? null
  return { user, restaurant }
}

function requireAuth(req, res, next) {
  const session = currentSession(req)
  if (!session) return res.status(401).json({ error: 'Faça login para continuar.' })
  req.session = session
  next()
}

function requireApproved(req, res, next) {
  if (req.session.user.role === 'platform_admin') return next()
  if (req.session.user.status === 'pending') {
    return res.status(403).json({ code: 'pending', error: 'Seu cadastro ainda está aguardando aprovação.' })
  }
  if (req.session.user.status === 'rejected') {
    return res.status(403).json({ code: 'rejected', error: 'Seu cadastro não foi aprovado.' })
  }
  next()
}

function requirePlatform(req, res, next) {
  if (req.session.user.role !== 'platform_admin') {
    return res.status(403).json({ error: 'Acesso restrito à administração da plataforma.' })
  }
  next()
}

function cleanImage(value) {
  if (typeof value !== 'string' || !value.startsWith('data:image/') || value.length > 1_000_000) {
    return ''
  }
  return value
}

function getRestaurantBySlug(slug) {
  const restaurant = db.prepare('SELECT * FROM restaurants WHERE slug = ?').get(slug)
  if (!restaurant) return null
  const owner = db.prepare('SELECT status FROM users WHERE id = ?').get(restaurant.owner_id)
  return owner?.status === 'approved' ? restaurant : null
}

// ---------- Auth ----------

app.post('/api/auth/register', (req, res) => {
  const { ownerName, email, password, restaurantName, description = '' } = req.body ?? {}
  const cleanEmail = String(email ?? '').trim().toLowerCase()
  const cleanOwner = String(ownerName ?? '').trim()
  const cleanRestaurant = String(restaurantName ?? '').trim()
  const cleanDescription = String(description).trim()

  if (!cleanOwner || !cleanRestaurant || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: 'Preencha seu nome, um e-mail válido e o nome do restaurante.' })
  }
  if (String(password ?? '').length < 8) {
    return res.status(400).json({ error: 'A senha precisa ter pelo menos 8 caracteres.' })
  }
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(cleanEmail)) {
    return res.status(409).json({ error: 'Já existe uma conta com esse e-mail.' })
  }

  const now = new Date().toISOString()
  const user = {
    id: randomUUID(),
    email: cleanEmail,
    password_hash: hashPassword(password),
    owner_name: cleanOwner,
    role: 'owner',
    status: 'pending',
    created_at: now,
  }
  const restaurant = {
    id: randomUUID(),
    owner_id: user.id,
    name: cleanRestaurant,
    slug: uniqueSlug(slugify(cleanRestaurant)),
    description: cleanDescription,
    created_at: now,
  }

  db.prepare(`
    INSERT INTO users (id, email, password_hash, owner_name, role, status, created_at)
    VALUES (@id, @email, @password_hash, @owner_name, @role, @status, @created_at)
  `).run(user)
  db.prepare(`
    INSERT INTO restaurants (id, owner_id, name, slug, description, created_at)
    VALUES (@id, @owner_id, @name, @slug, @description, @created_at)
  `).run(restaurant)

  res.status(201).json({
    message: 'Cadastro enviado! Você poderá entrar assim que sua conta for aprovada.',
    restaurant: restaurantToPublic(restaurant),
  })
})

app.post('/api/auth/login', (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase()
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  if (!user || !verifyPassword(req.body?.password ?? '', user.password_hash)) {
    return res.status(401).json({ error: 'E-mail ou senha incorretos.' })
  }

  const { token, expires } = createSession(user.id)
  res.setHeader('Set-Cookie', `menu_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${Math.floor((expires - new Date()) / 1000)}`)
  const restaurant = db.prepare('SELECT * FROM restaurants WHERE owner_id = ?').get(user.id) ?? null
  res.json({ user: userToPublic(user), restaurant: restaurantToPublic(restaurant) })
})

app.post('/api/auth/logout', (req, res) => {
  const token = readCookie(req, 'menu_session')
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
  res.setHeader('Set-Cookie', 'menu_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0')
  res.json({ ok: true })
})

app.get('/api/auth/me', (req, res) => {
  const session = currentSession(req)
  if (!session) return res.json({ user: null, restaurant: null })
  res.json({
    user: userToPublic(session.user),
    restaurant: restaurantToPublic(session.restaurant),
  })
})

// ---------- Public restaurant site ----------

app.get('/api/restaurants/:slug', (req, res) => {
  const restaurant = getRestaurantBySlug(req.params.slug)
  if (!restaurant) return res.status(404).json({ error: 'Restaurante não encontrado.' })
  res.json(restaurantToPublic(restaurant))
})

app.get('/api/restaurants/:slug/dishes', (req, res) => {
  const restaurant = getRestaurantBySlug(req.params.slug)
  if (!restaurant) return res.status(404).json({ error: 'Restaurante não encontrado.' })
  const rows = db.prepare(`
    SELECT d.* FROM dishes d
    LEFT JOIN categories c ON c.restaurant_id = d.restaurant_id AND c.name = d.category
    WHERE d.restaurant_id = ? AND d.available = 1
    ORDER BY COALESCE(c.position, 999), d.category, d.name
  `).all(restaurant.id)
  res.json(rows.map(dishToPublic))
})

app.post('/api/restaurants/:slug/orders', (req, res) => {
  const restaurant = getRestaurantBySlug(req.params.slug)
  if (!restaurant) return res.status(404).json({ error: 'Restaurante não encontrado.' })

  const requested = Array.isArray(req.body?.items) ? req.body.items : []
  if (requested.length === 0) {
    return res.status(400).json({ error: 'O pedido precisa ter pelo menos um item.' })
  }

  const itemRows = []
  for (const item of requested) {
    const dish = db.prepare(`
      SELECT * FROM dishes WHERE id = ? AND restaurant_id = ? AND available = 1
    `).get(item?.id, restaurant.id)
    const qty = Number(item?.qty)
    if (!dish || !Number.isInteger(qty) || qty < 1 || qty > 99) {
      return res.status(400).json({ error: 'Item inválido no pedido.' })
    }
    itemRows.push({
      id: dish.id, name: dish.name, price: dish.price, qty,
      lineTotal: dish.price * qty,
    })
  }

  const order = {
    id: randomUUID(),
    restaurant_id: restaurant.id,
    created_at: new Date().toISOString(),
    status: 'new',
    total: itemRows.reduce((sum, item) => sum + item.lineTotal, 0),
    items: JSON.stringify(itemRows),
    note: String(req.body?.note ?? '').trim().slice(0, 500),
    table_label: String(req.body?.table ?? '').trim().slice(0, 30),
  }
  db.prepare(`
    INSERT INTO orders (id, restaurant_id, created_at, status, total, items, note, table_label)
    VALUES (@id, @restaurant_id, @created_at, @status, @total, @items, @note, @table_label)
  `).run(order)

  res.status(201).json(orderToPublic(order))
})

// ---------- Owner app ----------

app.use('/api/me', requireAuth, requireApproved)

app.get('/api/me', (req, res) => {
  res.json({
    user: userToPublic(req.session.user),
    restaurant: restaurantToPublic(req.session.restaurant),
  })
})

app.patch('/api/me/restaurant', (req, res) => {
  const { name, description } = req.body ?? {}
  if (req.session.restaurant) {
    db.prepare('UPDATE restaurants SET name = ?, description = ? WHERE id = ?').run(
      String(name ?? req.session.restaurant.name).trim() || req.session.restaurant.name,
      String(description ?? req.session.restaurant.description).trim(),
      req.session.restaurant.id,
    )
  }
  const updated = db.prepare('SELECT * FROM restaurants WHERE owner_id = ?').get(req.session.user.id)
  res.json(restaurantToPublic(updated))
})

app.get('/api/me/dishes', (req, res) => {
  const rows = db.prepare(`
    SELECT d.* FROM dishes d
    LEFT JOIN categories c ON c.restaurant_id = d.restaurant_id AND c.name = d.category
    WHERE d.restaurant_id = ?
    ORDER BY COALESCE(c.position, 999), d.category, d.name
  `).all(req.session.restaurant.id)
  res.json(rows.map(dishToPublic))
})

app.post('/api/me/dishes', (req, res) => {
  const { name, description = '', category = 'Geral', price, available = true, image = '' } = req.body ?? {}
  const amount = Number(price)
  if (!String(name ?? '').trim() || !Number.isFinite(amount) || amount < 0) {
    return res.status(400).json({ error: 'Informe um nome e um preço válido.' })
  }
  const dish = {
    id: randomUUID(),
    restaurant_id: req.session.restaurant.id,
    name: String(name).trim(),
    description: String(description).trim(),
    category: String(category).trim() || 'Geral',
    price: amount,
    available: available ? 1 : 0,
    image: cleanImage(image),
    created_at: new Date().toISOString(),
  }
  db.prepare(`
    INSERT INTO dishes (id, restaurant_id, name, description, category, price, available, image, created_at)
    VALUES (@id, @restaurant_id, @name, @description, @category, @price, @available, @image, @created_at)
  `).run(dish)
  res.status(201).json(dishToPublic(dish))
})

app.patch('/api/me/dishes/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM dishes WHERE id = ? AND restaurant_id = ?')
    .get(req.params.id, req.session.restaurant.id)
  if (!existing) return res.status(404).json({ error: 'Prato não encontrado.' })

  const patch = { ...existing, ...(req.body ?? {}) }
  const amount = Number(patch.price)
  if (!String(patch.name ?? '').trim() || !Number.isFinite(amount) || amount < 0) {
    return res.status(400).json({ error: 'Nome ou preço inválido.' })
  }
  db.prepare(`
    UPDATE dishes SET name = ?, description = ?, category = ?, price = ?, available = ?, image = ? WHERE id = ?
  `).run(
    String(patch.name).trim(),
    String(patch.description ?? '').trim(),
    String(patch.category ?? 'Geral').trim() || 'Geral',
    amount,
    patch.available ? 1 : 0,
    cleanImage(patch.image ?? existing.image),
    existing.id,
  )
  res.json(dishToPublic(db.prepare('SELECT * FROM dishes WHERE id = ?').get(existing.id)))
})

app.delete('/api/me/dishes/:id', (req, res) => {
  const result = db.prepare('DELETE FROM dishes WHERE id = ? AND restaurant_id = ?')
    .run(req.params.id, req.session.restaurant.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Prato não encontrado.' })
  res.status(204).end()
})

// ---------- Categorias ----------

app.get('/api/me/categories', (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM categories WHERE restaurant_id = ? ORDER BY position, name
  `).all(req.session.restaurant.id)
  res.json(rows.map(categoryToPublic))
})

app.post('/api/me/categories', (req, res) => {
  const name = String(req.body?.name ?? '').trim().slice(0, 40)
  if (!name) return res.status(400).json({ error: 'Informe o nome da categoria.' })
  const restaurantId = req.session.restaurant.id
  if (db.prepare('SELECT 1 FROM categories WHERE restaurant_id = ? AND name = ?').get(restaurantId, name)) {
    return res.status(409).json({ error: 'Essa categoria já existe.' })
  }
  const position = Number(db.prepare('SELECT COUNT(*) AS total FROM categories WHERE restaurant_id = ?').get(restaurantId).total)
  const category = { id: randomUUID(), restaurant_id: restaurantId, name, position }
  db.prepare('INSERT INTO categories (id, restaurant_id, name, position) VALUES (@id, @restaurant_id, @name, @position)').run(category)
  res.status(201).json(categoryToPublic(category))
})

app.patch('/api/me/categories/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM categories WHERE id = ? AND restaurant_id = ?')
    .get(req.params.id, req.session.restaurant.id)
  if (!existing) return res.status(404).json({ error: 'Categoria não encontrada.' })

  const name = String(req.body?.name ?? existing.name).trim().slice(0, 40) || existing.name
  const position = Number(req.body?.position ?? existing.position)
  if (!Number.isInteger(position) || position < 0) {
    return res.status(400).json({ error: 'Posição inválida.' })
  }
  const restaurantId = req.session.restaurant.id
  if (name !== existing.name &&
      db.prepare('SELECT 1 FROM categories WHERE restaurant_id = ? AND name = ?').get(restaurantId, name)) {
    return res.status(409).json({ error: 'Essa categoria já existe.' })
  }

  db.prepare('UPDATE categories SET name = ?, position = ? WHERE id = ?').run(name, position, existing.id)
  if (name !== existing.name) {
    db.prepare('UPDATE dishes SET category = ? WHERE restaurant_id = ? AND category = ?')
      .run(name, restaurantId, existing.name)
  }
  res.json(categoryToPublic(db.prepare('SELECT * FROM categories WHERE id = ?').get(existing.id)))
})

app.delete('/api/me/categories/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM categories WHERE id = ? AND restaurant_id = ?')
    .get(req.params.id, req.session.restaurant.id)
  if (!existing) return res.status(404).json({ error: 'Categoria não encontrada.' })
  db.prepare('UPDATE dishes SET category = ? WHERE restaurant_id = ? AND category = ?')
    .run('Geral', req.session.restaurant.id, existing.name)
  db.prepare('DELETE FROM categories WHERE id = ?').run(existing.id)
  res.status(204).end()
})

// ---------- Mesas (QR Codes) ----------

app.get('/api/me/tables', (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM restaurant_tables WHERE restaurant_id = ? ORDER BY label
  `).all(req.session.restaurant.id)
  res.json(rows.map(tableToPublic))
})

app.post('/api/me/tables', (req, res) => {
  const label = String(req.body?.label ?? '').trim().slice(0, 30)
  if (!label) return res.status(400).json({ error: 'Informe o número ou nome da mesa.' })
  const restaurantId = req.session.restaurant.id
  if (db.prepare('SELECT 1 FROM restaurant_tables WHERE restaurant_id = ? AND label = ?').get(restaurantId, label)) {
    return res.status(409).json({ error: 'Essa mesa já existe.' })
  }
  const count = Number(db.prepare('SELECT COUNT(*) AS total FROM restaurant_tables WHERE restaurant_id = ?').get(restaurantId).total)
  const shape = req.body?.shape === 'square' ? 'square' : 'round'
  const requestedSeats = Number(req.body?.seats)
  const seats = [2, 4, 6].includes(requestedSeats) ? requestedSeats : 4
  const table = {
    id: randomUUID(),
    restaurant_id: restaurantId,
    label,
    x: 20 + (count % 4) * 124,
    y: 20 + Math.floor(count / 4) * 124,
    shape,
    seats,
    created_at: new Date().toISOString(),
  }
  db.prepare('INSERT INTO restaurant_tables (id, restaurant_id, label, x, y, shape, seats, created_at) VALUES (@id, @restaurant_id, @label, @x, @y, @shape, @seats, @created_at)').run(table)
  res.status(201).json(tableToPublic(table))
})

app.patch('/api/me/tables/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM restaurant_tables WHERE id = ? AND restaurant_id = ?')
    .get(req.params.id, req.session.restaurant.id)
  if (!existing) return res.status(404).json({ error: 'Mesa não encontrada.' })

  const label = String(req.body?.label ?? existing.label).trim().slice(0, 30) || existing.label
  const restaurantId = req.session.restaurant.id
  if (label !== existing.label &&
      db.prepare('SELECT 1 FROM restaurant_tables WHERE restaurant_id = ? AND label = ?').get(restaurantId, label)) {
    return res.status(409).json({ error: 'Essa mesa já existe.' })
  }
  const clamp = (value, fallback) => {
    const number = Number(value)
    return Number.isFinite(number) ? Math.max(0, Math.min(900, Math.round(number))) : fallback
  }
  const x = clamp(req.body?.x ?? existing.x, existing.x)
  const y = clamp(req.body?.y ?? existing.y, existing.y)
  const shape = req.body?.shape === undefined
    ? (existing.shape === 'square' ? 'square' : 'round')
    : (req.body.shape === 'square' ? 'square' : 'round')
  const requestedSeats = Number(req.body?.seats)
  const seats = req.body?.seats === undefined
    ? ([2, 4, 6].includes(existing.seats) ? existing.seats : 4)
    : ([2, 4, 6].includes(requestedSeats) ? requestedSeats : 4)

  db.prepare('UPDATE restaurant_tables SET label = ?, x = ?, y = ?, shape = ?, seats = ? WHERE id = ?')
    .run(label, x, y, shape, seats, existing.id)
  res.json(tableToPublic(db.prepare('SELECT * FROM restaurant_tables WHERE id = ?').get(existing.id)))
})

app.delete('/api/me/tables/:id', (req, res) => {
  const result = db.prepare('DELETE FROM restaurant_tables WHERE id = ? AND restaurant_id = ?')
    .run(req.params.id, req.session.restaurant.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Mesa não encontrada.' })
  res.status(204).end()
})

app.get('/api/me/orders', (req, res) => {
  const { status, from, to } = req.query
  let sql = 'SELECT * FROM orders WHERE restaurant_id = ?'
  const params = [req.session.restaurant.id]

  if (['new', 'preparing', 'done'].includes(status)) {
    sql += ' AND status = ?'
    params.push(status)
  }
  if (typeof from === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
    sql += ' AND substr(created_at, 1, 10) >= ?'
    params.push(from)
  }
  if (typeof to === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
    sql += ' AND substr(created_at, 1, 10) <= ?'
    params.push(to)
  }
  sql += ' ORDER BY created_at DESC'

  res.json(db.prepare(sql).all(...params).map(orderToPublic))
})

app.get('/api/me/reports', (req, res) => {
  const days = Math.min(365, Math.max(1, Number(req.query.days) || 7))
  const restaurantId = req.session.restaurant.id
  const rows = db.prepare('SELECT created_at, total, items FROM orders WHERE restaurant_id = ?').all(restaurantId)

  const localDay = (date) => [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dailyMap = new Map()
  for (let offset = days - 1; offset >= 0; offset--) {
    const day = new Date(today)
    day.setDate(today.getDate() - offset)
    const key = localDay(day)
    dailyMap.set(key, { day: key, orders: 0, revenue: 0 })
  }

  const topMap = new Map()
  for (const row of rows) {
    const key = localDay(new Date(row.created_at))
    const entry = dailyMap.get(key)
    if (!entry) continue
    entry.orders += 1
    entry.revenue += row.total
    for (const item of JSON.parse(row.items)) {
      const current = topMap.get(item.name) ?? { name: item.name, qty: 0, revenue: 0 }
      current.qty += item.qty
      current.revenue += item.lineTotal
      topMap.set(item.name, current)
    }
  }

  const daily = [...dailyMap.values()]
  const topDishes = [...topMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 5)
  const orders = daily.reduce((sum, day) => sum + day.orders, 0)
  const revenue = daily.reduce((sum, day) => sum + day.revenue, 0)

  res.json({
    daily,
    topDishes,
    totals: {
      orders,
      revenue,
      avgTicket: orders ? revenue / orders : 0,
    },
  })
})

app.patch('/api/me/orders/:id', (req, res) => {
  const status = req.body?.status
  if (!['new', 'preparing', 'done'].includes(status)) {
    return res.status(400).json({ error: 'Status inválido.' })
  }
  const result = db.prepare(`
    UPDATE orders SET status = ? WHERE id = ? AND restaurant_id = ?
  `).run(status, req.params.id, req.session.restaurant.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Pedido não encontrado.' })
  res.json(orderToPublic(db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id)))
})

app.delete('/api/me/orders/:id', (req, res) => {
  const result = db.prepare('DELETE FROM orders WHERE id = ? AND restaurant_id = ?')
    .run(req.params.id, req.session.restaurant.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Pedido não encontrado.' })
  res.status(204).end()
})

// ---------- Platform administration ----------

app.use('/api/admin', requireAuth, requirePlatform)

app.get('/api/admin/restaurants', (_req, res) => {
  const rows = db.prepare(`
    SELECT u.id AS user_id, u.email, u.owner_name, u.status, u.created_at,
           r.id AS restaurant_id, r.name, r.slug, r.description,
           (SELECT COUNT(*) FROM dishes d WHERE d.restaurant_id = r.id) AS dish_count,
           (SELECT COUNT(*) FROM orders o WHERE o.restaurant_id = r.id) AS order_count
    FROM users u JOIN restaurants r ON r.owner_id = u.id
    WHERE u.role = 'owner'
    ORDER BY CASE u.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, u.created_at DESC
  `).all()
  res.json(rows.map((row) => ({
    userId: row.user_id,
    email: row.email,
    ownerName: row.owner_name,
    status: row.status,
    createdAt: row.created_at,
    restaurant: {
      id: row.restaurant_id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      dishCount: row.dish_count,
      orderCount: row.order_count,
    },
  })))
})

function setRestaurantStatus(req, res, status) {
  const result = db.prepare(`
    UPDATE users SET status = ? WHERE id = ? AND role = 'owner'
  `).run(status, req.body?.userId ?? req.params.userId)
  if (result.changes === 0) return res.status(404).json({ error: 'Restaurante não encontrado.' })
  res.json({ ok: true, status })
}

app.post('/api/admin/restaurants/:userId/approve', (req, res) => setRestaurantStatus(req, res, 'approved'))
app.post('/api/admin/restaurants/:userId/reject', (req, res) => setRestaurantStatus(req, res, 'rejected'))

// ---------- Rotas da API não encontradas ----------

app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint não encontrado.' }))

// ---------- Static frontend ----------

const dist = path.join(root, 'dist')
if (fs.existsSync(dist)) {
  app.get('/app', (_req, res) => res.sendFile(path.join(dist, 'app.html')))
  app.use(express.static(dist))
  app.use((_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

const port = Number(process.env.PORT ?? 3000)
app.listen(port, () => {
  console.log(`Servidor do Cardápio ouvindo em http://localhost:${port}`)
})
