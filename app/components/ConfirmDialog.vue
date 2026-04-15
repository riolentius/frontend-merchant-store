<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", val: boolean): void;
  (e: "confirm"): void;
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit("update:modelValue", val),
});

const onConfirm = () => {
  emit("confirm");
  visible.value = false;
};
</script>

<template>
  <Dialog
    v-model:visible="visible"
    :header="title ?? 'Are you sure?'"
    :modal="true"
    :draggable="false"
    :style="{ width: '380px' }"
  >
    <p style="margin: 0; font-size: 13.5px; color: #64748b; line-height: 1.5">
      {{ description ?? "This action cannot be undone." }}
    </p>
    <template #footer>
      <div style="display: flex; gap: 8px">
        <Button
          label="Cancel"
          severity="secondary"
          outlined
          fluid
          @click="visible = false"
        />
        <Button
          :label="confirmLabel ?? 'Confirm'"
          :severity="danger !== false ? 'danger' : 'primary'"
          fluid
          @click="onConfirm"
        />
      </div>
    </template>
  </Dialog>
</template>
