<script setup lang="ts">
import { computed } from "vue";
import type { HealthResponse } from "@/types";

const props = defineProps<{
  health: HealthResponse | null;
  serviceCount: number;
  functionCount: number;
}>();

const configured = computed(() => Boolean(props.health?.config?.authConfigured));

const badgeState = computed(() => (configured.value ? "ready" : "warn"));
const badgeText = computed(() => (configured.value ? "Configured" : "Missing config"));

const message = computed(() => {
  const cfg = props.health?.config;
  if (configured.value && cfg) {
    return `Graph tester running at ${cfg.origin} with redirect ${cfg.redirectUri}.`;
  }
  return "Graph auth env vars are incomplete. Health is up, but login cannot start yet.";
});
</script>

<template>
  <article class="status-card">
    <div class="status-card__label">Server</div>
    <div class="status-badge" :data-state="badgeState">{{ badgeText }}</div>
    <p class="status-copy">{{ message }}</p>
    <div class="status-meta">
      <span class="pill">Services: {{ serviceCount }}</span>
      <span class="pill">Functions: {{ functionCount }}</span>
      <span class="pill">Port: {{ health?.config?.port ?? "-" }}</span>
      <span class="pill">
        {{ health?.config?.autoLoginOnStartup ? "Startup login enabled" : "Startup login disabled" }}
      </span>
    </div>
  </article>
</template>
