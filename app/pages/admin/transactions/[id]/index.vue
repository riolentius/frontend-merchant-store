<script setup lang="ts">
import { mockGetTransaction } from "~/mocks";
import type { Transaction } from "~/mocks";

definePageMeta({ layout: "dashboard" });

const route = useRoute();
const router = useRouter();
const id = Number(route.params.id);

const transaction = ref<Transaction | null>(null);
const isLoading = ref(true);
const notFound = ref(false);
const showFulfillConfirm = ref(false);
const showDeleteConfirm = ref(false);
const isFulfilling = ref(false);
const showAddPayment = ref(false);
const paymentForm = reactive({
  method: "cash" as "cash" | "transfer",
  amount: 0,
});
const isSavingPayment = ref(false);

onMounted(async () => {
  try {
    transaction.value = await mockGetTransaction(id);
  } catch {
    notFound.value = true;
  } finally {
    isLoading.value = false;
  }
});

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const outstanding = computed(() =>
  transaction.value
    ? transaction.value.total - transaction.value.total_paid
    : 0,
);

const canFulfill = computed(() => transaction.value?.status === "pending");

const canAddPayment = computed(
  () =>
    transaction.value?.payment_status !== "paid" &&
    transaction.value?.payment_status !== "overpaid" &&
    transaction.value?.status !== "cancelled",
);

const doFulfill = async () => {
  isFulfilling.value = true;
  await new Promise((r) => setTimeout(r, 600));
  if (transaction.value) transaction.value.status = "fulfilled";
  isFulfilling.value = false;
  showFulfillConfirm.value = false;
};

const doAddPayment = async () => {
  if (paymentForm.amount <= 0) return;
  isSavingPayment.value = true;
  await new Promise((r) => setTimeout(r, 500));
  if (transaction.value) {
    transaction.value.payments.push({
      id: Date.now(),
      method: paymentForm.method,
      amount: paymentForm.amount,
      paid_at: new Date().toISOString().split("T")[0],
    });
    transaction.value.total_paid += paymentForm.amount;
    // Recalculate payment status
    const paid = transaction.value.total_paid;
    const total = transaction.value.total;
    if (paid >= total)
      transaction.value.payment_status = paid > total ? "overpaid" : "paid";
    else if (paid > 0) transaction.value.payment_status = "partial";
    else transaction.value.payment_status = "unpaid";
  }
  paymentForm.amount = 0;
  isSavingPayment.value = false;
  showAddPayment.value = false;
};
</script>

