<script setup lang="ts">
import { computed } from "vue";
import type { SessionResponse } from "@/types";
import { formatDateTime, toDisplayLabel, trimPath } from "@/utils/valueFormatters";

const props = defineProps<{
  session: SessionResponse | null;
}>();

const emit = defineEmits<{
  (e: "login"): void;
  (e: "logout"): void;
  (e: "refresh"): void;
}>();

const authenticated = computed(() => props.session?.authenticated === true);
const authConfigured = computed(() => props.session?.authConfigured !== false);
const authInProgress = computed(() => props.session?.authInProgress === true);

interface Pill {
  text: string;
}

const view = computed(() => {
  const session = props.session || ({} as SessionResponse);

  if (authenticated.value) {
    const mismatch = session.identityMatch === false;
    return {
      state: mismatch ? "warn" : "ready",
      badge: mismatch
        ? "Identity mismatch"
        : session.tokenType === "application"
          ? "App token"
          : "Delegated",
      message: mismatch
        ? `Token was issued to "${session.claims?.appDisplayName || session.claims?.appId}" — not this app registration. Clear it and log in again.`
        : session.claims?.preferredUsername
          ? `Signed in as ${session.claims.preferredUsername}.`
          : "A persisted Graph token is active.",
      pills: [
        { text: `Expires: ${formatDateTime(session.expiresAt)}` },
        { text: `Scopes: ${(session.grantedScopes || []).length}` },
        session.claims?.appId
          ? { text: `Token app: ${session.claims.appDisplayName || session.claims.appId}` }
          : null,
        session.lastAuthMethod ? { text: `Source: ${toDisplayLabel(session.lastAuthMethod)}` } : null,
        session.tokenCachePresent ? { text: `Cache: ${trimPath(session.tokenCacheFile)}` } : null,
        session.grantedRoles?.length ? { text: `Roles: ${session.grantedRoles.length}` } : null,
      ].filter(Boolean) as Pill[],
    };
  }

  if (authInProgress.value) {
    return {
      state: "warn",
      badge: "Browser login",
      message:
        session.hint ||
        "The tester opened Microsoft login. Finish that sign-in flow, then return here.",
      pills: [
        { text: `Reason: ${toDisplayLabel(session.authReason || "manual")}` },
        { text: `Redirect: ${session.redirectUri || "Not set"}` },
        session.tokenCachePresent ? { text: `Cache: ${trimPath(session.tokenCacheFile)}` } : null,
      ].filter(Boolean) as Pill[],
    };
  }

  return {
    state: authConfigured.value ? "warn" : "danger",
    badge: authConfigured.value ? (session.expired ? "Expired" : "Login required") : "Not configured",
    message: session.hint
      ? session.hint
      : authConfigured.value
        ? "No active persisted Graph token is stored yet."
        : "Set the Graph env vars before starting the login flow.",
    pills: [
      { text: `Redirect: ${session.redirectUri || "Not set"}` },
      { text: session.autoLoginOnStartup ? "Startup login enabled" : "Startup login disabled" },
      session.tokenCachePresent ? { text: `Cache: ${trimPath(session.tokenCacheFile)}` } : null,
    ].filter(Boolean) as Pill[],
  };
});

const loginLabel = computed(() =>
  authInProgress.value
    ? "Login in progress"
    : props.session?.tokenCachePresent
      ? "Re-authenticate"
      : "Login",
);

const loginDisabled = computed(() => !authConfigured.value || authInProgress.value);
const logoutDisabled = computed(() => !authenticated.value && !props.session?.tokenCachePresent);
</script>

<template>
  <article class="status-card">
    <div class="status-card__label">Auth</div>
    <div class="status-badge" :data-state="view.state">{{ view.badge }}</div>
    <p class="status-copy">{{ view.message }}</p>
    <div class="status-meta">
      <span v-for="pill in view.pills" :key="pill.text" class="pill">{{ pill.text }}</span>
    </div>
    <div class="action-row">
      <button class="btn" :disabled="loginDisabled" @click="emit('login')">{{ loginLabel }}</button>
      <button class="btn btn--ghost" :disabled="logoutDisabled" @click="emit('logout')">
        Clear token
      </button>
      <button class="btn btn--ghost" @click="emit('refresh')">Refresh</button>
    </div>
  </article>
</template>
