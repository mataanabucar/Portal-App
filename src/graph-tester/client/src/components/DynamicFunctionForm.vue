<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { CatalogFunction } from "@/types";
import { buildInitialFormValues, collectFormArgs } from "@/utils/fieldDefaults";
import GraphField from "./GraphField.vue";

const props = defineProps<{
  entry: CatalogFunction | null;
  authenticated: boolean;
  authInProgress: boolean;
  running: boolean;
}>();

// Server-computed scope gate: entries with enabled === false are visible only
// via the "show unavailable" toggle and must never be runnable.
const entryEnabled = computed(() => props.entry?.enabled !== false);
const missingScopes = computed(() => props.entry?.missingScopes || []);

const emit = defineEmits<{
  (e: "run", payload: { args: Record<string, unknown>; confirmMutation: boolean }): void;
}>();

const formValues = ref<Record<string, string | boolean>>({});
const confirmMutation = ref(false);

// Rebuild the form whenever the selected function changes; defaults come from
// the server catalog so we never diverge from server-side validation.
watch(
  () => (props.entry ? `${props.entry.service}:${props.entry.functionName}` : ""),
  () => {
    formValues.value = props.entry ? buildInitialFormValues(props.entry) : {};
    confirmMutation.value = false;
  },
  { immediate: true },
);

const hasFields = computed(() => (props.entry?.fields.length || 0) > 0);

const mutationReady = computed(
  () => !props.entry?.mutation || confirmMutation.value === true,
);

const canSubmit = computed(
  () =>
    props.authenticated &&
    props.entry !== null &&
    entryEnabled.value &&
    !props.running &&
    mutationReady.value,
);

const buttonLabel = computed(() => {
  if (props.running) {
    return "Running…";
  }
  if (!props.authenticated) {
    return "Login required";
  }
  return entryEnabled.value ? "Run function" : "Missing scopes";
});

const runHint = computed(() => {
  if (props.authenticated && !entryEnabled.value) {
    return missingScopes.value.length
      ? `The signed-in token is missing: ${missingScopes.value.join(", ")}. Update GRAPH_SCOPES, clear the token cache, and log in again.`
      : "The signed-in token does not grant the scopes this function needs.";
  }
  if (props.authenticated) {
    return props.entry?.mutation
      ? "Mutating functions also require the confirmation checkbox."
      : "The request will run server-side with the stored Graph token.";
  }
  return props.authInProgress
    ? "Authentication is currently in progress. Finish the Microsoft login flow first."
    : "Login is required before protected calls can run.";
});

function onSubmit(): void {
  if (!props.entry || !canSubmit.value) {
    return;
  }
  emit("run", {
    args: collectFormArgs(props.entry, formValues.value),
    confirmMutation: props.entry.mutation ? confirmMutation.value : false,
  });
}
</script>

<template>
  <form class="dyn-form" @submit.prevent="onSubmit">
    <div v-if="hasFields" class="dyn-form__fields">
      <GraphField
        v-for="field in entry?.fields || []"
        :key="field.name"
        :field="field"
        :entry="entry as CatalogFunction"
        :model-value="formValues[field.name]"
        :class="{ 'dyn-form__field--wide': field.type === 'textarea' || field.type === 'json' }"
        @update:model-value="formValues[field.name] = $event"
      />
    </div>

    <article v-else class="empty-state">
      <h3>No inputs required</h3>
      <p>This function can run as-is with the current saved Graph token.</p>
    </article>

    <div v-if="entry?.mutation" class="mutation-bar">
      <label class="checkbox-field">
        <input type="checkbox" v-model="confirmMutation" />
        <span>I understand this action can change live Microsoft 365 data.</span>
      </label>
    </div>

    <div class="dyn-form__actions">
      <button type="submit" class="btn btn--block" :class="{ 'btn--danger': entry?.mutation }" :disabled="!canSubmit">
        {{ buttonLabel }}
      </button>
      <p class="field-note">{{ runHint }}</p>
    </div>
  </form>
</template>

<style scoped>
.dyn-form__fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.dyn-form__field--wide {
  grid-column: 1 / -1;
}

.mutation-bar {
  margin-top: 16px;
  border: 1px solid rgba(176, 57, 47, 0.35);
  border-radius: var(--radius-md);
  padding: 12px 14px;
  background: rgba(176, 57, 47, 0.06);
}

.dyn-form__actions {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.dyn-form__actions .field-note {
  text-align: center;
}

@media (max-width: 720px) {
  .dyn-form__fields {
    grid-template-columns: 1fr;
  }
}
</style>