<template>
  <div class="page">
    <PageHeader
      :title="isLoading ? 'Loading…' : `Transaction #${id}`"
      :subtitle="
        transaction
          ? `${transaction.customer_name} · ${formatDate(transaction.created_at)}`
          : ''
      "
    >
      <template #action>
        <div class="header-actions">
          <!-- Fulfill button -->
          <button
            v-if="canFulfill"
            class="btn-fulfill"
            @click="showFulfillConfirm = true"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Mark Fulfilled
          </button>
          <!-- Add payment button -->
          <button
            v-if="canAddPayment && transaction"
            class="btn-payment"
            @click="showAddPayment = true"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect x="1" y="4" width="22" height="16" rx="2" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
            Add Payment
          </button>
          <button
            v-if="transaction"
            class="btn-danger"
            @click="showDeleteConfirm = true"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            </svg>
            Cancel
          </button>
          <NuxtLink to="/admin/transactions" class="btn-ghost">← Back</NuxtLink>
        </div>
      </template>
    </PageHeader>

    <div v-if="notFound" class="not-found">
      <p>Transaction #{{ id }} was not found.</p>
      <NuxtLink to="/admin/transactions" class="btn-secondary">← Back</NuxtLink>
    </div>

    <DataCard v-else-if="isLoading" :loading="true" :skeleton-rows="4" />

    <template v-else-if="transaction">
      <div class="detail-grid">
        <!-- Left col -->
        <div class="left-col">
          <!-- Status overview -->
          <div class="status-bar">
            <div class="status-bar__item">
              <span class="status-bar__label">Order Status</span>
              <TransactionBadge :status="transaction.status" />
            </div>
            <div class="status-bar__item">
              <span class="status-bar__label">Payment Status</span>
              <PaymentBadge :status="transaction.payment_status" />
            </div>
            <div class="status-bar__item">
              <span class="status-bar__label">Customer</span>
              <span class="status-bar__val">{{
                transaction.customer_name
              }}</span>
            </div>
            <div class="status-bar__item">
              <span class="status-bar__label">Date</span>
              <span class="status-bar__val">{{
                formatDate(transaction.created_at)
              }}</span>
            </div>
          </div>

          <!-- Items -->
          <FormSection title="Order Items">
            <table class="items-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Unit Price</th>
                  <th>Qty</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in transaction.items" :key="item.product_id">
                  <td class="item-name">{{ item.product_name }}</td>
                  <td>
                    <PriceDisplay :amount="item.unit_price" size="sm" muted />
                  </td>
                  <td class="item-qty">× {{ item.qty }}</td>
                  <td><PriceDisplay :amount="item.subtotal" /></td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="total-row">
                  <td colspan="3" class="total-label">Grand Total</td>
                  <td>
                    <PriceDisplay :amount="transaction.total" size="lg" />
                  </td>
                </tr>
              </tfoot>
            </table>
          </FormSection>

          <!-- Payments -->
          <FormSection title="Payment History">
            <div
              v-if="transaction.payments.length === 0"
              class="empty-payments"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <rect x="1" y="4" width="22" height="16" rx="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
              No payments recorded yet
            </div>
            <div v-else class="payment-list">
              <div
                v-for="pay in transaction.payments"
                :key="pay.id"
                class="payment-row"
              >
                <div class="payment-row__left">
                  <span
                    class="payment-method"
                    :class="`payment-method--${pay.method}`"
                  >
                    {{ pay.method === "cash" ? "💵" : "🏦" }} {{ pay.method }}
                  </span>
                  <span class="payment-date">{{
                    formatDate(pay.paid_at)
                  }}</span>
                </div>
                <PriceDisplay :amount="pay.amount" />
              </div>
              <!-- Total paid summary -->
              <div class="payment-summary">
                <div class="payment-summary__row">
                  <span>Total Paid</span>
                  <PriceDisplay :amount="transaction.total_paid" />
                </div>
                <div
                  class="payment-summary__row"
                  :class="{ 'payment-summary__row--danger': outstanding > 0 }"
                >
                  <span>Outstanding</span>
                  <PriceDisplay :amount="Math.max(0, outstanding)" />
                </div>
              </div>
            </div>

            <!-- Add payment inline form -->
            <div v-if="showAddPayment" class="add-payment-form">
              <div class="add-payment-form__header">
                <span>Record Payment</span>
                <button
                  type="button"
                  class="picker-close"
                  @click="showAddPayment = false"
                >
                  ✕
                </button>
              </div>
              <div class="add-payment-form__body">
                <div class="field-row">
                  <div class="field-group">
                    <label class="field-label">Method</label>
                    <div class="method-tabs">
                      <button
                        v-for="m in ['cash', 'transfer']"
                        :key="m"
                        type="button"
                        class="method-tab"
                        :class="{
                          'method-tab--active': paymentForm.method === m,
                        }"
                        @click="paymentForm.method = m as 'cash' | 'transfer'"
                      >
                        {{ m === "cash" ? "💵 Cash" : "🏦 Transfer" }}
                      </button>
                    </div>
                  </div>
                  <div class="field-group">
                    <label class="field-label">Amount (IDR)</label>
                    <InputText
                      v-model.number="paymentForm.amount"
                      type="number"
                      min="0"
                      :placeholder="`Max: ${formatRupiah(outstanding)}`"
                      fluid
                    />
                  </div>
                </div>
                <div class="add-payment-actions">
                  <button
                    type="button"
                    class="btn-secondary"
                    @click="showAddPayment = false"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    class="btn-save"
                    :disabled="paymentForm.amount <= 0 || isSavingPayment"
                    @click="doAddPayment"
                  >
                    {{ isSavingPayment ? "Saving…" : "Record Payment" }}
                  </button>
                </div>
              </div>
            </div>

            <button
              v-if="!showAddPayment && canAddPayment"
              type="button"
              class="add-item-btn"
              @click="showAddPayment = true"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.2"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Record Payment
            </button>
          </FormSection>
        </div>

        <!-- Right: summary -->
        <div class="summary-card">
          <p class="summary-title">Summary</p>

          <div class="summary-amounts">
            <div class="amount-row">
              <span>Order Total</span>
              <PriceDisplay :amount="transaction.total" />
            </div>
            <div class="amount-row">
              <span>Total Paid</span>
              <PriceDisplay :amount="transaction.total_paid" />
            </div>
            <div
              class="amount-row amount-row--outstanding"
              v-if="outstanding > 0"
            >
              <span>Outstanding</span>
              <PriceDisplay :amount="outstanding" />
            </div>
          </div>

          <!-- Progress bar -->
          <div class="progress-wrap">
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{
                  width: `${Math.min(100, (transaction.total_paid / transaction.total) * 100)}%`,
                }"
                :class="
                  transaction.payment_status === 'paid'
                    ? 'progress-fill--done'
                    : 'progress-fill--partial'
                "
              />
            </div>
            <span class="progress-label">
              {{
                Math.min(
                  100,
                  Math.round(
                    (transaction.total_paid / transaction.total) * 100,
                  ),
                )
              }}% paid
            </span>
          </div>

          <div class="summary-badges">
            <div class="summary-badge-row">
              <span class="summary-badge-label">Order</span>
              <TransactionBadge :status="transaction.status" />
            </div>
            <div class="summary-badge-row">
              <span class="summary-badge-label">Payment</span>
              <PaymentBadge :status="transaction.payment_status" />
            </div>
          </div>

          <button
            v-if="canFulfill"
            class="btn-fulfill-lg"
            @click="showFulfillConfirm = true"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Mark as Fulfilled
          </button>
        </div>
      </div>
    </template>

    <!-- Fulfill confirm -->
    <ConfirmDialog
      v-model="showFulfillConfirm"
      title="Fulfill Transaction?"
      description="This will deduct stock for all items in this order. This action cannot be undone."
      confirm-label="Yes, Fulfill"
      :danger="false"
      @confirm="doFulfill"
    />

    <!-- Cancel confirm -->
    <ConfirmDialog
      v-model="showDeleteConfirm"
      title="Cancel Transaction?"
      description="This will cancel the transaction. No stock will be deducted."
      confirm-label="Yes, Cancel"
      @confirm="router.push('/admin/transactions')"
    />
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-fulfill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  background: #f0fdf4;
  color: #16a34a;
  border: 1px solid #86efac;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}
