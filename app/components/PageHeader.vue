<script setup lang="ts">
defineProps<{
  title: string;
  subtitle?: string;
}>();
</script>

<template>
  <div class="page-header">
    <div>
      <h1 class="page-title">{{ title }}</h1>
      <p v-if="subtitle" class="page-sub">{{ subtitle }}</p>
    </div>
    <!-- Optional action button (e.g. "Add Customer") -->
    <div v-if="$slots.action" class="page-action">
      <slot name="action" />
    </div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.page-title {
  font-size: 22px;
  font-weight: 600;
  color: #0f172a;
  letter-spacing: -0.3px;
  margin: 0 0 3px;
}

.page-sub {
  font-size: 13.5px;
  color: #64748b;
  margin: 0;
}

.page-action {
  flex-shrink: 0;
}
</style>
