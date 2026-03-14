<script setup lang="ts">
defineProps<{
  modelValue: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
}>();

defineEmits<{
  (e: "update:modelValue", val: boolean): void;
  (e: "confirm"): void;
}>();
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="modelValue"
        class="overlay"
        @click.self="$emit('update:modelValue', false)"
      >
        <div class="dialog">
          <div
            class="dialog__icon"
            :class="
              danger !== false ? 'dialog__icon--danger' : 'dialog__icon--info'
            "
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <path
                d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
              />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>

          <h3 class="dialog__title">{{ title ?? "Are you sure?" }}</h3>
          <p class="dialog__desc">
            {{ description ?? "This action cannot be undone." }}
          </p>

          <div class="dialog__actions">
            <button
              class="dialog__btn dialog__btn--cancel"
              @click="$emit('update:modelValue', false)"
            >
              Cancel
            </button>
            <button
              class="dialog__btn"
              :class="
                danger !== false
                  ? 'dialog__btn--danger'
                  : 'dialog__btn--confirm'
              "
              @click="$emit('confirm')"
            >
              {{ confirmLabel ?? "Confirm" }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(2px);
}

.dialog {
  background: #fff;
  border-radius: 14px;
  padding: 28px;
  width: 100%;
  max-width: 380px;
  margin: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
}

.dialog__icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}

.dialog__icon--danger {
  background: #fef2f2;
  color: #dc2626;
}
.dialog__icon--info {
  background: #eff6ff;
  color: #2563eb;
}

.dialog__title {
  font-size: 17px;
  font-weight: 600;
  color: #0f172a;
  margin: 0;
}
.dialog__desc {
  font-size: 13.5px;
  color: #64748b;
  margin: 0;
  line-height: 1.5;
}

.dialog__actions {
  display: flex;
  gap: 10px;
  margin-top: 8px;
  width: 100%;
}

.dialog__btn {
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  font-family: inherit;
  transition: background 0.15s;
}

.dialog__btn--cancel {
  background: #f1f5f9;
  color: #475569;
}
.dialog__btn--cancel:hover {
  background: #e2e8f0;
}
.dialog__btn--danger {
  background: #dc2626;
  color: #fff;
}
.dialog__btn--danger:hover {
  background: #b91c1c;
}
.dialog__btn--confirm {
  background: #2563eb;
  color: #fff;
}
.dialog__btn--confirm:hover {
  background: #1d4ed8;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
