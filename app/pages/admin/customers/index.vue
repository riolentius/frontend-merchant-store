<script setup lang="ts">
import { mockGetCustomers } from "../../../mocks";
import type { Customer } from "../../../mocks";

definePageMeta({ layout: "dashboard" });

const customers = ref<Customer[]>([]);
const isLoading = ref(true);
const search = ref("");
const showConfirm = ref(false);
const deleteTarget = ref<number | null>(null);
const router = useRouter();

onMounted(async () => {
  customers.value = await mockGetCustomers();
  isLoading.value = false;
});

const filtered = computed(() => {
  const q = search.value.toLowerCase().trim();
  if (!q) return customers.value;
  return customers.value.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.includes(q),
  );
});

const confirmDelete = (id: number) => {
  deleteTarget.value = id;
  showConfirm.value = true;
};

const doDelete = () => {
  customers.value = customers.value.filter((c) => c.id !== deleteTarget.value);
  showConfirm.value = false;
  deleteTarget.value = null;
};
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
          placeholder="Search by name, email, phone…"
        />
        <span class="record-count"
          >{{ filtered.length }} of {{ customers.length }} customers</span
        >
      </template>

      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Category</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filtered.length === 0">
              <td colspan="7" class="empty-row">No customers found</td>
            </tr>
            <tr v-for="c in filtered" :key="c.id">
              <td class="td-id">{{ c.id }}</td>
              <td class="td-name">{{ c.name }}</td>
              <td class="td-muted">{{ c.email }}</td>
              <td class="td-mono">{{ c.phone }}</td>
              <td><CategoryBadge :category="c.category" /></td>
              <td class="td-muted">{{ c.created_at }}</td>
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
      </div>
    </DataCard>

    <ConfirmDialog
      v-model="showConfirm"
      title="Delete Customer"
      description="This action cannot be undone. Are you sure you want to delete this customer?"
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
</style>
