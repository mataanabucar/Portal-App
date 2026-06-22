<script setup lang="ts">
import { computed } from "vue";
import type { CatalogFunction, GraphTesterErrorPayload, RunSuccess } from "@/types";
import {
  buildPreviewCards,
  buildScalarGrid,
  type KeyValue,
  type PreviewCard,
} from "@/utils/resultFormatting";
import { formatBytes } from "@/utils/valueFormatters";
import ResultSummary from "./ResultSummary.vue";
import ResultTable from "./ResultTable.vue";
import RawJsonPanel from "./RawJsonPanel.vue";

const props = defineProps<{
  entry: CatalogFunction | null;
  result: RunSuccess | null;
  error: GraphTesterErrorPayload | null;
}>();

const outputHint = computed(() => props.entry?.outputHint || "generic");
const data = computed<any>(() => props.result?.data);

const isArray = computed(() => Array.isArray(data.value));
const isObject = computed(
  () => !isArray.value && data.value !== null && typeof data.value === "object",
);
const isNoBody = computed(() => props.result !== null && data.value === undefined);
const isPrimitive = computed(
  () =>
    props.result !== null &&
    data.value !== undefined &&
    data.value !== null &&
    typeof data.value !== "object",
);

const isBinary = computed(() => isObject.value && outputHint.value === "photoBinary");
const isMime = computed(() => isObject.value && outputHint.value === "mimeContent");
const isGenericObject = computed(() => isObject.value && !isBinary.value && !isMime.value);

const previewCards = computed<PreviewCard[]>(() => {
  if (isArray.value) {
    return buildPreviewCards(outputHint.value, data.value as unknown[]);
  }
  if (isGenericObject.value) {
    return buildPreviewCards(outputHint.value, [data.value]);
  }
  return [];
});

const scalarGrid = computed<KeyValue[]>(() =>
  isGenericObject.value ? buildScalarGrid(data.value) : [],
);

const binaryItems = computed<KeyValue[]>(() => {
  const value = data.value || {};
  return [
    { label: "Status", value: String(value.status ?? "—") },
    { label: "Content type", value: value.contentType || "Unknown" },
    { label: "Size", value: formatBytes(value.sizeBytes) },
    { label: "ETag", value: value.etag || "None" },
  ];
});

const mimeItems = computed<KeyValue[]>(() => {
  const value = data.value || {};
  return [
    { label: "Status", value: String(value.status ?? "—") },
    { label: "Content type", value: value.contentType || "Unknown" },
    { label: "Size", value: formatBytes(value.sizeBytes) },
  ];
});

const mimePreview = computed(() => data.value?.preview || "No preview available.");
const primitiveText = computed(() => String(data.value));
</script>

<template>
  <!-- Error -->
  <article v-if="error" class="error-box">
    <h3>Request failed</h3>
    <p class="result-summary__text">{{ error.message }}</p>
    <div class="key-grid">
      <article class="key-grid__item">
        <p class="key-grid__label">Status</p>
        <p class="key-grid__value">{{ error.status || "-" }}</p>
      </article>
      <article class="key-grid__item">
        <p class="key-grid__label">Code</p>
        <p class="key-grid__value">{{ error.code || "-" }}</p>
      </article>
      <article class="key-grid__item">
        <p class="key-grid__label">Request ID</p>
        <p class="key-grid__value">{{ error.requestId || "None" }}</p>
      </article>
      <article class="key-grid__item">
        <p class="key-grid__label">Hint</p>
        <p class="key-grid__value">{{ error.hint || "Review the request and retry." }}</p>
      </article>
    </div>
  </article>

  <!-- Empty -->
  <article v-else-if="!result" class="empty-state">
    <h3>No results yet</h3>
    <p>Run a function to see summaries, cards, tables, and raw JSON.</p>
  </article>

  <!-- Success -->
  <div v-else class="result-shell">
    <ResultSummary :entry="entry" :result="result" />

    <section class="result-section">
      <article v-if="isNoBody" class="empty-state">
        <h3>No response body</h3>
        <p>This function completed successfully but did not return content.</p>
      </article>

      <!-- Binary (photo/file content) -->
      <div v-else-if="isBinary" class="key-grid">
        <article v-for="item in binaryItems" :key="item.label" class="key-grid__item">
          <p class="key-grid__label">{{ item.label }}</p>
          <p class="key-grid__value">{{ item.value }}</p>
        </article>
      </div>

      <!-- MIME / report stream -->
      <template v-else-if="isMime">
        <div class="key-grid">
          <article v-for="item in mimeItems" :key="item.label" class="key-grid__item">
            <p class="key-grid__label">{{ item.label }}</p>
            <p class="key-grid__value">{{ item.value }}</p>
          </article>
        </div>
        <RawJsonPanel label="MIME preview" :data="null" :text="mimePreview" />
      </template>

      <!-- Array or single object: scalar grid + preview cards + table -->
      <template v-else>
        <div v-if="scalarGrid.length" class="key-grid">
          <article v-for="item in scalarGrid" :key="item.label" class="key-grid__item">
            <p class="key-grid__label">{{ item.label }}</p>
            <p class="key-grid__value">{{ item.value }}</p>
          </article>
        </div>

        <div v-if="previewCards.length" class="preview-grid">
          <article v-for="(card, index) in previewCards" :key="index" class="preview-card">
            <div class="preview-card__title">{{ card.title }}</div>

            <div v-if="!card.mail" class="preview-card__body">
              <div v-for="(line, lineIndex) in card.lines" :key="lineIndex">{{ line }}</div>
            </div>

            <div v-else class="preview-card__body">
              <div class="preview-card__mail-meta">
                <div v-for="(line, metaIndex) in card.mail.metaLines" :key="metaIndex">{{ line }}</div>
              </div>
              <div class="preview-card__mail-body">
                <div class="preview-card__body-label">{{ card.mail.bodyLabel }}</div>
                <!-- eslint-disable-next-line vue/no-v-html -- content sanitized in resultFormatting -->
                <div v-if="card.mail.bodyHtml" class="preview-card__html" v-html="card.mail.bodyHtml"></div>
                <div v-else>{{ card.mail.bodyText || "No preview available." }}</div>
              </div>
            </div>
          </article>
        </div>

        <ResultTable v-if="isArray" :rows="(data as unknown[])" />

        <div v-if="isPrimitive" class="preview-card">
          <div class="preview-card__title">Primitive response</div>
          <div class="preview-card__body">{{ primitiveText }}</div>
        </div>
      </template>
    </section>

    <RawJsonPanel :data="data" />
  </div>
</template>

<style scoped>
.result-shell {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.result-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}

.preview-card {
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  padding: 14px 16px;
  background: var(--white);
}

.preview-card__title {
  font-weight: 700;
  font-size: 0.92rem;
  margin-bottom: 8px;
}

.preview-card__body {
  font-size: 0.84rem;
  color: var(--ink-soft);
  line-height: 1.55;
  word-break: break-word;
}

.preview-card__body-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--accent);
  margin: 8px 0 4px;
}

.preview-card__mail-meta {
  padding-bottom: 8px;
  margin-bottom: 6px;
  border-bottom: 1px solid var(--line);
}

.preview-card__html {
  max-height: 280px;
  overflow: auto;
  background: rgba(13, 45, 82, 0.03);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
}

.preview-card__html :deep(img) {
  max-width: 100%;
  height: auto;
}

.error-box .key-grid {
  margin-top: 12px;
}
</style>
