<script setup lang="ts">
// Accepts either display name ("Regular") or code ("REGULAR")
const props = defineProps<{ category: string }>();

// Normalize to title case for styling
const normalized = computed(() => {
  const c = props.category?.toLowerCase();
  if (c === "regular") return "Regular";
  if (c === "special") return "Special";
  if (c === "vip") return "VIP";
  return props.category;
});
</script>

<template>
  <span class="badge" :class="`badge--${normalized.toLowerCase()}`">
    {{ normalized }}
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
