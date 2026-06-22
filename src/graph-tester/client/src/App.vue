<script setup lang="ts">
import { onMounted } from "vue";
import { useGraphTester } from "@/composables/useGraphTester";
import AuthStatusCard from "@/components/AuthStatusCard.vue";
import ServerStatusCard from "@/components/ServerStatusCard.vue";
import FunctionSearch from "@/components/FunctionSearch.vue";
import FunctionDetails from "@/components/FunctionDetails.vue";
import DynamicFunctionForm from "@/components/DynamicFunctionForm.vue";
import ResultsPanel from "@/components/ResultsPanel.vue";

const {
  state,
  selectedEntry,
  isAuthenticated,
  totalFunctions,
  init,
  selectFunction,
  refreshSession,
  login,
  logout,
  runFunction,
} = useGraphTester();

onMounted(() => {
  void init();
});

function onRun(payload: { args: Record<string, unknown>; confirmMutation: boolean }): void {
  void runFunction(payload.args, payload.confirmMutation);
}
</script>

<template>
  <div class="app-shell">
    <header class="masthead">
      <div class="masthead-copy">
        <p class="eyebrow">Standalone Graph Lab</p>
        <h1>Microsoft Graph Tester</h1>
        <p class="lede">
          A local control bench for exercising the repo's Graph service layer without exposing
          secrets or touching the main portal app. Express owns auth and Graph calls — this UI only
          renders them.
        </p>
      </div>

      <AuthStatusCard
        :session="state.session"
        @login="login"
        @logout="logout"
        @refresh="refreshSession"
      />

      <ServerStatusCard
        :health="state.health"
        :service-count="state.catalog.length"
        :function-count="totalFunctions"
      />
    </header>

    <article v-if="state.startupError" class="error-box">
      <h3>Startup failed</h3>
      <p class="result-summary__text">{{ state.startupError }}</p>
      <p class="field-note">
        Keep the local Graph tester server running, then refresh. In dev, make sure the Vite proxy
        target points at the Express origin.
      </p>
    </article>

    <p v-else-if="state.loading" class="boot-note">Loading tester catalog and session…</p>

    <main v-else class="workspace">
      <aside class="control-rail">
        <section class="panel">
          <div class="panel-head">
            <p class="panel-kicker">1. Choose</p>
            <h2>Service and function</h2>
          </div>

          <FunctionSearch
            :services="state.catalog"
            :selected-service-key="state.selectedServiceKey"
            :selected-function-name="state.selectedFunctionName"
            @select="selectFunction"
          />

          <FunctionDetails :entry="selectedEntry" />
        </section>
      </aside>

      <div class="main-stack">
        <section class="panel">
          <div class="panel-head">
            <p class="panel-kicker">2. Run</p>
            <h2>Dynamic input form</h2>
          </div>

          <DynamicFunctionForm
            :entry="selectedEntry"
            :authenticated="isAuthenticated"
            :auth-in-progress="state.session?.authInProgress === true"
            :running="state.running"
            @run="onRun"
          />
        </section>

        <section class="panel panel--results">
          <div class="panel-head">
            <p class="panel-kicker">3. Inspect</p>
            <h2>Readable results</h2>
          </div>

          <ResultsPanel :entry="selectedEntry" :result="state.result" :error="state.error" />
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
.boot-note {
  text-align: center;
  color: var(--ink-soft);
  font-size: 0.95rem;
  padding: 40px 0;
}

.control-rail {
  position: sticky;
  top: 16px;
}
</style>
