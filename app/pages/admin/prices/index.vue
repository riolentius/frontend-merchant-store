<script setup lang="ts">
import { mockGetProducts } from "~/mocks";
import type { Product, ProductPrice } from "~/mocks";

definePageMeta({ layout: "dashboard" });

const products = ref<Product[]>([]);
const isLoading = ref(true);
const search = ref("");

// Edit state
const editingId = ref<number | null>(null);
const editForm = reactive<{ prices: ProductPrice[] }>({ prices: [] });
const isSaving = ref(false);
const savedId = ref<number | null>(null); // flash confirmation

onMounted(async () => {
  products.value = await mockGetProducts();
  isLoading.value = false;
});

const filtered = computed(() => {
  const q = search.value.toLowerCase().trim();
  if (!q) return products.value;
  return products.value.filter(
    (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q),
  );
});

const categories = ["Regular", "Special", "VIP"] as const;

const getPrice = (product: Product, category: string) =>
  product.prices.find((p) => p.category === category)?.price ?? 0;

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

// Category color helpers
const catColor: Record<string, string> = {
  Regular: "#475569",
  Special: "#1d4ed8",
  VIP: "#854d0e",
};
const catBg: Record<string, string> = {
  Regular: "#f1f5f9",
  Special: "#eff6ff",
  VIP: "#fef9c3",
};

// Open edit form for a product row
const startEdit = (product: Product) => {
  editingId.value = product.id;
  editForm.prices = product.prices.map((p) => ({ ...p }));
};

const cancelEdit = () => {
  editingId.value = null;
  editForm.prices = [];
};

const saveEdit = async (product: Product) => {
  isSaving.value = true;
  // TODO: PUT /api/v1/products/:id/prices
  await new Promise((r) => setTimeout(r, 600));

  // Apply to local state
  const target = products.value.find((p) => p.id === product.id);
  if (target) target.prices = editForm.prices.map((p) => ({ ...p }));

  isSaving.value = false;
  editingId.value = null;
  savedId.value = product.id;
  setTimeout(() => {
    savedId.value = null;
  }, 2000);
};

// Validate — all prices must be > 0
const hasError = computed(() =>
  editForm.prices.some((p) => !p.price || p.price <= 0),
);

// Summary stats
const avgPriceByCategory = computed(() => {
  if (!products.value.length) return {};
  return Object.fromEntries(
    categories.map((cat) => [
      cat,
      Math.round(
        products.value.reduce((s, p) => s + getPrice(p, cat), 0) /
          products.value.length,
      ),
    ]),
  );
});
</script>

