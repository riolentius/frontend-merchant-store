<script setup lang="ts">
defineProps<{
  category: "Regular" | "Special" | "VIP";
}>();
</script>

<template>
  <span class="badge" :class="`badge--${category.toLowerCase()}`">
    {{ category }}
  </span>
</template>

<style scoped>
.badge {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 99px;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.badge--regular {
  background: #f1f5f9;
  color: #475569;
}
.badge--special {
  background: #eff6ff;
  color: #1d4ed8;
}
.badge--vip {
  background: #fef9c3;
  color: #854d0e;
}
</style>
