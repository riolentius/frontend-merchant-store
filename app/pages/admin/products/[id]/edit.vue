<script setup lang="ts">
import { SKU_UNITS } from "../../../../config/skuUnits";
import type {
  Product,
  ProductPrice,
} from "../../../../composables/useProducts";

definePageMeta({ layout: "dashboard" });

const { $api } = useNuxtApp();
const { fetchCategories, categories } = useCategories();
const { fetchPrices, updatePrice, createPrices, formatRupiah } = useProducts();
const route = useRoute();
const router = useRouter();
const id = route.params.id as string;

const isLoading = ref(true);
const isSaving = ref(false);
const notFound = ref(false);
const showConfirmLeave = ref(false);

const form = reactive({
  name: "",
  skuUnit: "",
  skuSuffix: "",
  currentStock: 0,
  stockToAdd: 0,
  isActive: true,
  cost: "",
});

const priceInputs = ref<
  {
    categoryId: string;
    categoryName: string;
    code: string;
    amount: string;
    priceId?: string;
  }[]
>([]);

const errors = reactive({ name: "", cost: "", prices: [] as string[] });

onMounted(async () => {
  await fetchCategories();

  try {
    const found = await $api<Product>(`/products/${id}`);

    form.name = found.name;

    // Parse existing SKU back into unit + suffix
    const skuParts = (found.sku ?? "").split("-");
    const knownUnit = SKU_UNITS.find((u) => u.code === skuParts[0]);

    form.skuUnit = knownUnit ? skuParts[0] : "";
    form.skuSuffix =
      knownUnit && skuParts.length > 1
        ? skuParts.slice(1).join("-")
        : (found.sku ?? "");

    form.currentStock = found.stockOnHand;
    form.stockToAdd = 0;
    form.isActive = found.isActive;
    form.cost = found.cost ?? "0";

    const existing = await fetchPrices(id);

    priceInputs.value = categories.value.map((cat) => {
      const price = existing.find((p) => p.categoryId === cat.id);

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        code: cat.code,
        amount: cat.code === "WAREHOUSE" ? "1" : (price?.amount ?? ""),
        priceId: price?.id,
      };
    });

    errors.prices = priceInputs.value.map(() => "");
  } catch {
    notFound.value = true;
  } finally {
    isLoading.value = false;
  }
});

const fullSku = computed(() => {
  if (!form.skuUnit) return "";
  if (form.skuSuffix.trim())
    return `${form.skuUnit}-${form.skuSuffix.trim().toUpperCase()}`;
  return form.skuUnit;
});

const catColor = (code: string) => {
  if (code === "REGULAR") return "#475569";
  if (code === "SPECIAL") return "#1d4ed8";
  if (code === "VIP") return "#854d0e";
  return "#475569";
};

const visiblePriceInputs = computed(() =>
  priceInputs.value.filter((p) => p.code !== "WAREHOUSE"),
);

const validate = () => {
  errors.name = form.name.trim() ? "" : "Product name is required";
  errors.cost =
    form.cost && parseFloat(form.cost) >= 0 ? "" : "Cost price is required";
  errors.prices = priceInputs.value.map((p) => {
    if (p.code === "WAREHOUSE") return "";

    return p.amount && parseFloat(p.amount) > 0
      ? ""
      : "Price must be greater than 0";
  });
  return !errors.name && !errors.cost && errors.prices.every((e) => !e);
};

const handleSave = async () => {
  if (!validate()) return;
  isSaving.value = true;
  try {
    await $api(`/products/${id}`, {
      method: "PATCH",
      body: {
        name: form.name.trim(),
        sku: fullSku.value || undefined,
        cost: form.cost,
        isActive: form.isActive,
        stockOnHand: form.currentStock + form.stockToAdd,
      },
    });
    const toUpdate = priceInputs.value.filter((p) => p.priceId && p.amount);
    const toCreate = priceInputs.value.filter((p) => !p.priceId && p.amount);
    await Promise.all([
      ...toUpdate.map((p) => updatePrice(p.priceId!, p.amount)),
      ...(toCreate.length > 0
        ? [
            createPrices(
              id,
              toCreate.map((p) => ({
                categoryId: p.categoryId,
                amount: p.amount,
              })),
            ),
          ]
        : []),
    ]);
    router.push(`/admin/products/${id}`);
  } catch (err) {
    console.error("Failed to update product:", err);
  } finally {
    isSaving.value = false;
  }
};

