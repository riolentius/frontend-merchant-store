<script setup lang="ts">
import { mockGetProduct } from "~/mocks";
import type { Product } from "~/mocks";

definePageMeta({ layout: "dashboard" });

const route = useRoute();
const router = useRouter();
const id = Number(route.params.id);

const product = ref<Product | null>(null);
const isLoading = ref(true);
const notFound = ref(false);
const showDeleteConfirm = ref(false);

onMounted(async () => {
  try {
    product.value = await mockGetProduct(id);
  } catch {
    notFound.value = true;
  } finally {
    isLoading.value = false;
  }
});

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

const doDelete = () => router.push("/admin/products");

const categoryColors: Record<string, string> = {
  Regular: "#475569",
  Special: "#1d4ed8",
  VIP: "#854d0e",
};
</script>

<template>
  <div class="page">
    <PageHeader
      :title="isLoading ? 'Loading…' : (product?.name ?? 'Product Not Found')"
      :subtitle="product ? `SKU: ${product.sku}` : ''"
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
              <path d="M10 11v6m4-6v6" />
              <path d="M9 6V4h6v2" />
            </svg>
            Delete
          </button>
          <NuxtLink to="/admin/products" class="btn-ghost">← Back</NuxtLink>
        </div>
      </template>
    </PageHeader>

    <!-- Not found -->
    <div v-if="notFound" class="not-found">
      <p>Product #{{ id }} was not found.</p>
      <NuxtLink to="/admin/products" class="btn-secondary"
        >← Back to Products</NuxtLink
      >
    </div>

    <!-- Skeleton -->
    <DataCard v-else-if="isLoading" :loading="true" :skeleton-rows="4" />

    <!-- Detail -->
    <template v-else-if="product">
      <div class="detail-grid">
        <!-- Left col -->
        <div class="left-col">
          <FormSection title="Product Information">
            <div class="info-list">
              <div class="info-row">
                <span class="info-label">Name</span>
                <span class="info-value">{{ product.name }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">SKU</span>
                <span class="info-value info-mono">{{ product.sku }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Stock</span>
                <StockBadge :stock="product.stock" />
              </div>
              <div class="info-row">
                <span class="info-label">Status</span>
                <StatusBadge :active="product.is_active" />
              </div>
            </div>
          </FormSection>

          <FormSection title="Pricing Per Category">
            <div class="price-list">
              <div
                v-for="p in product.prices"
                :key="p.category"
                class="price-row"
              >
                <div class="price-cat">
                  <span
                    class="price-cat__dot"
                    :style="{ background: categoryColors[p.category] }"
                  />
                  <span
                    class="price-cat__name"
                    :style="{ color: categoryColors[p.category] }"
                  >
                    {{ p.category }}
                  </span>
                </div>
                <span class="price-val">{{ formatRupiah(p.price) }}</span>
              </div>
            </div>
          </FormSection>
        </div>

        <!-- Right: summary -->
        <div class="summary-card">
          <div class="summary-header">
            <div class="summary-icon">
              <svg
                width="22"
                height="22"
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
            <div>
              <p class="summary-name">{{ product.name }}</p>
              <p class="summary-sku">{{ product.sku }}</p>
            </div>
          </div>

          <div class="summary-stats">
            <div class="summary-stat">
              <p class="summary-stat__val">{{ product.stock }}</p>
              <p class="summary-stat__lbl">Units in Stock</p>
            </div>
            <div class="summary-stat">
              <p
                class="summary-stat__val"
                :style="{ color: product.is_active ? '#16a34a' : '#94a3b8' }"
              >
                {{ product.is_active ? "Active" : "Inactive" }}
              </p>
              <p class="summary-stat__lbl">Status</p>
            </div>
          </div>

          <div class="summary-prices">
            <p class="summary-prices__title">Price Range</p>
            <div
              v-for="p in product.prices"
              :key="p.category"
              class="summary-prices__row"
            >
              <span
                class="summary-prices__cat"
                :style="{ color: categoryColors[p.category] }"
              >
                {{ p.category }}
              </span>
              <span class="summary-prices__val">{{
                formatRupiah(p.price)
              }}</span>
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

    <ConfirmDialog
      v-model="showDeleteConfirm"
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
  transition: color 0.15s;
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

.price-list {
  display: flex;
  flex-direction: column;
}
.price-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
  flex-shrink: 0;
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

.summary-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: sticky;
  top: 80px;
}
.summary-header {
  display: flex;
  align-items: center;
  gap: 12px;
}
.summary-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: #f1f5f9;
  color: #475569;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.summary-name {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 2px;
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
  gap: 10px;
}
.summary-stat {
  background: #f8fafc;
  border-radius: 8px;
  padding: 12px;
  text-align: center;
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
.summary-prices__cat {
  font-weight: 600;
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
  padding: 9px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #475569;
  text-decoration: none;
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
</style>
