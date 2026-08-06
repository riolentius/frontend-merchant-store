<script setup lang="ts">
import type { Product } from "../../../composables/useProducts";

definePageMeta({ layout: "dashboard" });

const { $api } = useNuxtApp();
const { apiFetch } = useApiFetch();
const { categories, fetchCategories, getCategoryName, getCategoryIdByCode } =
  useCategories();
const { formatRupiah } = useProducts();
const { notifyError, notifySuccess, notifyWarn } = useNotify();
const router = useRouter();

const isLoading = ref(true);
const isSaving = ref(false);
const showConfirmLeave = ref(false);

interface Customer {
  id: string;
  firstName: string;
  lastName?: string;
  categoryId?: string;
}

const customerMode = ref<"existing" | "new">("existing");

const customers = ref<Customer[]>([]);
const selectedCustomer = ref<Customer | null>(null);
const customerSearch = ref("");
const isFetchingCustomer = ref(false);

const newCustomer = reactive({
  fullName: "",
  email: "",
  phone: "",
  categoryCode: "REGULAR" as string,
});

const availableStock = (p: Product) =>
  Math.max(0, (p.stockOnHand ?? 0) - (p.stockReserved ?? 0));

// ── Products / cart ───────────────────────────────────────
const products = ref<Product[]>([]);
const priceMap = ref<Record<string, Record<string, string>>>({});
const showProductPicker = ref(false);
const productSearch = ref("");

interface CartItem {
  product: Product;
  qty: number;
  unitPrice: string;
  discount: number;
}
const cart = ref<CartItem[]>([]);
const notes = ref("");
const status = ref<"pending">("pending");

// ── Derived customer state ────────────────────────────────
const splitName = (full: string) => {
  const parts = full.trim().split(/\s+/);
  const firstName = parts.shift() ?? "";
  const lastName = parts.join(" ");
  return { firstName, lastName: lastName || undefined };
};

const activeCategoryId = computed(() =>
  customerMode.value === "new"
    ? (getCategoryIdByCode(newCustomer.categoryCode) ?? null)
    : (selectedCustomer.value?.categoryId ?? null),
);

const isNewCustomerValid = computed(
  () =>
    newCustomer.fullName.trim() !== "" &&
    !!getCategoryIdByCode(newCustomer.categoryCode),
);
const hasCustomer = computed(() =>
  customerMode.value === "existing"
    ? !!selectedCustomer.value
    : isNewCustomerValid.value,
);

const setMode = (m: "existing" | "new") => {
  customerMode.value = m;
  cart.value = [];
  showProductPicker.value = false;
  if (m === "new") selectedCustomer.value = null;
};

watch(
  () => newCustomer.categoryCode,
  () => {
    cart.value = [];
  },
);

onMounted(async () => {
  await fetchCategories();
  try {
    const [, pRes] = await Promise.all([loadCustomers(), loadProducts()]);

    const map: Record<string, Record<string, string>> = {};
    for (const p of products.value) {
      map[p.id] = {};
      try {
        const data = await apiFetch<any>(`/products/${p.id}/prices`);
        const prices = Array.isArray(data) ? data : (data?.value ?? []);
        for (const pr of prices)
          if (pr.categoryId) map[p.id][pr.categoryId] = pr.amount;
      } catch {
        /* leave empty */
      }
    }
    priceMap.value = map;
  } catch (err) {
    notifyError(err, "Failed to load data");
  } finally {
    isLoading.value = false;
  }
});

let customerTimer: ReturnType<typeof setTimeout>;

watch(customerSearch, () => {
  clearTimeout(customerTimer);

  customerTimer = setTimeout(() => {
    loadCustomers();
  }, 350);
});

let productTimer: ReturnType<typeof setTimeout>;

watch(productSearch, () => {
  clearTimeout(productTimer);

  productTimer = setTimeout(() => {
    loadProducts();
  }, 350);
});

const pickerProducts = computed(() => availableProducts.value);

