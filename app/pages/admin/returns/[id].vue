<script setup lang="ts">
definePageMeta({ layout: "dashboard" });

const { fetchReturnableItems, fetchReturns, createReturn } = useReturns();
const { formatRupiah, formatDateTime } = useTransactions();
const { notifyError, notifySuccess, notifyWarn } = useNotify();
const route = useRoute();
const router = useRouter();
const id = route.params.id as string;

const returnable = ref<ReturnableItem[]>([]);
const history = ref<ReturnRecord[]>([]);
const isLoading = ref(true);
const isSaving = ref(false);
const notFound = ref(false);

// per-line state, keyed by transactionItemId
const qty = reactive<Record<string, number>>({});
const restock = reactive<Record<string, boolean>>({});
const reason = ref("");
const note = ref("");

const load = async () => {
  isLoading.value = true;
  try {
    const [r, h] = await Promise.all([
      fetchReturnableItems(id),
      fetchReturns(id).catch(() => ({ items: [] })),
    ]);
    returnable.value = r.items ?? [];
    history.value = h.items ?? [];
    returnable.value.forEach((i) => {
      qty[i.transactionItemId] = 0;
      restock[i.transactionItemId] = true; // default: goods go back to stock
    });
  } catch {
    notFound.value = true;
  } finally {
    isLoading.value = false;
  }
};

onMounted(load);

const setQty = (item: ReturnableItem, v: number) => {
  let next = Number.isFinite(v) ? Math.floor(v) : 0;
  if (next < 0) next = 0;
  if (next > item.qtyReturnable) {
    next = item.qtyReturnable;
    notifyWarn(
      "Limit",
      `Only ${item.qtyReturnable} of ${item.productName} can be returned.`,
    );
  }
  qty[item.transactionItemId] = next;
};

const selectedItems = computed(() =>
  returnable.value
    .filter((i) => (qty[i.transactionItemId] ?? 0) > 0)
    .map((i) => ({
      transactionItemId: i.transactionItemId,
      qty: qty[i.transactionItemId],
      restock: restock[i.transactionItemId] ?? true,
    })),
);

const returnTotal = computed(() =>
  returnable.value.reduce(
    (s, i) => s + parseFloat(i.unitAmount) * (qty[i.transactionItemId] ?? 0),
    0,
  ),
);

const canSave = computed(
  () => selectedItems.value.length > 0 && !isSaving.value,
);

const submit = async () => {
  if (!canSave.value) return;
  isSaving.value = true;
  try {
    await createReturn(id, {
      items: selectedItems.value,
      reason: reason.value.trim() || undefined,
      note: note.value.trim() || undefined,
    });
    notifySuccess("Return recorded");
    await load(); // refresh returnable qty + history
    reason.value = "";
    note.value = "";
  } catch (err) {
    notifyError(err, "Failed to record return");
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <div class="page">
    <PageHeader
      title="Record Return"
      :subtitle="`Transaction #${id.slice(0, 8)}…`"
    >
      <template #action>
        <div class="header-actions">
          <NuxtLink :to="`/admin/transactions/${id}`" class="btn-secondary">
            View Transaction
          </NuxtLink>
          <NuxtLink to="/admin/returns" class="btn-ghost">← Back</NuxtLink>
        </div>
      </template>
    </PageHeader>

    <div v-if="notFound" class="not-found">
      <p>Transaction not found or has no returnable items.</p>
      <NuxtLink to="/admin/returns" class="btn-secondary">← Back</NuxtLink>
    </div>

    <DataCard v-else-if="isLoading" :loading="true" :skeleton-rows="4" />

    <template v-else>
      <FormSection
        title="Returnable Items"
        subtitle="Only sold quantities can be returned"
      >
        <div v-if="returnable.length === 0" class="empty-state">
          Nothing left to return on this transaction.
        </div>

        <div v-else class="table-wrap">
          <table class="items-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th class="num">Sold</th>
                <th class="num">Returned</th>
                <th class="num">Returnable</th>
                <th class="center">Return Qty</th>
                <th class="center">Restock?</th>
                <th class="num">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="i in returnable" :key="i.transactionItemId">
                <td class="item-name">{{ i.productName }}</td>
                <td class="item-sku">{{ i.sku ?? "—" }}</td>
                <td class="num">{{ i.qtySold }}</td>
                <td class="num">{{ i.qtyReturned }}</td>
                <td class="num strong">{{ i.qtyReturnable }}</td>
                <td class="center">
                  <InputText
                    :model-value="String(qty[i.transactionItemId] ?? 0)"
                    type="number"
                    min="0"
                    :max="i.qtyReturnable"
                    :disabled="i.qtyReturnable === 0"
                    class="qty-input"
                    @update:model-value="
                      (v) => setQty(i, parseInt(v as string) || 0)
                    "
                  />
                </td>
                <td class="center">
                  <div
                    class="restock-toggle"
                    :class="{
                      'is-disabled': (qty[i.transactionItemId] ?? 0) === 0,
                    }"
                  >
                    <button
                      type="button"
                      class="restock-btn"
                      :class="{
                        'restock-btn--on': restock[i.transactionItemId],
                      }"
                      :disabled="(qty[i.transactionItemId] ?? 0) === 0"
                      @click="restock[i.transactionItemId] = true"
                    >
                      Restock
                    </button>
                    <button
                      type="button"
                      class="restock-btn"
                      :class="{
                        'restock-btn--off': !restock[i.transactionItemId],
                      }"
                      :disabled="(qty[i.transactionItemId] ?? 0) === 0"
                      @click="restock[i.transactionItemId] = false"
                    >
                      Rusak
                    </button>
                  </div>
                </td>
                <td class="num">
                  {{
                    formatRupiah(
                      parseFloat(i.unitAmount) *
                        (qty[i.transactionItemId] ?? 0),
                    )
                  }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="selectedItems.length" class="return-total">
          <span>Return Total</span>
          <span class="return-total__val">{{ formatRupiah(returnTotal) }}</span>
        </div>
      </FormSection>

      <FormSection title="Reason" subtitle="Why is this being returned?">
        <div class="field-group">
          <label class="field-label">Reason</label>
          <InputText
            v-model="reason"
            placeholder="e.g. Barang rusak / salah ukuran"
            fluid
          />
        </div>
        <div class="field-group">
          <label class="field-label">Note (optional)</label>
          <InputText v-model="note" placeholder="Optional detail" fluid />
        </div>
        <div class="form-actions">
          <button class="btn-save" :disabled="!canSave" @click="submit">
            {{ isSaving ? "Saving…" : "Record Return" }}
          </button>
        </div>
      </FormSection>

      <FormSection v-if="history.length" title="Return History">
        <div v-for="r in history" :key="r.id" class="ret-row">
          <div class="ret-info">
            <p class="ret-date">{{ formatDateTime(r.createdAt) }}</p>
            <p class="ret-items">
              {{ r.items.map((x) => `${x.productName} ×${x.qty}`).join(", ") }}
            </p>
            <p v-if="r.reason" class="ret-reason">{{ r.reason }}</p>
          </div>
          <span class="ret-amount">{{ formatRupiah(r.totalAmount) }}</span>
        </div>
      </FormSection>
    </template>
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
}
.btn-ghost:hover {
  color: #0f172a;
}
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px;
  color: #64748b;
}
.empty-state {
  padding: 32px;
  text-align: center;
  color: #94a3b8;
  font-size: 13px;
}

