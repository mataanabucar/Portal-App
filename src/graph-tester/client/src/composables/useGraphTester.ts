import { computed, reactive } from "vue";
import { graphTesterApi } from "@/api/graphTesterApi";
import {
  GraphTesterRequestError,
  type CapabilitiesResponse,
  type CatalogFunction,
  type CatalogService,
  type GraphTesterErrorPayload,
  type HealthResponse,
  type RunSuccess,
  type SessionResponse,
} from "@/types";

// Module-scoped reactive state: a single shared store for every component.
// All network access goes through graphTesterApi, which only ever calls the
// local Express server.
interface GraphTesterState {
  loading: boolean;
  startupError: string | null;
  catalog: CatalogService[];
  capabilities: CapabilitiesResponse | null;
  showUnavailable: boolean;
  health: HealthResponse | null;
  session: SessionResponse | null;
  selectedServiceKey: string;
  selectedFunctionName: string;
  running: boolean;
  result: RunSuccess | null;
  error: GraphTesterErrorPayload | null;
}

const state = reactive<GraphTesterState>({
  loading: true,
  startupError: null,
  catalog: [],
  capabilities: null,
  showUnavailable: false,
  health: null,
  session: null,
  selectedServiceKey: "",
  selectedFunctionName: "",
  running: false,
  result: null,
  error: null,
});

const selectedService = computed<CatalogService | null>(
  () => state.catalog.find((service) => service.key === state.selectedServiceKey) || null,
);

const selectedEntry = computed<CatalogFunction | null>(
  () =>
    selectedService.value?.functions.find(
      (entry) => entry.functionName === state.selectedFunctionName,
    ) || null,
);

const isAuthenticated = computed(() => state.session?.authenticated === true);

const totalFunctions = computed(() =>
  state.catalog.reduce((total, service) => total + service.functions.length, 0),
);

const enabledFunctionCount = computed(
  () => state.capabilities?.counts.enabled ?? totalFunctions.value,
);

const disabledFunctionCount = computed(() => state.capabilities?.counts.disabled ?? 0);

// The server flags each catalog entry with enabled/missingScopes; disabled
// entries are visible only via the toggle and can never be run.
const selectedEntryEnabled = computed(() => selectedEntry.value?.enabled !== false);

const identityMismatch = computed(
  () => isAuthenticated.value && state.session?.identityMatch === false,
);

const canRun = computed(
  () =>
    isAuthenticated.value &&
    selectedEntry.value !== null &&
    selectedEntryEnabled.value &&
    !state.running,
);

let listenersBound = false;

async function init(): Promise<void> {
  state.loading = true;
  state.startupError = null;

  try {
    const [health, catalog, session] = await Promise.all([
      graphTesterApi.getHealth(),
      graphTesterApi.getCatalog(state.showUnavailable),
      graphTesterApi.getSession(),
    ]);

    state.health = health;
    state.catalog = catalog.services || [];
    state.session = session;
    void refreshCapabilities();

    const firstService = state.catalog[0];
    const firstFn = firstService?.functions[0];
    if (firstFn) {
      state.selectedServiceKey = firstService.key;
      state.selectedFunctionName = firstFn.functionName;
    }

    bindWindowListeners();
  } catch (error) {
    state.startupError =
      error instanceof Error ? error.message : "The Graph tester could not finish booting.";
  } finally {
    state.loading = false;
  }
}

// Refresh the session when the user returns to the tab — picks up a token that
// was completed in the separate Microsoft login window.
function bindWindowListeners(): void {
  if (listenersBound) {
    return;
  }
  listenersBound = true;

  window.addEventListener("focus", () => {
    void refreshSession();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void refreshSession();
    }
  });
}

function selectFunction(serviceKey: string, functionName: string): void {
  state.selectedServiceKey = serviceKey;
  state.selectedFunctionName = functionName;
}

async function refreshSession(): Promise<void> {
  try {
    const previouslyAuthenticated = state.session?.authenticated === true;
    state.session = await graphTesterApi.getSession();

    // Catalog contents depend on the signed-in token's scopes — reload when
    // the auth state flips (e.g. login completed in another window).
    if (state.session.authenticated !== previouslyAuthenticated) {
      await reloadCatalog();
    }
  } catch {
    // Non-fatal: keep the last known session if a refresh blips.
  }
}

async function refreshCapabilities(): Promise<void> {
  try {
    state.capabilities = await graphTesterApi.getCapabilities();
  } catch {
    // Non-fatal: capabilities are informational.
  }
}

async function reloadCatalog(): Promise<void> {
  try {
    const catalog = await graphTesterApi.getCatalog(state.showUnavailable);
    state.catalog = catalog.services || [];
    void refreshCapabilities();

    const stillSelected = state.catalog
      .find((service) => service.key === state.selectedServiceKey)
      ?.functions.some((entry) => entry.functionName === state.selectedFunctionName);

    if (!stillSelected) {
      const firstService = state.catalog[0];
      state.selectedServiceKey = firstService?.key || "";
      state.selectedFunctionName = firstService?.functions[0]?.functionName || "";
    }
  } catch {
    // Keep the previous catalog on transient failures.
  }
}

async function setShowUnavailable(show: boolean): Promise<void> {
  state.showUnavailable = show;
  await reloadCatalog();
}

function login(): void {
  graphTesterApi.beginLogin();
}

async function logout(): Promise<void> {
  await graphTesterApi.logout();
  state.session = await graphTesterApi.getSession();
  state.result = null;
  state.error = null;
  await reloadCatalog();
}

async function runFunction(
  args: Record<string, unknown>,
  confirmMutation: boolean,
): Promise<void> {
  const entry = selectedEntry.value;
  if (!entry) {
    return;
  }

  state.running = true;
  state.error = null;

  try {
    const result = await graphTesterApi.run({
      service: entry.service,
      functionName: entry.functionName,
      args,
      confirmMutation,
    });
    state.result = result;
    // A successful call may have refreshed the token server-side.
    void refreshSession();
  } catch (error) {
    state.result = null;
    state.error =
      error instanceof GraphTesterRequestError
        ? error.payload
        : {
            status: 500,
            code: "GraphTesterError",
            message: error instanceof Error ? error.message : "Graph tester request failed.",
            requestId: null,
            hint: "Review the input and Graph permissions, then retry.",
          };
  } finally {
    state.running = false;
  }
}

export function useGraphTester() {
  return {
    // Mutations are funneled through the methods below; components treat this
    // as read-only state.
    state,
    selectedService,
    selectedEntry,
    selectedEntryEnabled,
    isAuthenticated,
    identityMismatch,
    totalFunctions,
    enabledFunctionCount,
    disabledFunctionCount,
    canRun,
    init,
    selectFunction,
    refreshSession,
    refreshCapabilities,
    reloadCatalog,
    setShowUnavailable,
    login,
    logout,
    runFunction,
  };
}
