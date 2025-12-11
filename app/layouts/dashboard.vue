<template>
  <div>
    <TopBar />
    <Sidebar />
    <main class="dashboard-main">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import TopBar from "./TopBar.vue";
import Sidebar from "./Sidebar.vue";
</script>

<style scoped>
.dashboard-main {
  margin-top: 56px;
  margin-left: 220px;
  padding: 32px;
  min-height: calc(100vh - 56px);
  background: #f7fafd;
}
</style>
<style scoped></style>
