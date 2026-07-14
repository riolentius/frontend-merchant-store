<script setup lang="ts">
import { SKU_UNITS } from "../../../config/skuUnits";

definePageMeta({ layout: "dashboard" });

const { $api } = useNuxtApp();
const { fetchCategories, categories } = useCategories();
const { createPrices, formatRupiah } = useProducts();
const router = useRouter();
const ZERO_ALLOWED_CODES = ["FREE"];
const {
  categories: productCategories,
  fetchProductCategories,
  createProductCategory,
  normalize,
} = useProductCategories();
const { notifyError } = useNotify();
const isLoading = ref(false);
const showConfirmLeave = ref(false);

const showNewCategory = ref(false);
const newCategoryName = ref("");
const isCreatingCategory = ref(false);

const liveNewName = computed(() => normalize(newCategoryName.value));
const newNameDuplicate = computed(
  () =>
    !!liveNewName.value &&
    productCategories.value.some((c) => c.name === liveNewName.value),
);
const form = reactive({
  name: "",
  skuUnit: "",
  skuSuffix: "",
  stockOnHand: 0,
  cost: "",
  categoryId: "",
});

// Price per category
const priceInputs = ref<
  { categoryId: string; categoryName: string; code: string; amount: string }[]
>([]);

const allowsZero = (code: string) => ZERO_ALLOWED_CODES.includes(code);

const enforceCostFloor = (p: {
  code: string;
  amount: string;
  categoryName: string;
}) => {
  if (allowsZero(p.code)) return;
  const amt = parseFloat(p.amount);
  const cost = parseFloat(form.cost);
  if (isNaN(cost) || cost <= 0) return;
  if (!isNaN(amt) && amt > 0 && amt < cost) {
    p.amount = String(cost);
    notifyWarn(
      "Adjusted to cost",
      `${p.categoryName} can't be below cost — set to ${formatRupiah(cost)}.`,
    );
  }
};

const submitNewCategory = async () => {
  if (!liveNewName.value || newNameDuplicate.value) return;
  isCreatingCategory.value = true;
  try {
    const created = await createProductCategory(newCategoryName.value);
    form.categoryId = created.id; // auto-select the new one
    showNewCategory.value = false;
    newCategoryName.value = "";
  } catch (err) {
    notifyError(err, "Failed to create category");
  } finally {
    isCreatingCategory.value = false;
  }
};

watch(
  () => form.cost,
  () => {
    priceInputs.value.forEach((p) => enforceCostFloor(p));
  },
);

const errors = reactive({
  name: "",
  skuUnit: "",
  cost: "",
  categoryId: "",
  prices: [] as string[],
});

onMounted(async () => {
  await Promise.all([fetchCategories(), fetchProductCategories()]);
  priceInputs.value = categories.value
    .filter((category) => category.code !== "WAREHOUSE")
    .map((c) => ({
      categoryId: c.id,
      categoryName: c.name,
      code: c.code,
      amount: "",
    }));
  errors.prices = categories.value.map(() => "");
});

const costNum = parseFloat(form.cost);
errors.prices = priceInputs.value.map((p) => {
  const amt = parseFloat(p.amount);

  if (allowsZero(p.code)) {
    return p.amount === "" || isNaN(amt) || amt < 0
      ? "Enter a price (0 is allowed)"
      : "";
  }

  if (!p.amount || isNaN(amt) || amt <= 0)
    return "Price must be greater than 0";
  if (!isNaN(costNum) && amt < costNum) return "Price cannot be below cost";
  return "";
});

const belowCost = (p: { code: string; amount: string }) => {
  if (allowsZero(p.code)) return false;
  const amt = parseFloat(p.amount);
  const cost = parseFloat(form.cost);
  return !isNaN(amt) && !isNaN(cost) && amt > 0 && amt < cost;
};

// Build the full SKU string: UNIT-SUFFIX or just UNIT
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