<template>
  <div class="page">
    <PageHeader
      title="Prices"
      subtitle="Manage pricing per product and customer category"
    >
      <template #action>
        <NuxtLink to="/admin/products/add" class="btn-secondary">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
            />
          </svg>
          Add Product
        </NuxtLink>
      </template>
    </PageHeader>

    <!-- Category summary strip -->
    <div class="cat-strip">
      <div
        v-for="cat in categories"
        :key="cat"
        class="cat-card"
        :style="{ borderLeftColor: catColor[cat] }"
      >
        <div class="cat-card__header">
          <span
            class="cat-badge"
            :style="{ background: catBg[cat], color: catColor[cat] }"
          >
            {{ cat }}
          </span>
        </div>
        <p class="cat-card__val">
          {{ isLoading ? "—" : formatRupiah(avgPriceByCategory[cat] ?? 0) }}
        </p>
        <p class="cat-card__lbl">
          Avg. price across {{ products.length }} products
        </p>
      </div>
    </div>

    <!-- Matrix table -->
    <DataCard :loading="isLoading" :skeleton-rows="5">
      <template #toolbar>
        <SearchInput
          v-model="search"
          placeholder="Search by product name or SKU…"
        />
        <span class="record-count">{{ filtered.length }} products</span>
      </template>

      <div class="table-wrap">
        <table class="price-table">
          <thead>
            <tr>
              <th class="col-product">Product</th>
              <th class="col-sku">SKU</th>
              <th
                v-for="cat in categories"
                :key="cat"
                class="col-price"
                :style="{ color: catColor[cat] }"
              >
                {{ cat }}
              </th>
              <th class="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filtered.length === 0">
              <td colspan="6" class="empty-row">No products found</td>
            </tr>

            <template v-for="product in filtered" :key="product.id">
              <!-- ── View row ── -->
              <tr
                v-if="editingId !== product.id"
                :class="{ 'row--saved': savedId === product.id }"
              >
                <td class="td-product">
                  <p class="product-name">{{ product.name }}</p>
                  <StatusBadge :active="product.is_active" />
                </td>
                <td class="td-sku">{{ product.sku }}</td>
                <td v-for="cat in categories" :key="cat" class="td-price">
                  <span class="price-val" :style="{ color: catColor[cat] }">
                    {{ formatRupiah(getPrice(product, cat)) }}
                  </span>
                </td>
                <td class="td-actions">
                  <div class="action-row">
                    <!-- Saved flash -->
                    <span v-if="savedId === product.id" class="saved-flash">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Saved
                    </span>
                    <button class="btn-edit" @click="startEdit(product)">
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
                      Edit Prices
                    </button>
                  </div>
                </td>
              </tr>

              <!-- ── Edit row (expands below) ── -->
              <tr v-else class="row--editing">
                <td colspan="6" class="edit-cell">
                  <div class="edit-panel">
                    <div class="edit-panel__header">
                      <div class="edit-panel__title">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                        >
                          <path
                            d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"
                          />
                          <line x1="7" y1="7" x2="7.01" y2="7" />
                        </svg>
                        Editing prices for <strong>{{ product.name }}</strong>
                      </div>
                      <button
                        class="edit-close"
                        @click="cancelEdit"
                        aria-label="Cancel"
                      >
                        ✕
                      </button>
                    </div>

                    <div class="edit-panel__body">
                      <div class="price-inputs">
                        <div
                          v-for="(p, i) in editForm.prices"
                          :key="p.category"
                          class="price-input-group"
                        >
                          <label
                            class="price-input-label"
                            :style="{ color: catColor[p.category] }"
                          >
                            <span
                              class="price-input-dot"
                              :style="{ background: catColor[p.category] }"
                            />
                            {{ p.category }}
                          </label>
                          <InputText
                            v-model.number="p.price"
                            type="number"
                            min="1"
                            placeholder="0"
                            fluid
                            :class="{ 'p-invalid': !p.price || p.price <= 0 }"
                          />
                          <span class="price-input-preview">
                            {{ p.price > 0 ? formatRupiah(p.price) : "—" }}
                          </span>
                        </div>
                      </div>

                      <!-- Discount check -->
                      <div
                        v-if="
                          editForm.prices.length === 3 &&
                          editForm.prices.every((p) => p.price > 0)
                        "
                        class="discount-info"
                      >
                        <div class="discount-row">
                          <span>Special discount</span>
                          <span class="discount-val">
                            {{
                              Math.round(
                                (1 -
                                  editForm.prices[1].price /
                                    editForm.prices[0].price) *
                                  100,
                              )
                            }}% off Regular
                          </span>
                        </div>
                        <div class="discount-row">
                          <span>VIP discount</span>
                          <span class="discount-val">
                            {{
                              Math.round(
                                (1 -
                                  editForm.prices[2].price /
                                    editForm.prices[0].price) *
                                  100,
                              )
                            }}% off Regular
                          </span>
                        </div>
                      </div>
                    </div>

                    <div class="edit-panel__footer">
                      <button class="btn-cancel" @click="cancelEdit">
                        Cancel
                      </button>
                      <button
                        class="btn-save"
                        :disabled="hasError || isSaving"
                        @click="saveEdit(product)"
                      >
                        <svg
                          v-if="!isSaving"
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2.5"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {{ isSaving ? "Saving…" : "Save Prices" }}
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </DataCard>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 20px;
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

/* ── Category strip ── */
.cat-strip {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.cat-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 16px 20px;
  border-left-width: 3px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cat-card__header {
  display: flex;
  align-items: center;
  gap: 8px;
}
.cat-badge {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 99px;
  font-size: 11.5px;
  font-weight: 600;
}
.cat-card__val {
  font-size: 20px;
  font-weight: 600;
  color: #0f172a;
  margin: 0;
  font-family: "Geist Mono", monospace;
}
.cat-card__lbl {
  font-size: 11.5px;
  color: #94a3b8;
  margin: 0;
}

/* ── Toolbar ── */
.record-count {
  font-size: 12px;
  color: #94a3b8;
  white-space: nowrap;
}

/* ── Matrix table ── */
.table-wrap {
  overflow-x: auto;
}
.price-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
}

