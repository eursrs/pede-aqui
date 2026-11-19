import { DatabaseSync } from 'node:sqlite'
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const dataDir = path.join(root, 'data')
fs.mkdirSync(dataDir, { recursive: true })

export const db = new DatabaseSync(path.join(dataDir, 'menu.db'))
db.exec('PRAGMA foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    owner_name    TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'platform_admin')),
    status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS restaurants (
    id          TEXT PRIMARY KEY,
    owner_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS dishes (
    id            TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    description   TEXT NOT NULL DEFAULT '',
    category      TEXT NOT NULL DEFAULT 'Geral',
    price         REAL NOT NULL CHECK (price >= 0),
    available     INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id            TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    created_at    TEXT NOT NULL,
    status        TEXT NOT NULL CHECK (status IN ('new', 'preparing', 'done')),
    total         REAL NOT NULL,
    items         TEXT NOT NULL,
    note          TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS categories (
    id            TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    position      INTEGER NOT NULL DEFAULT 0,
    UNIQUE (restaurant_id, name)
  );

  CREATE TABLE IF NOT EXISTS restaurant_tables (
    id            TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    label         TEXT NOT NULL,
    x             INTEGER NOT NULL DEFAULT 0,
    y             INTEGER NOT NULL DEFAULT 0,
    shape         TEXT NOT NULL DEFAULT 'round',
    seats         INTEGER NOT NULL DEFAULT 4,
    created_at    TEXT NOT NULL,
    UNIQUE (restaurant_id, label)
  );

  CREATE INDEX IF NOT EXISTS idx_dishes_restaurant ON dishes(restaurant_id);
  CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON orders(restaurant_id);
  CREATE INDEX IF NOT EXISTS idx_categories_restaurant ON categories(restaurant_id);
`)

// Migrações: bancos mais antigos não têm foto nos pratos nem mesa nos pedidos.
const dishColumns = db.prepare('PRAGMA table_info(dishes)').all().map((column) => column.name)
if (!dishColumns.includes('image')) {
  db.exec("ALTER TABLE dishes ADD COLUMN image TEXT NOT NULL DEFAULT ''")
}
const orderColumns = db.prepare('PRAGMA table_info(orders)').all().map((column) => column.name)
if (!orderColumns.includes('table_label')) {
  db.exec("ALTER TABLE orders ADD COLUMN table_label TEXT NOT NULL DEFAULT ''")
}
// Bancos antigos não tinham posição das mesas no mapa.
const tableColumns = db.prepare('PRAGMA table_info(restaurant_tables)').all().map((column) => column.name)
if (!tableColumns.includes('x')) {
  db.exec('ALTER TABLE restaurant_tables ADD COLUMN x INTEGER NOT NULL DEFAULT 0')
}
if (!tableColumns.includes('y')) {
  db.exec('ALTER TABLE restaurant_tables ADD COLUMN y INTEGER NOT NULL DEFAULT 0')
}
// Bancos antigos não tinham formato nem número de lugares.
if (!tableColumns.includes('shape')) {
  db.exec("ALTER TABLE restaurant_tables ADD COLUMN shape TEXT NOT NULL DEFAULT 'round'")
}
if (!tableColumns.includes('seats')) {
  db.exec('ALTER TABLE restaurant_tables ADD COLUMN seats INTEGER NOT NULL DEFAULT 4')
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const key = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${key}`
}

export function verifyPassword(password, stored) {
  try {
    const [salt, key] = String(stored).split(':')
    if (!salt || !key) return false
    const expected = Buffer.from(key, 'hex')
    const actual = scryptSync(password, salt, expected.length)
    return expected.length === actual.length && timingSafeEqual(expected, actual)
  } catch {
    return false
  }
}

export function slugify(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'restaurante'
}

export function uniqueSlug(base) {
  let slug = base
  let suffix = 2
  while (db.prepare('SELECT 1 FROM restaurants WHERE slug = ?').get(slug)) {
    slug = `${base}-${suffix++}`
  }
  return slug
}

export function createSession(userId) {
  const token = randomBytes(32).toString('hex')
  const now = new Date()
  const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  db.prepare(`
    INSERT INTO sessions (token, user_id, created_at, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(token, userId, now.toISOString(), expires.toISOString())
  return { token, expires }
}

export function userToPublic(row) {
  if (!row) return null
  return {
    id: row.id,
    email: row.email,
    ownerName: row.owner_name,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
  }
}

export function restaurantToPublic(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    createdAt: row.created_at,
  }
}

export function dishToPublic(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    price: row.price,
    available: Boolean(row.available),
    image: row.image ?? '',
  }
}

export function categoryToPublic(row) {
  return { id: row.id, name: row.name, position: row.position }
}

export function orderToPublic(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    status: row.status,
    total: row.total,
    items: JSON.parse(row.items),
    note: row.note,
    tableLabel: row.table_label ?? '',
  }
}

export function tableToPublic(row) {
  return {
    id: row.id,
    label: row.label,
    x: row.x ?? 0,
    y: row.y ?? 0,
    shape: row.shape === 'square' ? 'square' : 'round',
    seats: [2, 4, 6].includes(row.seats) ? row.seats : 4,
    createdAt: row.created_at,
  }
}