.btn-fulfill:hover {
  background: #dcfce7;
}

.btn-payment {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  background: #eff6ff;
  color: #2563eb;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}
.btn-payment:hover {
  background: #dbeafe;
}

.btn-danger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}
.btn-danger:hover {
  background: #fee2e2;
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  background: #fff;
  color: #475569;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  text-decoration: none;
  transition: background 0.15s;
}
.btn-secondary:hover {
  background: #f8fafc;
}

.btn-ghost {
  font-size: 13px;
  color: #64748b;
  text-decoration: none;
  padding: 7px 4px;
  transition: color 0.15s;
}
.btn-ghost:hover {
  color: #0f172a;
}

.btn-save {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}
.btn-save:hover:not(:disabled) {
  background: #1d4ed8;
}
.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px;
  color: #64748b;
}

/* Status bar */
.status-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
}
.status-bar__item {
  padding: 14px 16px;
  border-right: 1px solid #f1f5f9;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.status-bar__item:last-child {
  border-right: none;
}
.status-bar__label {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.status-bar__val {
  font-size: 13.5px;
  font-weight: 500;
  color: #0f172a;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 260px;
  gap: 16px;
  align-items: start;
}
.left-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Items table */
.items-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
}
.items-table th {
  padding: 8px 0;
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border-bottom: 1px solid #f1f5f9;
}
.items-table td {
  padding: 12px 0;
  border-bottom: 1px solid #f8fafc;
}
.items-table tbody tr:last-child td {
  border-bottom: none;
}
.item-name {
  font-weight: 500;
  color: #0f172a;
}
.item-qty {
  color: #64748b;
}
.total-row td {
  padding-top: 14px;
  border-top: 2px solid #f1f5f9;
  border-bottom: none;
}
.total-label {
  font-size: 13.5px;
  font-weight: 600;
  color: #0f172a;
}

