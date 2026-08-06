<script setup lang="ts">
import type { TransactionView } from "../../../../composables/useTransactions";

definePageMeta({ layout: "dashboard" });

const { notifyError, notifySuccess, notifyWarn } = useNotify();
const { apiFetch } = useApiFetch();
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
const productQuery = ref("");
const searchResults = ref<Product[]>([]);
const isSearching = ref(false);

interface EditItem {
  productId: string;
  productName: string;
  sku?: string;
  unitAmount: string;
  qty: number;
  discount: number; // per-unit discount in Rupiah
}

const view = ref<TransactionView | null>(null);
const isLoading = ref(true);
const notFound = ref(false);
const isEditing = ref(false);
const isSavingItems = ref(false);
const editItems = ref<EditItem[]>([]);
const addPick = ref("");

const products = ref<Product[]>([]);
const priceMap = ref<Record<string, Record<string, string>>>({});
const productsLoaded = ref(false);
const isFulfilling = ref(false);
const showFulfillConfirm = ref(false);
const showCancelConfirm = ref(false);
const showAddPayment = ref(false);
const isSavingPayment = ref(false);

const todayISO = () => {
  const d = new Date();
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
};

const formatPaidAt = (d: string) =>
  new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const mergeProduct = (p: Product) => {
  const idx = products.value.findIndex((x) => x.id === p.id);
  if (idx === -1) products.value.push(p);
  else products.value[idx] = p;
};

const loadPricesFor = async (p: Product) => {
  if (priceMap.value[p.id]) return;
  priceMap.value[p.id] = {};
  try {
    const data = await apiFetch<any>(`/products/${p.id}/prices`);
    const prices = Array.isArray(data) ? data : (data?.value ?? []);
    for (const pr of prices)
      if (pr.categoryId) priceMap.value[p.id][pr.categoryId] = pr.amount;
  } catch {}
};

const searchProducts = async () => {
  const q = productQuery.value.trim();
  if (q.length < 2) {
    searchResults.value = [];
    return;
  }
  isSearching.value = true;
  try {
    const res = await $api<{ items: Product[]; total: number }>(
      `/products?search=${encodeURIComponent(q)}&limit=10&offset=0`,
    );
    const items = (res.items ?? []).filter((p) => p.isActive);
    items.forEach(mergeProduct); // cache for stock caps
    await Promise.all(items.map(loadPricesFor)); // prices for just these 10
    searchResults.value = items;
  } finally {
    isSearching.value = false;
  }
};

let prodTimer: ReturnType<typeof setTimeout>;
watch(productQuery, () => {
  clearTimeout(prodTimer);
  prodTimer = setTimeout(searchProducts, 300);
});

// results eligible to add: not already a line, priced for this category, in stock
const pickerResults = computed(() =>
  searchResults.value.filter(
    (p) =>
      !editProductIds.value.has(p.id) &&
      getPriceForCategory(p.id) !== null &&
      availableStock(p) > 0,
  ),
);

const pickProduct = (p: Product) => {
  const price = getPriceForCategory(p.id);
  if (!price) return;
  editItems.value.push({
    productId: p.id,
    productName: p.name,
    sku: p.sku,
    unitAmount: price,
    qty: 1,
    discount: 0,
  });
  productQuery.value = "";
  searchResults.value = [];
};

const paymentForm = reactive({
  method: "cash",
  amount: "",
  paidAt: todayISO(),
  senderName: "",
  reference: "",
  note: "",
});

const editable = computed(() =>
  ["draft", "pending"].includes(view.value?.status ?? ""),
);

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

const availableStock = (p: { stockOnHand?: number; stockReserved?: number }) =>
  Math.max(0, (p.stockOnHand ?? 0) - (p.stockReserved ?? 0));

const originalQty = ref<Record<string, number>>({});

const maxQtyFor = (productId: string): number => {
  const p = products.value.find((x) => x.id === productId);
  if (!p) return originalQty.value[productId] ?? Infinity;
  return availableStock(p) + (originalQty.value[productId] ?? 0);
};

const loadProductsForEdit = async () => {
  if (productsLoaded.value) return;
  const { apiFetch } = useApiFetch();
  const pRes = await $api<{ items: Product[] }>("/products");
  products.value = (pRes.items ?? []).filter((p) => p.isActive);
  const map: Record<string, Record<string, string>> = {};
  for (const p of products.value) {
    map[p.id] = {};
    try {
      const data = await apiFetch<any>(`/products/${p.id}/prices`);
      const prices = Array.isArray(data) ? data : (data?.value ?? []);
      for (const pr of prices)
        if (pr.categoryId) map[p.id][pr.categoryId] = pr.amount;
    } catch {}
  }
  priceMap.value = map;
  productsLoaded.value = true;
};

