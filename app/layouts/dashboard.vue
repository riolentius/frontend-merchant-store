<script setup lang="ts">
import Sidebar from "./Sidebar.vue";
import TopBar from "./TopBar.vue";

const sidebarOpen = ref(false);
const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value;
};
</script>

<template>
  <div class="layout">
    <Sidebar :is-open="sidebarOpen" @close="sidebarOpen = false" />

    <!-- Right column: topbar sticks to top, content scrolls below -->
    <div class="layout__main">
      <TopBar @toggle-sidebar="toggleSidebar" />
      <main class="layout__content">
        <slot />
      </main>
    </div>

    <!-- Mobile overlay -->
    <Transition name="overlay">
      <div
        v-if="sidebarOpen"
        class="layout__overlay"
        @click="sidebarOpen = false"
      />
    </Transition>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
  background: #f1f5f9;
}

.layout__main {
  /* Push right of the fixed 220px sidebar */
  margin-left: 220px;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  /* Prevent content from overflowing horizontally */
  min-width: 0;
  overflow-x: hidden;
}

.layout__content {
  flex: 1;
  padding: 28px 32px;
}

.layout__overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  z-index: 39;
  backdrop-filter: blur(2px);
}

.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.2s ease;
}
.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .layout__main {
    margin-left: 0;
  }
}
</style>
