// ============================================================
// app/composables/useProducts.ts
// Shared product + price helpers
// ============================================================

export interface Product {
  id:            string
  sku?:          string
  name:          string
  isActive:      boolean
  stockOnHand:   number
  stockReserved: number
}

export interface ProductPrice {
  id:         string
  productId:  string
  categoryId?: string
  currency:   string
  amount:     string   // decimal string e.g. "75000"
  validFrom:  string
  validTo?:   string
}

export const useProducts = () => {
  const { $api } = useNuxtApp()

  const formatRupiah = (amount: string | number) => {
    const n = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
    }).format(n)
  }

  const todayISO = () => new Date().toISOString()

  // Fetch prices for a product — handles { value: [], Count: 0 } shape
  const fetchPrices = async (productId: string): Promise<ProductPrice[]> => {
    const res = await $api<{ value: ProductPrice[]; Count: number }>(
      `/products/${productId}/prices`
    )
    return res.value ?? []
  }

  // Create prices for all 3 categories at once
  const createPrices = async (
    productId: string,
    prices: { categoryId: string; amount: string }[]
  ) => {
    await Promise.all(
      prices.map(p =>
        $api(`/products/${productId}/prices`, {
          method: 'POST',
          body: {
            categoryId: p.categoryId,
            currency:   'IDR',
            amount:     p.amount,
            validFrom:  todayISO(),
          },
        })
      )
    )
  }

  // Update a single price
  const updatePrice = async (priceId: string, amount: string) => {
    await $api(`/prices/${priceId}`, {
      method: 'PATCH',
      body: { amount, currency: 'IDR' },
    })
  }

  return {
    formatRupiah,
    todayISO,
    fetchPrices,
    createPrices,
    updatePrice,
  }
}