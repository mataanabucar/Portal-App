const elements = {
  authBadge: document.querySelector("#auth-badge"),
  authMessage: document.querySelector("#auth-message"),
  authMeta: document.querySelector("#auth-meta"),
  catalogMeta: document.querySelector("#catalog-meta"),
  form: document.querySelector("#function-form"),
  formFields: document.querySelector("#form-fields"),
  functionDescription: document.querySelector("#function-description"),
  functionSelect: document.querySelector("#function-select"),
  functionWarnings: document.querySelector("#function-warnings"),
  healthBadge: document.querySelector("#health-badge"),
  healthMessage: document.querySelector("#health-message"),
  loginButton: document.querySelector("#login-button"),
  logoutButton: document.querySelector("#logout-button"),
  mutationBar: document.querySelector("#mutation-bar"),
  mutationConfirm: document.querySelector("#mutation-confirm"),
  mutationFlag: document.querySelector("#mutation-flag"),
  refreshSessionButton: document.querySelector("#refresh-session-button"),
  resultsShell: document.querySelector("#results-shell"),
  runButton: document.querySelector("#run-button"),
  runHint: document.querySelector("#run-hint"),
  selectedFunctionLabel: document.querySelector("#selected-function-label"),
  selectedServiceLabel: document.querySelector("#selected-service-label"),
  serviceDescription: document.querySelector("#service-description"),
  serviceSelect: document.querySelector("#service-select"),
};

const state = {
  catalog: [],
  health: null,
  session: null,
  selectedServiceKey: "",
  selectedFunctionName: "",
};

const TABLE_COLUMNS = [
  { key: "id", label: "ID", getter: (item) => item.id },
  { key: "displayName", label: "Name", getter: (item) => item.displayName },
  {
    key: "mail",
    label: "Mail",
    getter: (item) =>
      item.mail ||
      item.userPrincipalName ||
      item.emailAddress?.address ||
      item.scoredEmailAddresses?.[0]?.address,
  },
  {
    key: "subject",
    label: "Subject",
    getter: (item) => item.subject,
  },
  {
    key: "from",
    label: "From",
    getter: (item) =>
      item.from?.emailAddress?.address ||
      item.from?.user?.displayName ||
      item.organizer?.emailAddress?.address,
  },
  {
    key: "receivedDateTime",
    label: "Received",
    getter: (item) => item.receivedDateTime,
  },
  {
    key: "isRead",
    label: "Read",
    getter: (item) => item.isRead,
  },
  {
    key: "start",
    label: "Start",
    getter: (item) => item.start?.dateTime || item.start,
  },
  {
    key: "end",
    label: "End",
    getter: (item) => item.end?.dateTime || item.end,
  },
  {
    key: "location",
    label: "Location",
    getter: (item) => item.location?.displayName || item.location,
  },
  {
    key: "topic",
    label: "Topic",
    getter: (item) => item.topic,
  },
  {
    key: "memberSummary",
    label: "Participants",
    getter: (item) => item.memberSummary,
  },
  {
    key: "chatType",
    label: "Chat type",
    getter: (item) => item.chatType,
  },
  {
    key: "createdDateTime",
    label: "Created",
    getter: (item) => item.createdDateTime,
  },
];

init().catch((error) => {
  renderGlobalFailure(error);
});

async function init() {
  bindEvents();
  setRunBusyState(false);

  const [healthPayload, catalogPayload, sessionPayload] = await Promise.all([
    requestJson("/api/health"),
    requestJson("/api/graph-tester/catalog"),
    requestJson("/api/graph-tester/session"),
  ]);

  state.health = healthPayload;
  state.catalog = catalogPayload.services || [];
  state.session = sessionPayload;

  renderHealthState();
  populateServiceSelect();
  renderSessionState();
  renderSelectedFunction();
}

