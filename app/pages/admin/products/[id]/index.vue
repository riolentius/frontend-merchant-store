<script setup lang="ts">
import type {
  Product,
  ProductPrice,
} from "../../../../composables/useProducts";
const { fetchMovements } = useStockMovements();
const movements = ref<StockMovement[]>([]);
const movLoading = ref(false);

definePageMeta({ layout: "dashboard" });

const { $api } = useNuxtApp();
const { fetchCategories, categories, getCategoryName } = useCategories();
const { fetchPrices, formatRupiah } = useProducts();
const route = useRoute();
const router = useRouter();
const id = route.params.id as string;

const product = ref<Product | null>(null);
const prices = ref<ProductPrice[]>([]);
const isLoading = ref(true);
const notFound = ref(false);
const showDeleteConfirm = ref(false);

onMounted(async () => {
  await fetchCategories();
  try {
    const res = await $api<{ items: Product[] }>("/products");
    product.value = (res.items ?? []).find((p) => p.id === id) ?? null;
    if (!product.value) {
      notFound.value = true;
      return;
    }
    prices.value = await fetchPrices(id);
  } catch {
    notFound.value = true;
  } finally {
    isLoading.value = false;
  }
});

const todayISO = () => {
  const d = new Date();
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
};

const monthAgoISO = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
};

const filters = reactive({
  from: monthAgoISO(),
  to: todayISO(),
  type: "" as "" | "in" | "out",
});

const loadMovements = async () => {
  if (!product.value?.id) return;
  movLoading.value = true;
  try {
    const res = await fetchMovements(product.value.id, {
      from: filters.from || undefined,
      to: filters.to || undefined,
      type: filters.type || undefined,
      limit: 100,
    });
    movements.value = res.items ?? [];
  } catch (err) {
    notifyError(err, "Failed to load stock history");
  } finally {
    movLoading.value = false;
  }
};

onMounted(loadMovements);

const fmtMovDate = (d: string) =>
  new Date(d).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const catColor = (code: string) => {
  if (code === "REGULAR") return "#475569";
  if (code === "SPECIAL") return "#1d4ed8";
  if (code === "VIP") return "#854d0e";
  return "#475569";
};

const getPriceForCategory = (categoryId: string) =>
  prices.value.find((p) => p.categoryId === categoryId);

const doDelete = () => router.push("/admin/products");
</script>

