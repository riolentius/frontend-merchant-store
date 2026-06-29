<script setup lang="ts">
import type { TransactionView } from "../../../composables/useTransactions";

definePageMeta({ layout: "dashboard" });

const { $api } = useNuxtApp();
const {
  formatRupiah,
  formatDate,
  statusColor,
  paymentStatusColor,
  paymentProgress,
} = useTransactions();
const router = useRouter();

const isLoading = ref(true);
const isSaving = ref(false);
const showConfirmLeave = ref(false);

// All transactions that still need payment
interface TxSummary {
  id: string;
  customerName: string;
  totalAmount: string;
  paidAmount: string;
  balanceDue: string;
  paymentStatus: string;
  status: string;
}
const transactions = ref<TxSummary[]>([]);
const selectedTx = ref<TxSummary | null>(null);
const txSearch = ref("");

const todayISO = () => {
  const d = new Date();
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
};

const paymentForm = reactive({
  method: "cash",
  amount: "",
  paidAt: todayISO(),
  senderName: "",
  reference: "",
  note: "",
});

const errors = reactive({ amount: "" });

onMounted(async () => {
  try {
    const res = await $api<{ items: any[] }>("/transactions");
    const items = res.items ?? [];
    // Fetch view for each to get payment status + balance
    const views = await Promise.all(
      items.map((t) =>
        $api<TransactionView>(`/transactions/${t.id}/view`).catch(() => null),
      ),
    );
    transactions.value = views
      .filter(Boolean)
      .filter(
        (v) =>
          v!.status !== "cancelled" &&
          v!.paymentStatus !== "paid" &&
          v!.paymentStatus !== "overpaid",
      )
      .map((v) => ({
        id: v!.id,
        customerName: v!.customerName,
        totalAmount: v!.totalAmount,
        paidAmount: v!.paidAmount,
        balanceDue: v!.balanceDue,
        paymentStatus: v!.paymentStatus,
        status: v!.status,
      }));
  } catch {
    transactions.value = [];
  } finally {
    isLoading.value = false;
  }
});

const filteredTx = computed(() => {
  const q = txSearch.value.toLowerCase().trim();
  if (!q) return transactions.value;
  return transactions.value.filter(
    (t) =>
      t.customerName.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q),
  );
});

const selectTx = (tx: TxSummary) => {
  selectedTx.value = tx;
  paymentForm.amount = tx.balanceDue; // pre-fill with balance due
  errors.amount = "";
};

const clearSelection = () => {
  selectedTx.value = null;
  paymentForm.amount = "";
  errors.amount = "";
};

const progress = (tx: TxSummary) =>
  paymentProgress(tx.paidAmount, tx.totalAmount);

const validate = () => {
  if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
    errors.amount = "Amount must be greater than 0";
    return false;
  }
  errors.amount = "";
  return true;
};

