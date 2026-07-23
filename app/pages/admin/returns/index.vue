<script setup lang="ts">
import type { Transaction } from "../../../composables/useTransactions";

definePageMeta({ layout: "dashboard" });

const { $api } = useNuxtApp();
const { formatRupiah, formatDate } = useTransactions();
const router = useRouter();

const transactions = ref<Transaction[]>([]);
const isLoading = ref(true);
const search = ref("");
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
      status: "completed", // only fulfilled orders can be returned
    });
    if (search.value.trim()) params.set("search", search.value.trim());

    const res = await $api<{ items: Transaction[]; total: number }>(
      `/transactions?${params.toString()}`,
    );
    transactions.value = res.items ?? [];
    total.value = res.total ?? 0;
  } catch (err) {
    console.error("Failed to load transactions:", err);
  } finally {
    isLoading.value = false;
  }
};

onMounted(load);
watch(page, load);

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
    <PageHeader
      title="Returns"
      subtitle="Select a fulfilled transaction to record a return"
    />

    <DataCard :loading="isLoading" :skeleton-rows="5">
      <template #toolbar>
        <SearchInput
          v-model="search"
          placeholder="Search invoice or customer…"
        />
        <span>{{ total }} fulfilled transactions</span>
      </template>

      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Customer</th>
              <th>Total</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="transactions.length === 0">
              <td colspan="5" class="empty-row">
                No fulfilled transactions found
              </td>
            </tr>
            <tr v-for="tx in transactions" :key="tx.id">
              <td class="td-id">#{{ tx.id.slice(0, 8) }}…</td>
              <td>{{ tx.customerName }}</td>
              <td class="td-amount">{{ formatRupiah(tx.totalAmount) }}</td>
              <td class="td-date">{{ formatDate(tx.createdAt) }}</td>
              <td>
                <button
                  class="btn-return"
                  @click="router.push(`/admin/returns/${tx.id}`)"
                >
                  Record Return →
                </button>
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
.td-amount {
  font-family: "Geist Mono", monospace;
  font-weight: 500;
}
.td-date {
  color: #64748b;
  font-size: 12.5px;
}
.empty-row {
  text-align: center;
  color: #94a3b8;
  padding: 40px !important;
}
.btn-return {
  padding: 6px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 7px;
  background: #fff;
  font-size: 12.5px;
  font-weight: 500;
  color: #2563eb;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  transition:
    background 0.15s,
    border-color 0.15s;
}
.btn-return:hover {
  background: #eff6ff;
  border-color: #bfdbfe;
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
</style>
