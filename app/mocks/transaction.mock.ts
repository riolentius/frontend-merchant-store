// ============================================================
// app/mocks/transaction.mock.ts
// ============================================================

import { delay } from './auth.mock'

export type TransactionStatus  = 'pending' | 'fulfilled' | 'cancelled'
export type PaymentStatus      = 'unpaid' | 'partial' | 'paid' | 'overpaid'
export type PaymentMethod      = 'cash' | 'transfer'

export interface TransactionItem {
  product_id:   number
  product_name: string
  qty:          number
  unit_price:   number
  subtotal:     number
}

export interface Payment {
  id:         number
  method:     PaymentMethod
  amount:     number
  paid_at:    string
}

export interface Transaction {
  id:             number
  customer_id:    number
  customer_name:  string
  status:         TransactionStatus
  payment_status: PaymentStatus
  items:          TransactionItem[]
  payments:       Payment[]
  total:          number
  total_paid:     number
  created_at:     string
}

export const mockTransactions: Transaction[] = [
  {
    id: 1, customer_id: 2, customer_name: 'Siti Rahayu',
    status: 'fulfilled', payment_status: 'paid', total: 197000, total_paid: 197000,
    items: [
      { product_id: 1, product_name: 'Beras Premium 5kg', qty: 2, unit_price: 65000, subtotal: 130000 },
      { product_id: 2, product_name: 'Minyak Goreng 2L',  qty: 1, unit_price: 28000, subtotal: 28000  },
      { product_id: 3, product_name: 'Gula Pasir 1kg',    qty: 3, unit_price: 13000, subtotal: 39000  },
    ],
    payments: [
      { id: 1, method: 'transfer', amount: 197000, paid_at: '2025-03-01' },
    ],
    created_at: '2025-03-01',
  },
  {
    id: 2, customer_id: 1, customer_name: 'Budi Santoso',
    status: 'fulfilled', payment_status: 'partial', total: 150000, total_paid: 100000,
    items: [
      { product_id: 1, product_name: 'Beras Premium 5kg', qty: 2, unit_price: 75000, subtotal: 150000 },
    ],
    payments: [
      { id: 2, method: 'cash', amount: 100000, paid_at: '2025-03-03' },
    ],
    created_at: '2025-03-03',
  },
  {
    id: 3, customer_id: 5, customer_name: 'Rudi Hartono',
    status: 'pending', payment_status: 'unpaid', total: 93000, total_paid: 0,
    items: [
      { product_id: 2, product_name: 'Minyak Goreng 2L', qty: 2, unit_price: 28000, subtotal: 56000 },
      { product_id: 5, product_name: 'Kecap Manis 600ml', qty: 1, unit_price: 15000, subtotal: 15000 },
      { product_id: 3, product_name: 'Gula Pasir 1kg',   qty: 2, unit_price: 11000, subtotal: 22000 },
    ],
    payments: [],
    created_at: '2025-03-05',
  },
  {
    id: 4, customer_id: 3, customer_name: 'Agus Purnomo',
    status: 'cancelled', payment_status: 'unpaid', total: 68000, total_paid: 0,
    items: [
      { product_id: 1, product_name: 'Beras Premium 5kg', qty: 1, unit_price: 70000, subtotal: 70000 },
    ],
    payments: [],
    created_at: '2025-03-06',
  },
]

// Simulates GET /api/v1/transactions
export const mockGetTransactions = async (): Promise<Transaction[]> => {
  await delay(500)
  return mockTransactions
}

// Simulates GET /api/v1/transactions/:id
export const mockGetTransaction = async (id: number): Promise<Transaction> => {
  await delay(300)
  const found = mockTransactions.find(t => t.id === id)
  if (!found) throw { response: { status: 404 } }
  return found
}