<template>
  <div class="page">
    <PageHeader
      :title="isLoading ? 'Loading…' : (product?.name ?? 'Not Found')"
      :subtitle="product?.sku ? `SKU: ${product.sku}` : ''"
    >
      <template #action>
        <div class="header-actions">
          <NuxtLink
            v-if="product"
            :to="`/admin/products/${id}/edit`"
            class="btn-secondary"
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
            Edit
          </NuxtLink>
          <button
            v-if="product"
            class="btn-danger"
            @click="showDeleteConfirm = true"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            </svg>
            Delete
          </button>
          <NuxtLink to="/admin/products" class="btn-ghost">← Back</NuxtLink>
        </div>
      </template>
    </PageHeader>

    <div v-if="notFound" class="not-found">
      <p>Product not found.</p>
      <NuxtLink to="/admin/products" class="btn-secondary">← Back</NuxtLink>
    </div>

    <DataCard v-else-if="isLoading" :loading="true" :skeleton-rows="4" />

    <template v-else-if="product">
      <div class="detail-grid">
        <div class="left-col">
          <!-- Info -->
          <FormSection title="Product Information">
            <div class="info-list">
              <div class="info-row">
                <span class="info-label">Name</span
                ><span class="info-value">{{ product.name }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">SKU</span
                ><span class="info-value info-mono">{{
                  product.sku ?? "—"
                }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Stock</span
                ><StockBadge :stock="product.stockOnHand" />
              </div>
              <div class="info-row">
                <span class="info-label">Reserved</span
                ><span class="info-value">{{ product.stockReserved }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Status</span
                ><StatusBadge :active="product.isActive" />
              </div>
            </div>
          </FormSection>

          <!-- Prices -->
          <FormSection title="Pricing Per Category">
            <div v-if="prices.length === 0" class="empty-state">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <path
                  d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"
                />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
              No prices set yet
            </div>
            <div v-else class="price-list">
              <div v-for="cat in categories" :key="cat.id" class="price-row">
                <div class="price-cat">
                  <span
                    class="price-cat__dot"
                    :style="{ background: catColor(cat.code) }"
                  />
                  <span
                    class="price-cat__name"
                    :style="{ color: catColor(cat.code) }"
                    >{{ cat.name }}</span
                  >
                </div>
                <span v-if="getPriceForCategory(cat.id)" class="price-val">
                  {{ formatRupiah(getPriceForCategory(cat.id)!.amount) }}
                </span>
                <span v-else class="price-none">Not set</span>
              </div>
            </div>
          </FormSection>

          <section class="panel stock-history">
            <div class="stock-history__head">
              <div>
                <h2 class="panel-title">Stock History</h2>
                <p class="panel-sub">Movements in and out of stock</p>
              </div>
            </div>

            <div class="stock-filters">
              <div class="filter-field">
                <label>From</label>
                <input
                  v-model="filters.from"
                  type="date"
                  :max="filters.to"
                  class="date-input"
                />
              </div>
              <div class="filter-field">
                <label>To</label>
                <input
                  v-model="filters.to"
                  type="date"
                  :max="todayISO()"
                  class="date-input"
                />
              </div>
              <div class="filter-field">
                <label>Type</label>
                <select v-model="filters.type" class="type-select">
                  <option value="">All</option>
                  <option value="in">Stock In</option>
                  <option value="out">Stock Out</option>
                </select>
              </div>
              <button
                class="filter-apply"
                :disabled="movLoading"
                @click="loadMovements"
              >
                {{ movLoading ? "Loading…" : "Apply" }}
              </button>
            </div>

            <div v-if="movLoading" class="stock-empty">Loading…</div>
            <div v-else-if="!movements.length" class="stock-empty">
              No movements in this range.
            </div>
            <table v-else class="stock-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th class="num">Qty</th>
                  <th>Source</th>
                  <th>Note / Ref</th>
                  <th>By</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="m in movements" :key="m.id">
                  <td class="mov-date">{{ fmtMovDate(m.createdAt) }}</td>
                  <td>
                    <span
                      class="mov-badge"
                      :class="`mov-badge--${m.direction}`"
                    >
                      {{ m.direction === "in" ? "IN" : "OUT" }}
                    </span>
                  </td>
                  <td
                    class="num"
                    :class="m.direction === 'in' ? 'qty-in' : 'qty-out'"
                  >
                    {{ m.direction === "in" ? "+" : "−" }}{{ m.quantity }}
                  </td>
                  <td class="mov-source">{{ m.source }}</td>
                  <td class="mov-note">
                    {{
                      m.note ||
                      (m.referenceId ? `Tx ${m.referenceId.slice(0, 8)}` : "—")
                    }}
                  </td>
                  <td class="mov-by">{{ m.createdByEmail || "—" }}</td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>

        <!-- Summary -->
        <div class="summary-card">
          <div class="summary-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <path
                d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
              />
            </svg>
          </div>
          <p class="summary-name">{{ product.name }}</p>
          <p class="summary-sku">{{ product.sku ?? "No SKU" }}</p>

          <div class="summary-stats">
            <div class="summary-stat">
              <p class="summary-stat__val">{{ product.stockOnHand }}</p>
              <p class="summary-stat__lbl">In Stock</p>
            </div>
            <div class="summary-stat">
              <p
                class="summary-stat__val"
                :style="{ color: product.isActive ? '#16a34a' : '#94a3b8' }"
              >
                {{ product.isActive ? "Active" : "Inactive" }}
              </p>
              <p class="summary-stat__lbl">Status</p>
            </div>
          </div>

          <div v-if="prices.length > 0" class="summary-prices">
            <p class="summary-prices__title">Prices</p>
            <div
              v-for="cat in categories"
              :key="cat.id"
              class="summary-prices__row"
            >
              <span :style="{ color: catColor(cat.code), fontWeight: 600 }">{{
                cat.name
              }}</span>
              <span class="summary-prices__val">
                {{
                  getPriceForCategory(cat.id)
                    ? formatRupiah(getPriceForCategory(cat.id)!.amount)
                    : "—"
                }}
              </span>
            </div>
          </div>

          <NuxtLink :to="`/admin/products/${id}/edit`" class="summary-edit-btn">
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
            Edit this product
          </NuxtLink>
        </div>
      </div>
    </template>

    <Dialog
      v-model:visible="showDeleteConfirm"
      header="Delete Product"
      :modal="true"
      :draggable="false"
      :style="{ width: '380px' }"
    >
      <p style="margin: 0; font-size: 13.5px; color: #64748b; line-height: 1.5">
        This will permanently delete this product and all its prices.
      </p>
      <template #footer>
        <div style="display: flex; gap: 8px">
          <Button
            label="Cancel"
            severity="secondary"
            outlined
            fluid
            @click="showDeleteConfirm = false"
          />
          <Button
            label="Yes, Delete"
            severity="danger"
            fluid
            @click="doDelete"
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
.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
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
.btn-danger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}
.btn-danger:hover {
  background: #fee2e2;
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
.info-list {
  display: flex;
  flex-direction: column;
}
.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 0;
  border-bottom: 1px solid #f8fafc;
}
.info-row:last-child {
  border-bottom: none;
}
.info-label {
  font-size: 13px;
  color: #64748b;
}
.info-value {
  font-size: 13.5px;
  font-weight: 500;
  color: #0f172a;
}
.info-mono {
  font-family: "Geist Mono", monospace;
}
.empty-state {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 16px 0;
  font-size: 13px;
  color: #94a3b8;
}
.price-list {
  display: flex;
  flex-direction: column;
}
.price-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 11px 0;
  border-bottom: 1px solid #f8fafc;
}
.price-row:last-child {
  border-bottom: none;
}
.price-cat {
  display: flex;
  align-items: center;
  gap: 8px;
}
.price-cat__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.price-cat__name {
  font-size: 13.5px;
  font-weight: 600;
}
.price-val {
  font-family: "Geist Mono", monospace;
  font-weight: 500;
  color: #0f172a;
}
.price-none {
  font-size: 12px;
  color: #94a3b8;
}
.summary-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
  position: sticky;
  top: 80px;
}
.summary-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #f1f5f9;
  color: #475569;
  display: flex;
  align-items: center;
  justify-content: center;
}
.summary-name {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  margin: 0;
}
.summary-sku {
  font-family: "Geist Mono", monospace;
  font-size: 11.5px;
  color: #94a3b8;
  margin: 0;
}
.summary-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  width: 100%;
}
.summary-stat {
  background: #f8fafc;
  border-radius: 8px;
  padding: 10px;
}
.summary-stat__val {
  font-size: 18px;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 2px;
}
.summary-stat__lbl {
  font-size: 11px;
  color: #94a3b8;
  margin: 0;
}
.summary-prices {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}
.summary-prices__title {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: 4px;
}
.summary-prices__row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  padding: 4px 0;
}
.summary-prices__val {
  font-family: "Geist Mono", monospace;
  color: #0f172a;
  font-weight: 500;
}
.summary-edit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 9px 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #475569;
  text-decoration: none;
  width: 100%;
  transition:
    background 0.15s,
    border-color 0.15s;
}
.summary-edit-btn:hover {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #1d4ed8;
}
@media (max-width: 900px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
  .summary-card {
    position: static;
  }
}
.stock-history {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 24px;
}
.stock-history__head {
  margin-bottom: 16px;
}
.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
  margin: 0;
}
.panel-sub {
  font-size: 12.5px;
  color: #64748b;
  margin: 2px 0 0;
}

