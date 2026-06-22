<script setup lang="ts">
import { computed } from "vue";
import type { CatalogFunction, RunSuccess } from "@/types";
import { formatDateTime } from "@/utils/valueFormatters";

const props = defineProps<{
  entry: CatalogFunction | null;
  result: RunSuccess;
}>();

const pills = computed(() => {
  const list: string[] = [];
  if (props.entry?.serviceLabel) {
    list.push(props.entry.serviceLabel);
  }
  if (props.entry?.label) {
    list.push(props.entry.label);
  }
  list.push(`Duration ${props.result.meta?.durationMs ?? 0} ms`);
  if (props.result.meta?.count !== null && props.result.meta?.count !== undefined) {
    list.push(`Count ${props.result.meta.count}`);
  }
  return list;
});
</script>

<template>
  <section class="result-summary">
    <div class="meta-pill-row">
      <span v-for="pill in pills" :key="pill" class="pill">{{ pill }}</span>
    </div>
    <h3>{{ result.summary || "Completed successfully" }}</h3>
    <p class="result-summary__text">Ran at {{ formatDateTime(result.meta?.timestamp) }}.</p>
  </section>
</template>

<style scoped>
.result-summary h3 {
  font-size: 1.15rem;
}

.result-summary__text {
  margin: 6px 0 0;
  font-size: 0.85rem;
  color: var(--ink-soft);
}
</style>
