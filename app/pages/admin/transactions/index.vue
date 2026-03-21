<script setup lang="ts">
import { mockGetTransactions } from "~/mocks";
import type { Transaction } from "~/mocks";

definePageMeta({ layout: "dashboard" });

const transactions = ref<Transaction[]>([]);
const isLoading = ref(true);
const search = ref("");
const filterStatus = ref<"all" | "pending" | "fulfilled" | "cancelled">("all");
const router = useRouter();

onMounted(async () => {
  transactions.value = await mockGetTransactions();
  isLoading.value = false;
});

const filtered = computed(() => {
  let list = transactions.value;
  if (filterStatus.value !== "all")
    list = list.filter((t) => t.status === filterStatus.value);
  const q = search.value.toLowerCase().trim();
  if (!q) return list;
  return list.filter(
    (t) =>
      t.customer_name.toLowerCase().includes(q) || String(t.id).includes(q),
  );
});

// Summary stats
const totalRevenue = computed(() =>
  transactions.value
    .filter((t) => t.payment_status === "paid")
    .reduce((s, t) => s + t.total, 0),
);
const totalPending = computed(
  () => transactions.value.filter((t) => t.status === "pending").length,
);
const totalUnpaid = computed(() =>
  transactions.value.reduce((s, t) => s + (t.total - t.total_paid), 0),
);

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
</script>

<template>
  <div class="page">
    <PageHeader
      title="Transactions"
      subtitle="Manage orders, fulfillment and payment status"
    >
      <template #action>
        <NuxtLink to="/admin/transactions/add" class="btn-primary">
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
          New Transaction
        </NuxtLink>
      </template>
    </PageHeader>

    <!-- Summary strip -->
    <div class="summary-strip">
      <div class="strip-card">
        <p class="strip-val">{{ formatRupiah(totalRevenue) }}</p>
        <p class="strip-lbl">Total Collected</p>
      </div>
      <div class="strip-card strip-card--warn">
        <p class="strip-val">{{ totalPending }}</p>
        <p class="strip-lbl">Pending Orders</p>
      </div>
      <div class="strip-card strip-card--danger">
        <p class="strip-val">{{ formatRupiah(totalUnpaid) }}</p>
        <p class="strip-lbl">Outstanding Balance</p>
      </div>
      <div class="strip-card">
        <p class="strip-val">{{ transactions.length }}</p>
        <p class="strip-lbl">Total Transactions</p>
      </div>
    </div>

    <!-- Table -->
    <DataCard :loading="isLoading" :skeleton-rows="5">
      <template #toolbar>
        <div class="toolbar-left">
          <SearchInput
            v-model="search"
            placeholder="Search by customer or ID…"
          />
          <div class="filter-tabs">
            <button
              v-for="f in ['all', 'pending', 'fulfilled', 'cancelled'] as const"
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
          >{{ filtered.length }} of {{ transactions.length }}</span
        >
      </template>

      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Status</th>
              <th>Payment</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filtered.length === 0">
              <td colspan="9" class="empty-row">No transactions found</td>
            </tr>
            <tr v-for="t in filtered" :key="t.id">
              <td class="td-id">#{{ t.id }}</td>
              <td class="td-name">{{ t.customer_name }}</td>
              <td class="td-muted">
                {{ t.items.length }} item{{ t.items.length !== 1 ? "s" : "" }}
              </td>
              <td><PriceDisplay :amount="t.total" /></td>
              <td>
                <PriceDisplay
                  :amount="t.total_paid"
                  :muted="t.total_paid === 0"
                />
              </td>
              <td><TransactionBadge :status="t.status" /></td>
              <td><PaymentBadge :status="t.payment_status" /></td>
              <td class="td-muted">{{ formatDate(t.created_at) }}</td>
              <td>
                <ActionButtons
                  :hide-edit="true"
                  @view="router.push(`/admin/transactions/${t.id}`)"
                  @delete="() => {}"
                />
              </td>
            </tr>
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

/* Summary strip */
.summary-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.strip-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 16px 20px;
}
.strip-card--warn {
  border-left: 3px solid #d97706;
}
.strip-card--danger {
  border-left: 3px solid #dc2626;
}
.strip-val {
  font-size: 20px;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 3px;
  font-family: "Geist Mono", monospace;
}
.strip-lbl {
  font-size: 12px;
  color: #94a3b8;
  margin: 0;
}

/* Toolbar */
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

/* Table */
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

.td-id {
  font-family: "Geist Mono", monospace;
  font-size: 12px;
  color: #94a3b8;
}
.td-name {
  font-weight: 500;
  color: #0f172a;
}
.td-muted {
  color: #64748b;
  font-size: 12.5px;
}
.empty-row {
  text-align: center;
  color: #94a3b8;
  padding: 40px !important;
}

@media (max-width: 1100px) {
  .summary-strip {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 640px) {
  .summary-strip {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
