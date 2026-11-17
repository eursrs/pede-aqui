import { randomUUID } from 'node:crypto'
import { db, hashPassword, userToPublic } from './db.js'

const [email, password, name = 'Administrador da plataforma'] = process.argv.slice(2)

if (!email || !password) {
  console.error('Uso: npm run create-admin -- <email> <senha> [nome]')
  process.exit(1)
}

if (password.length < 8) {
  console.error('A senha precisa ter pelo menos 8 caracteres.')
  process.exit(1)
}

const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase())
if (existing) {
  console.error('Já existe um usuário com esse e-mail.')
  process.exit(1)
}

const admin = {
  id: randomUUID(),
  email: email.toLowerCase(),
  password_hash: hashPassword(password),
  owner_name: name,
  role: 'platform_admin',
  status: 'approved',
  created_at: new Date().toISOString(),
}

db.prepare(`
  INSERT INTO users (id, email, password_hash, owner_name, role, status, created_at)
  VALUES (@id, @email, @password_hash, @owner_name, @role, @status, @created_at)
`).run(admin)

console.log('Administrador da plataforma criado:', userToPublic(admin))
