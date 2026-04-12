<script setup lang="ts">
import type { TransactionView } from "../../../../composables/useTransactions";

definePageMeta({ layout: "dashboard" });

const { $api } = useNuxtApp();
const {
  formatRupiah,
  formatDateTime,
  statusColor,
  paymentStatusColor,
  paymentProgress,
} = useTransactions();
const route = useRoute();
const router = useRouter();
const id = route.params.id as string;

const view = ref<TransactionView | null>(null);
const isLoading = ref(true);
const notFound = ref(false);

// Actions
const isFulfilling = ref(false);
const showFulfillConfirm = ref(false);
const showCancelConfirm = ref(false);

// Add payment
const showAddPayment = ref(false);
const isSavingPayment = ref(false);
const paymentForm = reactive({
  method: "cash",
  amount: "",
  senderName: "",
  reference: "",
  note: "",
});

onMounted(async () => {
  try {
    view.value = await $api<TransactionView>(`/transactions/${id}/view`);
  } catch {
    notFound.value = true;
  } finally {
    isLoading.value = false;
  }
});

const progress = computed(() =>
  view.value
    ? paymentProgress(view.value.paidAmount, view.value.totalAmount)
    : 0,
);

// Status transitions
const canConfirm = computed(() => view.value?.status === "draft");
const canFulfill = computed(() => view.value?.status === "pending");
const canCancel = computed(() =>
  ["draft", "pending"].includes(view.value?.status ?? ""),
);
const canPay = computed(
  () =>
    view.value?.paymentStatus !== "paid" &&
    view.value?.paymentStatus !== "overpaid" &&
    view.value?.status !== "cancelled",
);

const doConfirm = async () => {
  try {
    await $api(`/transactions/${id}/status`, {
      method: "PATCH",
      body: { status: "pending" },
    });
    view.value = await $api<TransactionView>(`/transactions/${id}/view`);
  } catch (err) {
    console.error(err);
  }
};

const doFulfill = async () => {
  isFulfilling.value = true;
  try {
    await $api(`/transactions/${id}/fulfill`, { method: "POST" });
    view.value = await $api<TransactionView>(`/transactions/${id}/view`);
  } catch (err) {
    console.error(err);
  } finally {
    isFulfilling.value = false;
    showFulfillConfirm.value = false;
  }
};

const doCancel = async () => {
  try {
    await $api(`/transactions/${id}/status`, {
      method: "PATCH",
      body: { status: "cancelled" },
    });
    view.value = await $api<TransactionView>(`/transactions/${id}/view`);
  } catch (err) {
    console.error(err);
  } finally {
    showCancelConfirm.value = false;
  }
};

const doAddPayment = async () => {
  if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) return;
  isSavingPayment.value = true;
  try {
    await $api(`/transactions/${id}/payments`, {
      method: "POST",
      body: {
        method: paymentForm.method,
        amount: paymentForm.amount,
        currency: "IDR",
        senderName: paymentForm.senderName || undefined,
        reference: paymentForm.reference || undefined,
        note: paymentForm.note || undefined,
      },
    });
    // Refresh view
    view.value = await $api<TransactionView>(`/transactions/${id}/view`);
    showAddPayment.value = false;
    paymentForm.amount = "";
    paymentForm.senderName = "";
    paymentForm.reference = "";
    paymentForm.note = "";
  } catch (err) {
    console.error(err);
  } finally {
    isSavingPayment.value = false;
  }
};
</script>