const loadCustomers = async () => {
  const params = new URLSearchParams({
    offset: "0",
    limit: "20",
  });

  if (customerSearch.value.trim()) {
    params.set("search", customerSearch.value.trim());
  }

  const res = await $api<{ items: Customer[] }>(
    `/customers?${params.toString()}`,
  );

  customers.value = res.items ?? [];
};

const fullName = (c: Customer) =>
  [c.firstName, c.lastName].filter(Boolean).join(" ");

const selectCustomer = async (c: Customer) => {
  cart.value = [];
  showProductPicker.value = false;
  if (c.categoryId) {
    selectedCustomer.value = c;
    return;
  }
  isFetchingCustomer.value = true;
  try {
    const full = await $api<Customer>(`/customers/${c.id}`);
    selectedCustomer.value = full;
    const idx = customers.value.findIndex((x) => x.id === c.id);
    if (idx !== -1) customers.value[idx] = full;
  } catch {
    selectedCustomer.value = c;
  } finally {
    isFetchingCustomer.value = false;
  }
};

const getPriceForCustomer = (productId: string): string | null => {
  const catId = activeCategoryId.value;
  if (!catId) return null;
  return priceMap.value[productId]?.[catId] ?? null;
};

const cartProductIds = computed(() => cart.value.map((i) => i.product.id));

const availableProducts = computed(() =>
  products.value.filter(
    (p) =>
      !cartProductIds.value.includes(p.id) &&
      getPriceForCustomer(p.id) !== null,
  ),
);

const loadProducts = async () => {
  const params = new URLSearchParams({
    offset: "0",
    limit: "20",
  });

  if (productSearch.value.trim()) {
    params.set("search", productSearch.value.trim());
  }

  const res = await $api<{ items: Product[] }>(
    `/products?${params.toString()}`,
  );

  const items = (res.items ?? []).filter((p) => p.isActive);

  products.value = items;

  for (const p of items) {
    if (priceMap.value[p.id]) continue;

    priceMap.value[p.id] = {};

    try {
      const data = await apiFetch<any>(`/products/${p.id}/prices`);
      const prices = Array.isArray(data) ? data : (data?.value ?? []);

      for (const pr of prices) {
        if (pr.categoryId) {
          priceMap.value[p.id][pr.categoryId] = pr.amount;
        }
      }
    } catch {
      //
    }
  }
};

const openPicker = () => {
  productSearch.value = "";
  showProductPicker.value = true;
};
const closePicker = () => {
  productSearch.value = "";
  showProductPicker.value = false;
};

const addToCart = (product: Product) => {
  const price = getPriceForCustomer(product.id);
  if (!price) return;
  if (availableStock(product) < 1) {
    notifyWarn("Out of stock", `${product.name} has no available stock.`);
    return;
  }
  cart.value.push({ product, qty: 1, unitPrice: price, discount: 0 });
  closePicker();
};

const setDiscount = (i: number, d: number) => {
  const item = cart.value[i];
  const unit = parseFloat(item.unitPrice);
  let next = Number.isFinite(d) ? Math.max(0, Math.floor(d)) : 0;
  if (next > unit) {
    next = unit; // discount can't exceed the unit price
    notifyWarn(
      "Diskon terlalu besar",
      "Diskon per item tidak boleh melebihi harga satuan.",
    );
  }
  item.discount = next;
};

const lineSubtotal = (item: CartItem) =>
  (parseFloat(item.unitPrice) - item.discount) * item.qty;

const grandTotal = computed(() =>
  cart.value.reduce((s, i) => s + lineSubtotal(i), 0),
);

const removeFromCart = (i: number) => cart.value.splice(i, 1);
const updateQty = (i: number, qty: number) => {
  const item = cart.value[i];
  if (!item) return;
  const max = availableStock(item.product);
  let next = Number.isFinite(qty) ? Math.floor(qty) : 1;
  if (next < 1) next = 1;
  if (next > max) {
    next = max;
    notifyWarn("Stock limit", `Only ${max} of ${item.product.name} available.`);
  }
  item.qty = next;
};

