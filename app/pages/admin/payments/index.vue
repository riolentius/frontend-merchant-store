<script setup lang="ts">
import { mockGetTransactions } from "~/mocks";
import type { Transaction, Payment } from "~/mocks";

definePageMeta({ layout: "dashboard" });

interface PaymentRow extends Payment {
  transaction_id: number;
  customer_name: string;
  transaction_total: number;
}

const rows = ref<PaymentRow[]>([]);
const isLoading = ref(true);
const search = ref("");
const filterMethod = ref<"all" | "cash" | "transfer">("all");
const router = useRouter();

onMounted(async () => {
  const transactions = await mockGetTransactions();
  rows.value = transactions
    .flatMap((t) =>
      t.payments.map((p) => ({
        ...p,
        transaction_id: t.id,
        customer_name: t.customer_name,
        transaction_total: t.total,
      })),
    )
    .sort(
      (a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime(),
    );
  isLoading.value = false;
});

const filtered = computed(() => {
  let list = rows.value;
  if (filterMethod.value !== "all")
    list = list.filter((r) => r.method === filterMethod.value);
  const q = search.value.toLowerCase().trim();
  if (!q) return list;
  return list.filter(
    (r) =>
      r.customer_name.toLowerCase().includes(q) ||
      String(r.transaction_id).includes(q),
  );
});

// Summary stats
const totalCollected = computed(() =>
  rows.value.reduce((s, r) => s + r.amount, 0),
);
const totalCash = computed(() =>
  rows.value
    .filter((r) => r.method === "cash")
    .reduce((s, r) => s + r.amount, 0),
);
const totalTransfer = computed(() =>
  rows.value
    .filter((r) => r.method === "transfer")
    .reduce((s, r) => s + r.amount, 0),
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
      title="Payments"
      subtitle="All recorded payments across transactions"
    >
      <template #action>
        <NuxtLink to="/admin/payments/add" class="btn-primary">
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
          Add Payment
        </NuxtLink>
      </template>
    </PageHeader>

    <!-- Summary strip -->
    <div class="summary-strip">
      <div class="strip-card">
        <p class="strip-val">{{ formatRupiah(totalCollected) }}</p>
        <p class="strip-lbl">Total Collected</p>
      </div>
      <div class="strip-card strip-card--cash">
        <p class="strip-val">{{ formatRupiah(totalCash) }}</p>
        <p class="strip-lbl">💵 Cash</p>
      </div>
      <div class="strip-card strip-card--transfer">
        <p class="strip-val">{{ formatRupiah(totalTransfer) }}</p>
        <p class="strip-lbl">🏦 Transfer</p>
      </div>
      <div class="strip-card">
        <p class="strip-val">{{ rows.length }}</p>
        <p class="strip-lbl">Total Payments</p>
      </div>
    </div>

    <!-- Table -->
    <DataCard :loading="isLoading" :skeleton-rows="5">
      <template #toolbar>
        <div class="toolbar-left">
          <SearchInput
            v-model="search"
            placeholder="Search by customer or transaction ID…"
          />
          <div class="filter-tabs">
            <button
              v-for="f in ['all', 'cash', 'transfer'] as const"
              :key="f"
              class="filter-tab"
              :class="{ 'filter-tab--active': filterMethod === f }"
              @click="filterMethod = f"
            >
              {{
                f === "all" ? "All" : f === "cash" ? "💵 Cash" : "🏦 Transfer"
              }}
            </button>
          </div>
        </div>
        <span class="record-count"
          >{{ filtered.length }} of {{ rows.length }} payments</span
        >
      </template>

      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Payment ID</th>
              <th>Transaction</th>
              <th>Customer</th>
              <th>Method</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filtered.length === 0">
              <td colspan="7" class="empty-row">No payments found</td>
            </tr>
            <tr v-for="r in filtered" :key="r.id">
              <td class="td-id">PAY-{{ r.id }}</td>
              <td
                class="td-link"
                @click="router.push(`/admin/transactions/${r.transaction_id}`)"
              >
                #{{ r.transaction_id }}
              </td>
              <td class="td-name">{{ r.customer_name }}</td>
              <td>
                <span class="method-pill" :class="`method-pill--${r.method}`">
                  {{ r.method === "cash" ? "💵" : "🏦" }} {{ r.method }}
                </span>
              </td>
              <td><PriceDisplay :amount="r.amount" /></td>
              <td class="td-muted">{{ formatDate(r.paid_at) }}</td>
              <td>
                <button
                  class="view-btn"
                  @click="
                    router.push(`/admin/transactions/${r.transaction_id}`)
                  "
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  View Transaction
                </button>
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
.strip-card--cash {
  border-left: 3px solid #16a34a;
}
.strip-card--transfer {
  border-left: 3px solid #2563eb;
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
.td-link {
  font-family: "Geist Mono", monospace;
  font-weight: 500;
  color: #2563eb;
  cursor: pointer;
  font-size: 13px;
}
.td-link:hover {
  text-decoration: underline;
}

.method-pill {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 99px;
  font-size: 11.5px;
  font-weight: 600;
  text-transform: capitalize;
}
.method-pill--cash {
  background: #f0fdf4;
  color: #16a34a;
}
.method-pill--transfer {
  background: #eff6ff;
  color: #2563eb;
}

.empty-row {
  text-align: center;
  color: #94a3b8;
  padding: 40px !important;
}

.view-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  background: #eff6ff;
  color: #2563eb;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.12s;
  white-space: nowrap;
}
.view-btn:hover {
  background: #dbeafe;
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
