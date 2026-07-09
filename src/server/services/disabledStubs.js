// Disabled stand-ins for archived services. Callers that consult
// describe().enabled (autoRetrieveEvidence, /api/docs/search, model-status)
// no-op cleanly without any call-site changes.

export function createDisabledKbStub(kind) {
  const reason =
    `Local ${kind} embedding search is archived. Set LEGACY_LOCAL_RAG_ENABLED=true ` +
    "and ASSISTANT_EMBEDDING_MODE=local|cloud in .env to re-enable.";
  return {
    describe() {
      return { enabled: false, reason };
    },
    async search() {
      return [];
    },
    async reload() {
      return { enabled: false, reason };
    }
  };
}
