<script setup lang="ts">
import type { Product } from "../../../composables/useProducts";

definePageMeta({ layout: "dashboard" });

const { $api } = useNuxtApp();
const { fetchCategories, categories, getCategoryName } = useCategories();
const { fetchPrices, formatRupiah } = useProducts();
const router = useRouter();

const isLoading = ref(true);
const isSaving = ref(false);
const showConfirmLeave = ref(false);

// Step 1 — customer
interface Customer {
  id: string;
  firstName: string;
  lastName?: string;
  categoryId?: string;
}
const customers = ref<Customer[]>([]);
const selectedCustomer = ref<Customer | null>(null);
const customerSearch = ref("");
const isFetchingCustomer = ref(false);

// Step 2 — products
const products = ref<Product[]>([]);
const priceMap = ref<Record<string, Record<string, string>>>({});
const showProductPicker = ref(false);

interface CartItem {
  product: Product;
  qty: number;
  unitPrice: string;
}
const cart = ref<CartItem[]>([]);

// Step 3 — options
const notes = ref("");
const status = ref<"draft" | "pending">("pending");

onMounted(async () => {
  await fetchCategories();
  try {
    const [cRes, pRes] = await Promise.all([
      $api<{ items: Customer[] }>("/customers"),
      $api<{ items: Product[] }>("/products"),
    ]);
    customers.value = cRes.items ?? [];
    products.value = (pRes.items ?? []).filter((p) => p.isActive);

    // Fetch prices for all products upfront
    await Promise.all(
      products.value.map(async (p) => {
        try {
          const prices = await fetchPrices(p.id);
          priceMap.value[p.id] = Object.fromEntries(
            prices
              .filter((pr) => pr.categoryId)
              .map((pr) => [pr.categoryId!, pr.amount]),
          );
        } catch {
          priceMap.value[p.id] = {};
        }
      }),
    );
  } catch (err) {
    console.error(err);
  } finally {
    isLoading.value = false;
  }
});

const filteredCustomers = computed(() => {
  const q = customerSearch.value.toLowerCase().trim();
  if (!q) return customers.value;
  return customers.value.filter((c) =>
    `${c.firstName} ${c.lastName ?? ""}`.toLowerCase().includes(q),
  );
});

const fullName = (c: Customer) =>
  [c.firstName, c.lastName].filter(Boolean).join(" ");

// When a customer is selected, fetch their full detail to get categoryId
const selectCustomer = async (c: Customer) => {
  cart.value = [];
  showProductPicker.value = false;

  // If we already have categoryId from the list, use it directly
  if (c.categoryId) {
    selectedCustomer.value = c;
    return;
  }

  // Otherwise fetch the full customer detail
  isFetchingCustomer.value = true;
  try {
    const full = await $api<Customer>(`/customers/${c.id}`);
    selectedCustomer.value = full;
    // Update the customer in the list too for future selections
    const idx = customers.value.findIndex((x) => x.id === c.id);
    if (idx !== -1) customers.value[idx] = full;
  } catch {
    selectedCustomer.value = c;
  } finally {
    isFetchingCustomer.value = false;
  }
};

const getPriceForCustomer = (productId: string): string | null => {
  if (!selectedCustomer.value?.categoryId) return null;
  return priceMap.value[productId]?.[selectedCustomer.value.categoryId] ?? null;
};

const cartProductIds = computed(() => cart.value.map((i) => i.product.id));

const availableProducts = computed(() =>
  products.value.filter(
    (p) =>
      !cartProductIds.value.includes(p.id) &&
      getPriceForCustomer(p.id) !== null,
  ),
);

const addToCart = (product: Product) => {
  const price = getPriceForCustomer(product.id);
  if (!price) return;
  cart.value.push({ product, qty: 1, unitPrice: price });
  showProductPicker.value = false;
};

const removeFromCart = (index: number) => cart.value.splice(index, 1);

const updateQty = (index: number, qty: number) => {
  if (qty < 1) return;
  cart.value[index].qty = qty;
};

const grandTotal = computed(() =>
  cart.value.reduce((s, i) => s + parseFloat(i.unitPrice) * i.qty, 0),
);

const canSave = computed(() => selectedCustomer.value && cart.value.length > 0);

