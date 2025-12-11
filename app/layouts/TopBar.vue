<template>
  <div class="topbar">
    <div class="logo">Cahaya Gading</div>
    <div class="menubar-wrapper">
      <Menubar :model="items" class="menubar" />
    </div>
  </div>
</template>

<script setup lang="ts">
const items = [
  {
    label: "Home",
    icon: "pi pi-home",
    url: "/",
  },
  {
    label: "Profile",
    icon: "pi pi-user",
    url: "/account",
  },
];
</script>

<style scoped>
.topbar {
  background: #e3f2fd;
  border-radius: 0;
  border: none;
  height: 56px;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}
.logo {
  font-weight: bold;
  color: #1976d2;
  font-size: 1.3rem;
}
.menubar-wrapper {
  margin-left: auto;
}
.menubar {
  background: transparent;
  border: none;
  box-shadow: none;
}
</style>