const getPriceForCategory = (productId: string): string | null => {
  const catId = view.value?.categoryId;
  if (!catId) return null;
  return priceMap.value[productId]?.[catId] ?? null;
};

const editProductIds = computed(
  () => new Set(editItems.value.map((i) => i.productId)),
);

const availableProducts = computed(() =>
  products.value.filter(
    (p) =>
      !editProductIds.value.has(p.id) &&
      getPriceForCategory(p.id) !== null &&
      availableStock(p) > 0,
  ),
);

const startEdit = async () => {
  const items = view.value?.items ?? [];
  await Promise.all(
    items.map(async (i) => {
      if (products.value.some((p) => p.id === i.productId)) return;
      try {
        const p = await $api<Product>(`/products/${i.productId}`);
        mergeProduct(p);
      } catch {}
    }),
  );
  originalQty.value = Object.fromEntries(
    items.map((i) => [i.productId, i.qty]),
  );
  editItems.value = items.map((i) => ({
    productId: i.productId,
    productName: i.productName,
    sku: i.sku,
    unitAmount: i.unitAmount,
    qty: i.qty,
    discount: Number(i.discountAmount ?? 0),
  }));
  isEditing.value = true;
};

const cancelEdit = () => {
  isEditing.value = false;
  editItems.value = [];
  addPick.value = "";
};

const addEditItem = () => {
  const p = products.value.find((x) => x.id === addPick.value);
  if (!p) return;
  const price = getPriceForCategory(p.id);
  if (!price) return;
  if (availableStock(p) < 1) {
    notifyWarn("Out of stock", `${p.name} has no available stock.`);
    return;
  }
  editItems.value.push({
    productId: p.id,
    productName: p.name,
    sku: p.sku,
    unitAmount: price,
    qty: 1,
    discount: 0,
  });
  addPick.value = "";
};

const removeEditItem = (i: number) => editItems.value.splice(i, 1);
const setQty = (i: number, qty: number) => {
  const item = editItems.value[i];
  if (!item) return;
  const max = maxQtyFor(item.productId);
  let next = Number.isFinite(qty) ? Math.floor(qty) : 1;
  if (next < 1) next = 1;
  if (next > max) {
    next = max;
    notifyWarn("Stock limit", `Only ${max} of ${item.productName} available.`);
  }
  item.qty = next;
};

// Payment consequence vs what's already been paid
const paymentDelta = computed(() => {
  const paid = parseFloat(view.value?.paidAmount ?? "0");
  if (paid <= 0) return null;
  const diff = +(editedTotal.value - paid).toFixed(2);
  if (diff > 0) return { kind: "under" as const, amount: diff };
  if (diff < 0) return { kind: "over" as const, amount: -diff };
  return { kind: "settled" as const, amount: 0 };
});

const setDiscount = (i: number, d: number) => {
  const item = editItems.value[i];
  if (!item) return;
  const unit = parseFloat(item.unitAmount);
  let next = Number.isFinite(d) ? Math.max(0, Math.floor(d)) : 0;
  if (next > unit) {
    next = unit;
    notifyWarn(
      "Diskon terlalu besar",
      "Diskon per item tidak boleh melebihi harga satuan.",
    );
  }
  item.discount = next;
};

const lineSubtotal = (it: EditItem) =>
  (parseFloat(it.unitAmount) - it.discount) * it.qty;

const editedTotal = computed(() =>
  editItems.value.reduce((s, i) => s + lineSubtotal(i), 0),
);

const saveItems = async () => {
  if (editItems.value.length === 0) return;
  isSavingItems.value = true;
  try {
    await $api(`/transactions/${id}/items`, {
      method: "PUT",
      body: {
        items: editItems.value.map((i) => ({
          productId: i.productId,
          qty: i.qty,
          discount: i.discount,
        })),
      },
    });
    view.value = await $api<TransactionView>(`/transactions/${id}/view`);
    isEditing.value = false;
    editItems.value = [];
  } catch (err) {
    notifyError(err, "Failed to save items");
  } finally {
    isSavingItems.value = false;
  }
};

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

