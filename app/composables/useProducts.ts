export interface Product {
  id:            string
  sku?:          string
  name:          string
  cost:          string
  isActive:      boolean
  stockOnHand:   number
  stockReserved: number
}

export interface ProductPrice {
  id:          string
  productId:   string
  categoryId?: string
  currency:    string
  amount:      string
  validFrom:   string
  validTo?:    string
}

export const useProducts = () => {
  const { apiFetch } = useApiFetch()

  const formatRupiah = (amount: string | number) => {
    const n = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
    }).format(n)
  }

  const todayISO = () => new Date().toISOString()

  // Handles both plain array [] and { value: [] } response shapes
  const fetchPrices = async (productId: string): Promise<ProductPrice[]> => {
    try {
      const data = await apiFetch<any>(`/products/${productId}/prices`)
      return Array.isArray(data) ? data : (data?.value ?? [])
    } catch (err) {
      console.error(`fetchPrices failed for ${productId}:`, err)
      return []
    }
  }

  const createPrices = async (
    productId: string,
    prices: { categoryId: string; amount: string }[]
  ) => {
    await Promise.all(
      prices.map(p =>
        apiFetch(`/products/${productId}/prices`, {
          method: 'POST',
          body: JSON.stringify({
            categoryId: p.categoryId,
            currency:   'IDR',
            amount:     p.amount,
            validFrom:  todayISO(),
          }),
        })
      )
    )
  }

  const updatePrice = async (priceId: string, amount: string) => {
    await apiFetch(`/prices/${priceId}`, {
      method: 'PATCH',
      body: JSON.stringify({ amount, currency: 'IDR' }),
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