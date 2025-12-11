<template>
  <NuxtLayout name="dashboard">
    <div>
      <h2>Customers</h2>
      <DataTable :value="customers" responsiveLayout="scroll">
        <Column field="outletName" header="Outlet Name" />
        <Column field="email" header="Email" />
        <Column field="phone" header="Phone Number" />
        <Column header="Action" :body="actionTemplate">
          <template #body="slotProps">
            <Button
              label="View"
              icon="pi pi-eye"
              class="p-button-text"
              @click="
                () => $router.push(`/admin/customers/${slotProps.data.id}`)
              "
            />
            <Button
              label="Edit"
              icon="pi pi-pencil"
              class="p-button-text"
              @click="
                () => $router.push(`/admin/customers/edit/${slotProps.data.id}`)
              "
            />
            <Button
              label="Delete"
              icon="pi pi-trash"
              class="p-button-text p-button-danger"
              @click="() => confirmDelete(slotProps.data.id)"
            />
          </template>
        </Column>
      </DataTable>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref } from "vue";

const customers = ref([
  { id: 1, outletName: "Outlet A", email: "a@email.com", phone: "0812345678" },
  { id: 2, outletName: "Outlet B", email: "b@email.com", phone: "0898765432" },
  // Add more sample data as needed
]);
</script>
<style scoped></style>