const previewAmount = (amount: string) => {
  const n = parseFloat(amount);
  return n > 0 ? formatRupiah(n) : "—";
};

const margin = (sellingAmount: string) => {
  const sell = parseFloat(sellingAmount);
  const cost = parseFloat(form.cost);
  if (!sell || !cost || cost <= 0) return null;
  return (((sell - cost) / cost) * 100).toFixed(1);
};
</script>

<template>
  <div class="page">
    <PageHeader
      title="Edit Product"
      :subtitle="fullSku ? `SKU: ${fullSku}` : 'Update product details'"
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
      <p>Product not found.</p>
      <NuxtLink to="/admin/products" class="btn-secondary">← Back</NuxtLink>
    </div>

    <form v-else novalidate @submit.prevent="handleSave">
      <div class="form-layout">
        <FormSection
          title="Product Information"
          subtitle="Update name, SKU unit, stock, cost and status"
        >
          <div class="field-group">
            <label class="field-label"
              >Product Name <span class="req">*</span></label
            >
            <InputText
              v-model="form.name"
              fluid
              :class="{ 'p-invalid': errors.name }"
            />
            <span v-if="errors.name" class="field-error">{{
              errors.name
            }}</span>
          </div>

          <div class="field-group">
            <label class="field-label">SKU Unit</label>
            <div class="sku-row">
              <select v-model="form.skuUnit" class="sku-select">
                <option value="">No unit</option>
                <option v-for="u in SKU_UNITS" :key="u.code" :value="u.code">
                  {{ u.label }} — {{ u.description }}
                </option>
              </select>
              <span class="sku-sep">—</span>
              <InputText
                v-model="form.skuSuffix"
                placeholder="Optional suffix"
                class="sku-suffix"
              />
            </div>
            <span v-if="fullSku" class="sku-preview">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"
                />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
              SKU: <strong>{{ fullSku }}</strong>
            </span>
          </div>

          <div class="field-row">
            <div class="field-group">
              <label class="field-label">Stock</label>
              <div class="stock-adjust">
                <div class="stock-current">
                  <span class="stock-current__label">Current</span>
                  <span class="stock-current__val">{{
                    form.currentStock
                  }}</span>
                </div>
                <div class="stock-add">
                  <span class="stock-add__label">Add stock</span>
                  <InputText
                    v-model.number="form.stockToAdd"
                    type="number"
                    min="0"
                    placeholder="0"
                    class="stock-add__input"
                  />
                </div>
                <!-- <div class="stock-result">
                  <span class="stock-result__label">New total</span>
                  <span class="stock-result__val">{{
                    form.currentStock + (form.stockToAdd || 0)
                  }}</span>
                </div> -->
              </div>
              <span class="stock-hint">
                Enter how many to <strong>add</strong> — current stock stays,
                this is added on top.
              </span>
            </div>
            <div class="field-group">
              <label class="field-label"
                >Cost Price (IDR) <span class="req">*</span></label
              >
              <InputText
                v-model="form.cost"
                type="number"
                min="0"
                fluid
                :class="{ 'p-invalid': errors.cost }"
              />
              <span v-if="errors.cost" class="field-error">{{
                errors.cost
              }}</span>
              <span
                v-if="form.cost && parseFloat(form.cost) > 0"
                class="cost-preview"
              >
                Cost: {{ formatRupiah(form.cost) }}
              </span>
            </div>
          </div>

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
              :class="{ 'toggle-btn--on': form.isActive }"
              @click="form.isActive = !form.isActive"
            >
              <span class="toggle-btn__thumb" />
            </button>
          </div>
        </FormSection>

        <FormSection
          title="Selling Prices Per Category"
          subtitle="Margin calculated from cost price"
        >
          <div class="price-table">
            <div class="price-row price-row--header">
              <span>Category</span><span>Selling Price (IDR)</span
              ><span>Preview</span><span>Margin</span>
            </div>
            <div
              v-for="(price, index) in visiblePriceInputs"
              :key="price.categoryId"
              class="price-row"
            >
              <div class="price-cat">
                <span
                  class="price-cat__dot"
                  :style="{ background: catColor(price.code) }"
                />
                <span
                  class="price-cat__name"
                  :style="{ color: catColor(price.code) }"
                  >{{ price.categoryName }}</span
                >
              </div>
              <div class="field-group" style="margin: 0">
                <InputText
                  v-model="price.amount"
                  type="number"
                  min="0"
                  fluid
                  :class="{ 'p-invalid': errors.prices[i] }"
                />
                <span v-if="errors.prices[i]" class="field-error">{{
                  errors.prices[i]
                }}</span>
              </div>
              <span class="price-preview">{{
                previewAmount(price.amount)
              }}</span>
              <span v-if="margin(price.amount)" class="margin-badge"
                >+{{ margin(price.amount) }}%</span
              >
              <span v-else class="margin-empty">—</span>
            </div>
          </div>
        </FormSection>

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

    <Dialog
      v-model:visible="showConfirmLeave"
      header="Discard changes?"
      :modal="true"
      :draggable="false"
      :style="{ width: '380px' }"
    >
      <p style="margin: 0; font-size: 13.5px; color: #64748b; line-height: 1.5">
        You have unsaved changes. Are you sure you want to leave?
      </p>
      <template #footer>
        <div style="display: flex; gap: 8px">
          <Button
            label="Cancel"
            severity="secondary"
            outlined
            fluid
            @click="showConfirmLeave = false"
          />
          <Button
            label="Yes, Discard"
            severity="danger"
            fluid
            @click="router.push(`/admin/products/${id}`)"
          />
        </div>
      </template>
    </Dialog>
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
.sku-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.sku-select {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  color: #0f172a;
  background: #fff;
  outline: none;
  cursor: pointer;
  appearance: auto;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}
