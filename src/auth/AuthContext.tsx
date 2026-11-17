import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, type RegisterInput } from '../api'
import type { Restaurant, User } from '../types'

type AuthValue = {
  user: User | null
  restaurant: Restaurant | null
  loading: boolean
  refresh: () => Promise<void>
  login: (email: string, password: string) => Promise<{ user: User; restaurant: Restaurant | null }>
  register: (input: RegisterInput) => Promise<{ message: string; restaurant: Restaurant }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const data = await api.me()
      setUser(data.user)
      setRestaurant(data.restaurant)
    } catch {
      setUser(null)
      setRestaurant(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const login = async (email: string, password: string) => {
    const data = await api.login(email, password)
    setUser(data.user)
    setRestaurant(data.restaurant)
    return data
  }

  const register = async (input: RegisterInput) => {
    const data = await api.register(input)
    return data
  }

  const logout = async () => {
    await api.logout()
    setUser(null)
    setRestaurant(null)
  }

  return (
    <AuthContext.Provider value={{ user, restaurant, loading, refresh, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider.')
  return context
}
