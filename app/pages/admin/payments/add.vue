<script setup lang="ts">
import { mockGetTransactions } from "~/mocks";
import type { Transaction } from "~/mocks";

definePageMeta({ layout: "dashboard" });

const router = useRouter();
const isSaving = ref(false);
const isLoading = ref(true);
const showConfirmLeave = ref(false);

// Step 1 — transaction list
const transactions = ref<Transaction[]>([]);
const selectedTx = ref<Transaction | null>(null);
const txSearch = ref("");

// Step 2 — payment form
const paymentForm = reactive({
  method: "cash" as "cash" | "transfer",
  amount: 0,
  note: "",
});

const errors = reactive({ amount: "" });

onMounted(async () => {
  transactions.value = await mockGetTransactions();
  isLoading.value = false;
});

// Only show transactions that still need payment
const payableTransactions = computed(() => {
  const q = txSearch.value.toLowerCase().trim();
  return transactions.value
    .filter(
      (t) =>
        t.status !== "cancelled" &&
        t.payment_status !== "paid" &&
        t.payment_status !== "overpaid",
    )
    .filter(
      (t) =>
        !q ||
        t.customer_name.toLowerCase().includes(q) ||
        String(t.id).includes(q),
    );
});

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

// Derived from selected transaction
const outstanding = computed(() =>
  selectedTx.value ? selectedTx.value.total - selectedTx.value.total_paid : 0,
);

const alreadyPaid = computed(() =>
  selectedTx.value ? selectedTx.value.total_paid : 0,
);

const paymentProgress = computed(() =>
  selectedTx.value
    ? Math.min(
        100,
        Math.round(
          (selectedTx.value.total_paid / selectedTx.value.total) * 100,
        ),
      )
    : 0,
);

// Payment status label
const paymentStatusInfo = computed(() => {
  if (!selectedTx.value) return null;
  const s = selectedTx.value.payment_status;
  if (s === "unpaid")
    return {
      label: "No payments recorded yet",
      color: "#dc2626",
      bg: "#fef2f2",
    };
  if (s === "partial")
    return {
      label: `${paymentProgress.value}% paid — ${formatRupiah(outstanding.value)} remaining`,
      color: "#854d0e",
      bg: "#fef9c3",
    };
  return null;
});

const selectTransaction = (tx: Transaction) => {
  selectedTx.value = tx;
  paymentForm.amount = outstanding.value; // pre-fill with outstanding amount
  errors.amount = "";
};

const clearSelection = () => {
  selectedTx.value = null;
  paymentForm.amount = 0;
  paymentForm.note = "";
  errors.amount = "";
};

const validate = () => {
  if (!paymentForm.amount || paymentForm.amount <= 0) {
    errors.amount = "Amount must be greater than 0";
    return false;
  }
  errors.amount = "";
  return true;
};

const handleSave = async () => {
  if (!selectedTx.value || !validate()) return;
  isSaving.value = true;
  // TODO: POST /api/v1/payments  { transaction_id, method, amount }
  await new Promise((r) => setTimeout(r, 700));
  isSaving.value = false;
  router.push("/admin/payments");
};
</script>

