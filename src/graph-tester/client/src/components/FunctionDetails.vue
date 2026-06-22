<script setup lang="ts">
import { computed } from "vue";
import type { CatalogFunction } from "@/types";

const props = defineProps<{
  entry: CatalogFunction | null;
}>();

// Mutation note is surfaced first, matching the original tester's warning stack.
const warnings = computed(() => {
  if (!props.entry) {
    return [];
  }
  const list = [...(props.entry.warnings || [])];
  if (props.entry.mutation) {
    list.unshift("This function can mutate live Microsoft 365 data.");
  }
  return list;
});
</script>

<template>
  <div class="fn-card">
    <div class="fn-card__header">
      <div>
        <p class="fn-card__service">{{ entry?.serviceLabel || "Graph service" }}</p>
        <h3>{{ entry?.label || "Choose a function" }}</h3>
      </div>
      <span v-if="entry?.mutation" class="fn-card__mutation">Mutation</span>
    </div>

    <p class="fn-card__description">
      {{ entry?.description || "Function details will appear here." }}
    </p>

    <div v-if="warnings.length" class="fn-card__warnings">
      <article v-for="(warning, index) in warnings" :key="index" class="warning-callout">
        <strong>Warning</strong>
        <p>{{ warning }}</p>
      </article>
    </div>
  </div>
</template>

<style scoped>
.fn-card {
  margin-top: 18px;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  padding: 18px 20px;
  background: var(--white);
}

.fn-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.fn-card__service {
  margin: 0 0 4px;
  font-family: var(--display-font);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent);
}

.fn-card__header h3 {
  font-size: 1.15rem;
}

.fn-card__mutation {
  flex-shrink: 0;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  background: rgba(187, 109, 22, 0.16);
  color: var(--warning);
}

.fn-card__description {
  margin: 12px 0 0;
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--ink-soft);
}

.fn-card__warnings {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.warning-callout {
  border: 1px solid rgba(187, 109, 22, 0.35);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  background: rgba(187, 109, 22, 0.08);
}

.warning-callout strong {
  display: block;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--warning);
  margin-bottom: 4px;
}

.warning-callout p {
  margin: 0;
  font-size: 0.85rem;
  color: var(--ink);
}
</style>
