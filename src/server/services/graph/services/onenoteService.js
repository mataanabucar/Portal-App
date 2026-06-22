/**
 * OneNote service.
 *
 * Required scopes (per function — noted inline):
 *   Notes.Read       – list/get notebooks, sections, pages, page content
 *   Notes.ReadWrite  – createPage, updatePageContent
 */

import { graphRequest } from "../graphRequest.js";

// ---------------------------------------------------------------------------
// Notebooks
// ---------------------------------------------------------------------------

/** @scope Notes.Read */
export async function listNotebooks(token, { select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: "/me/onenote/notebooks",
    token,
    query: { $select: select },
  });
  return data?.value ?? [];
}

/** @scope Notes.Read */
export async function getNotebook(token, notebookId, { select } = {}) {
  return graphRequest({
    method: "GET",
    path: `/me/onenote/notebooks/${encodeURIComponent(notebookId)}`,
    token,
    query: { $select: select },
  });
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

/** @scope Notes.Read */
export async function listSections(token, { select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: "/me/onenote/sections",
    token,
    query: { $select: select },
  });
  return data?.value ?? [];
}

/** @scope Notes.Read */
export async function getSection(token, sectionId, { select } = {}) {
  return graphRequest({
    method: "GET",
    path: `/me/onenote/sections/${encodeURIComponent(sectionId)}`,
    token,
    query: { $select: select },
  });
}

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

/** @scope Notes.Read */
export async function listPages(token, { select, top } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: "/me/onenote/pages",
    token,
    query: { $select: select, $top: top },
  });
  return data?.value ?? [];
}

/** @scope Notes.Read */
export async function getPage(token, pageId, { select } = {}) {
  return graphRequest({
    method: "GET",
    path: `/me/onenote/pages/${encodeURIComponent(pageId)}`,
    token,
    query: { $select: select },
  });
}

/**
 * Returns the raw HTML content of a OneNote page as a binary Response.
 * @scope Notes.Read
 */
export async function getPageContent(token, pageId) {
  return graphRequest({
    method: "GET",
    path: `/me/onenote/pages/${encodeURIComponent(pageId)}/content`,
    token,
    binary: true,
  });
}

/**
 * Create a new OneNote page in the given section.
 * @scope Notes.ReadWrite
 *
 * Note: graphRequest JSON-serializes the body; for real OneNote page creation
 * use multipart/text/html directly. This is a stub — body is wrapped in a
 * preview object until a custom fetch implementation is added.
 */
export async function createPage(token, sectionId, htmlContent) {
  // Note: graphRequest JSON-serializes the body; for real OneNote page creation use multipart/text/html directly
  return graphRequest({
    method: "POST",
    path: `/me/onenote/sections/${encodeURIComponent(sectionId)}/pages`,
    token,
    body: { contentPreview: htmlContent },
  });
}

/**
 * Apply patch commands to a OneNote page's content.
 * @scope Notes.ReadWrite
 * @param {Array} patchCommands  Array of PATCH command objects per Graph spec
 */
export async function updatePageContent(token, pageId, patchCommands) {
  return graphRequest({
    method: "PATCH",
    path: `/me/onenote/pages/${encodeURIComponent(pageId)}/content`,
    token,
    body: patchCommands,
  });
}