function bindEvents() {
  elements.serviceSelect.addEventListener("change", () => {
    state.selectedServiceKey = elements.serviceSelect.value;
    populateFunctionSelect();
    renderSelectedFunction();
  });

  elements.functionSelect.addEventListener("change", () => {
    state.selectedFunctionName = elements.functionSelect.value;
    renderSelectedFunction();
  });

  elements.loginButton.addEventListener("click", () => {
    window.location.assign("/auth/login");
  });

  elements.logoutButton.addEventListener("click", async () => {
    await requestJson("/api/graph-tester/logout", { method: "POST" });
    state.session = await requestJson("/api/graph-tester/session");
    renderSessionState();
    clearResults();
  });

  elements.refreshSessionButton.addEventListener("click", async () => {
    await refreshSessionState();
  });

  elements.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await runSelectedFunction();
  });

  elements.formFields.addEventListener("click", (event) => {
    const sampleButton = event.target.closest("[data-sample-index]");

    if (!sampleButton) {
      return;
    }

    applySampleToField(
      sampleButton.getAttribute("data-field-name"),
      Number.parseInt(sampleButton.getAttribute("data-sample-index"), 10)
    );
  });

  window.addEventListener("focus", () => {
    void refreshSessionState();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void refreshSessionState();
    }
  });
}

