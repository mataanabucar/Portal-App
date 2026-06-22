<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    data: unknown;
    label?: string;
    text?: string;
    open?: boolean;
  }>(),
  { label: "Raw JSON", text: "", open: false },
);

// Raw JSON stays collapsed by default (per the UI spec). Accepts either a value
// to stringify or pre-formatted text (used for MIME previews).
const formatted = computed(() => {
  if (props.text) {
    return props.text;
  }
  try {
    return JSON.stringify(props.data, null, 2);
  } catch {
    return String(props.data);
  }
});
</script>

<template>
  <details class="raw-json" :open="open">
    <summary>{{ label }}</summary>
    <pre>{{ formatted }}</pre>
  </details>
</template>

<style scoped>
.raw-json {
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: var(--white);
}

.raw-json > summary {
  cursor: pointer;
  padding: 10px 14px;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--rail);
}

pre {
  margin: 0;
  padding: 14px;
  border-top: 1px solid var(--line);
  overflow-x: auto;
  font-family: var(--mono-font);
  font-size: 0.8rem;
  line-height: 1.5;
  max-height: 460px;
}
</style>