.sku-select:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}
.sku-sep {
  font-size: 16px;
  color: #94a3b8;
  font-weight: 600;
  flex-shrink: 0;
}
.sku-suffix {
  width: 180px !important;
}
.sku-preview {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: #475569;
  padding: 6px 10px;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}
.sku-preview strong {
  color: #0f172a;
  font-family: "Geist Mono", monospace;
}
.cost-preview {
  font-size: 12px;
  color: #16a34a;
  font-weight: 500;
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
}
.price-table {
  display: flex;
  flex-direction: column;
}
.price-row {
  display: grid;
  grid-template-columns: 140px 1fr 130px 90px;
  align-items: center;
  gap: 14px;
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
}
.margin-badge {
  font-size: 11.5px;
  font-weight: 600;
  padding: 3px 8px;
  background: #f0fdf4;
  color: #16a34a;
  border-radius: 99px;
  text-align: center;
}
.margin-empty {
  color: #94a3b8;
  font-size: 13px;
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
  .sku-row {
    flex-wrap: wrap;
  }
  .price-row {
    grid-template-columns: 120px 1fr 100px;
  }
  .margin-badge,
  .margin-empty {
    display: none;
  }
}
.stock-adjust {
  display: flex;
  align-items: center;
  gap: 16px;
}
.stock-current,
.stock-add,
.stock-result {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.stock-current__label,
.stock-add__label,
.stock-result__label {
  font-size: 11px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.stock-current__val {
  font-size: 18px;
  font-weight: 600;
  color: #94a3b8; /* grayed out — read-only */
  font-family: "Geist Mono", monospace;
  padding: 8px 12px;
  background: #f8fafc; /* muted fill signals read-only */
  border-radius: 8px;
  min-width: 80px;
  text-align: center;
}
.stock-add__input {
  width: 100px !important;
}
.stock-result__val {
  font-size: 18px;
  font-weight: 700;
  color: #16a34a; /* green — the resulting total */
  font-family: "Geist Mono", monospace;
  padding: 8px 12px;
  min-width: 80px;
  text-align: center;
}
.stock-hint {
  font-size: 12px;
  color: #64748b;
  margin-top: 6px;
}
</style>
