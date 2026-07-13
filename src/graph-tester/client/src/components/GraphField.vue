<script setup lang="ts">
import { computed } from "vue";
import type { CatalogField, CatalogFunction } from "@/types";
import { formatFieldValue, getFieldSamples } from "@/utils/fieldDefaults";
import SelectFieldPicker from "./SelectFieldPicker.vue";

const props = defineProps<{
  field: CatalogField;
  entry: CatalogFunction;
  modelValue: string | number | boolean;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string | number | boolean): void;
}>();

// Vue's native v-model on type="number" inputs auto-casts every keystroke to
// a JS number (even without the .number modifier). The getter has to accept
// that number back, or it falls through to "" and vModelText's beforeUpdate
// force-overwrites the DOM value, wiping the digit the user just typed.
const stringValue = computed<string>({
  get: () =>
    typeof props.modelValue === "string" || typeof props.modelValue === "number"
      ? String(props.modelValue)
      : "",
  set: (value) => emit("update:modelValue", value),
});

const booleanValue = computed<boolean>({
  get: () => props.modelValue === true,
  set: (value) => emit("update:modelValue", value),
});

const samples = computed(() => getFieldSamples(props.entry, props.field));

const isWide = computed(() => props.field.type === "textarea" || props.field.type === "json");
const hasPicker = computed(() => (props.field.pickerOptions?.length || 0) > 0);

function applySample(value: unknown): void {
  if (props.field.type === "boolean") {
    emit("update:modelValue", Boolean(value));
    return;
  }
  emit("update:modelValue", formatFieldValue(value, props.field));
}
</script>

<template>
  <div class="graph-field" :class="{ 'graph-field--wide': isWide }">
    <div class="graph-field__top">
      <label class="field-label" :for="`field-${field.name}`">
        {{ field.label }}<span v-if="field.required" class="req-mark"> *</span>
      </label>
      <div v-if="samples.length" class="graph-field__samples">
        <button
          v-for="(sample, index) in samples"
          :key="index"
          type="button"
          class="chip-btn"
          @click="applySample(sample.value)"
        >
          {{ sample.label }}
        </button>
      </div>
    </div>

    <!-- select (fixed options) -->
    <select v-if="field.type === 'select'" :id="`field-${field.name}`" v-model="stringValue">
      <option v-for="option in field.options || []" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>

    <!-- boolean -->
    <label v-else-if="field.type === 'boolean'" class="checkbox-field">
      <input :id="`field-${field.name}`" type="checkbox" v-model="booleanValue" />
      <span>{{ field.placeholder || "Toggle this value." }}</span>
    </label>

    <!-- textarea / json -->
    <textarea
      v-else-if="field.type === 'textarea' || field.type === 'json'"
      :id="`field-${field.name}`"
      v-model="stringValue"
      :rows="field.rows || 6"
      :placeholder="field.placeholder || ''"
      spellcheck="false"
    ></textarea>

    <!-- datetime-local -->
    <input
      v-else-if="field.type === 'datetime-local'"
      :id="`field-${field.name}`"
      type="datetime-local"
      v-model="stringValue"
    />

    <!-- number -->
    <input
      v-else-if="field.type === 'number'"
      :id="`field-${field.name}`"
      type="number"
      v-model="stringValue"
      :placeholder="field.placeholder || ''"
    />

    <!-- text (default), optionally with a $select picker -->
    <template v-else>
      <input
        :id="`field-${field.name}`"
        type="text"
        v-model="stringValue"
        :placeholder="field.placeholder || ''"
        autocomplete="off"
      />
      <SelectFieldPicker v-if="hasPicker" :field="field" v-model="stringValue" />
    </template>

    <span v-if="field.description" class="field-note">{{ field.description }}</span>
  </div>
</template>

<style scoped>
.graph-field {
  display: flex;
  flex-direction: column;
}

.graph-field__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 2px;
}

.graph-field__samples {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip-btn {
  border: 1px solid var(--line);
  border-radius: 999px;
  background: transparent;
  padding: 3px 10px;
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--rail);
}

.chip-btn:hover {
  background: var(--accent-soft);
}
</style>
