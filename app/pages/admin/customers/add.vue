<template>
  <div>
    <h1>Add New Customer</h1>
    <form @submit.prevent="submitForm">
      <div class="form-group">
        <label for="outletName">Outlet Name</label>
        <input
          type="text"
          id="outletName"
          v-model="customer.outletName"
          required
        />
      </div>
      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" v-model="customer.email" required />
      </div>
    </form>
  </div>
</template>

<script setup lang="ts"></script>
