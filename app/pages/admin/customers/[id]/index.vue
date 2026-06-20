<script setup lang="ts">
import type { CustomerTxn } from "../../../../composables/useCustomerTransactions";

definePageMeta({ layout: "dashboard" });

const { $api } = useNuxtApp();
const { fetchCategories, getCategoryName } = useCategories();
const { formatRupiah, formatDate, statusColor } = useTransactions();
const { fetchForCustomer } = useCustomerTransactions();
const { notifyError } = useNotify();
const route = useRoute();
const router = useRouter();
const id = route.params.id as string;

interface Address {
  id: string;
  label?: string;
  addressLine1: string;
  addressLine2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country: string;
  isDefault: boolean;
}
interface Customer {
  id: string;
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  categoryId?: string;
  createdAt: string;
}

const customer = ref<Customer | null>(null);
const addresses = ref<Address[]>([]);
const isLoading = ref(true);
const notFound = ref(false);
const showDeleteConfirm = ref(false);
const showDeleteAddrConfirm = ref(false);
const deleteAddrTarget = ref<string | null>(null);

const txns = ref<CustomerTxn[]>([]);
const totalOutstanding = ref("0");
const txnLoading = ref(true);

const paidPct = (t: CustomerTxn) => {
  const total = parseFloat(t.totalAmount);
  if (!total) return 0;
  return Math.min(100, Math.round((parseFloat(t.paidAmount) / total) * 100));
};

const fullName = (c: Customer) =>
  [c.firstName, c.lastName].filter(Boolean).join(" ");

const formatAddress = (a: Address) =>
  [a.addressLine1, a.addressLine2, a.city, a.province, a.postalCode, a.country]
    .filter(Boolean)
    .join(", ");

onMounted(async () => {
  await fetchCategories();
  try {
    const [c, a] = await Promise.all([
      $api<Customer>(`/customers/${id}`),
      $api<{ items: Address[] }>(`/customers/${id}/addresses`),
    ]);
    customer.value = c;
    addresses.value = a.items ?? [];
  } catch {
    notFound.value = true;
  } finally {
    isLoading.value = false;
  }

  // Transactions load independently — failure here shouldn't 404 the page
  try {
    const res = await fetchForCustomer(id);
    txns.value = res.items ?? [];
    totalOutstanding.value = res.totalOutstanding ?? "0";
  } catch (err) {
    notifyError(err, "Failed to load transactions");
  } finally {
    txnLoading.value = false;
  }
});

const confirmDeleteAddr = (addrId: string) => {
  deleteAddrTarget.value = addrId;
  showDeleteAddrConfirm.value = true;
};

const doDeleteAddr = async () => {
  if (!deleteAddrTarget.value) return;
  try {
    await $api(`/customers/${id}/addresses/${deleteAddrTarget.value}`, {
      method: "DELETE",
    });
    addresses.value = addresses.value.filter(
      (a) => a.id !== deleteAddrTarget.value,
    );
  } catch (err) {
    notifyError(err, "Failed to delete address");
  } finally {
    showDeleteAddrConfirm.value = false;
    deleteAddrTarget.value = null;
  }
};

const doDelete = () => router.push("/admin/customers");
</script>

