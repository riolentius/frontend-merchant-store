import {
  USE_MOCK,
  mockGetCustomers,
  mockGetProducts,
  mockGetTransactions,
} from '../mocks'

import type { Transaction } from '../mocks'

export interface StatCard {
  label:  string
  value:  string | number
  sub:    string
  icon:   string
  color:  'blue' | 'green' | 'amber' | 'red' | 'slate'
  trend?: { value: string; up: boolean }
}

export const useDashboard = () => {
  const isLoading          = ref(true)
  const stats              = ref<StatCard[]>([])
  const recentTransactions = ref<Transaction[]>([])
  const lowStockProducts   = ref<any[]>([])

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
    }).format(n)

  const load = async () => {
    isLoading.value = true
    try {
      if (USE_MOCK) {
        const [customers, products, transactions] = await Promise.all([
          mockGetCustomers(),
          mockGetProducts(),
          mockGetTransactions(),
        ])

        const totalRevenue = transactions
          .filter(t => t.payment_status === 'paid' || t.payment_status === 'overpaid')
          .reduce((sum, t) => sum + t.total_paid, 0)

        const pendingTx    = transactions.filter(t => t.status === 'pending').length
        const unpaidAmount = transactions
          .filter(t => t.payment_status === 'partial' || t.payment_status === 'unpaid')
          .reduce((sum, t) => sum + (t.total - t.total_paid), 0)

        const activeProducts = products.filter(p => p.is_active).length
        const lowStock       = products.filter(p => p.stock > 0 && p.stock < 30)
        const outOfStock     = products.filter(p => p.stock === 0).length
        const vipCustomers   = customers.filter(c => c.category === 'VIP').length

        stats.value = [
          {
            label: 'Total Revenue',
            value: formatRupiah(totalRevenue),
            sub:   `from ${transactions.filter(t => t.payment_status === 'paid').length} paid transactions`,
            icon: 'revenue', color: 'blue',
            trend: { value: '+12.4%', up: true },
          },
          {
            label: 'Total Customers',
            value: customers.length,
            sub:   `${vipCustomers} VIP · ${customers.filter(c => c.category === 'Special').length} Special`,
            icon: 'customers', color: 'green',
            trend: { value: '+3 this month', up: true },
          },
          {
            label: 'Pending Orders',
            value: pendingTx,
            sub:   `${formatRupiah(unpaidAmount)} outstanding`,
            icon: 'pending', color: 'amber',
            trend: { value: pendingTx > 0 ? 'needs action' : 'all clear', up: false },
          },
          {
            label: 'Active Products',
            value: activeProducts,
            sub:   `${outOfStock} out of stock`,
            icon: 'products', color: outOfStock > 0 ? 'red' : 'slate',
            trend: { value: outOfStock > 0 ? `${outOfStock} OOS` : 'stock OK', up: outOfStock === 0 },
          },
        ]

        recentTransactions.value = [...transactions]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5)

        lowStockProducts.value = lowStock
      }
    } finally {
      isLoading.value = false
    }
  }

  onMounted(load)

  return { isLoading, stats, recentTransactions, lowStockProducts }
}