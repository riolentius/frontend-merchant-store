export interface StockMovement {
  id: string;
  productId: string;
  direction: "in" | "out";
  quantity: number;
  source: "manual" | "transaction";
  referenceId?: string;
  note?: string;
  createdByEmail?: string;
  createdAt: string;
}

export interface StockMovementQuery {
  from?: string;
  to?: string;
  type?: "in" | "out";
  limit?: number;
  offset?: number;
}

export const useStockMovements = () => {
  const { $api } = useNuxtApp();

  const fetchMovements = async (productId: string, q: StockMovementQuery = {}) => {
    const params = new URLSearchParams();
    if (q.from) params.set("from", q.from);
    if (q.to) params.set("to", q.to);
    if (q.type) params.set("type", q.type);
    params.set("limit", String(q.limit ?? 50));
    params.set("offset", String(q.offset ?? 0));

    return await $api<{ items: StockMovement[]; total?: number }>(
      `/products/${productId}/stock-movements?${params.toString()}`,
    );
  };

  return { fetchMovements };
};