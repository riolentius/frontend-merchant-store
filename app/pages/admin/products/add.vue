<script setup lang="ts">
definePageMeta({ layout: "dashboard" });

const router = useRouter();
const isLoading = ref(false);
const showConfirmLeave = ref(false);

const form = reactive({
  name: "",
  sku: "",
  stock: 0,
  is_active: true,
  prices: [
    { category: "Regular", price: 0 },
    { category: "Special", price: 0 },
    { category: "VIP", price: 0 },
  ],
});

const errors = reactive({
  name: "",
  sku: "",
  stock: "",
  prices: ["", "", ""],
});

const validate = () => {
  errors.name = form.name.trim() ? "" : "Product name is required";
  errors.sku = form.sku.trim() ? "" : "SKU is required";
  errors.stock = form.stock >= 0 ? "" : "Stock cannot be negative";
  errors.prices = form.prices.map((p) =>
    p.price > 0 ? "" : "Price must be greater than 0",
  );
  return (
    !errors.name &&
    !errors.sku &&
    !errors.stock &&
    errors.prices.every((e) => !e)
  );
};

const handleSubmit = async () => {
  if (!validate()) return;
  isLoading.value = true;
  await new Promise((r) => setTimeout(r, 700));
  isLoading.value = false;
  router.push("/admin/products");
};

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

const categoryColors: Record<string, string> = {
  Regular: "#475569",
  Special: "#1d4ed8",
  VIP: "#854d0e",
};
</script>

<template>
  <div class="page">
    <PageHeader
      title="Add Product"
      subtitle="Create a new product with stock and pricing"
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

    <form novalidate @submit.prevent="handleSubmit">
      <div class="form-layout">
        <!-- Basic Info -->
        <FormSection
          title="Product Information"
          subtitle="Name, SKU and stock level"
        >
          <div class="field-group">
            <label class="field-label"
              >Product Name <span class="req">*</span></label
            >
            <InputText
              v-model="form.name"
              placeholder="e.g. Beras Premium 5kg"
              fluid
              :class="{ 'p-invalid': errors.name }"
            />
            <span v-if="errors.name" class="field-error">{{
              errors.name
            }}</span>
          </div>

          <div class="field-row">
            <div class="field-group">
              <label class="field-label">SKU <span class="req">*</span></label>
              <InputText
                v-model="form.sku"
                placeholder="e.g. BRS-001"
                fluid
                :class="{ 'p-invalid': errors.sku }"
              />
              <span v-if="errors.sku" class="field-error">{{
                errors.sku
              }}</span>
            </div>
            <div class="field-group">
              <label class="field-label"
                >Initial Stock <span class="req">*</span></label
              >
              <InputText
                v-model.number="form.stock"
                type="number"
                min="0"
                placeholder="0"
                fluid
                :class="{ 'p-invalid': errors.stock }"
              />
              <span v-if="errors.stock" class="field-error">{{
                errors.stock
              }}</span>
            </div>
          </div>

          <!-- Active toggle -->
          <div class="toggle-row">
            <div>
              <p class="toggle-label">Active Status</p>
              <p class="toggle-desc">
                Inactive products won't appear in transactions
              </p>
            </div>
            <button
              type="button"
              class="toggle-btn"
              :class="{ 'toggle-btn--on': form.is_active }"
              @click="form.is_active = !form.is_active"
              :aria-label="form.is_active ? 'Deactivate' : 'Activate'"
            >
              <span class="toggle-btn__thumb" />
            </button>
          </div>
        </FormSection>

        <!-- Pricing -->
        <FormSection
          title="Pricing Per Category"
          subtitle="Set different prices for each customer category"
        >
          <div class="price-note">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Prices are applied automatically based on the customer's category
            during a transaction.
          </div>

          <div class="price-table">
            <div class="price-row price-row--header">
              <span>Category</span>
              <span>Price (IDR)</span>
              <span>Preview</span>
            </div>
            <div
              v-for="(p, i) in form.prices"
              :key="p.category"
              class="price-row"
            >
              <div class="price-cat">
                <span
                  class="price-cat__dot"
                  :style="{ background: categoryColors[p.category] }"
                />
                <span
                  class="price-cat__name"
                  :style="{ color: categoryColors[p.category] }"
                >
                  {{ p.category }}
                </span>
              </div>
              <div class="field-group" style="margin: 0">
                <InputText
                  v-model.number="p.price"
                  type="number"
                  min="0"
                  placeholder="0"
                  fluid
                  :class="{ 'p-invalid': errors.prices[i] }"
                />
                <span v-if="errors.prices[i]" class="field-error">{{
                  errors.prices[i]
                }}</span>
              </div>
              <span class="price-preview">{{
                p.price > 0 ? formatRupiah(p.price) : "—"
              }}</span>
            </div>
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
                  Save Product
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
      @confirm="router.push('/admin/products')"
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
  transition: background 0.15s;
}
.btn-secondary:hover {
  background: #f8fafc;
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

/* Active toggle */
.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  border-top: 1px solid #f1f5f9;
  gap: 16px;
}
.toggle-label {
  font-size: 13.5px;
  font-weight: 500;
  color: #0f172a;
  margin: 0 0 2px;
}
.toggle-desc {
  font-size: 12px;
  color: #64748b;
  margin: 0;
}

.toggle-btn {
  width: 44px;
  height: 24px;
  border-radius: 99px;
  background: #e2e8f0;
  border: none;
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  transition: background 0.2s;
  flex-shrink: 0;
}
.toggle-btn--on {
  background: #2563eb;
  justify-content: flex-end;
}
.toggle-btn__thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s;
}

/* Pricing */
.price-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  font-size: 12.5px;
  color: #1e40af;
  line-height: 1.5;
}

.price-table {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.price-row {
  display: grid;
  grid-template-columns: 140px 1fr 140px;
  align-items: center;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid #f1f5f9;
}
.price-row:last-child {
  border-bottom: none;
}
.price-row--header {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding-bottom: 8px;
}

.price-cat {
  display: flex;
  align-items: center;
  gap: 8px;
}
.price-cat__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.price-cat__name {
  font-size: 13.5px;
  font-weight: 600;
}

.price-preview {
  font-family: "Geist Mono", monospace;
  font-size: 13px;
  color: #64748b;
  text-align: right;
}

/* Actions */
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
  .price-row {
    grid-template-columns: 100px 1fr 100px;
    gap: 10px;
  }
}
</style>
