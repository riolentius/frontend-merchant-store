<script setup lang="ts">
definePageMeta({ layout: "dashboard" });

const { $api } = useNuxtApp();
const { categories, fetchCategories, getCategoryIdByCode, codeById } =
  useCategories();
const route = useRoute();
const router = useRouter();
const id = route.params.id as string;

interface Address {
  id: string;
  label?: string;
  addressLine1: string;
  addressLine2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country: string;
  isDefault: boolean;
}

const isLoading = ref(true);
const isSaving = ref(false);
const notFound = ref(false);
const showConfirmLeave = ref(false);
const addresses = ref<Address[]>([]);

// Show add address form
const showAddAddr = ref(false);
const newAddr = reactive({
  label: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  province: "",
  postalCode: "",
  country: "ID",
  isDefault: false,
});
const isSavingAddr = ref(false);

const form = reactive({
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  categoryCode: "REGULAR",
});

const errors = reactive({ firstName: "", email: "" });

onMounted(async () => {
  await fetchCategories();
  try {
    const [c, a] = await Promise.all([
      $api<any>(`/customers/${id}`),
      $api<{ items: Address[] }>(`/customers/${id}/addresses`),
    ]);
    form.firstName = c.firstName;
    form.lastName = c.lastName ?? "";
    form.email = c.email;
    form.phone = c.phone ?? "";
    form.categoryCode = c.categoryId
      ? (codeById.value[c.categoryId] ?? "REGULAR")
      : "REGULAR";
    addresses.value = a.items ?? [];
  } catch {
    notFound.value = true;
  } finally {
    isLoading.value = false;
  }
});

const validate = () => {
  errors.firstName = form.firstName.trim() ? "" : "First name is required";
  errors.email = form.email.trim() ? "" : "Email is required";
  return !errors.firstName && !errors.email;
};

const handleSave = async () => {
  if (!validate()) return;
  isSaving.value = true;
  try {
    const categoryId = getCategoryIdByCode(form.categoryCode);
    await $api(`/customers/${id}`, {
      method: "PATCH",
      body: {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim() || undefined,
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        categoryId: categoryId || undefined,
      },
    });
    router.push(`/admin/customers/${id}`);
  } catch (err) {
    console.error("Failed to update customer:", err);
  } finally {
    isSaving.value = false;
  }
};

const setDefault = async (addr: Address) => {
  try {
    await $api(`/customers/${id}/addresses/${addr.id}`, {
      method: "PATCH",
      body: { isDefault: true },
    });
    addresses.value = addresses.value.map((a) => ({
      ...a,
      isDefault: a.id === addr.id,
    }));
  } catch (err) {
    console.error(err);
  }
};

const deleteAddr = async (addrId: string) => {
  try {
    await $api(`/customers/${id}/addresses/${addrId}`, { method: "DELETE" });
    addresses.value = addresses.value.filter((a) => a.id !== addrId);
  } catch (err) {
    console.error(err);
  }
};

const saveNewAddr = async () => {
  if (!newAddr.addressLine1.trim()) return;
  isSavingAddr.value = true;
  try {
    const created = await $api<Address>(`/customers/${id}/addresses`, {
      method: "POST",
      body: {
        label: newAddr.label.trim() || undefined,
        addressLine1: newAddr.addressLine1.trim(),
        addressLine2: newAddr.addressLine2.trim() || undefined,
        city: newAddr.city.trim() || undefined,
        province: newAddr.province.trim() || undefined,
        postalCode: newAddr.postalCode.trim() || undefined,
        country: newAddr.country || "ID",
        isDefault: newAddr.isDefault,
      },
    });
    // If new address is default, update existing ones
    if (newAddr.isDefault) {
      addresses.value = addresses.value.map((a) => ({
        ...a,
        isDefault: false,
      }));
    }
    addresses.value.push(created);
    showAddAddr.value = false;
    Object.assign(newAddr, {
      label: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      province: "",
      postalCode: "",
      country: "ID",
      isDefault: false,
    });
  } catch (err) {
    console.error(err);
  } finally {
    isSavingAddr.value = false;
  }
};
</script>