.price-table th {
  padding: 10px 16px;
  text-align: left;
  font-size: 11.5px;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
  border-bottom: 1px solid #f1f5f9;
}
.col-product {
  width: 260px;
}
.col-sku {
  width: 110px;
}
.col-price {
  width: 140px;
}
.col-actions {
  width: 140px;
}

.price-table td {
  padding: 14px 16px;
  border-bottom: 1px solid #f8fafc;
  vertical-align: middle;
}
.price-table tbody tr:hover td {
  background: #f8fafc;
}
.price-table tbody tr.row--editing td {
  background: #f8fafc;
  padding: 0;
}
.price-table tbody tr.row--saved td {
  background: #f0fdf4;
  transition: background 1s ease;
}

.td-product {
  white-space: nowrap;
}
.product-name {
  font-size: 13.5px;
  font-weight: 500;
  color: #0f172a;
  margin: 0 0 4px;
}
.td-sku {
  font-family: "Geist Mono", monospace;
  font-size: 12px;
  color: #64748b;
}
.td-price {
}
.price-val {
  font-family: "Geist Mono", monospace;
  font-weight: 600;
  font-size: 13px;
}

.td-actions {
  white-space: nowrap;
}
.action-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-edit {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 7px;
  font-size: 12.5px;
  font-weight: 500;
  color: #475569;
  cursor: pointer;
  font-family: inherit;
  transition:
    background 0.12s,
    border-color 0.12s,
    color 0.12s;
  white-space: nowrap;
}
.btn-edit:hover {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #1d4ed8;
}

.saved-flash {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  color: #16a34a;
  animation: flash-in 0.2s ease;
}
@keyframes flash-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.empty-row {
  text-align: center;
  color: #94a3b8;
  padding: 40px !important;
}

/* ── Edit panel ── */
.edit-cell {
  padding: 0 !important;
}

.edit-panel {
  border-top: 2px solid #3b82f6;
  background: #fff;
}

.edit-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: #eff6ff;
  border-bottom: 1px solid #dbeafe;
}
.edit-panel__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
  color: #1e40af;
}
.edit-panel__title strong {
  font-weight: 600;
}
.edit-close {
  background: none;
  border: none;
  cursor: pointer;
  color: #64748b;
  font-size: 14px;
  transition: color 0.15s;
  padding: 2px 6px;
}
.edit-close:hover {
  color: #0f172a;
}

.edit-panel__body {
  padding: 20px;
  display: flex;
  gap: 32px;
  align-items: flex-start;
  flex-wrap: wrap;
}

/* Price inputs */
.price-inputs {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}
.price-input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 180px;
}

.price-input-label {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.price-input-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.price-input-preview {
  font-family: "Geist Mono", monospace;
  font-size: 12px;
  color: #64748b;
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

/* Discount info */
.discount-info {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 200px;
  align-self: flex-end;
}
.discount-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12.5px;
  color: #64748b;
}
.discount-val {
  font-weight: 600;
  color: #0f172a;
  font-family: "Geist Mono", monospace;
}

/* Footer */
.edit-panel__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 20px;
  border-top: 1px solid #f1f5f9;
  background: #f8fafc;
}

.btn-cancel {
  padding: 7px 14px;
  background: #fff;
  color: #475569;
  border: 1px solid #e2e8f0;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}
.btn-cancel:hover {
  background: #f1f5f9;
}

.btn-save {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  box-shadow: 0 1px 4px rgba(37, 99, 235, 0.25);
  transition: background 0.15s;
}
.btn-save:hover:not(:disabled) {
  background: #1d4ed8;
}
.btn-save:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* ── Responsive ── */
@media (max-width: 900px) {
  .cat-strip {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 640px) {
  .price-inputs {
    flex-direction: column;
  }
  .discount-info {
    align-self: stretch;
  }
}
</style>