<template>
  <div class="page">
    <PageHeader
      :title="isLoading ? 'Loading…' : `Transaction`"
      :subtitle="view ? `#${view.id.slice(0, 8)}… · ${view.customerName}` : ''"
    >
      <template #action>
        <div class="header-actions">
          <button
            v-if="canConfirm && view"
            class="btn-action btn-action--blue"
            @click="doConfirm"
          >
            Confirm Order
          </button>
          <button
            v-if="canFulfill && view"
            class="btn-action btn-action--green"
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
            Fulfill
          </button>
          <button
            v-if="canPay && view"
            class="btn-action btn-action--blue"
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
            v-if="canCancel && view"
            class="btn-action btn-action--red"
            @click="showCancelConfirm = true"
          >
            Cancel
          </button>
          <NuxtLink
            :to="`/admin/transactions/${id}/invoice`"
            class="btn-action btn-action--gray"
            target="_blank"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
              />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            Invoice
          </NuxtLink>
          <NuxtLink to="/admin/transactions" class="btn-ghost">← Back</NuxtLink>
        </div>
      </template>
    </PageHeader>

    <div v-if="notFound" class="not-found">
      <p>Transaction not found.</p>
      <NuxtLink to="/admin/transactions" class="btn-secondary">← Back</NuxtLink>
    </div>

    <DataCard v-else-if="isLoading" :loading="true" :skeleton-rows="5" />

    <template v-else-if="view">
      <div class="detail-grid">
        <div class="left-col">
          <!-- Status bar -->
          <div class="status-bar">
            <div class="status-item">
              <span class="status-item__label">Order Status</span>
              <span class="status-badge" :style="statusColor(view.status)">{{
                view.status
              }}</span>
            </div>
            <div class="status-item">
              <span class="status-item__label">Payment</span>
              <span
                class="status-badge"
                :style="paymentStatusColor(view.paymentStatus)"
                >{{ view.paymentStatus }}</span
              >
            </div>
            <div class="status-item">
              <span class="status-item__label">Customer</span>
              <span class="status-item__val">{{ view.customerName }}</span>
            </div>
            <div class="status-item">
              <span class="status-item__label">Created</span>
              <span class="status-item__val">{{
                formatDateTime(view.createdAt)
              }}</span>
            </div>
          </div>

          <!-- Items -->
          <FormSection title="Order Items">
            <table class="items-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Unit Price</th>
                  <th>Qty</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in view.items" :key="item.productId">
                  <td class="item-name">{{ item.productName }}</td>
                  <td class="item-sku">{{ item.sku ?? "—" }}</td>
                  <td class="item-amount">
                    {{ formatRupiah(item.unitAmount) }}
                  </td>
                  <td class="item-qty">× {{ item.qty }}</td>
                  <td class="item-total">{{ formatRupiah(item.lineTotal) }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="total-row">
                  <td colspan="4" class="total-label">Grand Total</td>
                  <td class="total-val">
                    {{ formatRupiah(view.totalAmount) }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </FormSection>

          <!-- Payments -->
          <FormSection title="Payment History">
            <div v-if="view.payments.length === 0" class="empty-payments">
              <svg
                width="18"
                height="18"
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
                v-for="pay in view.payments"
                :key="pay.id"
                class="payment-row"
              >
                <div class="payment-row__left">
                  <span class="payment-method"
                    >{{ pay.method === "cash" ? "💵" : "🏦" }}
                    {{ pay.method }}</span
                  >
                  <span v-if="pay.senderName" class="payment-sender">{{
                    pay.senderName
                  }}</span>
                  <span v-if="pay.reference" class="payment-ref"
                    >Ref: {{ pay.reference }}</span
                  >
                </div>
                <span class="payment-amount">{{
                  formatRupiah(pay.amount)
                }}</span>
              </div>
              <!-- Summary -->
              <div class="payment-summary">
                <div class="payment-summary__row">
                  <span>Total Paid</span>
                  <span class="payment-summary__val">{{
                    formatRupiah(view.paidAmount)
                  }}</span>
                </div>
                <div
                  class="payment-summary__row payment-summary__row--due"
                  v-if="parseFloat(view.balanceDue) > 0"
                >
                  <span>Balance Due</span>
                  <span class="payment-summary__val">{{
                    formatRupiah(view.balanceDue)
                  }}</span>
                </div>
              </div>
            </div>

            <!-- Add payment form -->
            <div v-if="showAddPayment" class="add-payment">
              <div class="add-payment__head">
                <span>Record Payment</span>
                <button
                  type="button"
                  class="picker-close"
                  @click="showAddPayment = false"
                >
                  ✕
                </button>
              </div>
              <div class="add-payment__body">
                <div class="method-grid">
                  <label
                    v-for="m in ['cash', 'transfer']"
                    :key="m"
                    class="method-card"
                    :class="{ 'method-card--active': paymentForm.method === m }"
                  >
                    <input
                      type="radio"
                      v-model="paymentForm.method"
                      :value="m"
                      class="sr-only"
                    />
                    <span>{{ m === "cash" ? "💵 Cash" : "🏦 Transfer" }}</span>
                  </label>
                </div>
                <div class="field-row">
                  <div class="field-group">
                    <label class="field-label">Amount (IDR) *</label>
                    <InputText
                      v-model="paymentForm.amount"
                      type="number"
                      min="0"
                      :placeholder="`Due: ${formatRupiah(view.balanceDue)}`"
                      fluid
                    />
                  </div>
                  <div class="field-group">
                    <label class="field-label">Sender Name</label>
                    <InputText
                      v-model="paymentForm.senderName"
                      placeholder="Optional"
                      fluid
                    />
                  </div>
                </div>
                <div class="field-row">
                  <div class="field-group">
                    <label class="field-label">Reference</label>
                    <InputText
                      v-model="paymentForm.reference"
                      placeholder="e.g. Transfer ref no."
                      fluid
                    />
                  </div>
                  <div class="field-group">
                    <label class="field-label">Note</label>
                    <InputText
                      v-model="paymentForm.note"
                      placeholder="Optional"
                      fluid
                    />
                  </div>
                </div>
                <!-- Quick fill -->
                <div class="quick-fills">
                  <button
                    type="button"
                    class="quick-btn"
                    @click="
                      paymentForm.amount = String(
                        Math.round(parseFloat(view.balanceDue) / 2),
                      )
                    "
                  >
                    Half ({{ formatRupiah(parseFloat(view.balanceDue) / 2) }})
                  </button>
                  <button
                    type="button"
                    class="quick-btn quick-btn--full"
                    @click="paymentForm.amount = view.balanceDue"
                  >
                    Full ({{ formatRupiah(view.balanceDue) }})
                  </button>
                </div>
                <div class="add-payment__footer">
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
                    :disabled="!paymentForm.amount || isSavingPayment"
                    @click="doAddPayment"
                  >
                    {{ isSavingPayment ? "Saving…" : "Record Payment" }}
                  </button>
                </div>
              </div>
            </div>
          </FormSection>
        </div>

        <!-- Summary sidebar -->
        <div class="summary-card">
          <p class="summary-title">Summary</p>

          <div class="summary-amounts">
            <div class="amount-row">
              <span>Total</span
              ><span class="amount-val">{{
                formatRupiah(view.totalAmount)
              }}</span>
            </div>
            <div class="amount-row">
              <span>Paid</span
              ><span class="amount-val">{{
                formatRupiah(view.paidAmount)
              }}</span>
            </div>
            <div
              v-if="parseFloat(view.balanceDue) > 0"
              class="amount-row amount-row--due"
            >
              <span>Balance Due</span
              ><span class="amount-val">{{
                formatRupiah(view.balanceDue)
              }}</span>
            </div>
          </div>

          <!-- Progress bar -->
          <div class="progress-wrap">
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: `${progress}%` }"
                :class="
                  progress >= 100
                    ? 'progress-fill--done'
                    : 'progress-fill--partial'
                "
              />
            </div>
            <span class="progress-label">{{ progress }}% paid</span>
          </div>

          <div class="summary-badges">
            <div class="badge-row">
              <span class="badge-label">Order</span>
              <span class="status-badge" :style="statusColor(view.status)">{{
                view.status
              }}</span>
            </div>
            <div class="badge-row">
              <span class="badge-label">Payment</span>
              <span
                class="status-badge"
                :style="paymentStatusColor(view.paymentStatus)"
                >{{ view.paymentStatus }}</span
              >
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

          <button
            v-if="canPay"
            class="btn-pay-lg"
            @click="showAddPayment = true"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect x="1" y="4" width="22" height="16" rx="2" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
            Record Payment
          </button>
        </div>
      </div>
    </template>

    <ConfirmDialog
      v-model="showFulfillConfirm"
      title="Fulfill Transaction?"
      description="Stock will be deducted. This cannot be undone."
      confirm-label="Yes, Fulfill"
      :danger="false"
      @confirm="doFulfill"
    />
    <ConfirmDialog
      v-model="showCancelConfirm"
      title="Cancel Transaction?"
      description="This will cancel the order and release any reserved stock."
      confirm-label="Yes, Cancel"
      @confirm="doCancel"
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
.btn-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  border: 1px solid;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}
.btn-action--green {
  background: #f0fdf4;
  color: #16a34a;
  border-color: #86efac;
}
.btn-action--green:hover {
  background: #dcfce7;
}
.btn-action--blue {
  background: #eff6ff;
  color: #2563eb;
  border-color: #bfdbfe;
}
.btn-action--blue:hover {
  background: #dbeafe;
}
.btn-action--red {
  background: #fef2f2;
  color: #dc2626;
  border-color: #fecaca;
}
.btn-action--red:hover {
  background: #fee2e2;
}
.btn-action--gray {
  background: #f8fafc;
  color: #475569;
  border-color: #e2e8f0;
  text-decoration: none;
}
.btn-action--gray:hover {
  background: #f1f5f9;
}
.btn-ghost {
  font-size: 13px;
  color: #64748b;
  text-decoration: none;
  padding: 7px 4px;
}
.btn-ghost:hover {
  color: #0f172a;
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
  transition: background 0.15s;
}
.btn-secondary:hover {
  background: #f8fafc;
}
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px;
  color: #64748b;
}
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 16px;
  align-items: start;
}
.left-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Status bar */
.status-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
}
.status-item {
  padding: 14px 16px;
  border-right: 1px solid #f1f5f9;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.status-item:last-child {
  border-right: none;
}
.status-item__label {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.status-item__val {
  font-size: 13.5px;
  font-weight: 500;
  color: #0f172a;
}
.status-badge {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 99px;
  font-size: 11.5px;
  font-weight: 600;
  text-transform: capitalize;
  align-self: flex-start;
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
.item-sku {
  font-family: "Geist Mono", monospace;
  font-size: 12px;
  color: #94a3b8;
}
.item-amount,
.item-total {
  font-family: "Geist Mono", monospace;
  font-weight: 500;
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
.total-val {
  font-family: "Geist Mono", monospace;
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
}

/* Payments */
.empty-payments {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 16px 0;
  font-size: 13px;
  color: #94a3b8;
}
.payment-list {
  display: flex;
  flex-direction: column;
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
  flex-wrap: wrap;
}
.payment-method {
  font-size: 13px;
  font-weight: 500;
  color: #334155;
  text-transform: capitalize;
}
.payment-sender,
.payment-ref {
  font-size: 12px;
  color: #94a3b8;
}
.payment-amount {
  font-family: "Geist Mono", monospace;
  font-weight: 500;
}
.payment-summary {
  border-top: 1px solid #f1f5f9;
  margin-top: 8px;
  padding-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.payment-summary__row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #475569;
}
.payment-summary__row--due {
  color: #dc2626;
  font-weight: 500;
}
.payment-summary__val {
  font-family: "Geist Mono", monospace;
}

/* Add payment */
.add-payment {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  margin-top: 12px;
}
.add-payment__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}
.picker-close {
  background: none;
  border: none;
  cursor: pointer;
  color: #94a3b8;
  font-size: 14px;
}
.add-payment__body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.method-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.method-card {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #475569;
  transition:
    border-color 0.15s,
    background 0.15s;
}
.method-card--active {
  border-color: #3b82f6;
  background: #eff6ff;
  color: #1d4ed8;
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
.quick-fills {
  display: flex;
  gap: 8px;
}
.quick-btn {
  padding: 5px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #f8fafc;
  font-size: 12px;
  font-weight: 500;
  color: #475569;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.12s;
}
.quick-btn:hover {
  background: #f1f5f9;
}
.quick-btn--full {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #1d4ed8;
}
.add-payment__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
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

/* Summary card */
.summary-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
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
  font-size: 13px;
  color: #475569;
}
.amount-row--due {
  color: #dc2626;
  font-weight: 500;
}
.amount-val {
  font-family: "Geist Mono", monospace;
  font-weight: 500;
}
.progress-wrap {
  display: flex;
  flex-direction: column;
  gap: 5px;
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
  transition: width 0.4s;
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
.badge-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.badge-label {
  font-size: 12.5px;
  color: #64748b;
}
.btn-fulfill-lg,
.btn-pay-lg {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 10px;
  width: 100%;
  border-radius: 8px;
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  border: 1px solid;
  transition: background 0.15s;
}
.btn-fulfill-lg {
  background: #f0fdf4;
  color: #16a34a;
  border-color: #86efac;
}
.btn-fulfill-lg:hover {
  background: #dcfce7;
}
.btn-pay-lg {
  background: #eff6ff;
  color: #2563eb;
  border-color: #bfdbfe;
}
.btn-pay-lg:hover {
  background: #dbeafe;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
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
}
</style>
