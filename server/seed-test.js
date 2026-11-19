import { randomUUID } from 'node:crypto'
import { db, hashPassword, slugify, uniqueSlug } from './db.js'

// Conta de teste já aprovada, para abrir o painel sem esperar aprovação.
const ownerEmail = (process.env.TEST_OWNER_EMAIL ?? 'teste@pedeaqui.com').toLowerCase()
const ownerPassword = process.env.TEST_OWNER_PASSWORD ?? 'teste12345'
const ownerName = process.env.TEST_OWNER_NAME ?? 'Dono de Teste'
const restaurantName = process.env.TEST_RESTAURANT_NAME ?? 'Restaurante de Teste'

const now = new Date().toISOString()

let owner = db.prepare('SELECT * FROM users WHERE email = ?').get(ownerEmail)
if (!owner) {
  owner = {
    id: randomUUID(),
    email: ownerEmail,
    password_hash: hashPassword(ownerPassword),
    owner_name: ownerName,
    role: 'owner',
    status: 'approved',
    created_at: now,
  }
  db.prepare(`
    INSERT INTO users (id, email, password_hash, owner_name, role, status, created_at)
    VALUES (@id, @email, @password_hash, @owner_name, @role, @status, @created_at)
  `).run(owner)
  console.log(`Conta de teste criada: ${ownerEmail}`)
} else {
  // Garante que a conta de teste tenha acesso mesmo se já existia como pendente.
  db.prepare("UPDATE users SET status = 'approved', role = 'owner' WHERE id = ?").run(owner.id)
  owner = db.prepare('SELECT * FROM users WHERE id = ?').get(owner.id)
  console.log(`Conta de teste já existia; acesso liberado: ${ownerEmail}`)
}

let restaurant = db.prepare('SELECT * FROM restaurants WHERE owner_id = ?').get(owner.id)
if (!restaurant) {
  restaurant = {
    id: randomUUID(),
    owner_id: owner.id,
    name: restaurantName,
    slug: uniqueSlug(slugify(restaurantName)),
    description: 'Restaurante de teste do Pede Aqui.',
    created_at: now,
  }
  db.prepare(`
    INSERT INTO restaurants (id, owner_id, name, slug, description, created_at)
    VALUES (@id, @owner_id, @name, @slug, @description, @created_at)
  `).run(restaurant)
  console.log(`Restaurante de teste criado: ${restaurant.name}`)
}

// Cardápio inicial para o painel não abrir vazio.
const seedCategories = ['Bebidas', 'Doces']
for (const name of seedCategories) {
  if (!db.prepare('SELECT 1 FROM categories WHERE restaurant_id = ? AND name = ?').get(restaurant.id, name)) {
    const position = Number(db.prepare('SELECT COUNT(*) AS total FROM categories WHERE restaurant_id = ?').get(restaurant.id).total)
    db.prepare('INSERT INTO categories (id, restaurant_id, name, position) VALUES (?, ?, ?, ?)')
      .run(randomUUID(), restaurant.id, name, position)
  }
}

const seedDishes = [
  { name: 'Café coado', description: 'Café fresco', category: 'Bebidas', price: 12 },
  { name: 'Refrigerante', description: 'Lata 350 ml', category: 'Bebidas', price: 8 },
  { name: 'Bolo de chocolate', description: 'Fatia generosa', category: 'Doces', price: 18 },
]
for (const dish of seedDishes) {
  if (!db.prepare('SELECT 1 FROM dishes WHERE restaurant_id = ? AND name = ?').get(restaurant.id, dish.name)) {
    db.prepare(`
      INSERT INTO dishes (id, restaurant_id, name, description, category, price, available, image, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, '', ?)
    `).run(randomUUID(), restaurant.id, dish.name, dish.description, dish.category, dish.price, now)
  }
}

const tablePositions = [
  { label: '1', x: 20, y: 20 },
  { label: '2', x: 116, y: 20 },
  { label: '3', x: 20, y: 116 },
  { label: '4', x: 116, y: 116 },
]
const existingTables = db.prepare('SELECT * FROM restaurant_tables WHERE restaurant_id = ? ORDER BY created_at').all(restaurant.id)
if (existingTables.length === 0) {
  for (const position of tablePositions) {
    db.prepare('INSERT INTO restaurant_tables (id, restaurant_id, label, x, y, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(randomUUID(), restaurant.id, position.label, position.x, position.y, now)
  }
} else {
  // Mesas criadas antes do mapa ficaram na posição 0,0.
  existingTables.forEach((table, index) => {
    if (table.x === 0 && table.y === 0) {
      const position = tablePositions[index % tablePositions.length]
      db.prepare('UPDATE restaurant_tables SET x = ?, y = ? WHERE id = ?').run(position.x, position.y, table.id)
    }
  })
}

// Um pedido de exemplo para mostrar que o recebimento de pedidos funciona.
if (Number(db.prepare('SELECT COUNT(*) AS total FROM orders WHERE restaurant_id = ?').get(restaurant.id).total) === 0) {
  const dish = db.prepare('SELECT * FROM dishes WHERE restaurant_id = ? ORDER BY name LIMIT 1').get(restaurant.id)
  if (dish) {
    const items = [{ id: dish.id, name: dish.name, price: dish.price, qty: 1, lineTotal: dish.price }]
    db.prepare(`
      INSERT INTO orders (id, restaurant_id, created_at, status, total, items, note, table_label)
      VALUES (?, ?, ?, 'new', ?, ?, 'Pedido de teste', '1')
    `).run(randomUUID(), restaurant.id, now, dish.price, JSON.stringify(items))
  }
}

console.log('\n--- Acesso ao painel ---')
console.log(`E-mail: ${ownerEmail}`)
console.log(`Senha:  ${ownerPassword}`)
console.log(`Cardápio: /cardapio/${restaurant.slug}`)
