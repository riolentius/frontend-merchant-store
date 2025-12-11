<template>
  <aside class="sidebar">
    <PanelMenu :model="menuItems">
      <template #item="{ item, props }">
        <NuxtLink v-if="item.to" v-bind="props.action" :to="item.to">
          <span :class="item.icon" />
          <span class="p-menuitem-text">{{ item.label }}</span>
        </NuxtLink>
        <a v-else v-bind="props.action">
          <span :class="item.icon" />
          <span class="p-menuitem-text">{{ item.label }}</span>
        </a>
      </template>
    </PanelMenu>
    <div class="sidebar-footer">
      <span>PROVIDED BY<br /><b></b></span>
    </div>
  </aside>
</template>

<script setup lang="ts">
const menuItems = [
  {
    label: "Home",
    icon: "pi pi-home",
    to: "/admin",
  },
  {
    label: "Customers",
    icon: "pi pi-users",
    items: [
      { label: "All Customers", to: "/admin/customers" },
      { label: "New Customer", to: "/admin/customers/add" },
    ],
  },
  {
    label: "Products",
    icon: "pi pi-box",
    items: [
      { label: "All Products", to: "/products" },
      { label: "Add Product", to: "/products/add" },
    ],
  },
  {
    label: "Orders",
    icon: "pi pi-shopping-cart",
    items: [
      { label: "All Orders", to: "/orders" },
      { label: "Pending Orders", to: "/orders/pending" },
      { label: "Completed Orders", to: "/orders/completed" },
    ],
  },
];
</script>

<style scoped>
.sidebar {
  position: fixed;
  top: 56px;
  left: 0;
  width: 220px;
  height: calc(100vh - 56px);
  background: #fff;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  z-index: 999;
  padding: 16px 0;
}
.sidebar-footer {
  padding: 16px 24px;
  font-size: 0.9rem;
  color: #888;
  text-align: center;
}
</style>