const validate = () => {
  errors.name = form.name.trim() ? "" : "Product name is required";
  errors.skuUnit = form.skuUnit ? "" : "Please select a SKU unit";
  errors.category = form.categoryId ? "" : "Please select a category";
  errors.cost =
    form.cost && parseFloat(form.cost) >= 0 ? "" : "Cost price is required";
  errors.prices = priceInputs.value.map((p) =>
    p.amount && parseFloat(p.amount) > 0 ? "" : "Price must be greater than 0",
  );
  return (
    !errors.name &&
    !errors.skuUnit &&
    !errors.category &&
    !errors.cost &&
    errors.prices.every((e) => !e)
  );
};

const handleSave = async () => {
  if (!validate()) return;
  isLoading.value = true;
  try {
    const product = await $api<{ id: string }>("/products", {
      method: "POST",
      body: {
        name: form.name.trim(),
        categoryId: form.categoryId,
        sku: fullSku.value || undefined,
        cost: form.cost,
        stockOnHand: form.stockOnHand,
      },
    });
    await createPrices(
      product.id,
      priceInputs.value.map((p) => ({
        categoryId: p.categoryId,
        amount: p.amount,
      })),
    );
    router.push("/admin/products");
  } catch (err) {
    console.error("Failed to create product:", err);
  } finally {
    isLoading.value = false;
  }
};

const previewAmount = (amount: string) => {
  const n = parseFloat(amount);
  return n > 0 ? formatRupiah(n) : "—";
};

