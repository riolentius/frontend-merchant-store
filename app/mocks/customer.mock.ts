// ============================================================
// app/mocks/customer.mock.ts
// ============================================================

import { delay } from './auth.mock'

export interface Customer {
  id: number
  name: string
  phone: string
  email: string
  category: 'Regular' | 'Special' | 'VIP'
  created_at: string
}

export const mockCustomers: Customer[] = [
  { id: 1,  name: 'Budi Santoso',    phone: '081234567890', email: 'budi@email.com',    category: 'Regular', created_at: '2025-01-10' },
  { id: 2,  name: 'Siti Rahayu',     phone: '082345678901', email: 'siti@email.com',    category: 'VIP',     created_at: '2025-01-15' },
  { id: 3,  name: 'Agus Purnomo',    phone: '083456789012', email: 'agus@email.com',    category: 'Special', created_at: '2025-01-20' },
  { id: 4,  name: 'Dewi Lestari',    phone: '084567890123', email: 'dewi@email.com',    category: 'Regular', created_at: '2025-02-01' },
  { id: 5,  name: 'Rudi Hartono',    phone: '085678901234', email: 'rudi@email.com',    category: 'VIP',     created_at: '2025-02-05' },
  { id: 6,  name: 'Ani Wijayanti',   phone: '086789012345', email: 'ani@email.com',     category: 'Regular', created_at: '2025-02-10' },
  { id: 7,  name: 'Hendra Kusuma',   phone: '087890123456', email: 'hendra@email.com',  category: 'Special', created_at: '2025-02-14' },
  { id: 8,  name: 'Rina Marlina',    phone: '088901234567', email: 'rina@email.com',    category: 'Regular', created_at: '2025-02-18' },
]

// Simulates GET /api/v1/customers
export const mockGetCustomers = async (): Promise<Customer[]> => {
  await delay(400)
  return mockCustomers
}

// Simulates GET /api/v1/customers/:id
export const mockGetCustomer = async (id: number): Promise<Customer> => {
  await delay(300)
  const found = mockCustomers.find(c => c.id === id)
  if (!found) throw { response: { status: 404 } }
  return found
}