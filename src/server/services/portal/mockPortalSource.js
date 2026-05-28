export function createMockPortalSource() {
  return {
    describe() {
      return {
        mode: "mock",
        target: "local-demo"
      };
    },

    async fetch() {
      return {
        source: "mock",
        target: "local-demo",
        title: "Mock action queue",
        records: buildMockRecords(),
        raw: JSON.stringify(buildMockRecords(), null, 2)
      };
    }
  };
}

function buildMockRecords() {
  return [
    {
      id: "A-102",
      title: "Site inspection follow-up",
      status: "Open",
      owner: "Jordan",
      priority: "High",
      dueDate: "2026-05-24",
      detail: "Waiting on corrective action evidence from Plant 4."
    },
    {
      id: "A-118",
      title: "Supplier audit prep",
      status: "At Risk",
      owner: "Taylor",
      priority: "Medium",
      dueDate: "2026-05-29",
      detail: "Two required documents are still missing from the portal packet."
    },
    {
      id: "A-141",
      title: "Training exception review",
      status: "Open",
      owner: "Jordan",
      priority: "Low",
      dueDate: "2026-06-02",
      detail: "Aging exception list needs manager acknowledgement."
    }
  ];
}