async function runSelectedFunction() {
  const entry = getSelectedEntry();

  if (!entry) {
    return;
  }

  setRunBusyState(true);

  try {
    const payload = {
      service: entry.service,
      functionName: entry.functionName,
      args: collectFormArgs(entry),
      confirmMutation: entry.mutation ? elements.mutationConfirm.checked : false,
    };
    const result = await requestJson("/api/graph-tester/run", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    renderSuccessResult(entry, result);
    state.session = await requestJson("/api/graph-tester/session");
    renderSessionState();
  } catch (error) {
    renderErrorResult(error);
  } finally {
    setRunBusyState(false);
  }
}

function populateServiceSelect() {
  if (state.catalog.length === 0) {
    elements.serviceSelect.innerHTML = '<option value="">No services available</option>';
    return;
  }

  const selectedService =
    state.catalog.find((service) => service.key === state.selectedServiceKey) ||
    state.catalog[0];

  state.selectedServiceKey = selectedService.key;
  elements.serviceSelect.innerHTML = state.catalog
    .map(
      (service) =>
        `<option value="${escapeHtml(service.key)}"${service.key === state.selectedServiceKey ? " selected" : ""}>${escapeHtml(service.label)} (${service.functions.length})</option>`
    )
    .join("");

  populateFunctionSelect();
}

function populateFunctionSelect() {
  const selectedService = getSelectedService();

  if (!selectedService || selectedService.functions.length === 0) {
    elements.functionSelect.innerHTML = '<option value="">No functions available</option>';
    return;
  }

  const selectedFunction =
    selectedService.functions.find(
      (functionEntry) => functionEntry.functionName === state.selectedFunctionName
    ) || selectedService.functions[0];

  state.selectedFunctionName = selectedFunction.functionName;
  elements.functionSelect.innerHTML = selectedService.functions
    .map(
      (functionEntry) =>
        `<option value="${escapeHtml(functionEntry.functionName)}"${functionEntry.functionName === state.selectedFunctionName ? " selected" : ""}>${escapeHtml(functionEntry.label)}</option>`
    )
    .join("");
}

function renderSelectedFunction() {
  const service = getSelectedService();
  const entry = getSelectedEntry();

  if (!service || !entry) {
    return;
  }

  elements.serviceDescription.textContent = service.description;
  elements.selectedServiceLabel.textContent = service.label;
  elements.selectedFunctionLabel.textContent = entry.label;
  elements.functionDescription.textContent = entry.description;
  elements.mutationFlag.hidden = entry.mutation !== true;
  elements.functionWarnings.innerHTML = renderWarnings(entry);
  elements.mutationBar.hidden = entry.mutation !== true;
  elements.mutationConfirm.checked = false;
  elements.formFields.innerHTML = renderFieldMarkup(entry);
  updateRunAvailability(entry);
}

function renderWarnings(entry) {
  const warnings = [...(entry.warnings || [])];

  if (entry.mutation) {
    warnings.unshift("This function can mutate live Microsoft 365 data.");
  }

  if (warnings.length === 0) {
    return "";
  }

  return warnings
    .map(
      (warningText) => `
        <article class="warning-callout">
          <strong>Warning</strong>
          <p>${escapeHtml(warningText)}</p>
        </article>
      `
    )
    .join("");
}

function renderFieldMarkup(entry) {
  if (!Array.isArray(entry.fields) || entry.fields.length === 0) {
    return `
      <article class="empty-state">
        <h3>No inputs required</h3>
        <p>This function can run as-is with the current saved Graph token.</p>
      </article>
    `;
  }

  return entry.fields.map((field) => renderField(field, entry)).join("");
}

function renderField(field, entry) {
  const samples = getFieldSamples(entry, field);
  const sampleButtons = samples.length
    ? `
      <div class="sample-row">
        ${samples
          .map(
            (sample, index) => `
              <button
                type="button"
                class="sample-button"
                data-field-name="${escapeHtml(field.name)}"
                data-sample-index="${index}"
              >
                ${escapeHtml(sample.label)}
              </button>
            `
          )
          .join("")}
      </div>
    `
    : "";
  const defaultValue = getFieldDefaultValue(entry, field);
  const wideClass =
    field.type === "textarea" || field.type === "json" ? " field-group--wide" : "";
  const requiredMark = field.required ? " *" : "";

  return `
    <label class="field-group${wideClass}">
      <div class="field-group__top">
        <span class="field__label">${escapeHtml(field.label)}${requiredMark}</span>
        ${sampleButtons}
      </div>
      ${renderFieldControl(field, defaultValue)}
      ${
        field.description
          ? `<span class="field-note">${escapeHtml(field.description)}</span>`
          : ""
      }
    </label>
  `;
}

function renderFieldControl(field, defaultValue) {
  const name = escapeHtml(field.name);

  if (field.type === "select") {
    const options = (field.options || [])
      .map((option) => {
        const selected = option.value === defaultValue ? " selected" : "";
        return `<option value="${escapeHtml(option.value)}"${selected}>${escapeHtml(option.label)}</option>`;
      })
      .join("");

    return `<select name="${name}">${options}</select>`;
  }

  if (field.type === "boolean") {
    const checked = defaultValue === true ? " checked" : "";
    return `
      <label class="checkbox-field">
        <input type="checkbox" name="${name}"${checked} />
        <span>${escapeHtml(field.placeholder || "Toggle this value.")}</span>
      </label>
    `;
  }

  if (field.type === "textarea" || field.type === "json") {
    return `
      <textarea
        name="${name}"
        rows="${field.rows || 6}"
        placeholder="${escapeHtml(field.placeholder || "")}"
      >${escapeHtml(formatFieldValue(defaultValue, field))}</textarea>
    `;
  }

  const inputType = field.type === "datetime-local" ? "datetime-local" : field.type;
  const valueAttribute =
    defaultValue !== undefined && defaultValue !== ""
      ? ` value="${escapeHtml(formatFieldValue(defaultValue, field))}"`
      : "";

  return `
    <input
      type="${escapeHtml(inputType)}"
      name="${name}"
      placeholder="${escapeHtml(field.placeholder || "")}"
      ${valueAttribute}
    />
  `;
}

function getFieldDefaultValue(entry, field) {
  const explicitDefault =
    entry.defaults?.[field.name] !== undefined
      ? entry.defaults[field.name]
      : field.defaultValue;

  if (explicitDefault !== undefined) {
    return explicitDefault;
  }

  if (field.type === "datetime-local") {
    const plusHours = field.name === "end" ? 1 : 0;
    return buildLocalDateTimeValue(plusHours);
  }

  return field.type === "boolean" ? false : "";
}

function getFieldSamples(entry, field) {
  return entry.samplePayloads?.[field.name] || field.samples || [];
}

function collectFormArgs(entry) {
  const args = {};

  for (const field of entry.fields) {
    const control = elements.form.elements.namedItem(field.name);

    if (!control) {
      continue;
    }

    if (field.type === "boolean") {
      if (field.required || control.checked || entry.defaults?.[field.name] !== undefined) {
        args[field.name] = control.checked;
      }
      continue;
    }

    args[field.name] = control.value;
  }

  return args;
}

function applySampleToField(fieldName, sampleIndex) {
  const entry = getSelectedEntry();
  const field = entry?.fields?.find((candidateField) => candidateField.name === fieldName);
  const samples = getFieldSamples(entry, field || {});
  const sample = samples[sampleIndex];
  const control = elements.form.elements.namedItem(fieldName);

  if (!field || !sample || !control) {
    return;
  }

  if (field.type === "boolean") {
    control.checked = Boolean(sample.value);
    return;
  }

  control.value = formatFieldValue(sample.value, field);
}

function renderHealthState() {
  const configured = Boolean(state.health?.config?.authConfigured);
  const totalFunctions = state.catalog.reduce(
    (total, service) => total + service.functions.length,
    0
  );

  elements.healthBadge.dataset.state = configured ? "ready" : "warn";
  elements.healthBadge.textContent = configured ? "Configured" : "Missing config";
  elements.healthMessage.textContent = configured
    ? `Graph tester running at ${state.health.config.origin} with redirect ${state.health.config.redirectUri}.`
    : "Graph auth env vars are incomplete. Health is up, but login cannot start yet.";
  elements.catalogMeta.innerHTML = `
    <span class="pill">Services: ${state.catalog.length}</span>
    <span class="pill">Functions: ${totalFunctions}</span>
    <span class="pill">Port: ${escapeHtml(String(state.health?.config?.port || "-"))}</span>
    <span class="pill">${
      state.health?.config?.autoLoginOnStartup ? "Startup login enabled" : "Startup login disabled"
    }</span>
  `;
}

function renderSessionState() {
  const session = state.session || {};
  const authenticated = session.authenticated === true;
  const authConfigured = session.authConfigured !== false;
  const authInProgress = session.authInProgress === true;

  if (authenticated) {
    elements.authBadge.dataset.state = "ready";
    elements.authBadge.textContent = session.tokenType === "application" ? "App token" : "Delegated";
    elements.authMessage.textContent = session.claims?.preferredUsername
      ? `Signed in as ${session.claims.preferredUsername}.`
      : "A persisted Graph token is active.";
    elements.authMeta.innerHTML = [
      renderPill(`Expires: ${formatDateTime(session.expiresAt)}`),
      renderPill(`Scopes: ${(session.grantedScopes || []).length}`),
      session.lastAuthMethod ? renderPill(`Source: ${toDisplayLabel(session.lastAuthMethod)}`) : "",
      session.tokenCachePresent ? renderPill(`Cache: ${trimPath(session.tokenCacheFile)}`) : "",
      session.grantedRoles?.length ? renderPill(`Roles: ${session.grantedRoles.length}`) : "",
    ].join("");
  } else if (authInProgress) {
    elements.authBadge.dataset.state = "warn";
    elements.authBadge.textContent = "Browser login";
    elements.authMessage.textContent =
      session.hint ||
      "The tester opened Microsoft login. Finish that sign-in flow, then return here.";
    elements.authMeta.innerHTML = [
      renderPill(`Reason: ${toDisplayLabel(session.authReason || "manual")}`),
      renderPill(`Redirect: ${session.redirectUri || "Not set"}`),
      session.tokenCachePresent ? renderPill(`Cache: ${trimPath(session.tokenCacheFile)}`) : "",
    ].join("");
  } else {
    elements.authBadge.dataset.state = authConfigured ? "warn" : "danger";
    elements.authBadge.textContent = authConfigured
      ? session.expired
        ? "Expired"
        : "Login required"
      : "Not configured";
    elements.authMessage.textContent = session.hint
      ? session.hint
      : authConfigured
        ? "No active persisted Graph token is stored yet."
        : "Set the Graph env vars before starting the login flow.";
    elements.authMeta.innerHTML = [
      renderPill(`Redirect: ${session.redirectUri || "Not set"}`),
      renderPill(
        session.autoLoginOnStartup ? "Startup login enabled" : "Startup login disabled"
      ),
      session.tokenCachePresent ? renderPill(`Cache: ${trimPath(session.tokenCacheFile)}`) : "",
    ].join("");
  }

  elements.loginButton.textContent = authInProgress
    ? "Login in progress"
    : session.tokenCachePresent
      ? "Re-authenticate"
      : "Login";
  elements.loginButton.disabled = !authConfigured || authInProgress;
  elements.logoutButton.disabled = !authenticated && !session.tokenCachePresent;
  updateRunAvailability(getSelectedEntry());
}

function updateRunAvailability(entry) {
  const canRun = Boolean(state.session?.authenticated && entry);
  elements.runButton.disabled = !canRun;
  elements.runButton.textContent = canRun ? "Run function" : "Login required";
  elements.runHint.textContent = state.session?.authenticated
    ? entry?.mutation
      ? "Mutating functions also require the confirmation checkbox."
      : "The request will run server-side with the stored Graph token."
    : state.session?.authInProgress
      ? "Authentication is currently in progress. Finish the Microsoft login flow first."
      : "Login is required before protected calls can run.";
}

function renderSuccessResult(entry, result) {
  elements.resultsShell.innerHTML = `
    <div class="result-shell">
      <section class="result-summary">
        <div class="meta-pill-row">
          ${renderPill(entry.serviceLabel)}
          ${renderPill(entry.label)}
          ${renderPill(`Duration ${result.meta?.durationMs ?? 0} ms`)}
          ${
            result.meta?.count !== null && result.meta?.count !== undefined
              ? renderPill(`Count ${result.meta.count}`)
              : ""
          }
        </div>
        <h3>${escapeHtml(result.summary || "Completed successfully")}</h3>
        <p class="result-summary__text">
          Ran at ${escapeHtml(formatDateTime(result.meta?.timestamp))}.
        </p>
      </section>

      ${renderDataSections(entry, result.data)}

      <details class="raw-json">
        <summary>Raw JSON</summary>
        <pre>${escapeHtml(JSON.stringify(result.data, null, 2))}</pre>
      </details>
    </div>
  `;
}

function renderErrorResult(error) {
  const payload = error.payload?.error || {
    status: error.status || 500,
    code: error.code || "GraphTesterError",
    message: error.message || "Graph tester request failed.",
    requestId: null,
    hint: "Review the input and Graph permissions, then retry.",
  };

  elements.resultsShell.innerHTML = `
    <article class="error-box">
      <h3>Request failed</h3>
      <p class="result-summary__text">${escapeHtml(payload.message)}</p>
      <div class="error-meta">
        ${renderKeyValueItem("Status", payload.status || "-")}
        ${renderKeyValueItem("Code", payload.code || "-")}
        ${renderKeyValueItem("Request ID", payload.requestId || "None")}
        ${renderKeyValueItem("Hint", payload.hint || "Review the request and retry.")}
      </div>
    </article>
  `;
}

function renderDataSections(entry, data) {
  if (data === undefined) {
    return `
      <section class="result-section">
        <div class="empty-state">
          <h3>No response body</h3>
          <p>This function completed successfully but did not return content.</p>
        </div>
      </section>
    `;
  }

  if (Array.isArray(data)) {
    return renderArraySections(entry, data);
  }

  if (data && typeof data === "object") {
    return renderObjectSections(entry, data);
  }

  return `
    <section class="result-section">
      <div class="preview-card">
        <div class="preview-card__title">Primitive response</div>
        <div class="preview-card__body">${escapeHtml(String(data))}</div>
      </div>
    </section>
  `;
}

function renderArraySections(entry, data) {
  const previewMarkup = renderPreviewCards(entry.outputHint, data);
  const tableMarkup = renderArrayTable(data);

  return `
    <section class="result-section result-stack">
      ${previewMarkup}
      ${tableMarkup}
    </section>
  `;
}

function renderObjectSections(entry, data) {
  if (entry.outputHint === "photoBinary") {
    return `
      <section class="result-section result-stack">
        <div class="key-grid">
          ${renderKeyValueItem("Status", data.status)}
          ${renderKeyValueItem("Content type", data.contentType || "Unknown")}
          ${renderKeyValueItem("Size", formatBytes(data.sizeBytes))}
          ${renderKeyValueItem("ETag", data.etag || "None")}
        </div>
      </section>
    `;
  }

  return `
    <section class="result-section result-stack">
      <div class="key-grid">
        ${renderScalarGrid(data)}
      </div>
      ${
        renderPreviewCards(entry.outputHint, [data], true)
      }
    </section>
  `;
}

function renderPreviewCards(outputHint, items, singleObject = false) {
  const cards = items.slice(0, 8).map((item) => renderPreviewCard(outputHint, item));
  const filteredCards = cards.filter(Boolean);

  if (filteredCards.length === 0) {
    return singleObject ? "" : "";
  }

  return `<div class="preview-grid">${filteredCards.join("")}</div>`;
}

function renderPreviewCard(outputHint, item) {
  if (!item || typeof item !== "object") {
    return "";
  }

  if (outputHint === "mailMessages" || outputHint === "mailMessage") {
    return renderMailMessagePreview(item, outputHint === "mailMessage");
  }

  if (outputHint === "calendarEvents" || outputHint === "calendarEvent") {
    return `
      <article class="preview-card">
        <div class="preview-card__title">${escapeHtml(item.subject || "(No subject)")}</div>
        <div class="preview-card__body">
          ${escapeHtml(formatDateTime(item.start?.dateTime || item.start))}<br />
          ${escapeHtml(formatDateTime(item.end?.dateTime || item.end))}<br />
          ${escapeHtml(item.location?.displayName || "No location")}<br />
          ${escapeHtml(item.organizer?.emailAddress?.address || "Organizer unavailable")}
        </div>
      </article>
    `;
  }

  if (outputHint === "users" || outputHint === "user" || outputHint === "people") {
    return `
      <article class="preview-card">
        <div class="preview-card__title">${escapeHtml(item.displayName || item.name || "(Unnamed person)")}</div>
        <div class="preview-card__body">
          ${escapeHtml(item.mail || item.userPrincipalName || item.scoredEmailAddresses?.[0]?.address || "No email")}<br />
          ${escapeHtml(item.jobTitle || "No title")}<br />
          ${escapeHtml(item.officeLocation || "No office location")}
        </div>
      </article>
    `;
  }

  if (
    outputHint === "chats" ||
    outputHint === "chat" ||
    outputHint === "chatMessages" ||
    outputHint === "chatMessage"
  ) {
    return `
      <article class="preview-card">
        <div class="preview-card__title">${escapeHtml(item.topic || item.memberSummary || item.subject || item.chatType || "(Untitled chat item)")}</div>
        <div class="preview-card__body">
          ${escapeHtml(item.chatType || item.messageType || "Graph chat item")}<br />
          ${item.memberSummary ? `${escapeHtml(item.memberSummary)}<br />` : ""}
          ${escapeHtml(item.from?.user?.displayName || item.createdBy?.user?.displayName || "Sender unavailable")}<br />
          ${escapeHtml(formatDateTime(item.createdDateTime || item.lastUpdatedDateTime))}<br />
          ${escapeHtml(stripHtml(item.body?.content || "").slice(0, 160) || "No preview available.")}
        </div>
      </article>
    `;
  }

  return "";
}

function renderMailMessagePreview(item, showFullBody = false) {
  return `
    <article class="preview-card preview-card--mail">
      <div class="preview-card__title">${escapeHtml(item.subject || "(No subject)")}</div>
      <div class="preview-card__body preview-card__body--mail">
        <div class="mail-message-meta">
          ${escapeHtml(item.from?.emailAddress?.address || "Unknown sender")}<br />
          ${escapeHtml(formatDateTime(item.receivedDateTime))}<br />
          ${escapeHtml(item.isRead === true ? "Read" : item.isRead === false ? "Unread" : "Read state unavailable")}
        </div>
        ${renderMailMessageBody(item, showFullBody)}
      </div>
    </article>
  `;
}

function renderMailMessageBody(item, showFullBody = false) {
  const body = item.body;

  if (showFullBody && body?.content) {
    const label = body.contentType === "text" ? "Body text" : "Body HTML";

    return `
      <section class="mail-message-body">
        <div class="mail-message-body__label">${escapeHtml(label)}</div>
        <div class="mail-message-body__content">
          ${renderMailBodyContent(body)}
        </div>
      </section>
    `;
  }

  return `
    <section class="mail-message-body mail-message-body--preview">
      <div class="mail-message-body__label">Preview</div>
      <div class="mail-message-body__content">
        ${escapeHtml(item.bodyPreview || stripHtml(body?.content || "").slice(0, 160) || "No preview available.")}
      </div>
    </section>
  `;
}

function renderMailBodyContent(body) {
  if (!body?.content) {
    return "No body content available.";
  }

  if (body.contentType === "html") {
    return sanitizeHtmlContent(body.content);
  }

  return escapeHtml(body.content).replace(/\r?\n/g, "<br />");
}

function sanitizeHtmlContent(html) {
  const parser = new DOMParser();
  const documentNode = parser.parseFromString(String(html), "text/html");
  const disallowedTags = new Set(["script", "style", "iframe", "object", "embed", "link", "meta", "base"]);

  for (const element of documentNode.body.querySelectorAll("*")) {
    if (disallowedTags.has(element.tagName.toLowerCase())) {
      element.remove();
      continue;
    }

    for (const attribute of [...element.attributes]) {
      const attributeName = attribute.name.toLowerCase();
      const attributeValue = attribute.value.trim();

      if (attributeName.startsWith("on")) {
        element.removeAttribute(attribute.name);
        continue;
      }

      if (
        (attributeName === "href" ||
          attributeName === "src" ||
          attributeName === "xlink:href" ||
          attributeName === "action" ||
          attributeName === "formaction") &&
        /^(?:javascript|vbscript):/i.test(attributeValue)
      ) {
        element.removeAttribute(attribute.name);
      }
    }
  }

  return documentNode.body.innerHTML || "No body content available.";
}

function renderArrayTable(data) {
  const objectRows = data.filter((item) => item && typeof item === "object");

  if (objectRows.length === 0) {
    return "";
  }

  const columns = TABLE_COLUMNS.filter((column) =>
    objectRows.some((item) => hasUsableValue(column.getter(item)))
  ).slice(0, 6);

  if (columns.length === 0) {
    return "";
  }

  return `
    <div class="table-shell">
      <table>
        <thead>
          <tr>
            ${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${objectRows
            .slice(0, 50)
            .map(
              (item) => `
                <tr>
                  ${columns
                    .map(
                      (column) =>
                        `<td>${escapeHtml(formatValueForCell(column.getter(item)))}</td>`
                    )
                    .join("")}
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderScalarGrid(data) {
  return Object.entries(data)
    .filter(([, value]) => isScalarLike(value))
    .slice(0, 12)
    .map(([key, value]) => renderKeyValueItem(toDisplayLabel(key), formatValueForCell(value)))
    .join("");
}

function renderKeyValueItem(label, value) {
  return `
    <article class="key-grid__item">
      <p class="key-grid__label">${escapeHtml(String(label))}</p>
      <p class="key-grid__value">${escapeHtml(String(value))}</p>
    </article>
  `;
}

function clearResults() {
  elements.resultsShell.innerHTML = `
    <article class="empty-state">
      <h3>No results yet</h3>
      <p>Run a function to see summaries, cards, tables, and raw JSON.</p>
    </article>
  `;
}

async function refreshSessionState() {
  try {
    state.session = await requestJson("/api/graph-tester/session");
    renderSessionState();
  } catch (error) {
    renderErrorResult(error);
  }
}

function setRunBusyState(isBusy) {
  elements.runButton.disabled = isBusy || !state.session?.authenticated;
  elements.runButton.textContent = isBusy
    ? "Running..."
    : state.session?.authenticated
      ? "Run function"
      : "Login required";
}

function renderGlobalFailure(error) {
  elements.resultsShell.innerHTML = `
    <article class="error-box">
      <h3>Startup failed</h3>
      <p class="result-summary__text">${escapeHtml(error.message || String(error))}</p>
    </article>
  `;
  elements.healthBadge.dataset.state = "danger";
  elements.healthBadge.textContent = "Error";
  elements.healthMessage.textContent =
    "The standalone Graph tester could not finish booting. Keep the local server running and refresh.";
}

function getSelectedService() {
  return state.catalog.find((service) => service.key === state.selectedServiceKey) || null;
}

function getSelectedEntry() {
  return (
    getSelectedService()?.functions.find(
      (entry) => entry.functionName === state.selectedFunctionName
    ) || null
  );
}

async function requestJson(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    ...options,
  });
  const text = await response.text();
  const payload = text ? safeParseJson(text) : {};

  if (!response.ok) {
    const error = new Error(
      payload?.error?.message ||
        payload?.error ||
        payload?.message ||
        text ||
        `Request failed with ${response.status}`
    );
    error.status = response.status;
    error.payload = payload;
    error.code = payload?.error?.code || "RequestFailed";
    throw error;
  }

  return payload;
}