<template>
  <div class="page">
    <PageHeader
      title="Add Payment"
      subtitle="Record a payment against a transaction"
    >
      <template #action>
        <button class="btn-secondary" @click="showConfirmLeave = true">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </template>
    </PageHeader>

    <DataCard v-if="isLoading" :loading="true" :skeleton-rows="4" />

    <form v-else novalidate @submit.prevent="handleSave">
      <div class="form-layout">
        <!-- ── Step 1: Select Transaction ── -->
        <FormSection
          title="1. Select Transaction"
          subtitle="Only unpaid or partially paid transactions are shown"
        >
          <!-- Selected state -->
          <template v-if="selectedTx">
            <div class="selected-tx">
              <div class="selected-tx__info">
                <div class="selected-tx__top">
                  <span class="selected-tx__id">#{{ selectedTx.id }}</span>
                  <TransactionBadge :status="selectedTx.status" />
                  <PaymentBadge :status="selectedTx.payment_status" />
                </div>
                <p class="selected-tx__customer">
                  {{ selectedTx.customer_name }}
                </p>
                <div class="selected-tx__amounts">
                  <span class="amount-chip">
                    Total: <strong>{{ formatRupiah(selectedTx.total) }}</strong>
                  </span>
                  <span class="amount-chip amount-chip--paid">
                    Paid: <strong>{{ formatRupiah(alreadyPaid) }}</strong>
                  </span>
                  <span class="amount-chip amount-chip--due">
                    Due: <strong>{{ formatRupiah(outstanding) }}</strong>
                  </span>
                </div>

                <!-- Progress bar -->
                <div class="tx-progress">
                  <div class="tx-progress__bar">
                    <div
                      class="tx-progress__fill"
                      :style="{ width: `${paymentProgress}%` }"
                      :class="
                        paymentProgress === 100
                          ? 'tx-progress__fill--done'
                          : 'tx-progress__fill--partial'
                      "
                    />
                  </div>
                  <span class="tx-progress__label"
                    >{{ paymentProgress }}% paid</span
                  >
                </div>

                <!-- Status info -->
                <div
                  v-if="paymentStatusInfo"
                  class="status-info"
                  :style="{
                    background: paymentStatusInfo.bg,
                    color: paymentStatusInfo.color,
                  }"
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {{ paymentStatusInfo.label }}
                </div>

                <!-- Items summary -->
                <div class="tx-items">
                  <p
                    v-for="item in selectedTx.items"
                    :key="item.product_id"
                    class="tx-item"
                  >
                    <span>{{ item.product_name }} × {{ item.qty }}</span>
                    <span>{{ formatRupiah(item.subtotal) }}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                class="change-tx-btn"
                @click="clearSelection"
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
                    d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                  />
                  <path
                    d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                  />
                </svg>
                Change
              </button>
            </div>
          </template>

          <!-- Picker state -->
          <template v-else>
            <SearchInput
              v-model="txSearch"
              placeholder="Search by customer name or transaction ID…"
            />

            <div v-if="payableTransactions.length === 0" class="empty-state">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.2"
              >
                <rect x="1" y="4" width="22" height="16" rx="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
              <p>No unpaid transactions found</p>
              <NuxtLink
                to="/admin/transactions/add"
                class="btn-secondary btn-secondary--sm"
              >
                Create a transaction first
              </NuxtLink>
            </div>

            <div v-else class="tx-list">
              <div
                v-for="tx in payableTransactions"
                :key="tx.id"
                class="tx-card"
                @click="selectTransaction(tx)"
              >
                <div class="tx-card__left">
                  <div class="tx-card__top">
                    <span class="tx-card__id">#{{ tx.id }}</span>
                    <TransactionBadge :status="tx.status" />
                    <PaymentBadge :status="tx.payment_status" />
                  </div>
                  <p class="tx-card__customer">{{ tx.customer_name }}</p>
                  <div class="tx-card__amounts">
                    <span class="amount-chip"
                      >Total:
                      <strong>{{ formatRupiah(tx.total) }}</strong></span
                    >
                    <span
                      v-if="tx.total_paid > 0"
                      class="amount-chip amount-chip--paid"
                    >
                      Paid: <strong>{{ formatRupiah(tx.total_paid) }}</strong>
                    </span>
                    <span class="amount-chip amount-chip--due">
                      Due:
                      <strong>{{
                        formatRupiah(tx.total - tx.total_paid)
                      }}</strong>
                    </span>
                  </div>
                </div>

                <!-- Mini progress bar -->
                <div class="tx-card__progress">
                  <div class="mini-bar">
                    <div
                      class="mini-bar__fill"
                      :style="{
                        width: `${Math.round((tx.total_paid / tx.total) * 100)}%`,
                      }"
                    />
                  </div>
                  <span class="mini-pct">
                    {{ Math.round((tx.total_paid / tx.total) * 100) }}%
                  </span>
                </div>
              </div>
            </div>
          </template>
        </FormSection>

        <!-- ── Step 2: Payment Details (only shown after transaction selected) ── -->
        <Transition name="step-fade">
          <FormSection
            v-if="selectedTx"
            title="2. Payment Details"
            subtitle="Enter the payment amount and method"
          >
            <!-- Method selector -->
            <div class="field-group">
              <label class="field-label">Payment Method</label>
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
                  <span class="method-card__icon">{{
                    m === "cash" ? "💵" : "🏦"
                  }}</span>
                  <span class="method-card__label">{{
                    m === "cash" ? "Cash" : "Bank Transfer"
                  }}</span>
                  <div
                    v-if="paymentForm.method === m"
                    class="method-card__check"
                  >
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                </label>
              </div>
            </div>

            <!-- Amount input -->
            <div class="field-group">
              <div class="amount-label-row">
                <label class="field-label"
                  >Amount (IDR) <span class="req">*</span></label
                >
                <div class="quick-amounts">
                  <button
                    type="button"
                    class="quick-btn"
                    @click="paymentForm.amount = Math.round(outstanding / 2)"
                  >
                    Half
                  </button>
                  <button
                    type="button"
                    class="quick-btn quick-btn--full"
                    @click="paymentForm.amount = outstanding"
                  >
                    Full ({{ formatRupiah(outstanding) }})
                  </button>
                </div>
              </div>
              <InputText
                v-model.number="paymentForm.amount"
                type="number"
                min="1"
                :placeholder="`Outstanding: ${formatRupiah(outstanding)}`"
                fluid
                :class="{ 'p-invalid': errors.amount }"
              />
              <span v-if="errors.amount" class="field-error">{{
                errors.amount
              }}</span>

              <!-- Live preview of what this payment means -->
              <div v-if="paymentForm.amount > 0" class="payment-preview">
                <div class="preview-row">
                  <span>This payment</span>
                  <PriceDisplay :amount="paymentForm.amount" />
                </div>
                <div class="preview-row">
                  <span>Remaining after</span>
                  <PriceDisplay
                    :amount="Math.max(0, outstanding - paymentForm.amount)"
                    :muted="outstanding - paymentForm.amount <= 0"
                  />
                </div>
                <div
                  v-if="paymentForm.amount > outstanding"
                  class="overpay-warn"
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
                      d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                    />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  Overpayment of
                  {{ formatRupiah(paymentForm.amount - outstanding) }} —
                  transaction will be marked as overpaid
                </div>
                <div
                  v-else-if="paymentForm.amount === outstanding"
                  class="fullpay-info"
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  Full payment — transaction will be marked as paid
                </div>
              </div>
            </div>

            <!-- Note -->
            <div class="field-group">
              <label class="field-label"
                >Note <span class="field-label--opt">(optional)</span></label
              >
              <InputText
                v-model="paymentForm.note"
                placeholder="e.g. Paid via BCA transfer"
                fluid
              />
            </div>
          </FormSection>
        </Transition>

        <!-- ── Actions ── -->
        <div class="form-actions">
          <button
            type="button"
            class="btn-secondary"
            @click="showConfirmLeave = true"
          >
            Cancel
          </button>
          <Button
            type="submit"
            :loading="isSaving"
            :disabled="!selectedTx || isSaving"
            class="btn-submit"
          >
            <template #default>
              <span class="btn-inner">
                <template v-if="!isSaving">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.2"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Record Payment
                </template>
                <template v-else>Saving…</template>
              </span>
            </template>
          </Button>
        </div>
      </div>
    </form>

    <ConfirmDialog
      v-model="showConfirmLeave"
      title="Discard payment?"
      description="You have unsaved changes. Are you sure you want to leave?"
      confirm-label="Yes, Discard"
      @confirm="router.push('/admin/payments')"
    />
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.form-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 14px;
  background: #fff;
  color: #475569;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  text-decoration: none;
  transition: background 0.15s;
}
.btn-secondary:hover {
  background: #f8fafc;
}
.btn-secondary--sm {
  font-size: 12.5px;
  padding: 6px 12px;
}

