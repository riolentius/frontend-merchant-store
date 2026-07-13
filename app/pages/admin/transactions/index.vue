<script setup lang="ts">
import type { Transaction } from "../../../composables/useTransactions";

definePageMeta({ layout: "dashboard" });

const { canViewFinancials } = useAuth();
const { $api } = useNuxtApp();
const { formatRupiah, formatDate, statusColor, paymentStatusColor } =
  useTransactions();
const router = useRouter();

const transactions = ref<Transaction[]>([]);
const isLoading = ref(true);
const isEmpty = ref(false);
const search = ref("");
const filterStatus = ref;
"all" | "draft" | "pending" | "completed" | ("cancelled" > "all");

const page = ref(1);
const limit = ref(50);
const total = ref(0);
const totalPages = computed(() =>
  Math.max(1, Math.ceil(total.value / limit.value)),
);

const load = async () => {
  isLoading.value = true;
  try {
    const params = new URLSearchParams();
    params.set("offset", String((page.value - 1) * limit.value));
    params.set("limit", String(limit.value));

    if (search.value.trim()) params.set("search", search.value.trim());
    if (filterStatus.value && filterStatus.value !== "all") {
      params.set("status", filterStatus.value);
    }

    const res = await $api<{ items: Transaction[]; total: number }>(
      `/transactions?${params.toString()}`,
    );
    transactions.value = res.items ?? [];
    total.value = res.total ?? 0;
    isEmpty.value = total.value === 0;
  } catch (err: any) {
    transactions.value = [];
    total.value = 0;
    isEmpty.value = true;
  } finally {
    isLoading.value = false;
  }
};

onMounted(load);

watch(page, load);
watch(filterStatus, () => {
  page.value = 1;
  load();
});

let searchTimer: ReturnType<typeof setTimeout>;
watch(search, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    page.value = 1;
    load();
  }, 350);
});
</script>

<template>
  <div class="page">
    <PageHeader title="Transactions" subtitle="Manage orders and fulfillment">
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
    <div v-if="canViewFinancials" class="summary-strip">
      <div class="strip-card">
        <p class="strip-val">{{ formatRupiah(totalRevenue) }}</p>
        <p class="strip-lbl">Completed Revenue</p>
      </div>
      <div class="strip-card strip-card--warn">
        <p class="strip-val">{{ pendingCount }}</p>
        <p class="strip-lbl">Pending Orders</p>
      </div>
      <div class="strip-card">
        <p class="strip-val">{{ draftCount }}</p>
        <p class="strip-lbl">Draft Orders</p>
      </div>
      <div class="strip-card">
        <p class="strip-val">{{ transactions.length }}</p>
        <p class="strip-lbl">Total Transactions</p>
      </div>
    </div>

    <DataCard :loading="isLoading" :skeleton-rows="5">
      <template #toolbar>
        <div class="toolbar-left">
          <SearchInput
            v-model="search"
            placeholder="Search by transaction ID…"
          />
          <div class="filter-tabs">
            <button
              v-for="f in [
                'all',
                'draft',
                'pending',
                'completed',
                'cancelled',
              ] as const"
              :key="f"
              class="filter-tab"
              :class="{ 'filter-tab--active': filterStatus === f }"
              @click="filterStatus = f"
            >
              {{ f.charAt(0).toUpperCase() + f.slice(1) }}
            </button>
          </div>
        </div>
        <span>{{ total }} transactions</span>
      </template>

      <!-- Empty state -->
      <div v-if="!isLoading && transactions.length === 0" class="empty-state">
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.2"
        >
          <path
            d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
          />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <p>No transactions yet</p>
        <NuxtLink
          to="/admin/transactions/add"
          class="btn-primary btn-primary--sm"
        >
          Create first transaction
        </NuxtLink>
      </div>

      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="transactions.length === 0">
              <td colspan="7" class="empty-row">
                No transactions match filters
              </td>
            </tr>
            <tr v-for="t in transactions" :key="t.id">
              <td class="td-id">{{ t.id.slice(0, 8) }}…</td>
              <td class="td-customer">{{ t.customerName || "—" }}</td>
              <td class="td-muted">{{ t.items?.length ?? 0 }} item(s)</td>
              <td class="td-amount">{{ formatRupiah(t.totalAmount) }}</td>
              <td>
                <span class="status-badge" :style="statusColor(t.status)">
                  {{ t.status }}
                </span>
              </td>
              <td class="td-muted">{{ formatDate(t.createdAt) }}</td>
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
.btn-primary--sm {
  font-size: 13px;
  padding: 7px 14px;
}
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
  padding: 4px 10px;
  border: none;
  background: none;
  border-radius: 5px;
  font-size: 12px;
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
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px;
  color: #94a3b8;
}
.empty-state p {
  font-size: 14px;
  margin: 0;
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
.td-id {
  font-family: "Geist Mono", monospace;
  font-size: 12px;
  color: #64748b;
}
.td-muted {
  color: #64748b;
  font-size: 12.5px;
}
.td-amount {
  font-family: "Geist Mono", monospace;
  font-weight: 500;
  color: #0f172a;
}
.status-badge {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 99px;
  font-size: 11.5px;
  font-weight: 600;
  text-transform: capitalize;
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
@media (max-width: 1100px) {
  .summary-strip {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
