<script setup lang="ts">
/**
 * ConfirmBar — the inline unsaved-changes prompt (never a browser
 * alert()/confirm()): a warn-tinted bar with the question and two buttons.
 * The page renders it when switching files or leaving the route would touch
 * dirty edits.
 */
withDefaults(
  defineProps<{
    message: string;
    confirmLabel: string;
    cancelLabel?: string;
    /** style the confirm action as destructive (discard-and-leave) */
    danger?: boolean;
  }>(),
  { cancelLabel: "Keep editing", danger: false },
);

const emit = defineEmits<{ (e: "confirm"): void; (e: "cancel"): void }>();
</script>

<template>
  <div class="cb" role="alertdialog" aria-live="assertive">
    <span class="cb__icon" aria-hidden="true">!</span>
    <p class="cb__message">{{ message }}</p>
    <div class="cb__actions">
      <button
        class="btn"
        :class="danger ? 'btn--danger' : 'btn--primary'"
        type="button"
        @click="emit('confirm')"
      >
        {{ confirmLabel }}
      </button>
      <button class="btn btn--ghost" type="button" @click="emit('cancel')">
        {{ cancelLabel }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.cb {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  color: var(--mc-status-findings);
  background: var(--mc-status-findings-bg);
  border: 1px solid var(--mc-status-findings);
  border-radius: var(--mc-radius);
}
.cb__icon {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  font-size: 11px;
  font-weight: 700;
  border: 1.5px solid currentColor;
  border-radius: 50%;
}
.cb__message {
  flex: 1;
  margin: 0;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--mc-text);
}
.cb__actions {
  display: flex;
  gap: 6px;
}
</style>
