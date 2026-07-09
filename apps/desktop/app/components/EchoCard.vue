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
.demo-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.demo-title {
  margin-top: 0;
  font-size: 1.5rem;
  color: #fff;
  margin-bottom: 1.5rem;
}

.input-form {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.input-field {
  flex: 1;
  padding: 0.75rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  font-size: 1rem;
  background: rgba(255, 255, 255, 0.9);
  color: #333;
  transition:
    border-color 0.3s,
    background 0.3s;
}

.input-field:focus {
  outline: none;
  border-color: #a8edea;
  background: #fff;
}
</style>
