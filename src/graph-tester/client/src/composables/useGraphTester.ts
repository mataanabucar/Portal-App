import { computed, reactive } from "vue";
import { graphTesterApi } from "@/api/graphTesterApi";
import {
  GraphTesterRequestError,
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

const canRun = computed(() => isAuthenticated.value && selectedEntry.value !== null && !state.running);

let listenersBound = false;

async function init(): Promise<void> {
  state.loading = true;
  state.startupError = null;

  try {
    const [health, catalog, session] = await Promise.all([
      graphTesterApi.getHealth(),
      graphTesterApi.getCatalog(),
      graphTesterApi.getSession(),
    ]);

    state.health = health;
    state.catalog = catalog.services || [];
    state.session = session;

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
    state.session = await graphTesterApi.getSession();
  } catch {
    // Non-fatal: keep the last known session if a refresh blips.
  }
}

function login(): void {
  graphTesterApi.beginLogin();
}

async function logout(): Promise<void> {
  await graphTesterApi.logout();
  state.session = await graphTesterApi.getSession();
  state.result = null;
  state.error = null;
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
    isAuthenticated,
    totalFunctions,
    canRun,
    init,
    selectFunction,
    refreshSession,
    login,
    logout,
    runFunction,
  };
}