// Margin preview per category
const margin = (sellingAmount: string) => {
  const sell = parseFloat(sellingAmount);
  const cost = parseFloat(form.cost);
  if (!sell || !cost || cost <= 0) return null;
  const pct = (((sell - cost) / cost) * 100).toFixed(1);
  return { amount: formatRupiah(sell - cost), pct };
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

    <form novalidate @submit.prevent="handleSave">
      <div class="form-layout">
        <!-- Product Info -->
        <FormSection
          title="Product Information"
          subtitle="Name, unit, stock and cost price"
        >
          <div class="field-group">
            <label class="field-label"
              >Product Name <span class="req">*</span></label
            >
            <InputText
              v-model="form.name"
              placeholder="e.g. Beras Premium"
              fluid
              :class="{ 'p-invalid': errors.name }"
            />
            <span v-if="errors.name" class="field-error">{{
              errors.name
            }}</span>
          </div>

          <!-- SKU Unit dropdown + suffix -->
          <div class="field-group">
            <label class="field-label"
              >SKU Unit <span class="req">*</span></label
            >
            <div class="sku-row">
              <select
                v-model="form.skuUnit"
                class="sku-select"
                :class="{ 'sku-select--error': errors.skuUnit }"
              >
                <option value="" disabled>Select unit…</option>
                <option v-for="u in SKU_UNITS" :key="u.code" :value="u.code">
                  {{ u.label }} — {{ u.description }}
                </option>
              </select>
              <span class="sku-sep">—</span>
              <InputText
                v-model="form.skuSuffix"
                placeholder="Optional suffix (e.g. 001)"
                class="sku-suffix"
              />
            </div>
            <span v-if="errors.skuUnit" class="field-error">{{
              errors.skuUnit
            }}</span>
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
              SKU will be: <strong>{{ fullSku }}</strong>
            </span>
          </div>

          <div class="field-group">
            <label class="field-label"
              >Category <span class="req">*</span></label
            >

            <div v-if="!showNewCategory" class="cat-row">
              <select
                v-model="form.categoryId"
                class="cat-select"
                :class="{ 'cat-select--error': errors.category }"
              >
                <option value="" disabled>Select category…</option>
                <option
                  v-for="c in productCategories"
                  :key="c.id"
                  :value="c.id"
                >
                  {{ c.name }}
                </option>
              </select>
              <button
                type="button"
                class="cat-new-btn"
                @click="showNewCategory = true"
              >
                + New
              </button>
            </div>

            <div v-else class="cat-new">
              <InputText
                v-model="newCategoryName"
                placeholder="e.g. BERAS"
                fluid
                @keyup.enter="submitNewCategory"
              />
              <button
                type="button"
                class="cat-new-btn cat-new-btn--save"
                :disabled="
                  !liveNewName || newNameDuplicate || isCreatingCategory
                "
                @click="submitNewCategory"
              >
                {{ isCreatingCategory ? "Adding…" : "Add" }}
              </button>
              <button
                type="button"
                class="cat-new-btn"
                @click="
                  showNewCategory = false;
                  newCategoryName = '';
                "
              >
                Cancel
              </button>
            </div>

            <span v-if="newCategoryName && !newNameDuplicate" class="cat-hint">
              Will be saved as <strong>{{ liveNewName }}</strong>
            </span>
            <span v-if="newNameDuplicate" class="cat-hint cat-hint--dupe">
              “{{ liveNewName }}” already exists — pick it from the list.
            </span>
            <span v-if="errors.category" class="field-error">{{
              errors.category
            }}</span>
          </div>

          <div class="field-row">
            <div class="field-group">
              <label class="field-label">Initial Stock</label>
              <InputText
                v-model.number="form.stockOnHand"
                type="number"
                min="0"
                placeholder="0"
                fluid
              />
            </div>
            <div class="field-group">
              <label class="field-label"
                >Cost Price (IDR) <span class="req">*</span></label
              >
              <InputText
                v-model="form.cost"
                type="number"
                min="0"
                placeholder="e.g. 50000"
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
        </FormSection>

        <!-- Pricing Per Category -->
        <FormSection
          title="Selling Prices Per Category"
          subtitle="Set selling prices — margin is calculated from cost price"
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
            Prices are applied based on the customer's category during a
            transaction.
          </div>

          <div class="price-table">
            <div class="price-row price-row--header">
              <span>Category</span>
              <span>Selling Price (IDR)</span>
              <span>Preview</span>
              <span>Margin</span>
            </div>
            <div
              v-for="(p, i) in priceInputs"
              :key="p.categoryId"
              class="price-row"
            >
              <div class="price-cat">
                <span
                  class="price-cat__dot"
                  :style="{ background: catColor(p.code) }"
                />
                <span
                  class="price-cat__name"
                  :style="{ color: catColor(p.code) }"
                  >{{ p.categoryName }}</span
                >
              </div>
              <div class="field-group" style="margin: 0">
                <InputText
                  v-model="p.amount"
                  type="number"
                  min="0"
                  placeholder="0"
                  fluid
                  :class="{ 'p-invalid': errors.prices[i] }"
                  @blur="enforceCostFloor(p)"
                />
                <span v-if="errors.prices[i]" class="field-error">{{
                  errors.prices[i]
                }}</span>
              </div>
              <span class="price-preview">{{ previewAmount(p.amount) }}</span>
              <span
                v-if="margin(p.amount)"
                class="margin-badge"
                :class="{ 'margin-badge--loss': belowCost(p) }"
              >
                {{ belowCost(p) ? "" : "+" }}{{ margin(p.amount)!.pct }}%
              </span>
              <span v-else class="margin-empty">—</span>
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
            @click="router.push('/admin/products')"
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

/* SKU row */
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
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
  appearance: auto;
}
.sku-select:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}
.sku-select--error {
  border-color: #ef4444;
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

/* Price table */
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
  .sku-suffix {
    width: 100% !important;
  }
  .price-row {
    grid-template-columns: 120px 1fr 100px;
  }
  .margin-badge,
  .margin-empty {
    display: none;
  }
}

.margin-badge--loss {
  background: #fef2f2;
  color: #dc2626;
}

.cat-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.cat-new {
  display: flex;
  gap: 8px;
  align-items: center;
}
.cat-select {
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
.cat-select:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}
.cat-select--error {
  border-color: #ef4444;
}
.cat-new-btn {
  padding: 9px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  font-size: 13px;
  font-weight: 500;
  color: #475569;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  transition: background 0.15s;
}
.cat-new-btn:hover:not(:disabled) {
  background: #f8fafc;
}
.cat-new-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.cat-new-btn--save {
  background: #2563eb;
  color: #fff;
  border-color: #2563eb;
}
.cat-new-btn--save:hover:not(:disabled) {
  background: #1d4ed8;
}
.cat-hint {
  font-size: 12px;
  color: #64748b;
}
.cat-hint strong {
  font-family: "Geist Mono", monospace;
  color: #0f172a;
}
.cat-hint--dupe {
  color: #b45309;
}
</style>
