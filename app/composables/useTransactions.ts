// ============================================================
// app/composables/useTransactions.ts
// Shared transaction types and helpers
// ============================================================

export interface Transaction {
  id:           string
  customerId:   string
  customerName: string 
  status:       string
  currency:     string
  totalAmount:  string
  notes?:       string
  createdAt:    string
  updatedAt:    string
  items?:       TransactionItem[]
}

export interface TransactionItem {
  id:            string
  transactionId: string
  productId:     string
  qty:           number
  unitAmount:    string
  lineTotal:     string
  createdAt:     string
}

export interface TransactionView {
  id:            string
  customerId:    string
  customerName:  string
  categoryId?:   string
  status:        string
  currency:      string
  totalAmount:   string
  paidAmount:    string
  paymentStatus: string
  balanceDue:    string
  notes?:        string
  createdAt:     string
  updatedAt:     string
  items:         ViewItem[]
  payments:      ViewPay[]
}

export interface ViewItem {
  productId:      string
  sku?:           string
  productName:    string
  qty:            number
  unitAmount:     string
  discountAmount: string
  lineTotal:      string
  packSize?:      string
  stockProductId?: string
}

export interface ViewPay {
  id:          string
  method:      string
  amount:      string
  currency:    string
  paidAt:      string
  senderName?: string
  reference?:  string
  note?:       string
  status:      string
}

export const useTransactions = () => {
  const formatRupiah = (amount: string | number) => {
    const n = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
    }).format(n)
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
    })

  const formatDateTime = (d: string) =>
    new Date(d).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

  const statusColor = (status: string) => {
    switch (status) {
      case 'draft':      return { bg: '#f1f5f9', color: '#475569' }
      case 'pending':    return { bg: '#fef9c3', color: '#854d0e' }
      case 'completed':  return { bg: '#dcfce7', color: '#166534' }
      case 'cancelled':  return { bg: '#fee2e2', color: '#991b1b' }
      default:           return { bg: '#f1f5f9', color: '#475569' }
    }
  }

  const paymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':      return { bg: '#dcfce7', color: '#166534' }
      case 'partial':   return { bg: '#fef9c3', color: '#854d0e' }
      case 'unpaid':    return { bg: '#fee2e2', color: '#991b1b' }
      case 'overpaid':  return { bg: '#ede9fe', color: '#5b21b6' }
      default:          return { bg: '#f1f5f9', color: '#475569' }
    }
  }

  const paymentProgress = (paidAmount: string, totalAmount: string) => {
    const paid  = parseFloat(paidAmount)
    const total = parseFloat(totalAmount)
    if (!total) return 0
    return Math.min(100, Math.round((paid / total) * 100))
  }

  return {
    formatRupiah,
    formatDate,
    formatDateTime,
    statusColor,
    paymentStatusColor,
    paymentProgress,
  }
}