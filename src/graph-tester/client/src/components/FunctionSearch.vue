<script setup lang="ts">
import { computed, ref } from "vue";
import type { CatalogService } from "@/types";

const props = defineProps<{
  services: CatalogService[];
  selectedServiceKey: string;
  selectedFunctionName: string;
}>();

const emit = defineEmits<{
  (e: "select", serviceKey: string, functionName: string): void;
}>();

const query = ref("");

interface VisibleGroup {
  key: string;
  label: string;
  functions: { functionName: string; label: string; mutation: boolean }[];
}

const groups = computed<VisibleGroup[]>(() => {
  const needle = query.value.trim().toLowerCase();

  return props.services
    .map((service) => {
      const functions = service.functions
        .filter((fn) => {
          if (!needle) {
            return true;
          }
          return (
            fn.label.toLowerCase().includes(needle) ||
            fn.functionName.toLowerCase().includes(needle) ||
            service.label.toLowerCase().includes(needle)
          );
        })
        .map((fn) => ({
          functionName: fn.functionName,
          label: fn.label,
          mutation: fn.mutation === true,
        }));

      return { key: service.key, label: service.label, functions };
    })
    .filter((group) => group.functions.length > 0);
});

const totalMatches = computed(() =>
  groups.value.reduce((total, group) => total + group.functions.length, 0),
);

function isActive(serviceKey: string, functionName: string): boolean {
  return serviceKey === props.selectedServiceKey && functionName === props.selectedFunctionName;
}

function choose(serviceKey: string, functionName: string): void {
  emit("select", serviceKey, functionName);
}
</script>

<template>
  <div class="fn-search">
    <label class="field-label" for="fn-search-input">Function</label>
    <input
      id="fn-search-input"
      v-model="query"
      type="search"
      placeholder="Search functions or services…"
      autocomplete="off"
    />
    <p class="field-note">{{ totalMatches }} function{{ totalMatches === 1 ? "" : "s" }} shown</p>

    <div class="fn-search__list" role="listbox">
      <p v-if="groups.length === 0" class="fn-search__empty">No functions match “{{ query }}”.</p>

      <section v-for="group in groups" :key="group.key" class="fn-search__group">
        <header class="fn-search__group-header">{{ group.label }}</header>
        <button
          v-for="fn in group.functions"
          :key="fn.functionName"
          type="button"
          class="fn-search__option"
          :class="{ 'is-active': isActive(group.key, fn.functionName) }"
          role="option"
          :aria-selected="isActive(group.key, fn.functionName)"
          @click="choose(group.key, fn.functionName)"
        >
          <span class="fn-search__option-label">{{ fn.label }}</span>
          <span v-if="fn.mutation" class="fn-search__mutation" title="Mutating function">●</span>
        </button>
      </section>
    </div>
  </div>
</template>

<style scoped>
.fn-search__list {
  margin-top: 12px;
  max-height: 420px;
  overflow-y: auto;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: var(--white);
}

.fn-search__empty {
  margin: 0;
  padding: 18px;
  font-size: 0.85rem;
  color: var(--ink-soft);
  text-align: center;
}

.fn-search__group:not(:last-child) {
  border-bottom: 1px solid var(--line);
}

.fn-search__group-header {
  position: sticky;
  top: 0;
  padding: 7px 14px;
  font-family: var(--display-font);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
  background: rgba(247, 243, 234, 0.96);
  backdrop-filter: blur(4px);
  border-bottom: 1px solid var(--line);
}

.fn-search__option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 9px 14px;
  border: none;
  background: transparent;
  text-align: left;
  font-size: 0.88rem;
  color: var(--ink);
  border-left: 3px solid transparent;
}

.fn-search__option:hover {
  background: var(--accent-soft);
}

.fn-search__option.is-active {
  background: var(--accent-soft);
  border-left-color: var(--accent);
  font-weight: 600;
}

.fn-search__mutation {
  color: var(--warning);
  font-size: 0.7rem;
}
</style>
