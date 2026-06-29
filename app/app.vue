<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <Toast position="top-right" />
</template>

<script setup lang="ts">
const route = useRoute();

const pageTitle = computed(() => {
  const p = route.path;
  if (p === "/" || p.startsWith("/auth/login")) return "Login";
  if (p.includes("/dashboard") || p === "/admin") return "Dashboard";
  if (p.includes("/transactions")) return "Transactions";
  if (p.includes("/customers")) return "Customers";
  if (p.includes("/products")) return "Products";
  if (p.includes("/payments")) return "Payments";
  return "Admin";
});

useHead({
  title: () => pageTitle.value,
  titleTemplate: (t) => (t ? `Cahaya Gading | ${t}` : "Cahaya Gading"),
  link: [
    { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
    { rel: "alternate icon", href: "/favicon.ico" }, // fallback for old browsers
  ],
});
</script>
