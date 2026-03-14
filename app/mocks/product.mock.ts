// ============================================================
// app/mocks/product.mock.ts
// ============================================================

import { delay } from './auth.mock'

export interface ProductPrice {
  category: 'Regular' | 'Special' | 'VIP'
  price: number
}

export interface Product {
  id: number
  name: string
  sku: string
  stock: number
  is_active: boolean
  prices: ProductPrice[]
  created_at: string
}

export const mockProducts: Product[] = [
  {
    id: 1, name: 'Beras Premium 5kg', sku: 'BRS-001', stock: 150, is_active: true,
    prices: [
      { category: 'Regular', price: 75000 },
      { category: 'Special', price: 70000 },
      { category: 'VIP',     price: 65000 },
    ],
    created_at: '2025-01-05',
  },
  {
    id: 2, name: 'Minyak Goreng 2L', sku: 'MYK-001', stock: 80, is_active: true,
    prices: [
      { category: 'Regular', price: 32000 },
      { category: 'Special', price: 30000 },
      { category: 'VIP',     price: 28000 },
    ],
    created_at: '2025-01-06',
  },
  {
    id: 3, name: 'Gula Pasir 1kg', sku: 'GLA-001', stock: 200, is_active: true,
    prices: [
      { category: 'Regular', price: 14000 },
      { category: 'Special', price: 13000 },
      { category: 'VIP',     price: 12000 },
    ],
    created_at: '2025-01-07',
  },
  {
    id: 4, name: 'Tepung Terigu 1kg', sku: 'TPG-001', stock: 0, is_active: false,
    prices: [
      { category: 'Regular', price: 12000 },
      { category: 'Special', price: 11000 },
      { category: 'VIP',     price: 10000 },
    ],
    created_at: '2025-01-08',
  },
  {
    id: 5, name: 'Kecap Manis 600ml', sku: 'KCP-001', stock: 60, is_active: true,
    prices: [
      { category: 'Regular', price: 18000 },
      { category: 'Special', price: 17000 },
      { category: 'VIP',     price: 15000 },
    ],
    created_at: '2025-01-09',
  },
]

// Simulates GET /api/v1/products
export const mockGetProducts = async (): Promise<Product[]> => {
  await delay(400)
  return mockProducts
}

// Simulates GET /api/v1/products/:id
export const mockGetProduct = async (id: number): Promise<Product> => {
  await delay(300)
  const found = mockProducts.find(p => p.id === id)
  if (!found) throw { response: { status: 404 } }
  return found
}