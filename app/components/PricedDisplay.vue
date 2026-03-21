<script setup lang="ts">
const props = defineProps<{
  amount: number;
  size?: "sm" | "md" | "lg";
  muted?: boolean;
}>();

const formatted = computed(() =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(props.amount),
);
</script>

<template>
  <span
    class="price"
    :class="[`price--${size ?? 'md'}`, { 'price--muted': muted }]"
  >
    {{ formatted }}
  </span>
</template>

<style scoped>
.price {
  font-family: "Geist Mono", monospace;
  font-variant-numeric: tabular-nums;
}
.price--sm {
  font-size: 12px;
}
.price--md {
  font-size: 13.5px;
  font-weight: 500;
}
.price--lg {
  font-size: 18px;
  font-weight: 600;
}
.price--muted {
  color: #64748b;
}
</style>
