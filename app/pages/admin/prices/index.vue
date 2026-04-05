<script setup lang="ts">
import type { Product, ProductPrice } from "../../../composables/useProducts";

definePageMeta({ layout: "dashboard" });

const { $api } = useNuxtApp();
const { fetchCategories, categories } = useCategories();
const { fetchPrices, updatePrice, createPrices, formatRupiah } = useProducts();

const products = ref<Product[]>([]);
const priceMap = ref<Record<string, ProductPrice[]>>({});
const isLoading = ref(true);
const search = ref("");

// Edit state
const editingId = ref<string | null>(null);
const editAmounts = ref<Record<string, string>>({}); // categoryId → amount
const isSaving = ref(false);
const savedId = ref<string | null>(null);

onMounted(async () => {
  await fetchCategories();
  try {
    const res = await $api<{ items: Product[] }>("/products");
    products.value = res.items ?? [];
    await Promise.all(
      products.value.map(async (p) => {
        priceMap.value[p.id] = await fetchPrices(p.id);
      }),
    );
  } catch (err) {
    console.error("Failed to load products:", err);
  } finally {
    isLoading.value = false;
  }
});

const filtered = computed(() => {
  const q = search.value.toLowerCase().trim();
  if (!q) return products.value;
  return products.value.filter(
    (p) => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q),
  );
});

const catColor = (code: string) => {
  if (code === "REGULAR") return "#475569";
  if (code === "SPECIAL") return "#1d4ed8";
  if (code === "VIP") return "#854d0e";
  return "#475569";
};

const getPriceForCategory = (productId: string, categoryId: string) =>
  (priceMap.value[productId] ?? []).find((p) => p.categoryId === categoryId);

const startEdit = (product: Product) => {
  editingId.value = product.id;
  // Pre-fill edit amounts from existing prices
  editAmounts.value = Object.fromEntries(
    categories.value.map((cat) => {
      const existing = getPriceForCategory(product.id, cat.id);
      return [cat.id, existing?.amount ?? ""];
    }),
  );
};

const cancelEdit = () => {
  editingId.value = null;
  editAmounts.value = {};
};

const saveEdit = async (product: Product) => {
  isSaving.value = true;
  try {
    const existing = priceMap.value[product.id] ?? [];
    const toUpdate = categories.value
      .filter((cat) => {
        const p = existing.find((e) => e.categoryId === cat.id);
        return p && editAmounts.value[cat.id];
      })
      .map((cat) => ({
        priceId: existing.find((e) => e.categoryId === cat.id)!.id,
        amount: editAmounts.value[cat.id],
      }));

    const toCreate = categories.value
      .filter((cat) => {
        const p = existing.find((e) => e.categoryId === cat.id);
        return !p && editAmounts.value[cat.id];
      })
      .map((cat) => ({
        categoryId: cat.id,
        amount: editAmounts.value[cat.id],
      }));

    await Promise.all([
      ...toUpdate.map((p) => updatePrice(p.priceId, p.amount)),
      ...(toCreate.length > 0 ? [createPrices(product.id, toCreate)] : []),
    ]);

    // Refresh prices for this product
    priceMap.value[product.id] = await fetchPrices(product.id);

    savedId.value = product.id;
    editingId.value = null;
    setTimeout(() => {
      savedId.value = null;
    }, 2000);
  } catch (err) {
    console.error("Failed to save prices:", err);
  } finally {
    isSaving.value = false;
  }
};

// Avg price per category
const avgByCategory = computed(() => {
  if (!products.value.length) return {};
  return Object.fromEntries(
    categories.value.map((cat) => {
      const amounts = products.value
        .map((p) => getPriceForCategory(p.id, cat.id))
        .filter(Boolean)
        .map((p) => parseFloat(p!.amount));
      const avg = amounts.length
        ? Math.round(amounts.reduce((a, b) => a + b, 0) / amounts.length)
        : 0;
      return [cat.id, avg];
    }),
  );
});