.stock-filters {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f1f5f9;
}
.filter-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.filter-field label {
  font-size: 11.5px;
  font-weight: 500;
  color: #64748b;
}
.date-input,
.type-select {
  padding: 8px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
  color: #0f172a;
  background: #fff;
  outline: none;
}
.date-input:focus,
.type-select:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}
.filter-apply {
  padding: 8px 18px;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
}
.filter-apply:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.stock-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.stock-table th {
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #94a3b8;
  padding: 8px 10px;
  border-bottom: 1px solid #e2e8f0;
}
.stock-table td {
  padding: 10px;
  border-bottom: 1px solid #f1f5f9;
  color: #334155;
}
.stock-table .num {
  text-align: right;
  font-family: "Geist Mono", monospace;
}
.mov-date {
  color: #64748b;
  white-space: nowrap;
}
.mov-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 99px;
  font-size: 11px;
  font-weight: 600;
}
.mov-badge--in {
  background: #f0fdf4;
  color: #16a34a;
}
.mov-badge--out {
  background: #fef2f2;
  color: #dc2626;
}
.qty-in {
  color: #16a34a;
  font-weight: 600;
}
.qty-out {
  color: #dc2626;
  font-weight: 600;
}
.mov-source {
  text-transform: capitalize;
  color: #64748b;
}
.mov-note {
  color: #475569;
}
.mov-by {
  color: #94a3b8;
  font-size: 12px;
}
.stock-empty {
  padding: 32px;
  text-align: center;
  color: #94a3b8;
  font-size: 13px;
}
</style>