/* Payments */
.empty-payments {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 0;
  font-size: 13px;
  color: #94a3b8;
}
.payment-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.payment-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f8fafc;
}
.payment-row:last-child {
  border-bottom: none;
}
.payment-row__left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.payment-method {
  font-size: 13px;
  font-weight: 500;
  color: #334155;
  text-transform: capitalize;
}
.payment-date {
  font-size: 12px;
  color: #94a3b8;
}

.payment-summary {
  border-top: 1px solid #f1f5f9;
  margin-top: 4px;
  padding-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.payment-summary__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #475569;
}
.payment-summary__row--danger {
  color: #dc2626;
  font-weight: 500;
}

/* Add payment form */
.add-payment-form {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  margin-top: 8px;
}
.add-payment-form__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}
.add-payment-form__body {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.picker-close {
  background: none;
  border: none;
  cursor: pointer;
  color: #94a3b8;
  font-size: 14px;
  transition: color 0.15s;
}
.picker-close:hover {
  color: #0f172a;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field-label {
  font-size: 12.5px;
  font-weight: 500;
  color: #475569;
}

.method-tabs {
  display: flex;
  gap: 6px;
}
.method-tab {
  flex: 1;
  padding: 8px;
  border: 1.5px solid #e2e8f0;
  border-radius: 7px;
  background: #fff;
  font-size: 12.5px;
  font-weight: 500;
  color: #475569;
  cursor: pointer;
  font-family: inherit;
  transition:
    border-color 0.15s,
    background 0.15s;
}
.method-tab--active {
  border-color: #3b82f6;
  background: #eff6ff;
  color: #1d4ed8;
}

.add-payment-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

:deep(.p-inputtext) {
  font-family: "Geist", sans-serif;
  font-size: 14px;
  border-radius: 8px;
  border-color: #e2e8f0;
}
:deep(.p-inputtext:enabled:focus) {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}

.add-item-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-top: 10px;
  padding: 8px 14px;
  background: #f8fafc;
  border: 1.5px dashed #e2e8f0;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #475569;
  cursor: pointer;
  font-family: inherit;
  transition:
    border-color 0.15s,
    background 0.15s;
}
.add-item-btn:hover {
  border-color: #3b82f6;
  background: #eff6ff;
  color: #2563eb;
}

/* Summary card */
.summary-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: sticky;
  top: 80px;
}
.summary-title {
  font-size: 13.5px;
  font-weight: 600;
  color: #0f172a;
  margin: 0;
}

.summary-amounts {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.amount-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #475569;
}
.amount-row--outstanding {
  color: #dc2626;
  font-weight: 500;
}

.progress-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.progress-bar {
  height: 6px;
  background: #f1f5f9;
  border-radius: 99px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  border-radius: 99px;
  transition: width 0.4s ease;
}
.progress-fill--partial {
  background: #f59e0b;
}
.progress-fill--done {
  background: #16a34a;
}
.progress-label {
  font-size: 11.5px;
  color: #94a3b8;
  text-align: right;
}

.summary-badges {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.summary-badge-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.summary-badge-label {
  font-size: 12.5px;
  color: #64748b;
}

.btn-fulfill-lg {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 10px;
  width: 100%;
  background: #f0fdf4;
  color: #16a34a;
  border: 1px solid #86efac;
  border-radius: 8px;
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}
.btn-fulfill-lg:hover {
  background: #dcfce7;
}

@media (max-width: 1000px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
  .summary-card {
    position: static;
  }
  .status-bar {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 640px) {
  .field-row {
    grid-template-columns: 1fr;
  }
  .status-bar {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
