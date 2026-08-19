<script setup lang="ts">
import type { Product, ProductPrice } from "../../../composables/useProducts";

definePageMeta({ layout: "dashboard" });
const { notifyError, notifySuccess } = useNotify();
const { $api } = useNuxtApp();
const { fetchCategories, categories, getCategoryName } = useCategories();
const { fetchPrices, formatRupiah } = useProducts();
const router = useRouter();
const { exportProducts } = useProductExport();
const isExporting = ref(false);
const products = ref<Product[]>([]);
const priceMap = ref<Record<string, ProductPrice[]>>({});
const isLoading = ref(true);
const search = ref("");
const filterStatus = ref<"all" | "active" | "inactive">("all");
const showConfirm = ref(false);
const deleteTarget = ref<string | null>(null);
const sort = ref<"newest" | "oldest" | "alphabet">("alphabet");
const page = ref(1);
const limit = ref(50);
const total = ref(0);
const totalPages = computed(() =>
  Math.max(1, Math.ceil(total.value / limit.value)),
);

const load = async () => {
  isLoading.value = true;
  try {
    const params = new URLSearchParams({
      offset: String((page.value - 1) * limit.value),
      limit: String(limit.value),
      sort: sort.value,
    });
    if (search.value.trim()) params.set("search", search.value.trim());
    if (filterStatus.value !== "all") params.set("status", filterStatus.value);

    const res = await $api<{ items: Product[]; total: number }>(
      `/products?${params.toString()}`,
    );
    products.value = res.items ?? [];
    total.value = res.total ?? 0;

    // prices only for the current page — not the whole catalog
    priceMap.value = {};
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
};

onMounted(async () => {
  await fetchCategories();
  await load();
});

watch(page, load);
watch(filterStatus, () => {
  page.value = 1;
  load();
});

watch(sort, () => {
  page.value = 1;
  load();
});

const handleExport = async () => {
  isExporting.value = true;
  try {
    // export respects the current search/filter, or omit to export all
    await exportProducts({ search: search.value, status: filterStatus.value });
    notifySuccess("Export berhasil diunduh");
  } catch (err) {
    notifyError(err, "Gagal export produk");
  } finally {
    isExporting.value = false;
  }
};

let searchTimer: ReturnType<typeof setTimeout>;
watch(search, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    page.value = 1;
    load();
  }, 350);
});

const getPriceAmount = (
  productId: string,
  categoryId: string,
): string | null => {
  const prices = priceMap.value[productId] ?? [];
  const price = prices.find((p) => p.categoryId === categoryId);
  return price ? price.amount : null;
};

const confirmDelete = (id: string) => {
  deleteTarget.value = id;
  showConfirm.value = true;
};

const isDeleting = ref(false);

const doDelete = async () => {
  if (!deleteTarget.value) return;
  isDeleting.value = true;
  try {
    await $api(`/products/${deleteTarget.value}`, { method: "DELETE" });
    notifySuccess("Product deleted");
    await load();
  } catch (err) {
    notifyError(err, "Failed to delete product");
  } finally {
    isDeleting.value = false;
    showConfirm.value = false;
    deleteTarget.value = null;
  }
};

const regularCategory = computed(() =>
  categories.value.find((c) => c.code === "REGULAR"),
);

const regularPrice = (productId: string): string | null => {
  if (!regularCategory.value) return null;
  return getPriceAmount(productId, regularCategory.value.id);
};
</script>

