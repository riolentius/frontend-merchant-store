<script setup lang="ts">
import { mockGetCustomers, mockGetProducts } from "~/mocks";
import type { Customer, Product } from "~/mocks";

definePageMeta({ layout: "dashboard" });

const router = useRouter();
const isLoading = ref(true);
const isSaving = ref(false);
const showConfirmLeave = ref(false);

const customers = ref<Customer[]>([]);
const products = ref<Product[]>([]);

const selectedCustomer = ref<Customer | null>(null);
const items = ref<
  { product: Product; qty: number; unit_price: number; subtotal: number }[]
>([]);
const showProductPicker = ref(false);

onMounted(async () => {
  const [c, p] = await Promise.all([mockGetCustomers(), mockGetProducts()]);
  customers.value = c;
  products.value = p.filter((p) => p.is_active && p.stock > 0);
  isLoading.value = false;
});

// Get price for selected customer's category
const priceForCustomer = (product: Product) => {
  if (!selectedCustomer.value)
    return product.prices.find((p) => p.category === "Regular")?.price ?? 0;
  return (
    product.prices.find((p) => p.category === selectedCustomer.value!.category)
      ?.price ?? 0
  );
};

const addProduct = (product: Product) => {
  const existing = items.value.find((i) => i.product.id === product.id);
  if (existing) {
    existing.qty++;
    existing.subtotal = existing.qty * existing.unit_price;
  } else {
    const unit_price = priceForCustomer(product);
    items.value.push({ product, qty: 1, unit_price, subtotal: unit_price });
  }
  showProductPicker.value = false;
};

const removeItem = (index: number) => items.value.splice(index, 1);

const updateQty = (index: number, qty: number) => {
  if (qty < 1) return;
  items.value[index].qty = qty;
  items.value[index].subtotal = qty * items.value[index].unit_price;
};

const grandTotal = computed(() =>
  items.value.reduce((s, i) => s + i.subtotal, 0),
);

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

const canSave = computed(
  () => selectedCustomer.value && items.value.length > 0,
);

const handleSave = async () => {
  if (!canSave.value) return;
  isSaving.value = true;
  // TODO: POST /api/v1/transactions
  await new Promise((r) => setTimeout(r, 800));
  isSaving.value = false;
  router.push("/admin/transactions");
};

// Products not yet added
const availableProducts = computed(() =>
  products.value.filter((p) => !items.value.find((i) => i.product.id === p.id)),
);
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
          <div class="customer-grid">
            <div
              v-for="c in customers"
              :key="c.id"
              class="customer-card"
              :class="{
                'customer-card--active': selectedCustomer?.id === c.id,
              }"
              @click="selectedCustomer = c"
            >
              <div class="customer-card__avatar">
                {{ c.name.slice(0, 2).toUpperCase() }}
              </div>
              <div class="customer-card__info">
                <p class="customer-card__name">{{ c.name }}</p>
                <CategoryBadge :category="c.category" />
              </div>
              <div
                v-if="selectedCustomer?.id === c.id"
                class="customer-card__check"
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
            </div>
          </div>
          <p v-if="!selectedCustomer" class="field-hint">
            Select a customer to continue
          </p>
        </FormSection>

        <!-- Step 2: Items -->
        <FormSection
          title="2. Add Items"
          subtitle="Add products to this transaction"
        >
          <!-- Item list -->
          <div v-if="items.length > 0" class="item-list">
            <div class="item-list__header">
              <span>Product</span><span>Unit Price</span><span>Qty</span
              ><span>Subtotal</span><span />
            </div>
            <div
              v-for="(item, i) in items"
              :key="item.product.id"
              class="item-row"
            >
              <div class="item-row__name">
                <p class="item-name">{{ item.product.name }}</p>
                <p class="item-sku">{{ item.product.sku }}</p>
              </div>
              <PriceDisplay :amount="item.unit_price" size="sm" muted />
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
              <PriceDisplay :amount="item.subtotal" />
              <button
                type="button"
                class="remove-btn"
                @click="removeItem(i)"
                aria-label="Remove"
              >
                <svg
                  width="14"
                  height="14"
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

          <!-- Add product button -->
          <button
            type="button"
            class="add-item-btn"
            :disabled="!selectedCustomer || availableProducts.length === 0"
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
            Add Product
          </button>
          <p v-if="!selectedCustomer" class="field-hint">
            Select a customer first to see their prices
          </p>

          <!-- Product picker -->
          <div v-if="showProductPicker" class="product-picker">
            <div class="product-picker__header">
              <span>Select a product</span>
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
                @click="addProduct(p)"
              >
                <div>
                  <p class="picker-item__name">{{ p.name }}</p>
                  <p class="picker-item__sku">
                    {{ p.sku }} · Stock: {{ p.stock }}
                  </p>
                </div>
                <PriceDisplay :amount="priceForCustomer(p)" size="sm" />
              </div>
              <p v-if="availableProducts.length === 0" class="picker-empty">
                All products already added
              </p>
            </div>
          </div>
        </FormSection>

        <!-- Order summary -->
        <div v-if="items.length > 0" class="order-summary">
          <div class="order-summary__row order-summary__row--total">
            <span>Grand Total</span>
            <PriceDisplay :amount="grandTotal" size="lg" />
          </div>
        </div>

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
      description="You have unsaved items. Are you sure you want to leave?"
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

.field-hint {
  font-size: 12px;
  color: #94a3b8;
  margin: 4px 0 0;
}

/* Customer grid */
.customer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
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
.customer-card__avatar {
  width: 32px;
  height: 32px;
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
.customer-card__name {
  font-size: 13px;
  font-weight: 500;
  color: #0f172a;
  margin: 0 0 4px;
}
.customer-card__check {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #2563eb;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Item list */
.item-list {
  display: flex;
  flex-direction: column;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}
.item-list__header {
  display: grid;
  grid-template-columns: 1fr 120px 100px 120px 32px;
  gap: 12px;
  padding: 8px 14px;
  background: #f8fafc;
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.item-row {
  display: grid;
  grid-template-columns: 1fr 120px 100px 120px 32px;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-top: 1px solid #f1f5f9;
}
.item-name {
  font-size: 13.5px;
  font-weight: 500;
  color: #0f172a;
  margin: 0 0 2px;
}
.item-sku {
  font-family: "Geist Mono", monospace;
  font-size: 11px;
  color: #94a3b8;
  margin: 0;
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
  font-weight: 500;
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
  color: #0f172a;
  min-width: 20px;
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

/* Add product */
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
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}
.product-picker__header {
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
  transition: color 0.15s;
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
.picker-item__name {
  font-size: 13.5px;
  font-weight: 500;
  color: #0f172a;
  margin: 0 0 2px;
}
.picker-item__sku {
  font-family: "Geist Mono", monospace;
  font-size: 11px;
  color: #94a3b8;
  margin: 0;
}
.picker-empty {
  padding: 16px;
  text-align: center;
  color: #94a3b8;
  font-size: 13px;
}

/* Order summary */
.order-summary {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 16px 20px;
}
.order-summary__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.order-summary__row--total {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
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
  .item-list__header {
    display: none;
  }
  .item-row {
    grid-template-columns: 1fr 80px 32px;
  }
}
</style>