/* ── Transaction picker ── */
.tx-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}

.tx-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s;
  gap: 16px;
}
.tx-card:hover {
  border-color: #3b82f6;
  background: #f8fafc;
}

.tx-card__top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.tx-card__id {
  font-family: "Geist Mono", monospace;
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}
.tx-card__customer {
  font-size: 13.5px;
  font-weight: 500;
  color: #334155;
  margin: 0 0 6px;
}
.tx-card__amounts {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.amount-chip {
  font-size: 12px;
  color: #64748b;
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 99px;
}
.amount-chip strong {
  color: #0f172a;
}
.amount-chip--paid strong {
  color: #16a34a;
}
.amount-chip--due {
  background: #fef9c3;
}
.amount-chip--due strong {
  color: #854d0e;
}

.tx-card__progress {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}
.mini-bar {
  width: 80px;
  height: 5px;
  background: #f1f5f9;
  border-radius: 99px;
  overflow: hidden;
}
.mini-bar__fill {
  height: 100%;
  background: #f59e0b;
  border-radius: 99px;
  transition: width 0.3s;
}
.mini-pct {
  font-size: 11px;
  color: #94a3b8;
}

/* ── Selected transaction ── */
.selected-tx {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px;
  border: 1.5px solid #3b82f6;
  border-radius: 10px;
  background: #eff6ff;
  gap: 12px;
}
.selected-tx__top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.selected-tx__id {
  font-family: "Geist Mono", monospace;
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}
.selected-tx__customer {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 8px;
}
.selected-tx__amounts {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.tx-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.tx-progress__bar {
  flex: 1;
  height: 6px;
  background: #bfdbfe;
  border-radius: 99px;
  overflow: hidden;
}
.tx-progress__fill {
  height: 100%;
  border-radius: 99px;
  transition: width 0.4s;
}
.tx-progress__fill--partial {
  background: #f59e0b;
}
.tx-progress__fill--done {
  background: #16a34a;
}
.tx-progress__label {
  font-size: 11.5px;
  color: #3b82f6;
  font-weight: 600;
  white-space: nowrap;
}

.status-info {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 12px;
  border-radius: 7px;
  font-size: 12.5px;
  font-weight: 500;
  margin-bottom: 10px;
}

.tx-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.tx-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12.5px;
  color: #475569;
  padding: 3px 0;
  border-bottom: 1px solid rgba(59, 130, 246, 0.1);
}
.tx-item:last-child {
  border-bottom: none;
}

.change-tx-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  background: #fff;
  color: #475569;
  border: 1px solid #bfdbfe;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  transition: background 0.15s;
  flex-shrink: 0;
}
.change-tx-btn:hover {
  background: #f1f5f9;
}

