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

// Shape returned by GET /api/admin/dashboard
interface DashboardRecentTx {
  id:            string
  customerName:  string
  totalAmount:   string
  currency:      string
  status:        string
  paymentStatus: string
  createdAt:     string
}

interface DashboardLowStockItem {
  id:             string
  name:           string
  sku:            string
  stockOnHand:    number
  stockReserved:  number
  availableStock: number
}

interface DashboardTopProduct {
  id:            string
  name:          string
  sku:           string
  totalQtySold:  number
  totalRevenue:  string
}

interface DashboardResponse {
  recentTransactions: DashboardRecentTx[]
  lowStock: {
    hasLowStock: boolean
    items:       DashboardLowStockItem[]
  }
}

interface TopProductsResponse {
  items: DashboardTopProduct[]
}

export const useDashboard = () => {
  const { $api } = useNuxtApp()

  const isLoading          = ref(true)
  const stats              = ref<StatCard[]>([])
  const recentTransactions = ref<any[]>([])
  const lowStockProducts   = ref<any[]>([])
  const topProducts        = ref<DashboardTopProduct[]>([])
  const formatRupiah = (n: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
    }).format(n)

  const loadReal = async () => {
    const [data, top] = await Promise.all([
      $api<DashboardResponse>('/dashboard'),
      $api<TopProductsResponse>('/dashboard/top-products?limit=20')
        .catch(() => ({ items: [] as DashboardTopProduct[] })),
    ])

    // Map recent transactions into the shape index.vue expects
    recentTransactions.value = (data.recentTransactions ?? []).map(tx => ({
      id:             tx.id.slice(0, 8),
      customer_name:  tx.customerName,
      total:          parseFloat(tx.totalAmount),
      status:         tx.status,
      payment_status: tx.paymentStatus,
      created_at:     tx.createdAt,
    }))

    // Map low stock items
    lowStockProducts.value = (data.lowStock?.items ?? []).map(p => ({
      id:    p.id,
      name:  p.name,
      sku:   p.sku,
      stock: p.availableStock,
    }))


    topProducts.value = (top.items ?? []).map(p => ({
      id:           p.id,
      name:         p.name,
      sku:          p.sku,
      totalQtySold: p.totalQtySold,
      totalRevenue: p.totalRevenue,
    }))

    const txs = data.recentTransactions ?? []
    const paidCount    = txs.filter(t => t.paymentStatus === 'paid').length
    const pendingCount = txs.filter(t => t.status === 'pending' || t.status === 'draft').length
    const revenue = txs
      .filter(t => t.paymentStatus === 'paid')
      .reduce((s, t) => s + parseFloat(t.totalAmount), 0)
    const outstanding = txs
      .filter(t => t.paymentStatus === 'unpaid' || t.paymentStatus === 'partial')
      .reduce((s, t) => s + parseFloat(t.totalAmount), 0)
    const lowStockCount = data.lowStock?.items?.length ?? 0

    stats.value = [
      {
        label: 'Recent Revenue',
        value: formatRupiah(revenue),
        sub:   `from ${paidCount} paid transactions`,
        icon: 'revenue', color: 'blue',
      },
      {
        label: 'Recent Transactions',
        value: txs.length,
        sub:   `${paidCount} paid · ${pendingCount} pending`,
        icon: 'customers', color: 'green',
      },
      {
        label: 'Outstanding',
        value: formatRupiah(outstanding),
        sub:   `across unpaid orders`,
        icon: 'pending', color: 'amber',
      },
      {
        label: 'Low Stock Items',
        value: lowStockCount,
        sub:   lowStockCount > 0 ? 'need restocking' : 'stock healthy',
        icon: 'products', color: lowStockCount > 0 ? 'red' : 'slate',
        trend: { value: lowStockCount > 0 ? 'action needed' : 'all clear', up: lowStockCount === 0 },
      },
    ]
  }

  const loadMock = async () => {
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

  const load = async () => {
    isLoading.value = true
    try {
      if (USE_MOCK) {
        await loadMock()
      } else {
        await loadReal()
      }
    } catch (err) {
      console.error('dashboard load failed:', err)
    } finally {
      isLoading.value = false
    }
  }

  onMounted(load)

  return { isLoading, stats, recentTransactions, lowStockProducts, topProducts }
}