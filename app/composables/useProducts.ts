import * as XLSX from "xlsx";

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

interface ExportProduct {
  name: string;
  sku: string;
  cost: string;
  priceRegular: string;
  priceSpecial: string;
  priceVip: string;
  stockOnHand: number;
  stockReserved: number;
  isActive: boolean;
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

export const useProductExport = () => {
  const { $api } = useNuxtApp();

  const exportProducts = async (opts?: { search?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (opts?.search) params.set("search", opts.search);
    if (opts?.status && opts.status !== "all") params.set("status", opts.status);

    const res = await $api<{ items: ExportProduct[] }>(
      `/products/export?${params.toString()}`,
    );
    const items = res.items ?? [];

    // map to spreadsheet rows with friendly headers + numeric types
    const rows = items.map((p) => ({
      "Nama Produk": p.name,
      SKU: p.sku,
      "Harga Modal": Number(p.cost),
      "Harga Regular": Number(p.priceRegular),
      "Harga Special": Number(p.priceSpecial),
      "Harga VIP": Number(p.priceVip),
      "Stok Tersedia": p.stockOnHand - p.stockReserved,
      "Stok Fisik": p.stockOnHand,
      "Stok Dipesan": p.stockReserved,
      Status: p.isActive ? "Aktif" : "Nonaktif",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);

    // column widths so it's readable, not cramped
    ws["!cols"] = [
      { wch: 32 },
      { wch: 14 }, // SKU
      { wch: 14 }, // Modal
      { wch: 14 }, // Regular
      { wch: 14 }, // Special
      { wch: 14 }, // VIP
      { wch: 12 }, // Tersedia
      { wch: 10 }, // Fisik
      { wch: 12 }, // Dipesan
      { wch: 10 }, // Status
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produk");
    XLSX.writeFile(wb, `produk-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return { exportProducts };
};