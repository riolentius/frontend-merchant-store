<script setup lang="ts">
definePageMeta({ layout: "dashboard" });

const { isLoading, stats, recentTransactions, lowStockProducts } =
  useDashboard();

const statusClass = (status: string) => ({
  "badge-pending": status === "pending",
  "badge-fulfilled": status === "fulfilled",
  "badge-cancelled": status === "cancelled",
});

const paymentClass = (status: string) => ({
  "badge-paid": status === "paid",
  "badge-partial": status === "partial",
  "badge-unpaid": status === "unpaid",
  "badge-over": status === "overpaid",
});

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

const iconPaths: Record<string, string> = {
  revenue: "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  customers:
    "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  pending: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  products:
    "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
};
</script>

<template>
  <div class="dash-root">
    <div class="dash-header">
      <div>
        <h1 class="dash-title">Dashboard</h1>
        <p class="dash-sub">Welcome back — here's what's happening today.</p>
      </div>
      <div class="dash-date">
        {{
          new Date().toLocaleDateString("id-ID", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        }}
      </div>
    </div>

    <!-- Stat cards -->
    <div class="stat-grid">
      <template v-if="isLoading">
        <div v-for="i in 4" :key="i" class="stat-card stat-skeleton" />
      </template>
      <template v-else>
        <div
          v-for="card in stats"
          :key="card.label"
          class="stat-card"
          :class="`stat-card--${card.color}`"
        >
          <div class="stat-top">
            <div class="stat-icon-wrap" :class="`stat-icon--${card.color}`">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path :d="iconPaths[card.icon]" />
              </svg>
            </div>
            <span
              v-if="card.trend"
              class="stat-trend"
              :class="card.trend.up ? 'trend-up' : 'trend-neutral'"
            >
              <svg
                v-if="card.trend.up"
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <path d="M18 15l-6-6-6 6" />
              </svg>
              {{ card.trend.value }}
            </span>
          </div>
          <p class="stat-value">{{ card.value }}</p>
          <p class="stat-label">{{ card.label }}</p>
          <p class="stat-sub">{{ card.sub }}</p>
        </div>
      </template>
    </div>

    <!-- Content grid -->
    <div class="content-grid">
      <!-- Recent Transactions -->
      <div class="panel">
        <div class="panel-head">
          <h2 class="panel-title">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
              />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            Recent Transactions
          </h2>
          <NuxtLink to="/admin/transactions" class="panel-link"
            >View all →</NuxtLink
          >
        </div>
        <div v-if="isLoading" class="table-skeleton">
          <div v-for="i in 4" :key="i" class="table-skeleton-row" />
        </div>
        <div v-else class="table-wrap">
          <table class="dash-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="tx in recentTransactions" :key="tx.id">
                <td class="td-id">#{{ tx.id }}</td>
                <td class="td-customer">{{ tx.customer_name }}</td>
                <td class="td-amount">{{ formatRupiah(tx.total) }}</td>
                <td>
                  <span class="badge" :class="statusClass(tx.status)">{{
                    tx.status
                  }}</span>
                </td>
                <td>
                  <span
                    class="badge"
                    :class="paymentClass(tx.payment_status)"
                    >{{ tx.payment_status }}</span
                  >
                </td>
                <td class="td-date">{{ formatDate(tx.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Right column -->
      <div class="right-col">
        <!-- Low Stock -->
        <div class="panel">
          <div class="panel-head">
            <h2 class="panel-title">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Low Stock
            </h2>
            <NuxtLink to="/admin/products" class="panel-link"
              >Manage →</NuxtLink
            >
          </div>
          <div v-if="isLoading" class="table-skeleton">
            <div v-for="i in 3" :key="i" class="table-skeleton-row" />
          </div>
          <div v-else-if="lowStockProducts.length === 0" class="empty-state">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>All products are well stocked</span>
          </div>
          <div v-else class="stock-list">
            <div v-for="p in lowStockProducts" :key="p.id" class="stock-item">
              <div>
                <p class="stock-name">{{ p.name }}</p>
                <p class="stock-sku">{{ p.sku }}</p>
              </div>
              <div
                class="stock-badge"
                :class="p.stock <= 10 ? 'stock-critical' : 'stock-low'"
              >
                {{ p.stock }} left
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="panel">
          <div class="panel-head">
            <h2 class="panel-title">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              Quick Actions
            </h2>
          </div>
          <div class="actions-grid">
            <NuxtLink to="/admin/transactions/add" class="action-btn">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Transaction
            </NuxtLink>
            <NuxtLink to="/admin/customers/add" class="action-btn">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
              Add Customer
            </NuxtLink>
            <NuxtLink to="/admin/products/add" class="action-btn">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8"
                />
                <line x1="12" y1="22" x2="12" y2="12" />
              </svg>
              Add Product
            </NuxtLink>
            <NuxtLink to="/admin/payments" class="action-btn">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
              Payments
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<!-- No <style scoped> — all styles live in app/assets/css/dashboard-page.css -->