const previewAmount = (amount: string) => {
  const n = parseFloat(amount);
  return n > 0 ? formatRupiah(n) : "—";
};
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

    <!-- Category averages -->
    <div
      class="cat-strip"
      :style="{ gridTemplateColumns: `repeat(${categories.length}, 1fr)` }"
    >
      <div
        v-for="cat in categories"
        :key="cat.id"
        class="cat-card"
        :style="{ borderLeftColor: catColor(cat.code) }"
      >
        <span
          class="cat-badge"
          :style="{
            background:
              cat.code === 'REGULAR'
                ? '#f1f5f9'
                : cat.code === 'SPECIAL'
                  ? '#eff6ff'
                  : '#fef9c3',
            color: catColor(cat.code),
          }"
        >
          {{ cat.name }}
        </span>
        <p class="cat-val">
          {{ isLoading ? "—" : formatRupiah(avgByCategory[cat.id] ?? 0) }}
        </p>
        <p class="cat-lbl">Avg. across {{ products.length }} products</p>
      </div>
    </div>

    <!-- Matrix table -->
    <DataCard :loading="isLoading" :skeleton-rows="5">
      <template #toolbar>
        <SearchInput v-model="search" placeholder="Search by name or SKU…" />
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
                :key="cat.id"
                class="col-price"
                :style="{ color: catColor(cat.code) }"
              >
                {{ cat.name }}
              </th>
              <th class="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filtered.length === 0">
              <td :colspan="3 + categories.length" class="empty-row">
                No products found
              </td>
            </tr>

            <template v-for="product in filtered" :key="product.id">
              <!-- View row -->
              <tr
                v-if="editingId !== product.id"
                :class="{ 'row--saved': savedId === product.id }"
              >
                <td class="td-product">
                  <p class="product-name">{{ product.name }}</p>
                  <StatusBadge :active="product.isActive" />
                </td>
                <td class="td-sku">{{ product.sku ?? "—" }}</td>
                <td v-for="cat in categories" :key="cat.id" class="td-price">
                  <span
                    v-if="getPriceForCategory(product.id, cat.id)"
                    :style="{
                      color: catColor(cat.code),
                      fontWeight: 600,
                      fontFamily: 'Geist Mono, monospace',
                    }"
                  >
                    {{
                      formatRupiah(
                        getPriceForCategory(product.id, cat.id)!.amount,
                      )
                    }}
                  </span>
                  <span v-else class="td-muted">—</span>
                </td>
                <td>
                  <div class="action-row">
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

              <!-- Edit row -->
              <tr v-else class="row--editing">
                <td :colspan="3 + categories.length" class="edit-cell">
                  <div class="edit-panel">
                    <div class="edit-panel__header">
                      <span class="edit-panel__title">
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
                      </span>
                      <button class="edit-close" @click="cancelEdit">✕</button>
                    </div>
                    <div class="edit-panel__body">
                      <div class="price-inputs">
                        <div
                          v-for="cat in categories"
                          :key="cat.id"
                          class="price-input-group"
                        >
                          <label
                            class="price-input-label"
                            :style="{ color: catColor(cat.code) }"
                          >
                            <span
                              class="price-input-dot"
                              :style="{ background: catColor(cat.code) }"
                            />
                            {{ cat.name }}
                          </label>
                          <InputText
                            v-model="editAmounts[cat.id]"
                            type="number"
                            min="0"
                            placeholder="0"
                            fluid
                          />
                          <span class="price-input-preview">{{
                            previewAmount(editAmounts[cat.id] ?? "")
                          }}</span>
                        </div>
                      </div>
                    </div>
                    <div class="edit-panel__footer">
                      <button class="btn-cancel" @click="cancelEdit">
                        Cancel
                      </button>
                      <button
                        class="btn-save"
                        :disabled="isSaving"
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
.cat-strip {
  display: grid;
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
.cat-badge {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 99px;
  font-size: 11.5px;
  font-weight: 600;
  align-self: flex-start;
}
.cat-val {
  font-size: 20px;
  font-weight: 600;
  color: #0f172a;
  margin: 0;
  font-family: "Geist Mono", monospace;
}
.cat-lbl {
  font-size: 11.5px;
  color: #94a3b8;
  margin: 0;
}
.record-count {
  font-size: 12px;
  color: #94a3b8;
  white-space: nowrap;
}
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
  width: 160px;
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
.td-muted {
  color: #94a3b8;
  font-size: 13px;
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
}
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
@media (max-width: 900px) {
  .cat-strip {
    grid-template-columns: 1fr !important;
  }
}
</style>