const handleSave = async () => {
  if (!canSave.value) return;
  isSaving.value = true;
  try {
    await $api("/transactions", {
      method: "POST",
      body: {
        customerId: selectedCustomer.value!.id,
        status: status.value,
        notes: notes.value.trim() || undefined,
        items: cart.value.map((i) => ({
          productId: i.product.id,
          qty: i.qty,
        })),
      },
    });
    router.push("/admin/transactions");
  } catch (err: any) {
    console.error("Failed to create transaction:", err);
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
        <!-- Step 1: Customer -->
        <FormSection
          title="1. Select Customer"
          subtitle="Choose who this transaction is for"
        >
          <SearchInput
            v-model="customerSearch"
            placeholder="Search customer…"
          />
          <div class="customer-grid">
            <div
              v-for="c in filteredCustomers"
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
                <CategoryBadge
                  v-if="
                    c.categoryId ||
                    (selectedCustomer?.id === c.id &&
                      selectedCustomer?.categoryId)
                  "
                  :category="
                    getCategoryName(
                      c.categoryId ?? selectedCustomer?.categoryId,
                    )
                  "
                />
                <span v-else class="no-category">No category</span>
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
            ⚠️ This customer has no pricing category — no prices can be applied.
            <NuxtLink :to="`/admin/customers/${selectedCustomer.id}/edit`"
              >Assign a category →</NuxtLink
            >
          </p>
        </FormSection>

        <!-- Step 2: Items -->
        <FormSection
          title="2. Add Items"
          subtitle="Prices auto-apply based on customer category"
        >
          <div v-if="cart.length > 0" class="cart-list">
            <div class="cart-header">
              <span>Product</span><span>Unit Price</span><span>Qty</span
              ><span>Subtotal</span><span />
            </div>
            <div
              v-for="(item, i) in cart"
              :key="item.product.id"
              class="cart-row"
            >
              <div>
                <p class="cart-name">{{ item.product.name }}</p>
                <p class="cart-sku">{{ item.product.sku ?? "—" }}</p>
              </div>
              <span class="cart-price">{{ formatRupiah(item.unitPrice) }}</span>
              <div class="qty-control">
                <button
                  type="button"
                  class="qty-btn"
                  @click="updateQty(i, item.qty - 1)"
                >
                  −
                </button>
                <span class="qty-val">{{ item.qty }}</span>
                <button
                  type="button"
                  class="qty-btn"
                  @click="updateQty(i, item.qty + 1)"
                >
                  +
                </button>
              </div>
              <span class="cart-subtotal">{{
                formatRupiah(parseFloat(item.unitPrice) * item.qty)
              }}</span>
              <button
                type="button"
                class="remove-btn"
                @click="removeFromCart(i)"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          <button
            v-if="!showProductPicker"
            type="button"
            class="add-item-btn"
            :disabled="
              !selectedCustomer ||
              !selectedCustomer.categoryId ||
              availableProducts.length === 0
            "
            @click="showProductPicker = true"
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
            <span v-if="!selectedCustomer">Select a customer first</span>
            <span v-else-if="!selectedCustomer.categoryId"
              >Customer has no category</span
            >
            <span v-else-if="availableProducts.length === 0"
              >No products with prices for this category</span
            >
            <span v-else>Add Product</span>
          </button>

          <!-- Product picker -->
          <div v-if="showProductPicker" class="product-picker">
            <div class="product-picker__head">
              <span>Select product</span>
              <button
                type="button"
                class="picker-close"
                @click="showProductPicker = false"
              >
                ✕
              </button>
            </div>
            <div class="product-picker__list">
              <div
                v-for="p in availableProducts"
                :key="p.id"
                class="picker-item"
                @click="addToCart(p)"
              >
                <div>
                  <p class="picker-name">{{ p.name }}</p>
                  <p class="picker-sku">
                    {{ p.sku ?? "—" }} · Stock: {{ p.stockOnHand }}
                  </p>
                </div>
                <span class="picker-price">{{
                  formatRupiah(getPriceForCustomer(p.id)!)
                }}</span>
              </div>
              <p v-if="availableProducts.length === 0" class="picker-empty">
                No products available
              </p>
            </div>
          </div>

          <!-- Grand total -->
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
                v-for="s in ['draft', 'pending'] as const"
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
              placeholder="e.g. Urgent delivery, paid in advance"
              fluid
            />
          </div>
        </FormSection>

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

    <ConfirmDialog
      v-model="showConfirmLeave"
      title="Discard transaction?"
      description="You have unsaved changes. Are you sure you want to leave?"
      confirm-label="Yes, Discard"
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

/* Customer grid */
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

/* Cart */
.cart-list {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}
.cart-header {
  display: grid;
  grid-template-columns: 1fr 120px 110px 120px 32px;
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
  grid-template-columns: 1fr 120px 110px 120px 32px;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-top: 1px solid #f1f5f9;
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

/* Add item button */
.add-item-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
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
.add-item-btn:hover:not(:disabled) {
  border-color: #3b82f6;
  background: #eff6ff;
  color: #2563eb;
}
.add-item-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Product picker */
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

/* Grand total */
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

/* Status tabs */
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
@media (max-width: 768px) {
  .cart-header {
    display: none;
  }
  .cart-row {
    grid-template-columns: 1fr 80px 32px;
  }
}
</style>
