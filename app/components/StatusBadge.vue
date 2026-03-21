<script setup lang="ts">
defineProps<{ active: boolean }>();
</script>

<template>
  <span
    class="status-badge"
    :class="active ? 'status-badge--active' : 'status-badge--inactive'"
  >
    <span class="status-badge__dot" />
    {{ active ? "Active" : "Inactive" }}
  </span>
</template>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 99px;
  font-size: 11.5px;
  font-weight: 600;
  white-space: nowrap;
}
.status-badge__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}
.status-badge--active {
  background: #f0fdf4;
  color: #16a34a;
}
.status-badge--active .status-badge__dot {
  background: #16a34a;
}
.status-badge--inactive {
  background: #f1f5f9;
  color: #64748b;
}
.status-badge--inactive .status-badge__dot {
  background: #94a3b8;
}
</style>