<template>
  <div class="page">
    <PageHeader
      title="Products"
      subtitle="Manage products, stock levels and category prices"
    >
      <template #action>
        <NuxtLink to="/admin/products/add" class="btn-primary">
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
        </NuxtLink>
      </template>
    </PageHeader>

    <DataCard :loading="isLoading" :skeleton-rows="5">
      <template #toolbar>
        <div class="toolbar-left">
          <SearchInput v-model="search" placeholder="Search by name or SKU…" />
          <select v-model="sort" class="sort-select">
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="alphabet">Alphabetical</option>
          </select>
          <div class="filter-tabs">
            <button
              v-for="f in ['all', 'active', 'inactive'] as const"
              :key="f"
              class="filter-tab"
              :class="{ 'filter-tab--active': filterStatus === f }"
              @click="filterStatus = f"
            >
              {{ f.charAt(0).toUpperCase() + f.slice(1) }}
            </button>
          </div>
          <button
            class="btn-export"
            :disabled="isExporting"
            @click="handleExport"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {{ isExporting ? "Menyiapkan…" : "Export Excel" }}
          </button>
        </div>
        <span>{{ total }} products</span>
      </template>

      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>SKU</th>
              <th>Stock</th>
              <th>Status</th>
              <!-- Price columns per category
              <th
                v-for="cat in categories"
                :key="cat.id"
                :style="{ color: catColor(cat.code) }"
              >
                {{ cat.name }}
              </th> -->
              <th>Price</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="products.length === 0">
              <td :colspan="5 + categories.length" class="empty-row">
                No products found
              </td>
            </tr>
            <tr v-for="p in products" :key="p.id">
              <td class="td-name">{{ p.name }}</td>
              <td class="td-sku">{{ p.sku ?? "—" }}</td>
              <td><StockBadge :stock="p.stockOnHand - p.stockReserved" /></td>
              <td><StatusBadge :active="p.isActive" /></td>
              <td class="td-price">
                {{
                  regularPrice(p.id) ? formatRupiah(regularPrice(p.id)!) : "—"
                }}
              </td>
              <td>
                <ActionButtons
                  @view="router.push(`/admin/products/${p.id}`)"
                  @edit="router.push(`/admin/products/${p.id}/edit`)"
                  @delete="confirmDelete(p.id)"
                />
              </td>
            </tr>
          </tbody>
        </table>
        <div class="pager">
          <button class="pager-btn" :disabled="page <= 1" @click="page--">
            ← Prev
          </button>
          <span class="pager-info"
            >Page {{ page }} of {{ totalPages }} · {{ total }} total</span
          >
          <button
            class="pager-btn"
            :disabled="page >= totalPages"
            @click="page++"
          >
            Next →
          </button>
        </div>
      </div>
    </DataCard>

    <Dialog
      v-model:visible="showConfirm"
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
            @click="showConfirm = false"
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

<script lang="ts">
// catColor helper outside setup for template use
function catColor(code: string): string {
  if (code === "REGULAR") return "#475569";
  if (code === "SPECIAL") return "#1d4ed8";
  if (code === "VIP") return "#854d0e";
  return "#475569";
}
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.btn-primary {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 16px;
  background: #2563eb;
  color: #fff;
  border-radius: 8px;
  font-size: 13.5px;
  font-weight: 500;
  text-decoration: none;
  white-space: nowrap;
  box-shadow: 0 1px 6px rgba(37, 99, 235, 0.25);
  transition:
    background 0.15s,
    transform 0.12s;
}
.btn-primary:hover {
  background: #1d4ed8;
  transform: translateY(-1px);
}
.toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.filter-tabs {
  display: flex;
  gap: 2px;
  background: #f1f5f9;
  padding: 3px;
  border-radius: 7px;
}
.filter-tab {
  padding: 4px 12px;
  border: none;
  background: none;
  border-radius: 5px;
  font-size: 12.5px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  font-family: inherit;
  transition:
    background 0.15s,
    color 0.15s;
}
.filter-tab--active {
  background: #fff;
  color: #0f172a;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
.record-count {
  font-size: 12px;
  color: #94a3b8;
  white-space: nowrap;
}
.table-wrap {
  overflow-x: auto;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.data-table th {
  padding: 10px 14px;
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  white-space: nowrap;
  border-bottom: 1px solid #f1f5f9;
}
.data-table td {
  padding: 12px 14px;
  border-bottom: 1px solid #f8fafc;
  white-space: nowrap;
}
.data-table tbody tr:last-child td {
  border-bottom: none;
}
.data-table tbody tr:hover td {
  background: #f8fafc;
}
.td-name {
  font-weight: 500;
  color: #0f172a;
}
.td-sku {
  font-family: "Geist Mono", monospace;
  font-size: 12px;
  color: #64748b;
}
.td-price {
  font-family: "Geist Mono", monospace;
  font-size: 12.5px;
  font-weight: 500;
}
.td-muted {
  color: #94a3b8;
}
.empty-row {
  text-align: center;
  color: #94a3b8;
  padding: 40px !important;
}
.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 16px;
  font-size: 13px;
  color: #64748b;
}
.pager-btn {
  padding: 7px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  font-size: 13px;
  font-weight: 500;
  color: #475569;
  cursor: pointer;
  font-family: inherit;
}
.pager-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.pager-info {
  font-variant-numeric: tabular-nums;
}

.btn-export {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 14px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #16a34a;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}
.btn-export:hover:not(:disabled) {
  background: #dcfce7;
}
.btn-export:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
