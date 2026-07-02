/**
 * Tasks service (Microsoft To Do).
 *
 * Required scopes (per function — noted inline):
 *   Tasks.ReadWrite – all functions
 */

import { graphRequest } from "../graphRequest.js";

// ---------------------------------------------------------------------------
// To Do lists
// ---------------------------------------------------------------------------

/** @scope Tasks.ReadWrite */
export async function listTodoLists(token, { select } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: "/me/todo/lists",
    token,
    query: { $select: select },
  });
  return data?.value ?? [];
}

/** @scope Tasks.ReadWrite */
export async function getTodoList(token, listId, { select } = {}) {
  return graphRequest({
    method: "GET",
    path: `/me/todo/lists/${encodeURIComponent(listId)}`,
    token,
    query: { $select: select },
  });
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

/** @scope Tasks.ReadWrite */
export async function listTasks(token, listId, { select, top, filter } = {}) {
  const data = await graphRequest({
    method: "GET",
    path: `/me/todo/lists/${encodeURIComponent(listId)}/tasks`,
    token,
    query: { $select: select, $top: top, $filter: filter },
  });
  return data?.value ?? [];
}

/** @scope Tasks.ReadWrite */
export async function getTask(token, listId, taskId, { select } = {}) {
  return graphRequest({
    method: "GET",
    path: `/me/todo/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`,
    token,
    query: { $select: select },
  });
}

/** @scope Tasks.ReadWrite */
export async function createTask(token, listId, taskInput) {
  return graphRequest({
    method: "POST",
    path: `/me/todo/lists/${encodeURIComponent(listId)}/tasks`,
    token,
    body: taskInput,
  });
}

/** @scope Tasks.ReadWrite */
export async function updateTask(token, listId, taskId, patch) {
  return graphRequest({
    method: "PATCH",
    path: `/me/todo/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`,
    token,
    body: patch,
  });
}

/**
 * Mark a task as completed (status patch).
 * @scope Tasks.ReadWrite
 */
export async function completeTask(token, listId, taskId) {
  return updateTask(token, listId, taskId, { status: "completed" });
}
