<script setup lang="ts">
const route = useRoute();
const { user } = useAuth();

const breadcrumbs = computed(() => {
  const segments = route.path.split("/").filter(Boolean);
  return segments.map((seg, i) => ({
    label: seg.charAt(0).toUpperCase() + seg.slice(1),
    to: "/" + segments.slice(0, i + 1).join("/"),
    last: i === segments.length - 1,
  }));
});

const userInitials = computed(() =>
  (user.value?.username || "A").slice(0, 2).toUpperCase(),
);

const emit = defineEmits<{ (e: "toggle-sidebar"): void }>();
</script>

<template>
  <header class="topbar">
    <!-- Left: breadcrumb -->
    <div class="topbar__left">
      <button
        class="topbar__menu-btn"
        @click="emit('toggle-sidebar')"
        aria-label="Toggle menu"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <nav class="topbar__breadcrumb" aria-label="breadcrumb">
        <template v-for="(crumb, i) in breadcrumbs" :key="crumb.to">
          <span v-if="i > 0" class="topbar__sep">/</span>
          <NuxtLink
            v-if="!crumb.last"
            :to="crumb.to"
            class="topbar__crumb-link"
          >
            {{ crumb.label }}
          </NuxtLink>
          <span v-else class="topbar__crumb-cur">{{ crumb.label }}</span>
        </template>
      </nav>
    </div>

    <!-- Right: bell + user -->
    <div class="topbar__right">
      <button class="topbar__icon-btn" aria-label="Notifications">
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <span class="topbar__notif-dot" />
      </button>

      <div class="topbar__user">
        <div class="topbar__avatar">{{ userInitials }}</div>
        <span class="topbar__username">{{ user?.username || "Admin" }}</span>
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#94a3b8"
          stroke-width="2.5"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  /* Stretch full width of the right column */
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 28px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  position: sticky;
  top: 0;
  z-index: 30;
  flex-shrink: 0;
  /* Ensure it fills the parent column width */
  width: 100%;
  box-sizing: border-box;
}

/* ── Left ── */
.topbar__left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.topbar__menu-btn {
  display: none; /* hidden on desktop, shown on mobile */
  width: 32px;
  height: 32px;
  border-radius: 7px;
  background: none;
  border: 1px solid #e2e8f0;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #64748b;
  transition: background 0.15s;
  flex-shrink: 0;
}
.topbar__menu-btn:hover {
  background: #f1f5f9;
}

.topbar__breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.topbar__sep {
  color: #cbd5e1;
  user-select: none;
}
.topbar__crumb-link {
  color: #94a3b8;
  text-decoration: none;
  transition: color 0.15s;
}
.topbar__crumb-link:hover {
  color: #475569;
}
.topbar__crumb-cur {
  color: #0f172a;
  font-weight: 500;
}

/* ── Right ── */
.topbar__right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.topbar__icon-btn {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: none;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #64748b;
  position: relative;
  transition:
    background 0.15s,
    color 0.15s;
}
.topbar__icon-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.topbar__notif-dot {
  position: absolute;
  top: 7px;
  right: 7px;
  width: 6px;
  height: 6px;
  background: #ef4444;
  border-radius: 50%;
  border: 1.5px solid #fff;
}

.topbar__user {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px 4px 5px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  background: none;
  transition: background 0.15s;
}
.topbar__user:hover {
  background: #f8fafc;
}

.topbar__avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: linear-gradient(145deg, #3b82f6, #1d4ed8);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  text-transform: uppercase;
  flex-shrink: 0;
}

.topbar__username {
  font-size: 13px;
  font-weight: 500;
  color: #0f172a;
}

/* ── Mobile ── */
@media (max-width: 768px) {
  .topbar {
    padding: 0 16px;
  }
  .topbar__menu-btn {
    display: flex;
  }
}
</style>
