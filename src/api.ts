import { demoRequest, isDemo } from './demo/mockApi'
import type { Category, Dish, Order, OrderStatus, PlatformRestaurant, Report, Restaurant, RestaurantTable, User } from './types'

type ApiErrorBody = { error?: string; code?: string }

export class ApiError extends Error {
  code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.code = code
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  if (isDemo) return demoRequest<T>(url, init)
  let response: Response
  try {
    response = await fetch(url, {
      ...init,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    })
  } catch {
    throw new ApiError('Não foi possível conectar ao servidor.')
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as ApiErrorBody
    throw new ApiError(body.error ?? `Erro ${response.status}.`, body.code)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export type RegisterInput = {
  ownerName: string
  email: string
  password: string
  restaurantName: string
  description?: string
}

export type DishInput = Omit<Dish, 'id'>

export const api = {
  // Autenticação
  me: () => request<{ user: User | null; restaurant: Restaurant | null }>('/api/auth/me'),
  register: (data: RegisterInput) =>
    request<{ message: string; restaurant: Restaurant }>('/api/auth/register', {
      method: 'POST', body: JSON.stringify(data),
    }),
  login: (email: string, password: string) =>
    request<{ user: User; restaurant: Restaurant | null }>('/api/auth/login', {
      method: 'POST', body: JSON.stringify({ email, password }),
    }),
  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),

  // Site público do restaurante
  getPublicRestaurant: (slug: string) =>
    request<Restaurant>(`/api/restaurants/${encodeURIComponent(slug)}`),
  getPublicDishes: (slug: string) =>
    request<Dish[]>(`/api/restaurants/${encodeURIComponent(slug)}/dishes`),
  placeOrder: (slug: string, items: { id: string; qty: number }[], note = '', table = '') =>
    request<Order>(`/api/restaurants/${encodeURIComponent(slug)}/orders`, {
      method: 'POST', body: JSON.stringify({ items, note, table }),
    }),

  // Área do dono
  getMyRestaurant: () => request<{ user: User; restaurant: Restaurant }>('/api/me'),
  updateMyRestaurant: (patch: Partial<Pick<Restaurant, 'name' | 'description'>>) =>
    request<Restaurant>('/api/me/restaurant', { method: 'PATCH', body: JSON.stringify(patch) }),
  getDishes: () => request<Dish[]>('/api/me/dishes'),
  addDish: (dish: DishInput) =>
    request<Dish>('/api/me/dishes', { method: 'POST', body: JSON.stringify(dish) }),
  updateDish: (id: string, patch: Partial<DishInput>) =>
    request<Dish>(`/api/me/dishes/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteDish: (id: string) =>
    request<void>(`/api/me/dishes/${id}`, { method: 'DELETE' }),
  getCategories: () => request<Category[]>('/api/me/categories'),
  addCategory: (name: string) =>
    request<Category>('/api/me/categories', { method: 'POST', body: JSON.stringify({ name }) }),
  updateCategory: (id: string, patch: Partial<Pick<Category, 'name' | 'position'>>) =>
    request<Category>(`/api/me/categories/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteCategory: (id: string) =>
    request<void>(`/api/me/categories/${id}`, { method: 'DELETE' }),
  getTables: () => request<RestaurantTable[]>('/api/me/tables'),
  addTable: (label: string) =>
    request<RestaurantTable>('/api/me/tables', { method: 'POST', body: JSON.stringify({ label }) }),
  updateTable: (id: string, patch: Partial<Pick<RestaurantTable, 'label' | 'x' | 'y'>>) =>
    request<RestaurantTable>(`/api/me/tables/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteTable: (id: string) =>
    request<void>(`/api/me/tables/${id}`, { method: 'DELETE' }),
  getOrders: (filters?: { status?: OrderStatus; from?: string; to?: string }) => {
    const params = new URLSearchParams()
    if (filters?.status) params.set('status', filters.status)
    if (filters?.from) params.set('from', filters.from)
    if (filters?.to) params.set('to', filters.to)
    const query = params.toString()
    return request<Order[]>(`/api/me/orders${query ? `?${query}` : ''}`)
  },
  getReport: (days: number) => request<Report>(`/api/me/reports?days=${days}`),
  setOrderStatus: (id: string, status: OrderStatus) =>
    request<Order>(`/api/me/orders/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteOrder: (id: string) =>
    request<void>(`/api/me/orders/${id}`, { method: 'DELETE' }),

  // Administração da plataforma
  getPlatformRestaurants: () => request<PlatformRestaurant[]>('/api/admin/restaurants'),
  approveRestaurant: (userId: string) =>
    request<{ ok: boolean }>(`/api/admin/restaurants/${userId}/approve`, { method: 'POST' }),
  rejectRestaurant: (userId: string) =>
    request<{ ok: boolean }>(`/api/admin/restaurants/${userId}/reject`, { method: 'POST' }),
}
