<script setup lang="ts">
import type { PaymentStatus } from "../mocks";
defineProps<{ status: PaymentStatus }>();
</script>

<template>
  <span class="badge" :class="`badge--${status}`">{{ status }}</span>
</template>

<style scoped>
.badge {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 99px;
  font-size: 11.5px;
  font-weight: 600;
  text-transform: capitalize;
  white-space: nowrap;
}
.badge--paid {
  background: #dcfce7;
  color: #166534;
}
.badge--partial {
  background: #fef9c3;
  color: #854d0e;
}
.badge--unpaid {
  background: #fee2e2;
  color: #991b1b;
}
.badge--overpaid {
  background: #ede9fe;
  color: #5b21b6;
}
</style>
