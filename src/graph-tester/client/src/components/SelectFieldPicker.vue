<script setup lang="ts">
import { computed } from "vue";
import type { CatalogField } from "@/types";
import { formatSelectPickerSummary, parseCommaSeparatedValues } from "@/utils/valueFormatters";

// Checkbox helper for $select fields. The canonical value is the comma-separated
// string in modelValue; checkboxes simply add/remove known option tokens while
// preserving any custom tokens the user typed directly.
const props = defineProps<{
  field: CatalogField;
  modelValue: string;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const options = computed(() => props.field.pickerOptions || []);
const optionValues = computed(() => options.value.map((option) => option.value));

const selectedValues = computed(() => new Set(parseCommaSeparatedValues(props.modelValue)));

const recommendedValues = computed(() => props.field.recommendedValues || []);

const summary = computed(() => {
  const known = optionValues.value.filter((value) => selectedValues.value.has(value)).length;
  const custom = [...selectedValues.value].filter(
    (value) => !optionValues.value.includes(value),
  ).length;
  return formatSelectPickerSummary(known, optionValues.value.length, custom);
});

function isChecked(value: string): boolean {
  return selectedValues.value.has(value);
}

function toggle(value: string, checked: boolean): void {
  const known = new Set(optionValues.value);
  const current = parseCommaSeparatedValues(props.modelValue);
  const custom = current.filter((token) => !known.has(token));
  const checkedKnown = optionValues.value.filter((token) =>
    token === value ? checked : selectedValues.value.has(token),
  );
  emit("update:modelValue", [...checkedKnown, ...custom].join(","));
}

function applyAction(action: "recommended" | "all" | "clear"): void {
  if (action === "recommended") {
    emit("update:modelValue", recommendedValues.value.join(","));
  } else if (action === "all") {
    emit("update:modelValue", optionValues.value.join(","));
  } else {
    emit("update:modelValue", "");
  }
}
</script>

<template>
  <details class="select-picker">
    <summary>
      <span class="select-picker__title">Choose fields</span>
      <span class="select-picker__summary">{{ summary }}</span>
    </summary>

    <div class="select-picker__actions">
      <button type="button" class="chip-btn" @click="applyAction('recommended')">Recommended</button>
      <button type="button" class="chip-btn" @click="applyAction('all')">All</button>
      <button type="button" class="chip-btn" @click="applyAction('clear')">Clear</button>
    </div>

    <div class="select-picker__grid">
      <label v-for="option in options" :key="option.value" class="select-picker__option">
        <input
          type="checkbox"
          :checked="isChecked(option.value)"
          @change="toggle(option.value, ($event.target as HTMLInputElement).checked)"
        />
        <span>{{ option.label }}</span>
      </label>
    </div>
  </details>
</template>

<style scoped>
.select-picker {
  margin-top: 8px;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: var(--white);
  padding: 4px 0;
}

.select-picker > summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 12px;
  cursor: pointer;
  list-style: none;
}

.select-picker__title {
  font-size: 0.82rem;
  font-weight: 600;
}

.select-picker__summary {
  font-size: 0.76rem;
  color: var(--ink-soft);
}

.select-picker__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 4px 12px 10px;
  border-bottom: 1px solid var(--line);
}

.chip-btn {
  border: 1px solid var(--line);
  border-radius: 999px;
  background: transparent;
  padding: 4px 11px;
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--rail);
}

.chip-btn:hover {
  background: var(--accent-soft);
}

.select-picker__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 6px 14px;
  padding: 12px;
  max-height: 220px;
  overflow-y: auto;
}

.select-picker__option {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 0.82rem;
}

.select-picker__option input {
  width: 15px;
  height: 15px;
  accent-color: var(--accent);
}
</style>
