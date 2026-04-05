<script setup lang="ts">
import type { Transaction } from "../../../composables/useTransactions";

definePageMeta({ layout: "dashboard" });

const { $api } = useNuxtApp();
const { formatRupiah, formatDate, paymentStatusColor } = useTransactions();
const router = useRouter();

interface PaymentRow {
  id: string;
  method: string;
  amount: string;
  currency: string;
  paidAt: string;
  senderName?: string;
  reference?: string;
  status: string;
  transactionId: string;
}

const rows = ref<PaymentRow[]>([]);
const isLoading = ref(true);
const search = ref("");
const filterMethod = ref<"all" | "cash" | "transfer">("all");

onMounted(async () => {
  try {
    // Fetch all transactions then collect their payments via view
    const res = await $api<{ items: Transaction[] }>("/transactions");
    const transactions = res.items ?? [];

    // Fetch view for each transaction to get payments
    const views = await Promise.all(
      transactions.map((t) =>
        $api<any>(`/transactions/${t.id}/view`).catch(() => null),
      ),
    );

    rows.value = views
      .filter(Boolean)
      .flatMap((v) =>
        (v.payments ?? []).map((p: any) => ({
          ...p,
          transactionId: v.id,
        })),
      )
      .sort(
        (a: PaymentRow, b: PaymentRow) =>
          new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
      );
  } catch {
    rows.value = [];
  } finally {
    isLoading.value = false;
  }
});

const filtered = computed(() => {
  let list = rows.value;
  if (filterMethod.value !== "all")
    list = list.filter((r) => r.method === filterMethod.value);
  const q = search.value.toLowerCase().trim();
  if (!q) return list;
  return list.filter(
    (r) =>
      r.transactionId.toLowerCase().includes(q) ||
      r.senderName?.toLowerCase().includes(q) ||
      r.reference?.toLowerCase().includes(q),
  );
});

const totalCollected = computed(() =>
  rows.value.reduce((s, r) => s + parseFloat(r.amount), 0),
);
const totalCash = computed(() =>
  rows.value
    .filter((r) => r.method === "cash")
    .reduce((s, r) => s + parseFloat(r.amount), 0),
);
const totalTransfer = computed(() =>
  rows.value
    .filter((r) => r.method === "transfer")
    .reduce((s, r) => s + parseFloat(r.amount), 0),
);
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

    <!-- Summary -->
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

    <DataCard :loading="isLoading" :skeleton-rows="5">
      <template #toolbar>
        <div class="toolbar-left">
          <SearchInput
            v-model="search"
            placeholder="Search by transaction, sender, reference…"
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
          >{{ filtered.length }} of {{ rows.length }}</span
        >
      </template>

      <div v-if="!isLoading && rows.length === 0" class="empty-state">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.2"
        >
          <rect x="1" y="4" width="22" height="16" rx="2" />
          <line x1="1" y1="10" x2="23" y2="10" />
        </svg>
        <p>No payments recorded yet</p>
      </div>

      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Transaction</th>
              <th>Method</th>
              <th>Amount</th>
              <th>Sender</th>
              <th>Reference</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filtered.length === 0">
              <td colspan="7" class="empty-row">No payments match filters</td>
            </tr>
            <tr v-for="r in filtered" :key="r.id">
              <td
                class="td-link"
                @click="router.push(`/admin/transactions/${r.transactionId}`)"
              >
                #{{ r.transactionId.slice(0, 8) }}…
              </td>
              <td>
                <span class="method-pill" :class="`method-pill--${r.method}`">
                  {{ r.method === "cash" ? "💵" : "🏦" }} {{ r.method }}
                </span>
              </td>
              <td class="td-amount">{{ formatRupiah(r.amount) }}</td>
              <td class="td-muted">{{ r.senderName ?? "—" }}</td>
              <td class="td-mono">{{ r.reference ?? "—" }}</td>
              <td class="td-muted">{{ formatDate(r.paidAt) }}</td>
              <td>
                <button
                  class="view-btn"
                  @click="router.push(`/admin/transactions/${r.transactionId}`)"
                >
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
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 40px;
  color: #94a3b8;
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
.td-link {
  font-family: "Geist Mono", monospace;
  font-weight: 500;
  color: #2563eb;
  cursor: pointer;
}
.td-link:hover {
  text-decoration: underline;
}
.td-amount {
  font-family: "Geist Mono", monospace;
  font-weight: 500;
  color: #0f172a;
}
.td-muted {
  color: #64748b;
  font-size: 12.5px;
}
.td-mono {
  font-family: "Geist Mono", monospace;
  font-size: 12px;
  color: #64748b;
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
}
.view-btn:hover {
  background: #dbeafe;
}
@media (max-width: 1100px) {
  .summary-strip {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