<template>
  <div class="page">
    <PageHeader
      title="Edit Customer"
      subtitle="Update customer details and addresses"
    >
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

    <DataCard v-if="isLoading" :loading="true" :skeleton-rows="4" />
    <div v-else-if="notFound" class="not-found">
      <p>Customer not found.</p>
      <NuxtLink to="/admin/customers" class="btn-secondary">← Back</NuxtLink>
    </div>

    <form v-else novalidate @submit.prevent="handleSave">
      <div class="form-layout">
        <!-- Customer Info -->
        <FormSection
          title="Customer Information"
          subtitle="Update contact details"
        >
          <div class="field-row">
            <div class="field-group">
              <label class="field-label"
                >First Name <span class="req">*</span></label
              >
              <InputText
                v-model="form.firstName"
                fluid
                :class="{ 'p-invalid': errors.firstName }"
              />
              <span v-if="errors.firstName" class="field-error">{{
                errors.firstName
              }}</span>
            </div>
            <div class="field-group">
              <label class="field-label">Last Name</label>
              <InputText v-model="form.lastName" fluid />
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
                fluid
                :class="{ 'p-invalid': errors.email }"
              />
              <span v-if="errors.email" class="field-error">{{
                errors.email
              }}</span>
            </div>
            <div class="field-group">
              <label class="field-label">Phone</label>
              <InputText v-model="form.phone" fluid />
            </div>
          </div>
        </FormSection>

        <!-- Addresses -->
        <FormSection title="Addresses" subtitle="Manage delivery addresses">
          <!-- Existing addresses -->
          <div v-if="addresses.length > 0" class="addr-list">
            <div v-for="addr in addresses" :key="addr.id" class="addr-card">
              <div class="addr-card__head">
                <div class="addr-card__label-wrap">
                  <span class="addr-card__label">{{
                    addr.label || "Address"
                  }}</span>
                  <span v-if="addr.isDefault" class="default-badge"
                    >Default</span
                  >
                </div>
                <div class="addr-card__actions">
                  <button
                    v-if="!addr.isDefault"
                    type="button"
                    class="addr-btn addr-btn--default"
                    @click="setDefault(addr)"
                  >
                    Set Default
                  </button>
                  <button
                    type="button"
                    class="addr-btn addr-btn--delete"
                    @click="deleteAddr(addr.id)"
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    </svg>
                  </button>
                </div>
              </div>
              <p class="addr-card__text">
                {{
                  [
                    addr.addressLine1,
                    addr.addressLine2,
                    addr.city,
                    addr.province,
                    addr.postalCode,
                  ]
                    .filter(Boolean)
                    .join(", ")
                }}
              </p>
            </div>
          </div>

          <!-- Add new address form -->
          <div v-if="showAddAddr" class="new-addr-form">
            <div class="new-addr-form__header">
              <span>New Address</span>
              <button
                type="button"
                class="close-btn"
                @click="showAddAddr = false"
              >
                ✕
              </button>
            </div>
            <div class="new-addr-form__body">
              <div class="field-group">
                <label class="field-label">Label</label>
                <InputText
                  v-model="newAddr.label"
                  placeholder="e.g. Branch, Warehouse"
                  fluid
                />
              </div>
              <div class="field-group">
                <label class="field-label"
                  >Address Line 1 <span class="req">*</span></label
                >
                <InputText
                  v-model="newAddr.addressLine1"
                  placeholder="Street name and number"
                  fluid
                />
              </div>
              <div class="field-group">
                <label class="field-label">Address Line 2</label>
                <InputText
                  v-model="newAddr.addressLine2"
                  placeholder="Floor, unit (optional)"
                  fluid
                />
              </div>
              <div class="field-row">
                <div class="field-group">
                  <label class="field-label">City</label>
                  <InputText v-model="newAddr.city" fluid />
                </div>
                <div class="field-group">
                  <label class="field-label">Province</label>
                  <InputText v-model="newAddr.province" fluid />
                </div>
              </div>
              <div class="field-row">
                <div class="field-group">
                  <label class="field-label">Postal Code</label>
                  <InputText v-model="newAddr.postalCode" fluid />
                </div>
                <div class="field-group">
                  <label class="field-label">Country</label>
                  <InputText v-model="newAddr.country" fluid />
                </div>
              </div>
              <label class="toggle-row">
                <span class="field-label">Set as default address</span>
                <input type="checkbox" v-model="newAddr.isDefault" />
              </label>
              <div class="new-addr-actions">
                <button
                  type="button"
                  class="btn-secondary"
                  @click="showAddAddr = false"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  class="btn-save"
                  :disabled="!newAddr.addressLine1.trim() || isSavingAddr"
                  @click="saveNewAddr"
                >
                  {{ isSavingAddr ? "Saving…" : "Add Address" }}
                </button>
              </div>
            </div>
          </div>

          <button
            v-if="!showAddAddr"
            type="button"
            class="add-addr-btn"
            @click="showAddAddr = true"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Another Address
          </button>
        </FormSection>

        <!-- Category -->
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

        <!-- Actions -->
        <div class="form-actions">
          <button
            type="button"
            class="btn-secondary"
            @click="showConfirmLeave = true"
          >
            Cancel
          </button>
          <Button type="submit" :loading="isSaving" class="btn-submit">
            <template #default>
              <span class="btn-inner">
                <template v-if="!isSaving">
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
                  Save Changes
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
      @confirm="router.push(`/admin/customers/${id}`)"
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
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px;
  color: #64748b;
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

/* Address list */
.addr-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.addr-card {
  border: 1px solid #e2e8f0;
  border-radius: 9px;
  padding: 14px;
}
.addr-card__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.addr-card__label-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}
.addr-card__label {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}
.default-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 7px;
  background: #eff6ff;
  color: #2563eb;
  border-radius: 99px;
}
.addr-card__actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.addr-card__text {
  font-size: 13px;
  color: #64748b;
  line-height: 1.5;
  margin: 0;
}
.addr-btn {
  padding: 4px 10px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.12s;
}
.addr-btn--default {
  background: #f1f5f9;
  color: #475569;
}
.addr-btn--default:hover {
  background: #eff6ff;
  color: #2563eb;
}
.addr-btn--delete {
  background: #fef2f2;
  color: #dc2626;
  display: flex;
  align-items: center;
}
.addr-btn--delete:hover {
  background: #fee2e2;
}

/* New address form */
.new-addr-form {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
}
.new-addr-form__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}
.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #94a3b8;
  font-size: 14px;
}
.close-btn:hover {
  color: #0f172a;
}
.new-addr-form__body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}
.new-addr-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
.btn-save {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}
.btn-save:hover:not(:disabled) {
  background: #1d4ed8;
}
.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.add-addr-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 14px;
  background: #f8fafc;
  border: 1.5px dashed #e2e8f0;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #475569;
  cursor: pointer;
  font-family: inherit;
  transition:
    border-color 0.15s,
    background 0.15s;
}
.add-addr-btn:hover {
  border-color: #3b82f6;
  background: #eff6ff;
  color: #2563eb;
}

/* Category */
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