const handleSave = async () => {
  if (!selectedTx.value || !validate()) return;
  isSaving.value = true;
  try {
    await $api(`/transactions/${selectedTx.value.id}/payments`, {
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
    router.push("/admin/payments");
  } catch (err) {
    console.error("Failed to record payment:", err);
  } finally {
    isSaving.value = false;
  }
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
        <!-- Step 1: Select Transaction -->
        <FormSection
          title="1. Select Transaction"
          subtitle="Only unpaid or partially paid transactions are shown"
        >
          <!-- Selected -->
          <template v-if="selectedTx">
            <div class="selected-tx">
              <div class="selected-tx__info">
                <div class="selected-tx__top">
                  <span class="selected-tx__id"
                    >#{{ selectedTx.id.slice(0, 8) }}…</span
                  >
                  <span
                    class="status-badge"
                    :style="statusColor(selectedTx.status)"
                    >{{ selectedTx.status }}</span
                  >
                  <span
                    class="status-badge"
                    :style="paymentStatusColor(selectedTx.paymentStatus)"
                    >{{ selectedTx.paymentStatus }}</span
                  >
                </div>
                <p class="selected-tx__customer">
                  {{ selectedTx.customerName }}
                </p>
                <div class="selected-tx__chips">
                  <span class="chip"
                    >Total:
                    <strong>{{
                      formatRupiah(selectedTx.totalAmount)
                    }}</strong></span
                  >
                  <span class="chip chip--paid"
                    >Paid:
                    <strong>{{
                      formatRupiah(selectedTx.paidAmount)
                    }}</strong></span
                  >
                  <span class="chip chip--due"
                    >Due:
                    <strong>{{
                      formatRupiah(selectedTx.balanceDue)
                    }}</strong></span
                  >
                </div>
                <div class="tx-progress">
                  <div class="tx-progress__bar">
                    <div
                      class="tx-progress__fill"
                      :style="{ width: `${progress(selectedTx)}%` }"
                    />
                  </div>
                  <span class="tx-progress__label"
                    >{{ progress(selectedTx) }}% paid</span
                  >
                </div>
              </div>
              <button type="button" class="change-btn" @click="clearSelection">
                Change
              </button>
            </div>
          </template>

          <!-- Picker -->
          <template v-else>
            <SearchInput
              v-model="txSearch"
              placeholder="Search by customer name or ID…"
            />

            <div v-if="transactions.length === 0" class="empty-state">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.2"
              >
                <rect x="1" y="4" width="22" height="16" rx="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
              <p>No unpaid transactions found</p>
              <NuxtLink to="/admin/transactions/add" class="btn-secondary"
                >Create a transaction first</NuxtLink
              >
            </div>

            <div v-else class="tx-list">
              <div
                v-for="tx in filteredTx"
                :key="tx.id"
                class="tx-card"
                @click="selectTx(tx)"
              >
                <div class="tx-card__left">
                  <div class="tx-card__top">
                    <span class="tx-id">#{{ tx.id.slice(0, 8) }}…</span>
                    <span
                      class="status-badge"
                      :style="statusColor(tx.status)"
                      >{{ tx.status }}</span
                    >
                    <span
                      class="status-badge"
                      :style="paymentStatusColor(tx.paymentStatus)"
                      >{{ tx.paymentStatus }}</span
                    >
                  </div>
                  <p class="tx-customer">{{ tx.customerName }}</p>
                  <div class="tx-chips">
                    <span class="chip">{{ formatRupiah(tx.totalAmount) }}</span>
                    <span class="chip chip--due"
                      >Due: {{ formatRupiah(tx.balanceDue) }}</span
                    >
                  </div>
                </div>
                <div class="mini-progress">
                  <div class="mini-bar">
                    <div
                      class="mini-fill"
                      :style="{ width: `${progress(tx)}%` }"
                    />
                  </div>
                  <span class="mini-pct">{{ progress(tx) }}%</span>
                </div>
              </div>
            </div>
          </template>
        </FormSection>

        <!-- Step 2: Payment Details -->
        <Transition name="fade-up">
          <FormSection
            v-if="selectedTx"
            title="2. Payment Details"
            subtitle="Enter payment method and amount"
          >
            <!-- Method -->
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
                  <div v-if="paymentForm.method === m" class="method-check">
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

            <!-- Amount -->
            <div class="field-group">
              <div class="amount-label-row">
                <label class="field-label"
                  >Amount (IDR) <span class="req">*</span></label
                >
                <div class="quick-fills">
                  <button
                    type="button"
                    class="quick-btn"
                    @click="
                      paymentForm.amount = String(
                        Math.round(parseFloat(selectedTx.balanceDue) / 2),
                      )
                    "
                  >
                    Half
                  </button>
                  <button
                    type="button"
                    class="quick-btn quick-btn--full"
                    @click="paymentForm.amount = selectedTx.balanceDue"
                  >
                    Full ({{ formatRupiah(selectedTx.balanceDue) }})
                  </button>
                </div>
              </div>
              <InputText
                v-model="paymentForm.amount"
                type="number"
                min="0"
                :placeholder="`Balance due: ${formatRupiah(selectedTx.balanceDue)}`"
                fluid
                :class="{ 'p-invalid': errors.amount }"
              />
              <span v-if="errors.amount" class="field-error">{{
                errors.amount
              }}</span>

              <!-- Preview -->
              <div
                v-if="paymentForm.amount && parseFloat(paymentForm.amount) > 0"
                class="amount-preview"
              >
                <div class="preview-row">
                  <span>This payment</span
                  ><span class="preview-val">{{
                    formatRupiah(paymentForm.amount)
                  }}</span>
                </div>
                <div class="preview-row">
                  <span>Remaining after</span>
                  <span class="preview-val">{{
                    formatRupiah(
                      Math.max(
                        0,
                        parseFloat(selectedTx.balanceDue) -
                          parseFloat(paymentForm.amount),
                      ),
                    )
                  }}</span>
                </div>
                <div
                  v-if="
                    parseFloat(paymentForm.amount) >
                    parseFloat(selectedTx.balanceDue)
                  "
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
                  Overpayment — transaction will be marked as overpaid
                </div>
                <div
                  v-else-if="
                    parseFloat(paymentForm.amount) ===
                    parseFloat(selectedTx.balanceDue)
                  "
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

            <!-- Transfer fields -->
            <template v-if="paymentForm.method === 'transfer'">
              <div class="field-row">
                <div class="field-group">
                  <label class="field-label">Sender Name</label>
                  <InputText
                    v-model="paymentForm.senderName"
                    placeholder="e.g. Budi Santoso"
                    fluid
                  />
                </div>
                <div class="field-group">
                  <label class="field-label">Reference No.</label>
                  <InputText
                    v-model="paymentForm.reference"
                    placeholder="e.g. TRF-20240401"
                    fluid
                  />
                </div>
              </div>
            </template>

            <div class="field-group">
              <label class="field-label"
                >Note <span class="field-label--opt">(optional)</span></label
              >
              <InputText
                v-model="paymentForm.note"
                placeholder="e.g. Paid in advance"
                fluid
              />
            </div>
          </FormSection>
        </Transition>

        <!-- Actions -->
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

    <Dialog
      v-model:visible="showConfirmLeave"
      header="Discard payment?"
      :modal="true"
      :draggable="false"
      :style="{ width: '380px' }"
    >
      <p style="margin: 0; font-size: 13.5px; color: #64748b; line-height: 1.5">
        You have unsaved changes. Are you sure you want to leave?
      </p>
      <template #footer>
        <div style="display: flex; gap: 8px">
          <Button
            label="Cancel"
            severity="secondary"
            outlined
            fluid
            @click="showConfirmLeave = false"
          />
          <Button
            label="Yes, Discard"
            severity="danger"
            fluid
            @click="router.push('/admin/payments')"
          />
        </div>
      </template>
    </Dialog>
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
.status-badge {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 99px;
  font-size: 11.5px;
  font-weight: 600;
  text-transform: capitalize;
}

/* Selected tx */
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
.selected-tx__chips {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.chip {
  font-size: 12px;
  color: #64748b;
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 99px;
}
.chip strong {
  color: #0f172a;
}
.chip--paid strong {
  color: #16a34a;
}
.chip--due {
  background: #fef9c3;
}
.chip--due strong {
  color: #854d0e;
}
.tx-progress {
  display: flex;
  align-items: center;
  gap: 10px;
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
  background: #f59e0b;
  border-radius: 99px;
  transition: width 0.4s;
}
.tx-progress__label {
  font-size: 11.5px;
  color: #3b82f6;
  font-weight: 600;
  white-space: nowrap;
}
.change-btn {
  padding: 6px 12px;
  background: #fff;
  color: #475569;
  border: 1px solid #bfdbfe;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background 0.15s;
}
.change-btn:hover {
  background: #f1f5f9;
}

/* TX list */
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
.tx-id {
  font-family: "Geist Mono", monospace;
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}
.tx-customer {
  font-size: 13.5px;
  font-weight: 500;
  color: #334155;
  margin: 0 0 6px;
}
.tx-chips {
  display: flex;
  align-items: center;
  gap: 8px;
}
.mini-progress {
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
.mini-fill {
  height: 100%;
  background: #f59e0b;
  border-radius: 99px;
}
.mini-pct {
  font-size: 11px;
  color: #94a3b8;
}

/* Empty state */
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

/* Step 2 */
.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
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
.method-check {
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
.quick-fills {
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
}
.quick-btn--full {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #1d4ed8;
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
.amount-preview {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.preview-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #475569;
}
.preview-val {
  font-family: "Geist Mono", monospace;
  font-weight: 500;
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
}

/* Transition */
.fade-up-enter-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}
.fade-up-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

/* Actions */
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
  .field-row {
    grid-template-columns: 1fr;
  }
}
</style>