/* Items table */
.table-wrap {
  overflow-x: auto;
}
.items-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
}
.items-table th {
  padding: 9px 12px;
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border-bottom: 1px solid #f1f5f9;
  white-space: nowrap;
}
.items-table td {
  padding: 12px;
  border-bottom: 1px solid #f8fafc;
  vertical-align: middle;
}
.items-table tbody tr:last-child td {
  border-bottom: none;
}
.items-table tbody tr:hover td {
  background: #f8fafc;
}
.items-table .num {
  text-align: right;
  font-family: "Geist Mono", monospace;
}
.items-table .center {
  text-align: center;
}
.items-table .strong {
  font-weight: 600;
  color: #0f172a;
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
.qty-input {
  width: 78px !important;
}
:deep(.qty-input.p-inputtext) {
  padding: 6px 8px;
  font-size: 13px;
  text-align: center;
}

/* Restock toggle */
.restock-toggle {
  display: inline-flex;
  gap: 2px;
  background: #f1f5f9;
  padding: 3px;
  border-radius: 7px;
}
.restock-toggle.is-disabled {
  opacity: 0.45;
}
.restock-btn {
  padding: 4px 10px;
  border: none;
  background: none;
  border-radius: 5px;
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  transition:
    background 0.15s,
    color 0.15s;
}
.restock-btn:disabled {
  cursor: not-allowed;
}
.restock-btn--on {
  background: #fff;
  color: #16a34a;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
.restock-btn--off {
  background: #fff;
  color: #dc2626;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.return-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 14px;
  padding: 14px 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-weight: 600;
  color: #0f172a;
}
.return-total__val {
  font-family: "Geist Mono", monospace;
  font-size: 18px;
}

/* Reason form */
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
.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
}
.btn-save {
  padding: 9px 18px;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}
.btn-save:hover:not(:disabled) {
  background: #1d4ed8;
}
.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Return history */
.ret-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid #f8fafc;
}
.ret-row:last-child {
  border-bottom: none;
}
.ret-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.ret-date {
  font-size: 12px;
  color: #94a3b8;
  margin: 0;
}
.ret-items {
  font-size: 13.5px;
  color: #0f172a;
  margin: 0;
}
.ret-reason {
  font-size: 12.5px;
  color: #64748b;
  font-style: italic;
  margin: 0;
}
.ret-amount {
  font-family: "Geist Mono", monospace;
  font-weight: 600;
  color: #0f172a;
  white-space: nowrap;
}

@media (max-width: 900px) {
  .items-table {
    font-size: 12.5px;
  }
  .items-table th,
  .items-table td {
    padding: 8px;
  }
}
</style>
