<script setup lang="ts">
definePageMeta({ layout: false });
const token = useCookie("admin_token");
await navigateTo(token.value ? "/admin" : "/auth/login");
</script>

<template>
  <div></div>
</template>
