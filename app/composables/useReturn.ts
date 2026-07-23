export interface ReturnableItem {
  transactionItemId: string;
  productId: string;
  productName: string;
  sku?: string;
  unitAmount: string;
  qtySold: number;
  qtyReturned: number;
  qtyReturnable: number;
}

export interface ReturnRecord {
  id: string;
  createdAt: string;
  reason?: string;
  note?: string;
  totalAmount: string;
  createdByEmail?: string;
  items: { productId: string; productName: string; qty: number; unitAmount: string }[];
}

export const useReturns = () => {
  const { $api } = useNuxtApp();

  const fetchReturnableItems = (txId: string) =>
    $api<{ items: ReturnableItem[] }>(`/transactions/${txId}/returnable-items`);

  const fetchReturns = (txId: string) =>
    $api<{ items: ReturnRecord[] }>(`/transactions/${txId}/returns`);

  const createReturn = (
    txId: string,
    payload: { items: { productId: string; qty: number }[]; reason?: string; note?: string },
  ) => $api(`/transactions/${txId}/returns`, { method: "POST", body: payload });

  return { fetchReturnableItems, fetchReturns, createReturn };
};