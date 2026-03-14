<script setup lang="ts">
import type { Customer } from "../../../mocks";

definePageMeta({ layout: "dashboard" });

const router = useRouter();
const isLoading = ref(false);
const showConfirmLeave = ref(false);

const form = reactive({
  name: "",
  email: "",
  phone: "",
  category: "Regular" as Customer["category"],
});

const errors = reactive({ name: "", email: "", phone: "" });

const categories: Customer["category"][] = ["Regular", "Special", "VIP"];

const validate = () => {
  errors.name = form.name.trim() ? "" : "Name is required";
  errors.email = form.email.trim() ? "" : "Email is required";
  errors.phone = form.phone.trim() ? "" : "Phone is required";
  return !errors.name && !errors.email && !errors.phone;
};

const handleSubmit = async () => {
  if (!validate()) return;
  isLoading.value = true;
  // TODO: replace with real API call
  await new Promise((r) => setTimeout(r, 600));
  isLoading.value = false;
  router.push("/admin/customers");
};
</script>

<template>
  <div class="page">
    <PageHeader title="Add Customer" subtitle="Create a new customer record">
      <template #action>
        <button class="btn-secondary" @click="showConfirmLeave = true">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </template>
    </PageHeader>

    <form novalidate @submit.prevent="handleSubmit">
      <div class="form-layout">
        <!-- Main fields -->
        <FormSection
          title="Customer Information"
          subtitle="Basic contact details"
        >
          <div class="field-group">
            <label class="field-label"
              >Full Name <span class="req">*</span></label
            >
            <InputText
              v-model="form.name"
              placeholder="e.g. Budi Santoso"
              fluid
              :class="{ 'p-invalid': errors.name }"
            />
            <span v-if="errors.name" class="field-error">{{
              errors.name
            }}</span>
          </div>

          <div class="field-row">
            <div class="field-group">
              <label class="field-label"
                >Email <span class="req">*</span></label
              >
              <InputText
                v-model="form.email"
                type="email"
                placeholder="e.g. budi@email.com"
                fluid
                :class="{ 'p-invalid': errors.email }"
              />
              <span v-if="errors.email" class="field-error">{{
                errors.email
              }}</span>
            </div>
            <div class="field-group">
              <label class="field-label"
                >Phone <span class="req">*</span></label
              >
              <InputText
                v-model="form.phone"
                placeholder="e.g. 081234567890"
                fluid
                :class="{ 'p-invalid': errors.phone }"
              />
              <span v-if="errors.phone" class="field-error">{{
                errors.phone
              }}</span>
            </div>
          </div>
        </FormSection>

        <!-- Category -->
        <FormSection
          title="Pricing Category"
          subtitle="Determines which prices apply to this customer"
        >
          <div class="category-grid">
            <label
              v-for="cat in categories"
              :key="cat"
              class="category-option"
              :class="{ 'category-option--active': form.category === cat }"
            >
              <input
                type="radio"
                v-model="form.category"
                :value="cat"
                class="sr-only"
              />
              <div class="category-option__inner">
                <CategoryBadge :category="cat" />
                <span class="category-option__desc">
                  <span v-if="cat === 'Regular'">Standard pricing</span>
                  <span v-else-if="cat === 'Special'">Discounted pricing</span>
                  <span v-else>Best pricing tier</span>
                </span>
              </div>
              <div class="category-option__check" v-if="form.category === cat">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </label>
          </div>
        </FormSection>

        <!-- Form actions -->
        <div class="form-actions">
          <button
            type="button"
            class="btn-secondary"
            @click="showConfirmLeave = true"
          >
            Cancel
          </button>
          <Button type="submit" :loading="isLoading" class="btn-submit">
            <template #default>
              <span class="btn-inner">
                <template v-if="!isLoading">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.2"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Save Customer
                </template>
                <template v-else>Saving…</template>
              </span>
            </template>
          </Button>
        </div>
      </div>
    </form>

    <ConfirmDialog
      v-model="showConfirmLeave"
      title="Discard changes?"
      description="You have unsaved changes. Are you sure you want to leave this page?"
      confirm-label="Yes, Discard"
      @confirm="router.push('/admin/customers')"
    />
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 14px;
  background: #fff;
  color: #475569;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  text-decoration: none;
  transition:
    background 0.15s,
    border-color 0.15s;
}
.btn-secondary:hover {
  background: #f8fafc;
  border-color: #94a3b8;
}

.form-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.field-label {
  font-size: 12.5px;
  font-weight: 500;
  color: #475569;
  letter-spacing: 0.02em;
}
.req {
  color: #ef4444;
  margin-left: 2px;
}
.field-error {
  font-size: 12px;
  color: #dc2626;
}

:deep(.p-inputtext) {
  font-family: "Geist", sans-serif;
  font-size: 14px;
  border-radius: 8px;
  border-color: #e2e8f0;
}
:deep(.p-inputtext:enabled:focus) {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}
:deep(.p-invalid.p-inputtext) {
  border-color: #ef4444;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.category-option {
  position: relative;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  padding: 14px;
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s;
}
.category-option:hover {
  border-color: #94a3b8;
  background: #f8fafc;
}
.category-option--active {
  border-color: #3b82f6;
  background: #eff6ff;
}

.category-option__inner {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.category-option__desc {
  font-size: 12px;
  color: #64748b;
}

.category-option__check {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #2563eb;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}

.form-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 4px;
}

:deep(.btn-submit.p-button) {
  background: #2563eb;
  border-color: #2563eb;
  font-family: "Geist", sans-serif;
  font-size: 13.5px;
  font-weight: 500;
  border-radius: 8px;
  padding: 8px 20px;
  box-shadow: 0 1px 6px rgba(37, 99, 235, 0.25);
}
:deep(.btn-submit.p-button:not(:disabled):hover) {
  background: #1d4ed8;
  border-color: #1d4ed8;
}

.btn-inner {
  display: flex;
  align-items: center;
  gap: 7px;
}

@media (max-width: 640px) {
  .field-row {
    grid-template-columns: 1fr;
  }
  .category-grid {
    grid-template-columns: 1fr;
  }
}
</style>
