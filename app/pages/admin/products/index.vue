<script setup lang="ts">
import { mockGetProducts } from "../../../mocks";
import type { Product } from "../../../mocks";

definePageMeta({ layout: "dashboard" });

const products = ref<Product[]>([]);
const isLoading = ref(true);
const search = ref("");
const filterStatus = ref<"all" | "active" | "inactive">("all");
const deleteTarget = ref<number | null>(null);
const showConfirm = ref(false);
const router = useRouter();

onMounted(async () => {
  products.value = await mockGetProducts();
  isLoading.value = false;
});

const filtered = computed(() => {
  let list = products.value;

  if (filterStatus.value === "active") list = list.filter((p) => p.is_active);
  if (filterStatus.value === "inactive")
    list = list.filter((p) => !p.is_active);

  const q = search.value.toLowerCase().trim();
  if (!q) return list;
  return list.filter(
    (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q),
  );
});

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

// Get Regular price as the displayed price
const regularPrice = (p: Product) =>
  p.prices.find((pr) => pr.category === "Regular")?.price ?? 0;

const confirmDelete = (id: number) => {
  deleteTarget.value = id;
  showConfirm.value = true;
};

const doDelete = () => {
  products.value = products.value.filter((p) => p.id !== deleteTarget.value);
  showConfirm.value = false;
  deleteTarget.value = null;
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
          <!-- Status filter tabs -->
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
        </div>
        <span class="record-count"
          >{{ filtered.length }} of {{ products.length }} products</span
        >
      </template>

      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Name</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Regular Price</th>
              <th>Special Price</th>
              <th>VIP Price</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filtered.length === 0">
              <td colspan="8" class="empty-row">No products found</td>
            </tr>
            <tr v-for="p in filtered" :key="p.id">
              <td class="td-sku">{{ p.sku }}</td>
              <td class="td-name">{{ p.name }}</td>
              <td><StockBadge :stock="p.stock" /></td>
              <td><StatusBadge :active="p.is_active" /></td>
              <td class="td-price">
                {{
                  formatRupiah(
                    p.prices.find((pr) => pr.category === "Regular")?.price ??
                      0,
                  )
                }}
              </td>
              <td class="td-price td-price--special">
                {{
                  formatRupiah(
                    p.prices.find((pr) => pr.category === "Special")?.price ??
                      0,
                  )
                }}
              </td>
              <td class="td-price td-price--vip">
                {{
                  formatRupiah(
                    p.prices.find((pr) => pr.category === "VIP")?.price ?? 0,
                  )
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
      </div>
    </DataCard>

    <ConfirmDialog
      v-model="showConfirm"
      title="Delete Product"
      description="This will permanently delete this product and all its prices. This action cannot be undone."
      confirm-label="Yes, Delete"
      @confirm="doDelete"
    />
  </div>
</template>

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
.filter-tab:not(.filter-tab--active):hover {
  color: #0f172a;
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

.td-sku {
  font-family: "Geist Mono", monospace;
  font-size: 12px;
  color: #64748b;
}
.td-name {
  font-weight: 500;
  color: #0f172a;
}
.td-price {
  font-family: "Geist Mono", monospace;
  font-size: 12.5px;
  color: #334155;
}
.td-price--special {
  color: #1d4ed8;
}
.td-price--vip {
  color: #854d0e;
}
.empty-row {
  text-align: center;
  color: #94a3b8;
  padding: 40px !important;
}
</style>