const canSave = computed(() => hasCustomer.value && cart.value.length > 0);

const handleSave = async () => {
  if (!canSave.value) return;
  isSaving.value = true;
  try {
    let customerId: string;
    if (customerMode.value === "new") {
      const { firstName, lastName } = splitName(newCustomer.fullName);
      const created = await $api<{ id: string }>("/customers", {
        method: "POST",
        body: {
          firstName,
          lastName,
          email: newCustomer.email.trim() || undefined,
          phone: newCustomer.phone.trim() || undefined,
          categoryId:
            getCategoryIdByCode(newCustomer.categoryCode) || undefined,
        },
      });
      customerId = created.id;
    } else {
      customerId = selectedCustomer.value!.id;
    }

    const tx = await $api<{ id: string }>("/transactions", {
      method: "POST",
      body: {
        customerId,
        notes: notes.value || undefined,
        items: cart.value.map((i) => ({
          productId: i.product.id,
          qty: i.qty,
          discount: String(i.discount),
        })),
      },
    });
    try {
      await $api(`/transactions/${tx.id}/status`, {
        method: "PATCH",
        body: { status: "pending" },
      });
    } catch (err) {
      notifyWarn(
        "Created as draft",
        "Transaction saved but couldn't be confirmed — confirm it manually on the detail page.",
      );
    }
    notifySuccess("Transaction created");
    router.push(`/admin/transactions/${tx.id}`);
  } catch (err) {
    notifyError(err, "Failed to create transaction");
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <div class="page">
    <PageHeader
      title="New Transaction"
      subtitle="Create a transaction for a customer"
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
        <FormSection
          title="1. Customer"
          subtitle="Pick an existing customer or add a new one"
        >
          <div class="mode-tabs">
            <button
              type="button"
              class="mode-tab"
              :class="{ 'mode-tab--active': customerMode === 'existing' }"
              @click="setMode('existing')"
            >
              Existing Customer
            </button>
            <button
              type="button"
              class="mode-tab"
              :class="{ 'mode-tab--active': customerMode === 'new' }"
              @click="setMode('new')"
            >
              New Customer
            </button>
          </div>

          <!-- Existing -->
          <template v-if="customerMode === 'existing'">
            <SearchInput
              v-model="customerSearch"
              placeholder="Search customer…"
            />
            <div class="customer-grid">
              <div
                v-for="c in customers"
                :key="c.id"
                class="customer-card"
                :class="{
                  'customer-card--active': selectedCustomer?.id === c.id,
                  'customer-card--loading':
                    isFetchingCustomer && selectedCustomer?.id === c.id,
                }"
                @click="selectCustomer(c)"
              >
                <div class="customer-avatar">
                  {{ c.firstName.slice(0, 2).toUpperCase() }}
                </div>
                <div class="customer-info">
                  <p class="customer-name">{{ fullName(c) }}</p>
                </div>
                <div
                  v-if="selectedCustomer?.id === c.id && !isFetchingCustomer"
                  class="customer-check"
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
                <div
                  v-if="isFetchingCustomer && selectedCustomer?.id === c.id"
                  class="customer-loading"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    class="spin"
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                </div>
              </div>
            </div>
            <p v-if="!selectedCustomer" class="field-hint">
              Select a customer to continue
            </p>
            <p v-else-if="!selectedCustomer.categoryId" class="field-warn">
              ⚠️ This customer has no pricing category.
              <NuxtLink :to="`/admin/customers/${selectedCustomer.id}/edit`"
                >Assign a category →</NuxtLink
              >
            </p>
          </template>

          <!-- New -->
          <template v-else>
            <div class="new-customer">
              <div class="field-group">
                <label class="field-label"
                  >Full Name <span class="req">*</span></label
                >
                <InputText
                  v-model="newCustomer.fullName"
                  placeholder="e.g. Budi Santoso"
                  fluid
                />
              </div>
              <div class="field-row">
                <div class="field-group">
                  <label class="field-label">Phone</label>
                  <InputText
                    v-model="newCustomer.phone"
                    placeholder="e.g. 081234567890"
                    fluid
                  />
                </div>
                <div class="field-group">
                  <label class="field-label">Email</label>
                  <InputText
                    v-model="newCustomer.email"
                    type="email"
                    placeholder="optional"
                    fluid
                  />
                </div>
              </div>
              <div class="field-group">
                <label class="field-label"
                  >Pricing Category <span class="req">*</span></label
                >
                <select v-model="newCustomer.categoryCode" class="cat-select">
                  <option v-for="c in categories" :key="c.code" :value="c.code">
                    {{ c.name }} — {{ c.description }}
                  </option>
                </select>
              </div>
              <p class="field-hint">
                This customer is created when you save the transaction.
              </p>
            </div>
          </template>
        </FormSection>

        <!-- Step 2: Items -->
        <FormSection
          title="2. Add Items"
          subtitle="Prices auto-apply based on customer category"
        >
          <div v-if="cart.length > 0" class="cart-list">
            <div class="cart-header">
              <span>Product</span><span>Unit Price</span><span>Disc / item</span
              ><span>Qty</span><span>Subtotal</span><span />
            </div>
            <div
              class="cart-row"
              v-for="(item, i) in cart"
              :key="item.product.id"
            >
              <div>
                <p class="cart-name">{{ item.product.name }}</p>
                <p class="cart-sku">{{ item.product.sku ?? "—" }}</p>
              </div>
              <span class="cart-price">{{ formatRupiah(item.unitPrice) }}</span>
              <div class="disc-control">
                <span class="disc-prefix">Rp</span>
                <InputText
                  :model-value="String(item.discount)"
                  type="number"
                  min="0"
                  class="disc-input"
                  @update:model-value="
                    (v) => setDiscount(i, parseInt(v as string) || 0)
                  "
                />
              </div>
              <div class="qty-control">
                <InputText
                  :model-value="String(item.qty)"
                  type="number"
                  min="1"
                  :max="availableStock(item.product)"
                  class="qty-input"
                  @update:model-value="
                    (v) => updateQty(i, parseInt(v as string) || 1)
                  "
                />
                <span class="qty-max"
                  >/ {{ availableStock(item.product) }}</span
                >
              </div>
              <span class="cart-subtotal">{{
                formatRupiah(lineSubtotal(item))
              }}</span>
              <button
                type="button"
                class="remove-btn"
                @click="removeFromCart(i)"
              >
                <!-- ×  icon -->
              </button>
            </div>
          </div>

          <button
            v-if="!showProductPicker"
            type="button"
            class="add-item-btn"
            :disabled="
              !hasCustomer ||
              !activeCategoryId ||
              availableProducts.length === 0
            "
            @click="openPicker"
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
            <span v-if="!hasCustomer">{{
              customerMode === "new"
                ? "Enter customer name first"
                : "Select a customer first"
            }}</span>
            <span v-else-if="!activeCategoryId">No pricing category</span>
            <span v-else-if="availableProducts.length === 0"
              >No products with prices for this category</span
            >
            <span v-else>Add Product</span>
          </button>

          <div v-if="showProductPicker" class="product-picker">
            <div class="product-picker__head">
              <span>Select product</span>
              <button type="button" class="picker-close" @click="closePicker">
                ✕
              </button>
            </div>
            <div class="product-picker__search">
              <SearchInput
                v-model="productSearch"
                placeholder="Search product… (any order)"
              />
            </div>
            <div class="product-picker__list">
              <div
                v-for="p in pickerProducts"
                :key="p.id"
                class="picker-item"
                @click="addToCart(p)"
              >
                <div>
                  <p class="picker-name">{{ p.name }}</p>
                  <p class="picker-sku">
                    {{ p.sku ?? "—" }} · Available: {{ availableStock(p) }}
                  </p>
                </div>
                <span class="picker-price">{{
                  formatRupiah(getPriceForCustomer(p.id)!)
                }}</span>
              </div>
              <p v-if="pickerProducts.length === 0" class="picker-empty">
                {{
                  productSearch.trim()
                    ? "No products match your search"
                    : "No products available"
                }}
              </p>
            </div>
          </div>

          <div v-if="cart.length > 0" class="grand-total">
            <span>Grand Total</span>
            <span class="grand-total__val">{{ formatRupiah(grandTotal) }}</span>
          </div>
        </FormSection>

        <!-- Step 3: Options -->
        <FormSection title="3. Options" subtitle="Status and notes">
          <div class="field-group">
            <label class="field-label">Initial Status</label>
            <div class="status-tabs">
              <button
                v-for="s in ['pending'] as const"
                :key="s"
                type="button"
                class="status-tab"
                :class="{ 'status-tab--active': status === s }"
                @click="status = s"
              >
                <span
                  class="status-tab__dot"
                  :class="`status-tab__dot--${s}`"
                />
                {{ s.charAt(0).toUpperCase() + s.slice(1) }}
              </button>
            </div>
            <p class="field-hint">
              <template v-if="status === 'draft'"
                >Draft — no stock reserved yet</template
              >
              <template v-else
                >Pending — stock will be reserved immediately</template
              >
            </p>
          </div>
          <div class="field-group">
            <label class="field-label">Notes (optional)</label>
            <InputText
              v-model="notes"
              placeholder="e.g. Urgent delivery"
              fluid
            />
          </div>
        </FormSection>

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
            :disabled="!canSave || isSaving"
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
                  Create Transaction
                </template>
                <template v-else>Creating…</template>
              </span>
            </template>
          </Button>
        </div>
      </div>
    </form>

    <Dialog
      v-model:visible="showConfirmLeave"
      header="Discard transaction?"
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
            @click="router.push('/admin/transactions')"
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
.field-hint {
  font-size: 12px;
  color: #94a3b8;
  margin: 2px 0 0;
}
.field-warn {
  font-size: 12.5px;
  color: #854d0e;
  background: #fef9c3;
  padding: 8px 12px;
  border-radius: 7px;
  border: 1px solid #fde68a;
}
.field-warn a {
  color: #2563eb;
}
.no-category {
  font-size: 11.5px;
  color: #94a3b8;
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
.customer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px;
  margin-top: 8px;
}
.customer-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  cursor: pointer;
  position: relative;
  transition:
    border-color 0.15s,
    background 0.15s;
}
.customer-card:hover {
  border-color: #94a3b8;
  background: #f8fafc;
}
.customer-card--active {
  border-color: #3b82f6;
  background: #eff6ff;
}
.customer-card--loading {
  opacity: 0.7;
}
.customer-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(145deg, #3b82f6, #1d4ed8);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  flex-shrink: 0;
}
.customer-name {
  font-size: 13px;
  font-weight: 500;
  color: #0f172a;
  margin: 0 0 4px;
}
.customer-check {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #2563eb;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.customer-loading {
  position: absolute;
  top: 8px;
  right: 8px;
  color: #3b82f6;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.spin {
  animation: spin 0.8s linear infinite;
}
.cart-list {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}
.cart-header {
  display: grid;
  grid-template-columns: 1fr 110px 110px 100px 120px 32px;
  gap: 12px;
  padding: 8px 14px;
  background: #f8fafc;
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.cart-row {
  display: grid;
  grid-template-columns: 1fr 110px 110px 100px 120px 32px;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-top: 1px solid #f1f5f9;
}
.disc-control {
  display: flex;
  align-items: center;
  gap: 4px;
}
.disc-prefix {
  font-size: 12px;
  color: #94a3b8;
}
.disc-input {
  width: 72px !important;
}
:deep(.disc-input.p-inputtext) {
  padding: 7px 8px;
  font-size: 13px;
}
.cart-name {
  font-size: 13.5px;
  font-weight: 500;
  color: #0f172a;
  margin: 0 0 2px;
}
.cart-sku {
  font-family: "Geist Mono", monospace;
  font-size: 11px;
  color: #94a3b8;
  margin: 0;
}
.cart-price {
  font-family: "Geist Mono", monospace;
  font-size: 13px;
  color: #64748b;
}
.cart-subtotal {
  font-family: "Geist Mono", monospace;
  font-size: 13px;
  font-weight: 500;
  color: #0f172a;
}
.qty-control {
  display: flex;
  align-items: center;
  gap: 8px;
}
.qty-btn {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #fff;
  cursor: pointer;
  font-size: 16px;
  color: #475569;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.12s;
}
.qty-btn:hover {
  background: #f1f5f9;
}
.qty-val {
  font-size: 14px;
  font-weight: 600;
  min-width: 24px;
  text-align: center;
}
.remove-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: #fef2f2;
  color: #dc2626;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.12s;
}
.remove-btn:hover {
  background: #fee2e2;
}
.add-item-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 14px;
  background: #2563eb;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  font-family: inherit;
  transition:
    border-color 0.15s,
    background 0.15s,
    color 0.15s;
}
.add-item-btn:hover:not(:disabled) {
  border-color: #60a5fa;
  background: #1d4ed8;
  color: #1d4ed8;
}
.add-item-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.product-picker {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
}
.product-picker__head {
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
.picker-close:hover {
  color: #0f172a;
}
.product-picker__list {
  max-height: 240px;
  overflow-y: auto;
}
.picker-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid #f8fafc;
  transition: background 0.12s;
}
.picker-item:last-child {
  border-bottom: none;
}
.picker-item:hover {
  background: #f8fafc;
}
.picker-name {
  font-size: 13.5px;
  font-weight: 500;
  color: #0f172a;
  margin: 0 0 2px;
}
.picker-sku {
  font-family: "Geist Mono", monospace;
  font-size: 11px;
  color: #94a3b8;
  margin: 0;
}
.picker-price {
  font-family: "Geist Mono", monospace;
  font-size: 13px;
  font-weight: 500;
  color: #2563eb;
}
.picker-empty {
  padding: 16px;
  text-align: center;
  color: #94a3b8;
  font-size: 13px;
}
.grand-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}
.grand-total__val {
  font-family: "Geist Mono", monospace;
  font-size: 18px;
}
.status-tabs {
  display: flex;
  gap: 8px;
}
.status-tab {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 16px;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  font-size: 13px;
  font-weight: 500;
  color: #475569;
  cursor: pointer;
  font-family: inherit;
  transition:
    border-color 0.15s,
    background 0.15s;
}
.status-tab--active {
  border-color: #3b82f6;
  background: #eff6ff;
  color: #1d4ed8;
}
.status-tab__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.status-tab__dot--draft {
  background: #94a3b8;
}
.status-tab__dot--pending {
  background: #d97706;
}
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
@media (max-width: 768px) {
  .cart-header {
    display: none;
  }
  .cart-row {
    grid-template-columns: 1fr 80px 32px;
  }
}

.mode-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.mode-tab {
  flex: 1;
  padding: 9px 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  font-size: 13px;
  font-weight: 500;
  color: #475569;
  cursor: pointer;
  font-family: inherit;
  transition:
    border-color 0.15s,
    background 0.15s,
    color 0.15s;
}
.mode-tab--active {
  border-color: #3b82f6;
  background: #eff6ff;
  color: #1d4ed8;
}
.new-customer {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.req {
  color: #ef4444;
}
.cat-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
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
.cat-select:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}
.product-picker__search {
  padding: 10px 12px;
  border-bottom: 1px solid #f1f5f9;
}
.qty-input {
  width: 72px !important;
}
:deep(.qty-input.p-inputtext) {
  padding: 6px 8px;
  font-size: 13.5px;
  text-align: center;
}
@media (max-width: 640px) {
  .field-row {
    grid-template-columns: 1fr;
  }
}
.qty-max {
  font-family: "Geist Mono", monospace;
  font-size: 12px;
  color: #94a3b8;
  white-space: nowrap;
}
</style>
