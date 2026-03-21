<script setup lang="ts">
import { mockGetCustomer } from "~/mocks";
import type { Customer } from "~/mocks";

definePageMeta({ layout: "dashboard" });

const route = useRoute();
const router = useRouter();
const id = Number(route.params.id);

const customer = ref<Customer | null>(null);
const isLoading = ref(true);
const notFound = ref(false);
const showDeleteConfirm = ref(false);

onMounted(async () => {
  try {
    customer.value = await mockGetCustomer(id);
  } catch {
    notFound.value = true;
  } finally {
    isLoading.value = false;
  }
});

const doDelete = () => router.push("/admin/customers");
</script>

<template>
  <div class="page">
    <PageHeader
      :title="isLoading ? 'Loading…' : (customer?.name ?? 'Customer Not Found')"
      subtitle="Customer details"
    >
      <template #action>
        <div class="header-actions">
          <NuxtLink
            v-if="customer"
            :to="`/admin/customers/${id}/edit`"
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
            v-if="customer"
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
          <NuxtLink to="/admin/customers" class="btn-ghost">← Back</NuxtLink>
        </div>
      </template>
    </PageHeader>

    <div v-if="notFound" class="not-found">
      <p>Customer #{{ id }} was not found.</p>
      <NuxtLink to="/admin/customers" class="btn-secondary"
        >← Back to Customers</NuxtLink
      >
    </div>

    <DataCard v-else-if="isLoading" :loading="true" :skeleton-rows="4" />

    <template v-else-if="customer">
      <div class="detail-grid">
        <FormSection title="Customer Information">
          <div class="info-list">
            <div class="info-row">
              <span class="info-label">Full Name</span
              ><span class="info-value">{{ customer.name }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Email</span
              ><span class="info-value">{{ customer.email }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Phone</span
              ><span class="info-value info-mono">{{ customer.phone }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Category</span
              ><CategoryBadge :category="customer.category" />
            </div>
            <div class="info-row">
              <span class="info-label">Joined</span
              ><span class="info-value">{{ customer.created_at }}</span>
            </div>
          </div>
        </FormSection>

        <div class="summary-card">
          <div class="summary-avatar">
            {{ customer.name.slice(0, 2).toUpperCase() }}
          </div>
          <p class="summary-name">{{ customer.name }}</p>
          <CategoryBadge :category="customer.category" />
          <div class="summary-stats">
            <div class="summary-stat">
              <p class="summary-stat__val">—</p>
              <p class="summary-stat__lbl">Transactions</p>
            </div>
            <div class="summary-stat">
              <p class="summary-stat__val">—</p>
              <p class="summary-stat__lbl">Total Spent</p>
            </div>
          </div>
          <NuxtLink
            :to="`/admin/customers/${id}/edit`"
            class="summary-edit-btn"
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
            Edit this customer
          </NuxtLink>
        </div>
      </div>
    </template>

    <ConfirmDialog
      v-model="showDeleteConfirm"
      title="Delete Customer"
      description="This will permanently delete this customer. This action cannot be undone."
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
  grid-template-columns: 1fr 260px;
  gap: 16px;
  align-items: start;
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
.summary-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(145deg, #3b82f6, #1d4ed8);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  text-transform: uppercase;
}
.summary-name {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
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
</style>
