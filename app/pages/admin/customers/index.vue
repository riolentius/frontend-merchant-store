<script setup lang="ts">
definePageMeta({ layout: "dashboard" });

interface Customer {
  id: string;
  firstName: string;
  lastName?: string;
  email?: string; // ← made optional (migrated data has nulls — fixes the crash)
  phone?: string;
  categoryId?: string;
  createdAt: string;
}

const { $api } = useNuxtApp();
const { fetchCategories, getCategoryName } = useCategories();
const router = useRouter();

const customers = ref<Customer[]>([]);
const isLoading = ref(true);
const search = ref("");
const showConfirm = ref(false);
const deleteTarget = ref<string | null>(null);

// server-side pagination state
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
    });
    if (search.value.trim()) params.set("search", search.value.trim());

    const res = await $api<{ items: Customer[]; total: number }>(
      `/customers?${params.toString()}`,
    );
    customers.value = res.items ?? [];
    total.value = res.total ?? 0;
  } catch (err) {
    console.error("Failed to load customers:", err);
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  await fetchCategories();
  await load();
});

// page change → refetch
watch(page, load);

// debounced search → reset to page 1, refetch server-side
let searchTimer: ReturnType<typeof setTimeout>;
watch(search, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    page.value = 1;
    load();
  }, 350);
});

const fullName = (c: Customer) =>
  [c.firstName, c.lastName].filter(Boolean).join(" ");

const confirmDelete = (id: string) => {
  deleteTarget.value = id;
  showConfirm.value = true;
};

const doDelete = async () => {
  // TODO: DELETE /customers/:id when backend supports it
  customers.value = customers.value.filter((c) => c.id !== deleteTarget.value);
  showConfirm.value = false;
  deleteTarget.value = null;
};

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
      title="Customers"
      subtitle="Manage customers and their pricing categories"
    >
      <template #action>
        <NuxtLink to="/admin/customers/add" class="btn-primary">
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
          Add Customer
        </NuxtLink>
      </template>
    </PageHeader>

    <DataCard :loading="isLoading" :skeleton-rows="6">
      <template #toolbar>
        <SearchInput
          v-model="search"
          placeholder="Search by name, email or phone…"
        />
        <span>{{ total }} customers</span>
      </template>

      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="customers.length === 0">
              <td colspan="6" class="empty-row">No customers found</td>
            </tr>
            <tr v-for="c in customers" :key="c.id">
              <td class="td-name">{{ fullName(c) }}</td>
              <td class="td-muted">{{ c.email }}</td>
              <td class="td-mono">{{ c.phone ?? "—" }}</td>
              <td class="td-muted">{{ formatDate(c.createdAt) }}</td>
              <td>
                <ActionButtons
                  @view="router.push(`/admin/customers/${c.id}`)"
                  @edit="router.push(`/admin/customers/${c.id}/edit`)"
                  @delete="confirmDelete(c.id)"
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
      header="Delete Customer"
      :modal="true"
      :draggable="false"
      :style="{ width: '380px' }"
    >
      <p style="margin: 0; font-size: 13.5px; color: #64748b; line-height: 1.5">
        This action cannot be undone. Are you sure you want to delete this
        customer?
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
  font-size: 13.5px;
}
.data-table th {
  padding: 10px 16px;
  text-align: left;
  font-size: 11.5px;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  white-space: nowrap;
  border-bottom: 1px solid #f1f5f9;
}
.data-table td {
  padding: 13px 16px;
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
.td-muted {
  color: #64748b;
  font-size: 13px;
}
.td-mono {
  font-family: "Geist Mono", monospace;
  font-size: 13px;
  color: #334155;
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
</style>