function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    return { message: text };
  }
}

function buildLocalDateTimeValue(hoursToAdd) {
  const value = new Date(Date.now() + hoursToAdd * 60 * 60 * 1000);
  const year = String(value.getFullYear());
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatFieldValue(value, field) {
  if (value === undefined || value === null) {
    return "";
  }

  if (field.type === "json" && typeof value !== "string") {
    return JSON.stringify(value, null, 2);
  }

  if (field.type === "datetime-local") {
    const date = new Date(value);

    if (Number.isNaN(date.valueOf())) {
      return String(value);
    }

    const year = String(date.getFullYear());
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  if (Array.isArray(value) && field.parseMode === "linesOrJsonArray") {
    return value.join("\n");
  }

  return String(value);
}

function renderPill(content) {
  return `<span class="pill">${escapeHtml(String(content))}</span>`;
}

function formatDateTime(value) {
  if (!value) {
    return "Unknown";
  }

  const parsedValue = new Date(value);
  return Number.isNaN(parsedValue.valueOf())
    ? String(value)
    : parsedValue.toLocaleString();
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) {
    return "Unknown size";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatValueForCell(value) {
  if (value === undefined || value === null || value === "") {
    return "—";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function trimPath(filePath) {
  if (!filePath) {
    return "None";
  }

  const normalizedPath = String(filePath).replaceAll("\\", "/");
  const parts = normalizedPath.split("/");
  return parts.slice(Math.max(parts.length - 2, 0)).join("/");
}

function toDisplayLabel(key) {
  return String(key)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/^./, (value) => value.toUpperCase());
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function stripHtml(value) {
  return String(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function hasUsableValue(value) {
  return !(
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

function isScalarLike(value) {
  return (
    value === null ||
    ["string", "number", "boolean"].includes(typeof value)
  );
}