const openFulfillConfirm = () => {
  console.log("Opening fulfill confirmation dialog");
  showFulfillConfirm.value = true;
};
const openCancelConfirm = () => {
  showCancelConfirm.value = true;
};
const openAddPayment = () => {
  showAddPayment.value = true;
};

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
  if (!paymentForm.paidAt) {
    notifyWarn("Date required", "Please set the payment date.");
    return;
  }

  const due = parseFloat(view.value?.balanceDue ?? "0");
  if (parseFloat(paymentForm.amount) > due) {
    paymentForm.amount = String(due);
  }

  isSavingPayment.value = true;
  try {
    await $api(`/transactions/${id}/payments`, {
      method: "POST",
      body: {
        method: paymentForm.method,
        amount: paymentForm.amount,
        currency: "IDR",
        paidAt: new Date(`${paymentForm.paidAt}T00:00:00`).toISOString(),
        senderName: paymentForm.senderName || undefined,
        reference: paymentForm.reference || undefined,
        note: paymentForm.note || undefined,
      },
    });
    view.value = await $api<TransactionView>(`/transactions/${id}/view`);
    notifySuccess("Payment recorded");
    showAddPayment.value = false;
    paymentForm.amount = "";
    paymentForm.paidAt = todayISO();
    paymentForm.senderName = "";
    paymentForm.reference = "";
    paymentForm.note = "";
  } catch (err) {
    notifyError(err, "Failed to record payment");
  } finally {
    isSavingPayment.value = false;
  }
};

const clampPaymentAmount = () => {
  const amt = parseFloat(paymentForm.amount);
  const due = parseFloat(view.value?.balanceDue ?? "0");
  if (!isNaN(amt) && amt > due) {
    paymentForm.amount = String(due);
  }
};
</script>

