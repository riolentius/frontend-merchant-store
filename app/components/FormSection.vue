<script setup lang="ts">
defineProps<{
  title?: string;
  subtitle?: string;
}>();
</script>

<template>
  <div class="form-section">
    <div v-if="title || subtitle" class="form-section__head">
      <h2 v-if="title" class="form-section__title">{{ title }}</h2>
      <p v-if="subtitle" class="form-section__sub">{{ subtitle }}</p>
    </div>
    <div class="form-section__body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.form-section {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
}

.form-section__head {
  padding: 16px 24px;
  border-bottom: 1px solid #f1f5f9;
}

.form-section__title {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 2px;
}

.form-section__sub {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}

.form-section__body {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
</style>