/* ── Empty state ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 32px;
  color: #94a3b8;
  text-align: center;
}
.empty-state p {
  font-size: 13.5px;
  margin: 0;
}

/* ── Step 2 fields ── */
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
.field-label--opt {
  font-weight: 400;
  color: #94a3b8;
}
.req {
  color: #ef4444;
}
.field-error {
  font-size: 12px;
  color: #dc2626;
}

.method-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.method-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  cursor: pointer;
  position: relative;
  transition:
    border-color 0.15s,
    background 0.15s;
}
.method-card:hover {
  border-color: #94a3b8;
  background: #f8fafc;
}
.method-card--active {
  border-color: #3b82f6;
  background: #eff6ff;
}
.method-card__icon {
  font-size: 20px;
}
.method-card__label {
  font-size: 13.5px;
  font-weight: 500;
  color: #0f172a;
}
.method-card__check {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #2563eb;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.amount-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.quick-amounts {
  display: flex;
  gap: 6px;
}
.quick-btn {
  padding: 3px 10px;
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
  border-color: #94a3b8;
}
.quick-btn--full {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #1d4ed8;
}
.quick-btn--full:hover {
  background: #dbeafe;
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
:deep(.p-invalid.p-inputtext) {
  border-color: #ef4444;
}

/* Payment preview */
.payment-preview {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
}
.preview-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #475569;
}

.overpay-warn {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  padding: 8px 12px;
  background: #fef9c3;
  border: 1px solid #fde68a;
  border-radius: 7px;
  font-size: 12.5px;
  color: #854d0e;
  line-height: 1.4;
  margin-top: 4px;
}
.fullpay-info {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 12px;
  background: #f0fdf4;
  border: 1px solid #86efac;
  border-radius: 7px;
  font-size: 12.5px;
  color: #16a34a;
  margin-top: 4px;
}

/* ── Step transition ── */
.step-fade-enter-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}
.step-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

/* ── Actions ── */
.form-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}
:deep(.btn-submit.p-button) {
  background: #2563eb;
  border-color: #2563eb;
  font-family: "Geist", sans-serif;
  font-size: 13.5px;
  font-weight: 500;
  border-radius: 8px;
  padding: 8px 20px;
  box-shadow: 0 1px 6px rgba(37, 99, 235, 0.25);
}
:deep(.btn-submit.p-button:not(:disabled):hover) {
  background: #1d4ed8;
  border-color: #1d4ed8;
}
:deep(.btn-submit.p-button:disabled) {
  opacity: 0.5;
}
.btn-inner {
  display: flex;
  align-items: center;
  gap: 7px;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}

@media (max-width: 640px) {
  .method-grid {
    grid-template-columns: 1fr;
  }
}
</style>
