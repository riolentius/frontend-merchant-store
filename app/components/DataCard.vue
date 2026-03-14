<script setup lang="ts">
defineProps<{
  loading?: boolean;
  skeletonRows?: number;
}>();
</script>

<template>
  <div class="data-card">
    <!-- Toolbar slot (search, filters, count) -->
    <div v-if="$slots.toolbar" class="data-card__toolbar">
      <slot name="toolbar" />
    </div>

    <!-- Skeleton while loading -->
    <div v-if="loading" class="data-card__skeleton">
      <div v-for="i in skeletonRows ?? 5" :key="i" class="skeleton-row" />
    </div>

    <!-- Default content slot -->
    <slot v-else />
  </div>
</template>

<style scoped>
.data-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
}

.data-card__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid #f1f5f9;
  gap: 12px;
  flex-wrap: wrap;
}

.data-card__skeleton {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skeleton-row {
  height: 44px;
  border-radius: 6px;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