<template>
  <div class="page">
    <PageHeader
      :title="
        isLoading ? 'Loading…' : customer ? fullName(customer) : 'Not Found'
      "
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
            </svg>
            Delete
          </button>
          <NuxtLink to="/admin/customers" class="btn-ghost">← Back</NuxtLink>
        </div>
      </template>
    </PageHeader>

    <div v-if="notFound" class="not-found">
      <p>Customer not found.</p>
      <NuxtLink to="/admin/customers" class="btn-secondary">← Back</NuxtLink>
    </div>

    <DataCard v-else-if="isLoading" :loading="true" :skeleton-rows="4" />

    <template v-else-if="customer">
      <div class="detail-grid">
        <div class="left-col">
          <!-- Info -->
          <FormSection title="Customer Information">
            <div class="info-list">
              <div class="info-row">
                <span class="info-label">Full Name</span
                ><span class="info-value">{{ fullName(customer) }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Email</span
                ><span class="info-value">{{ customer.email }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Phone</span
                ><span class="info-value">{{ customer.phone ?? "—" }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Category</span>
                <CategoryBadge
                  v-if="customer.categoryId"
                  :category="getCategoryName(customer.categoryId)"
                />
                <span v-else class="info-value">—</span>
              </div>
              <div class="info-row">
                <span class="info-label">Joined</span
                ><span class="info-value">{{
                  formatDate(customer.createdAt)
                }}</span>
              </div>
            </div>
          </FormSection>

          <!-- Addresses -->
          <FormSection title="Addresses">
            <div v-if="addresses.length === 0" class="empty-state">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              No addresses yet
            </div>
            <div v-else class="addr-list">
              <div v-for="addr in addresses" :key="addr.id" class="addr-card">
                <div class="addr-card__head">
                  <div class="addr-card__label-wrap">
                    <span class="addr-card__label">{{
                      addr.label || "Address"
                    }}</span>
                    <span v-if="addr.isDefault" class="default-badge"
                      >Default</span
                    >
                  </div>
                  <button
                    class="addr-delete-btn"
                    @click="confirmDeleteAddr(addr.id)"
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
                    </svg>
                  </button>
                </div>
                <p class="addr-card__text">{{ formatAddress(addr) }}</p>
              </div>
            </div>
          </FormSection>

          <FormSection
            title="Transactions"
            subtitle="Orders and outstanding balance for this customer"
          >
            <div v-if="txnLoading" class="ct-empty">Loading…</div>
            <div v-else-if="txns.length === 0" class="ct-empty">
              No transactions yet.
            </div>
            <div v-else class="ct-list">
              <NuxtLink
                v-for="t in txns"
                :key="t.id"
                :to="`/admin/transactions/${t.id}`"
                class="ct-row"
              >
                <div class="ct-row__top">
                  <span class="ct-id">#{{ t.id.slice(0, 8) }}</span>
                  <span class="ct-status" :style="statusColor(t.status)">{{
                    t.status
                  }}</span>
                  <span class="ct-date">{{ formatDate(t.createdAt) }}</span>
                </div>
                <div class="ct-row__mid">
                  <span class="ct-paid">
                    {{ formatRupiah(t.totalAmount) }} total ·
                    <span class="ct-paid-amt"
                      >{{ formatRupiah(t.paidAmount) }} paid</span
                    >
                  </span>
                  <span
                    class="ct-due"
                    :class="
                      parseFloat(t.balanceDue) > 0
                        ? 'ct-due--open'
                        : 'ct-due--settled'
                    "
                  >
                    {{
                      parseFloat(t.balanceDue) > 0
                        ? `${formatRupiah(t.balanceDue)} due`
                        : "Settled"
                    }}
                  </span>
                </div>
                <div class="ct-bar">
                  <div
                    class="ct-bar__fill"
                    :style="{ width: paidPct(t) + '%' }"
                  />
                </div>
              </NuxtLink>
            </div>

            <div v-if="txns.length > 0" class="ct-footer">
              <span>Total outstanding</span>
              <span class="ct-footer__val">{{
                formatRupiah(totalOutstanding)
              }}</span>
            </div>
          </FormSection>
        </div>

        <!-- Summary -->
        <div class="summary-card">
          <div class="summary-avatar">
            {{ customer.firstName.slice(0, 2).toUpperCase() }}
          </div>
          <p class="summary-name">{{ fullName(customer) }}</p>
          <CategoryBadge
            v-if="customer.categoryId"
            :category="getCategoryName(customer.categoryId)"
          />
          <div class="summary-stat">
            <p class="summary-stat__val">
              {{ txnLoading ? "…" : txns.length }}
            </p>
            <p class="summary-stat__lbl">Transactions</p>
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
            Edit customer
          </NuxtLink>
        </div>
      </div>
    </template>

    <Dialog
      v-model:visible="showDeleteConfirm"
      header="Delete Customer"
      :modal="true"
      :draggable="false"
      :style="{ width: '380px' }"
    >
      <p style="margin: 0; font-size: 13.5px; color: #64748b; line-height: 1.5">
        This will permanently delete this customer.
      </p>
      <template #footer>
        <div style="display: flex; gap: 8px">
          <Button
            label="Cancel"
            severity="secondary"
            outlined
            fluid
            @click="showDeleteConfirm = false"
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

    <Dialog
      v-model:visible="showDeleteAddrConfirm"
      header="Delete Address"
      :modal="true"
      :draggable="false"
      :style="{ width: '380px' }"
    >
      <p style="margin: 0; font-size: 13.5px; color: #64748b; line-height: 1.5">
        Remove this address from the customer?
      </p>
      <template #footer>
        <div style="display: flex; gap: 8px">
          <Button
            label="Cancel"
            severity="secondary"
            outlined
            fluid
            @click="showDeleteAddrConfirm = false"
          />
          <Button
            label="Yes, Delete"
            severity="danger"
            fluid
            @click="doDeleteAddr"
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

/* Address list */
.empty-state {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 16px 0;
  font-size: 13px;
  color: #94a3b8;
}
.addr-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.addr-card {
  border: 1px solid #e2e8f0;
  border-radius: 9px;
  padding: 14px;
}
.addr-card__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.addr-card__label-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}
.addr-card__label {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}
.default-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 7px;
  background: #eff6ff;
  color: #2563eb;
  border-radius: 99px;
}
.addr-card__text {
  font-size: 13px;
  color: #64748b;
  line-height: 1.5;
  margin: 0;
}
.addr-delete-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #94a3b8;
  padding: 4px;
  border-radius: 4px;
  transition: color 0.15s;
}
.addr-delete-btn:hover {
  color: #dc2626;
}

/* Summary */
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

.ct-list {
  display: flex;
  flex-direction: column;
}
.ct-row {
  display: block;
  text-decoration: none;
  padding: 12px 0;
  border-bottom: 1px solid #f1f5f9;
}
.ct-row:last-child {
  border-bottom: none;
}
.ct-row__top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}
.ct-id {
  font-family: "Geist Mono", monospace;
  font-size: 12.5px;
  color: #64748b;
}
.ct-status {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 99px;
  text-transform: capitalize;
}
.ct-date {
  margin-left: auto;
  font-size: 11.5px;
  color: #94a3b8;
}
.ct-row__mid {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 13px;
}
.ct-paid {
  color: #64748b;
}
.ct-paid-amt {
  color: #16a34a;
}
.ct-due {
  font-family: "Geist Mono", monospace;
  font-size: 13px;
  font-weight: 600;
}
.ct-due--open {
  color: #b45309;
}
.ct-due--settled {
  color: #16a34a;
}
.ct-bar {
  height: 5px;
  background: #f1f5f9;
  border-radius: 99px;
  overflow: hidden;
  margin-top: 8px;
}
.ct-bar__fill {
  height: 100%;
  background: #2563eb;
  border-radius: 99px;
}
.ct-empty {
  color: #94a3b8;
  font-size: 13px;
  padding: 14px 0;
}
.ct-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 0 4px;
  margin-top: 6px;
  border-top: 1px solid #e2e8f0;
  font-size: 13px;
  color: #64748b;
}
.ct-footer__val {
  font-family: "Geist Mono", monospace;
  font-size: 16px;
  font-weight: 600;
  color: #b45309;
}
</style>
