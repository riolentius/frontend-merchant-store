<script setup lang="ts">
defineProps<{
  hideView?: boolean;
  hideEdit?: boolean;
  hideDelete?: boolean;
}>();

defineEmits<{
  (e: "view"): void;
  (e: "edit"): void;
  (e: "delete"): void;
}>();
</script>

<template>
  <div class="actions">
    <button v-if="!hideView" class="btn btn--view" @click="$emit('view')">
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      View
    </button>

    <button v-if="!hideEdit" class="btn btn--edit" @click="$emit('edit')">
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
      Edit
    </button>

    <button v-if="!hideDelete" class="btn btn--delete" @click="$emit('delete')">
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
        <path d="M10 11v6m4-6v6" />
        <path d="M9 6V4h6v2" />
      </svg>
      Delete
    </button>
  </div>
</template>

<style scoped>
.actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.12s;
  white-space: nowrap;
}

.btn--view {
  background: #eff6ff;
  color: #2563eb;
}
.btn--view:hover {
  background: #dbeafe;
}
.btn--edit {
  background: #f0fdf4;
  color: #16a34a;
}
.btn--edit:hover {
  background: #dcfce7;
}
.btn--delete {
  background: #fef2f2;
  color: #dc2626;
}
.btn--delete:hover {
  background: #fee2e2;
}
</style>
