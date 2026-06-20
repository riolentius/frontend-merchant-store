export interface CustomerTxn {
  id:            string
  status:        string
  totalAmount:   string
  paidAmount:    string
  balanceDue:    string
  paymentStatus: string
  createdAt:     string
}

export const useCustomerTransactions = () => {
  const { apiFetch } = useApiFetch()

  const fetchForCustomer = async (customerId: string) => {
    return apiFetch<{ items: CustomerTxn[]; totalOutstanding: string }>(
      `/customers/${customerId}/transactions`,
    )
  }

  return { fetchForCustomer }
}