<template>
  <div class="page">
    <PageHeader
      :title="isLoading ? 'Loading…' : 'Transaction'"
      :subtitle="view ? `#${view.id.slice(0, 8)}… · ${view.customerName}` : ''"
    >
      <template #action>
        <div class="header-actions">
          <Button
            v-if="editable && !isEditing && view"
            label="Edit Items"
            severity="secondary"
            size="small"
            outlined
            @click="startEdit"
          />
          <Button
            v-if="canConfirm && view"
            label="Confirm Order"
            severity="info"
            size="small"
            outlined
            @click="doConfirm"
          />
          <Button
            v-if="canFulfill && view"
            label="Fulfill"
            severity="success"
            size="small"
            outlined
            @click="openFulfillConfirm"
          />
          <Button
            v-if="canPay && view"
            label="Add Payment"
            severity="info"
            size="small"
            outlined
            @click="openAddPayment"
          />
          <Button
            v-if="canCancel && view"
            label="Cancel"
            severity="danger"
            size="small"
            outlined
            @click="openCancelConfirm"
          />
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

          <FormSection title="Order Items">
            <!-- Read-only -->
            <table v-if="!isEditing" class="items-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Unit Price</th>

                  <th>Discount</th>
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
                  <td class="item-discount">
                    {{
                      Number(item.discountAmount ?? 0) > 0
                        ? formatRupiah(Number(item.discountAmount))
                        : "—"
                    }}
                  </td>
                  <td class="item-qty">× {{ item.qty }}</td>

                  <td class="item-total">{{ formatRupiah(item.lineTotal) }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="total-row">
                  <td colspan="5" class="total-label">Grand Total</td>
                  <td class="total-val">
                    {{ formatRupiah(view.totalAmount) }}
                  </td>
                </tr>
              </tfoot>
            </table>

            <!-- Edit mode -->
            <div v-else class="items-edit">
              <table class="items-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Unit Price</th>
                    <th>Disc / item</th>
                    <th>Qty</th>
                    <th>Subtotal</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(it, i) in editItems" :key="it.productId">
                    <td class="item-name">{{ it.productName }}</td>
                    <td class="item-sku">{{ it.sku ?? "—" }}</td>
                    <td class="item-amount">
                      {{ formatRupiah(it.unitAmount) }}
                    </td>
                    <td class="item-disc-edit">
                      <span class="disc-prefix">Rp</span>
                      <InputText
                        :model-value="String(it.discount)"
                        type="number"
                        min="0"
                        class="disc-input"
                        @update:model-value="
                          (v) => setDiscount(i, parseInt(v as string) || 0)
                        "
                      />
                    </td>
                    <td class="item-qty-edit">
                      <InputText
                        :model-value="String(it.qty)"
                        type="number"
                        min="1"
                        :max="maxQtyFor(it.productId)"
                        class="qty-input"
                        @update:model-value="
                          (v) => setQty(i, parseInt(v as string) || 1)
                        "
                      />
                      <span class="qty-max-hint"
                        >max {{ maxQtyFor(it.productId) }}</span
                      >
                    </td>
                    <td class="item-total">
                      {{ formatRupiah(lineSubtotal(it)) }}
                    </td>
                    <td class="item-remove">
                      <button
                        type="button"
                        class="remove-btn"
                        aria-label="Remove"
                        @click="removeEditItem(i)"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                  <tr v-if="editItems.length === 0">
                    <td colspan="6" class="edit-empty">
                      No items — add at least one below.
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr class="total-row">
                    <td colspan="4" class="total-label">New Grand Total</td>
                    <td class="total-val">{{ formatRupiah(editedTotal) }}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>

              <div class="edit-add-row">
                <div class="prod-search">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    v-model="productQuery"
                    type="text"
                    placeholder="Search product by name or SKU…"
                    class="prod-search__input"
                  />
                  <span v-if="isSearching" class="prod-search__spin">…</span>
                </div>

                <div
                  v-if="productQuery.trim().length >= 2"
                  class="prod-results"
                >
                  <button
                    v-for="p in pickerResults"
                    :key="p.id"
                    type="button"
                    class="prod-result"
                    @click="pickProduct(p)"
                  >
                    <span class="prod-result__name">{{ p.name }}</span>
                    <span class="prod-result__meta">
                      {{ p.sku ?? "—" }} · stok {{ availableStock(p) }} ·
                      {{ formatRupiah(getPriceForCategory(p.id) ?? "0") }}
                    </span>
                  </button>
                  <div
                    v-if="!isSearching && pickerResults.length === 0"
                    class="prod-result prod-result--empty"
                  >
                    No matching products for this customer's price category.
                  </div>
                </div>
              </div>
              <p v-if="availableProducts.length === 0" class="edit-hint">
                No more products available for this customer's price category.
              </p>

              <div
                v-if="paymentDelta && paymentDelta.kind !== 'settled'"
                class="pay-delta"
                :class="`pay-delta--${paymentDelta.kind}`"
              >
                <template v-if="paymentDelta.kind === 'under'">
                  {{ formatRupiah(view.paidAmount) }} already paid — saving
                  makes this
                  <strong
                    >underpaid by
                    {{ formatRupiah(paymentDelta.amount) }}</strong
                  >.
                </template>
                <template v-else>
                  {{ formatRupiah(view.paidAmount) }} already paid — saving
                  makes this
                  <strong
                    >overpaid by {{ formatRupiah(paymentDelta.amount) }}</strong
                  >
                  (refund may be needed).
                </template>
              </div>

              <div class="edit-actions">
                <button type="button" class="btn-secondary" @click="cancelEdit">
                  Cancel
                </button>
                <button
                  type="button"
                  class="btn-save"
                  :disabled="editItems.length === 0 || isSavingItems"
                  @click="saveItems"
                >
                  {{ isSavingItems ? "Saving…" : "Save Items" }}
                </button>
              </div>
            </div>
          </FormSection>

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
                  <span class="payment-date">{{
                    formatPaidAt(pay.paidAt)
                  }}</span>
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
                    <label class="field-label">Payment Date *</label>
                    <input
                      v-model="paymentForm.paidAt"
                      type="date"
                      class="date-input"
                      :max="todayISO()"
                    />
                  </div>
                  <div class="field-group">
                    <label class="field-label">Amount (IDR) *</label>
                    <InputText
                      v-model="paymentForm.amount"
                      type="number"
                      min="0"
                      :placeholder="`Due: ${formatRupiah(view.balanceDue)}`"
                      fluid
                      @blur="clampPaymentAmount"
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
          <Button
            v-if="canFulfill"
            label="Mark as Fulfilled"
            severity="success"
            outlined
            fluid
            @click="openFulfillConfirm"
          />
          <Button
            v-if="canPay"
            label="Record Payment"
            severity="info"
            outlined
            fluid
            @click="openAddPayment"
          />
        </div>
      </div>
      <Dialog
        v-model:visible="showFulfillConfirm"
        header="Fulfill Transaction?"
        :modal="true"
        :draggable="false"
        :style="{ width: '380px' }"
      >
        <p style="margin: 0; font-size: 13.5px; color: #64748b">
          Stock will be deducted. This cannot be undone.
        </p>
        <template #footer>
          <div style="display: flex; gap: 8px">
            <Button
              label="Cancel"
              severity="secondary"
              outlined
              fluid
              @click="showFulfillConfirm = false"
            />
            <Button
              label="Yes, Fulfill"
              severity="success"
              fluid
              @click="doFulfill"
            />
          </div>
        </template>
      </Dialog>

      <Dialog
        v-model:visible="showCancelConfirm"
        header="Cancel Transaction?"
        :modal="true"
        :draggable="false"
        :style="{ width: '380px' }"
      >
        <p style="margin: 0; font-size: 13.5px; color: #64748b">
          This will cancel the order and release any reserved stock.
        </p>
        <template #footer>
          <div style="display: flex; gap: 8px">
            <Button
              label="Cancel"
              severity="secondary"
              outlined
              fluid
              @click="showCancelConfirm = false"
            />
            <Button
              label="Yes, Cancel"
              severity="danger"
              fluid
              @click="doCancel"
            />
          </div>
        </template>
      </Dialog>
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

.items-edit {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.item-qty-edit {
  width: 90px;
}
.qty-input {
  width: 72px !important;
}
:deep(.qty-input.p-inputtext) {
  padding: 6px 8px;
  font-size: 13px;
}
.item-remove {
  width: 40px;
  text-align: right;
}
.remove-btn {
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 6px;
  background: #fef2f2;
  color: #dc2626;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.12s;
}
.remove-btn:hover {
  background: #fee2e2;
}
.edit-empty {
  color: #94a3b8;
  font-size: 12.5px;
  padding: 14px 0;
  text-align: center;
}
.edit-hint {
  color: #94a3b8;
  font-size: 12.5px;
  margin: 0;
}
.edit-add-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.edit-add-select {
  flex: 1;
  padding: 9px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 13.5px;
  font-family: inherit;
  color: #0f172a;
  background: #fff;
  outline: none;
  cursor: pointer;
  appearance: auto;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}
.edit-add-select:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}
.pay-delta {
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 12.5px;
  line-height: 1.5;
}
.pay-delta--under {
  background: #fef9c3;
  color: #854d0e;
  border: 1px solid #fde68a;
}
.pay-delta--over {
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
}
.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.qty-cell {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}
.qty-input {
  width: 64px !important;
}
.qty-max {
  font-family: "Geist Mono", monospace;
  font-size: 12px;
  color: #94a3b8;
  white-space: nowrap;
}
.item-qty-edit {
  width: 120px;
  padding-right: 16px;
}

.qty-max-hint {
  display: block;
  font-size: 11px;
  color: #94a3b8;
  margin-top: 3px;
}
.date-input {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  color: #0f172a;
  background: #fff;
  outline: none;
  box-sizing: border-box;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}
.date-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}
.payment-date {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.edit-add-row {
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
  width: 100%; /* full width, not shrink-wrapped */
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f1f5f9; /* separates it from the totals row */
}
.prod-search {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%; /* stretch across the panel */
  padding: 10px 14px;
  border: 1px dashed #cbd5e1; /* dashed = "add something here" affordance */
  border-radius: 8px;
  background: #f8fafc;
  color: #94a3b8;
  transition:
    border-color 0.15s,
    background 0.15s,
    box-shadow 0.15s;
}
.prod-search:focus-within {
  border-style: solid;
  border-color: #3b82f6;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}
.prod-search__input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 13.5px;
  font-family: inherit;
  color: #0f172a;
  background: transparent;
}

.prod-search__input::placeholder {
  color: #94a3b8;
}
.prod-search__spin {
  font-size: 12px;
}
.prod-results {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  margin-top: 6px;
  background: #fff;
  max-height: 260px;
  overflow-y: auto;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}
.prod-result {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-bottom: 1px solid #f8fafc;
  background: #fff;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
}
.prod-result:hover {
  background: #f8fafc;
}
.prod-result:last-child {
  border-bottom: none;
}
.prod-result__name {
  font-size: 13.5px;
  font-weight: 500;
  color: #0f172a;
}
.prod-result__meta {
  font-size: 12px;
  color: #94a3b8;
  font-family: "Geist Mono", monospace;
}
.prod-result--empty {
  color: #94a3b8;
  font-size: 12.5px;
  cursor: default;
}
.prod-result--empty:hover {
  background: #fff;
}
.item-disc-edit {
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}
.disc-prefix {
  font-size: 12px;
  color: #94a3b8;
}
.disc-input {
  width: 78px !important;
}
:deep(.disc-input.p-inputtext) {
  padding: 6px 8px;
  font-size: 13px;
  text-align: right;
}
</style>
