<script setup lang="ts">
import { ref } from "vue";
import { echoFallback } from "../utils/echo";
import GradientButton from "./GradientButton.vue";
import ResultBanner from "./ResultBanner.vue";

const props = withDefaults(
  defineProps<{
    title?: string;
    invoker?: (message: string) => Promise<string>;
  }>(),
  {
    title: "Echo Command",
    invoker: echoFallback,
  },
);

const message = ref("");
const echoResult = ref("");

async function callEcho() {
  if (!message.value) return;
  try {
    echoResult.value = await props.invoker(message.value);
  } catch (error) {
    echoResult.value = `Error: ${error}`;
  }
}
</script>

<template>
  <div class="demo-card">
    <h2 class="demo-title">{{ title }}</h2>
    <form class="input-form" @submit.prevent="callEcho">
      <input
        v-model="message"
        type="text"
        placeholder="Enter a message to echo"
        class="input-field"
      />
      <GradientButton label="Echo" type="submit" />
    </form>
    <ResultBanner v-if="echoResult" :message="echoResult" />
  </div>
</template>

<style scoped>
/* Surfaced on the kit's theme tokens so the card reads in light AND dark
   (the template styled it for its gradient landing page). */
.demo-card {
  background: var(--mc-surface);
  border-radius: var(--mc-radius-lg);
  padding: 1.25rem;
  border: 1px solid var(--mc-border);
}

.demo-title {
  margin-top: 0;
  font-size: 1.1rem;
  color: var(--mc-text);
  margin-bottom: 1rem;
}

.input-form {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.input-field {
  flex: 1;
  padding: 0.5rem 0.65rem;
  border: 1px solid var(--mc-border);
  border-radius: var(--mc-radius);
  font-size: 0.95rem;
  background: var(--mc-field-bg);
  color: var(--mc-text);
  box-shadow: var(--mc-shadow-inset);
  transition:
    border-color 0.3s,
    background 0.3s;
}

.input-field:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--mc-accent) 45%, var(--mc-border));
  box-shadow: var(--mc-shadow-inset), var(--mc-focus-ring);
}
</style>
