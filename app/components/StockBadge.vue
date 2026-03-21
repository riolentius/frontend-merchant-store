<script setup lang="ts">
const props = defineProps<{ stock: number }>();

const status = computed(() => {
  if (props.stock === 0) return "out";
  if (props.stock < 30) return "low";
  return "ok";
});

const label = computed(() => {
  if (props.stock === 0) return "Out of Stock";
  if (props.stock < 30) return `Low (${props.stock})`;
  return `${props.stock}`;
});
</script>

<template>
  <span class="stock-badge" :class="`stock-badge--${status}`">
    <span class="stock-badge__dot" />
    {{ label }}
  </span>
</template>

<style scoped>
.stock-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 99px;
  font-size: 11.5px;
  font-weight: 600;
  white-space: nowrap;
}
.stock-badge__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}
.stock-badge--ok {
  background: #f0fdf4;
  color: #16a34a;
}
.stock-badge--ok .stock-badge__dot {
  background: #16a34a;
}
.stock-badge--low {
  background: #fef9c3;
  color: #854d0e;
}
.stock-badge--low .stock-badge__dot {
  background: #d97706;
}
.stock-badge--out {
  background: #fee2e2;
  color: #991b1b;
}
.stock-badge--out .stock-badge__dot {
  background: #dc2626;
}
</style>
