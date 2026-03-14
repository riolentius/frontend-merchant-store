// ============================================================
// app/mocks/index.ts
// Single import point — use this in your composables:
//
//   import { USE_MOCK, mockLogin, mockGetProducts } from '~/mocks'
// ============================================================

export { USE_MOCK }                        from './config'
export { delay, mockLogin,
         mockUser, mockCredentials,
         mockAuthResponse }                from './auth.mock'
export { mockCustomers,
         mockGetCustomers,
         mockGetCustomer }                 from './customer.mock'
export { mockProducts,
         mockGetProducts,
         mockGetProduct }                  from './product.mock'
export { mockTransactions,
         mockGetTransactions,
         mockGetTransaction }              from './transaction.mock'

export type { Customer }                   from './customer.mock'
export type { Product, ProductPrice }      from './product.mock'
export type { Transaction, TransactionItem,
              Payment, TransactionStatus,
              PaymentStatus, PaymentMethod } from './transaction.mock'