<script setup lang="ts">
const props = defineProps<{ isOpen: boolean }>();
const emit = defineEmits<{ (e: "close"): void }>();

const route = useRoute();
const { user, logout } = useAuth();

const navItems = [
  {
    section: "Overview",
    items: [{ label: "Dashboard", to: "/admin", icon: "grid" }],
  },
  {
    section: "Manage",
    items: [
      { label: "Transactions", to: "/admin/transactions", icon: "file-text" },
      { label: "Payments", to: "/admin/payments", icon: "credit-card" },
      { label: "Customers", to: "/admin/customers", icon: "users" },
      { label: "Products", to: "/admin/products", icon: "package" },
      { label: "Prices", to: "/admin/prices", icon: "tag" },
    ],
  },
];

const isActive = (path: string) =>
  path === "/admin" ? route.path === "/admin" : route.path.startsWith(path);

const icons: Record<string, string> = {
  grid: "M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z",
  "file-text":
    "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8m8 4H8m2-8H8",
  "credit-card": "M1 4h22v16H1zM1 10h22",
  users:
    "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  package:
    "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12",
  tag: "M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01",
  "log-out": "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
};

const userInitials = computed(() =>
  (user.value?.username || "A").slice(0, 2).toUpperCase(),
);
</script>

<template>
  <aside :class="['sidebar', { 'sidebar--open': props.isOpen }]">
    <!-- Brand -->
    <NuxtLink to="/admin" class="sidebar__brand" @click="emit('close')">
      <div class="sidebar__brand-icon">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
          <path
            d="M3 10L8 15L17 5"
            stroke="white"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
      <div>
        <p class="sidebar__brand-name">Cahaya Gading</p>
        <p class="sidebar__brand-sub">Admin Panel</p>
      </div>
    </NuxtLink>

    <!-- Nav -->
    <nav class="sidebar__nav">
      <template v-for="group in navItems" :key="group.section">
        <p class="sidebar__section">{{ group.section }}</p>
        <NuxtLink
          v-for="item in group.items"
          :key="item.to"
          :to="item.to"
          :class="[
            'sidebar__item',
            { 'sidebar__item--active': isActive(item.to) },
          ]"
          @click="emit('close')"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path :d="icons[item.icon]" />
          </svg>
          {{ item.label }}
        </NuxtLink>
      </template>
    </nav>

    <!-- Footer -->
    <div class="sidebar__footer">
      <div class="sidebar__user">
        <div class="sidebar__avatar">{{ userInitials }}</div>
        <div>
          <p class="sidebar__username">{{ user?.username || "Admin" }}</p>
          <p class="sidebar__role">{{ user?.role || "admin" }}</p>
        </div>
      </div>
      <button class="sidebar__logout" @click="logout">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path :d="icons['log-out']" />
        </svg>
        Sign out
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 220px;
  min-height: 100vh;
  background: #0f172a;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 40;
  transition: transform 0.25s ease;
}

.sidebar__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  text-decoration: none;
}

.sidebar__brand-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: linear-gradient(145deg, #3b82f6, #1d4ed8);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.4);
}

.sidebar__brand-name {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  margin: 0;
  line-height: 1.2;
}

.sidebar__brand-sub {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.3);
  margin: 2px 0 0;
  letter-spacing: 0.04em;
}

.sidebar__nav {
  flex: 1;
  padding: 12px 0;
  overflow-y: auto;
}

.sidebar__section {
  font-size: 10px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.25);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 12px 20px 6px;
  margin: 0;
}

.sidebar__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 20px;
  font-size: 13.5px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.55);
  text-decoration: none;
  position: relative;
  transition:
    color 0.15s,
    background 0.15s;
}

.sidebar__item svg {
  color: rgba(255, 255, 255, 0.3);
  flex-shrink: 0;
  transition: color 0.15s;
}

.sidebar__item:hover {
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.06);
}
.sidebar__item:hover svg {
  color: rgba(255, 255, 255, 0.7);
}

.sidebar__item--active {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
  font-weight: 500;
}
.sidebar__item--active svg {
  color: rgba(255, 255, 255, 0.9);
}
.sidebar__item--active::before {
  content: "";
  position: absolute;
  left: 0;
  top: 6px;
  bottom: 6px;
  width: 3px;
  background: #3b82f6;
  border-radius: 0 2px 2px 0;
}

.sidebar__footer {
  padding: 16px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.sidebar__user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
}

.sidebar__avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: linear-gradient(145deg, #3b82f6, #1d4ed8);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  flex-shrink: 0;
  text-transform: uppercase;
}

.sidebar__username {
  font-size: 12.5px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.85);
  margin: 0;
}
.sidebar__role {
  font-size: 10.5px;
  color: rgba(255, 255, 255, 0.3);
  margin: 2px 0 0;
  text-transform: capitalize;
}

.sidebar__logout {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  font-size: 12.5px;
  color: rgba(255, 255, 255, 0.35);
  background: none;
  border: none;
  cursor: pointer;
  width: 100%;
  font-family: inherit;
  transition: color 0.15s;
}

.sidebar__logout:hover {
  color: #f87171;
}

@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
  }
  .sidebar--open {
    transform: translateX(0);
  }
}
</style>
