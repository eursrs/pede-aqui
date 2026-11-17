export type UserStatus = 'pending' | 'approved' | 'rejected'
export type UserRole = 'owner' | 'platform_admin'

export type User = {
  id: string
  email: string
  ownerName: string
  role: UserRole
  status: UserStatus
  createdAt: string
}

export type Restaurant = {
  id: string
  name: string
  slug: string
  description: string
  createdAt: string
  owner_id?: string
}

export type Dish = {
  id: string
  name: string
  description: string
  price: number
  category: string
  available: boolean
  image: string
  restaurant_id?: string
}

export type Category = {
  id: string
  name: string
  position: number
}

export type OrderItem = {
  id: string
  name: string
  price: number
  qty: number
  lineTotal: number
}

export type OrderStatus = 'new' | 'preparing' | 'done'

export type Order = {
  id: string
  createdAt: string
  status: OrderStatus
  total: number
  items: OrderItem[]
  note: string
  tableLabel: string
}

export type RestaurantTable = {
  id: string
  label: string
  createdAt: string
}

export type DailyReport = {
  day: string
  orders: number
  revenue: number
}

export type Report = {
  daily: DailyReport[]
  topDishes: { name: string; qty: number; revenue: number }[]
  totals: { orders: number; revenue: number; avgTicket: number }
}

export type PlatformRestaurant = {
  userId: string
  email: string
  ownerName: string
  status: UserStatus
  createdAt: string
  restaurant: Restaurant & { dishCount: number; orderCount: number }
}
