<script setup lang="ts">
definePageMeta({ layout: "dashboard" });

const { $api } = useNuxtApp();
const { categories, fetchCategories, getCategoryIdByCode } = useCategories();
const router = useRouter();

const isLoading = ref(false);
const showConfirmLeave = ref(false);

const form = reactive({
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  categoryCode: "REGULAR" as string,
});

const address = reactive({
  label: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  province: "",
  postalCode: "",
  country: "ID",
  isDefault: true,
});

const errors = reactive({
  firstName: "",
  email: "",
  addressLine1: "",
});

onMounted(() => fetchCategories());

const validate = () => {
  errors.firstName = form.firstName.trim() ? "" : "First name is required";
  errors.email = form.email.trim() ? "" : "Email is required";
  errors.addressLine1 = address.addressLine1.trim()
    ? ""
    : "Address line 1 is required";
  return !errors.firstName && !errors.email && !errors.addressLine1;
};

const handleSave = async () => {
  if (!validate()) return;
  isLoading.value = true;
  try {
    const categoryId = getCategoryIdByCode(form.categoryCode);

    // Step 1 — create customer
    const customer = await $api<{ id: string }>("/customers", {
      method: "POST",
      body: {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim() || undefined,
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        categoryId: categoryId || undefined,
      },
    });

    // Step 2 — create address linked to customer
    await $api(`/customers/${customer.id}/addresses`, {
      method: "POST",
      body: {
        label: address.label.trim() || undefined,
        addressLine1: address.addressLine1.trim(),
        addressLine2: address.addressLine2.trim() || undefined,
        city: address.city.trim() || undefined,
        province: address.province.trim() || undefined,
        postalCode: address.postalCode.trim() || undefined,
        country: address.country || "ID",
        isDefault: true,
      },
    });

    router.push("/admin/customers");
  } catch (err: any) {
    console.error("Failed to create customer:", err);
  } finally {
    isLoading.value = false;
  }
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

    <form novalidate @submit.prevent="handleSave">
      <div class="form-layout">
        <!-- ── Customer Info ── -->
        <FormSection
          title="Customer Information"
          subtitle="Basic contact details"
        >
          <div class="field-row">
            <div class="field-group">
              <label class="field-label"
                >First Name <span class="req">*</span></label
              >
              <InputText
                v-model="form.firstName"
                placeholder="e.g. Budi"
                fluid
                :class="{ 'p-invalid': errors.firstName }"
              />
              <span v-if="errors.firstName" class="field-error">{{
                errors.firstName
              }}</span>
            </div>
            <div class="field-group">
              <label class="field-label">Last Name</label>
              <InputText
                v-model="form.lastName"
                placeholder="e.g. Santoso"
                fluid
              />
            </div>
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
              <label class="field-label">Phone</label>
              <InputText
                v-model="form.phone"
                placeholder="e.g. 081234567890"
                fluid
              />
            </div>
          </div>
        </FormSection>

        <!-- ── Address ── -->
        <FormSection
          title="Default Address"
          subtitle="Primary address for this customer — required"
        >
          <div class="field-group">
            <label class="field-label">Label</label>
            <InputText
              v-model="address.label"
              placeholder="e.g. Main Office, Warehouse"
              fluid
            />
          </div>
          <div class="field-group">
            <label class="field-label"
              >Address Line 1 <span class="req">*</span></label
            >
            <InputText
              v-model="address.addressLine1"
              placeholder="Street name and number"
              fluid
              :class="{ 'p-invalid': errors.addressLine1 }"
            />
            <span v-if="errors.addressLine1" class="field-error">{{
              errors.addressLine1
            }}</span>
          </div>
          <div class="field-group">
            <label class="field-label">Address Line 2</label>
            <InputText
              v-model="address.addressLine2"
              placeholder="Floor, unit, building (optional)"
              fluid
            />
          </div>
          <div class="field-row">
            <div class="field-group">
              <label class="field-label">City</label>
              <InputText
                v-model="address.city"
                placeholder="e.g. Jakarta"
                fluid
              />
            </div>
            <div class="field-group">
              <label class="field-label">Province</label>
              <InputText
                v-model="address.province"
                placeholder="e.g. DKI Jakarta"
                fluid
              />
            </div>
          </div>
          <div class="field-row">
            <div class="field-group">
              <label class="field-label">Postal Code</label>
              <InputText
                v-model="address.postalCode"
                placeholder="e.g. 10110"
                fluid
              />
            </div>
            <div class="field-group">
              <label class="field-label">Country</label>
              <InputText v-model="address.country" placeholder="ID" fluid />
            </div>
          </div>
        </FormSection>

        <!-- ── Category ── -->
        <FormSection
          title="Pricing Category"
          subtitle="Determines which prices apply during transactions"
        >
          <div class="category-grid">
            <label
              v-for="cat in categories"
              :key="cat.code"
              class="category-option"
              :class="{
                'category-option--active': form.categoryCode === cat.code,
              }"
            >
              <input
                type="radio"
                v-model="form.categoryCode"
                :value="cat.code"
                class="sr-only"
              />
              <div class="category-option__inner">
                <CategoryBadge :category="cat.name" />
                <span class="category-option__desc">{{ cat.description }}</span>
              </div>
              <div
                v-if="form.categoryCode === cat.code"
                class="category-option__check"
              >
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

        <!-- ── Actions ── -->
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
      description="You have unsaved changes. Are you sure you want to leave?"
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
.form-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
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
  transition: background 0.15s;
}
.btn-secondary:hover {
  background: #f8fafc;
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
}
.req {
  color: #ef4444;
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
