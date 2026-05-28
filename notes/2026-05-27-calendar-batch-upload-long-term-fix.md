# Calendar Batch Upload Long-Term Fix

## Overview

This note describes the recommended long-term fix for the Compliance Calendar batch upload failure seen on May 14, 2026.

The goal is to remove the batch upload page's dependency on an internal HTTP call to `action.cfm` and replace it with a shared server-side task creation service that can be called directly by both:

- the normal task entry flow
- the Excel batch upload flow

This removes session/login dependency from the batch upload processing path and makes the upload more stable.

## Problem Summary

Current batch upload processing in Calendar works roughly like this:

1. `receiver.cfm` reads and validates each Excel row.
2. For each row, it makes an internal `cfhttp` POST to `action.cfm`.
3. `receiver.cfm` waits for `action.cfm` to return HTML containing a success marker.
4. `receiver.cfm` parses that returned HTML to decide whether the row succeeded or failed.

This is fragile because the row submission depends on an internal web request behaving like a browser request.

If that internal request hits a login/session issue, SSO page, or connection failure, `receiver.cfm` does not get the normal response it expects. That is the likely reason for the May 14, 2026 exception:

- subject: `Calendar Batch Upload XLS Failed: DataReturned is undefined`

Important point:

- this does not appear to be caused by bad spreadsheet data
- this appears to be caused by a system/session/connection problem in the internal upload path

## Root Cause Direction

The current design uses `cfhttp` inside `receiver.cfm` to submit each row back through the web layer.

That means batch upload depends on:

- session state
- cookies or auth context
- login behavior
- HTML response parsing
- internal application routing behaving the same way as a user browser session

This is the wrong layer boundary for server-side batch processing.

The upload path should not have to impersonate a browser in order to create a task.

## Recommended Long-Term Fix

### Core Change

Move the actual Calendar task creation logic out of `action.cfm` into a shared server-side service or CFC method.

Then:

- `action.cfm` should call that shared service
- `receiver.cfm` should call that same shared service directly

No internal `cfhttp` call should be needed for batch upload row submission.

### Desired End State

Instead of:

- `receiver.cfm` -> `cfhttp` -> `action.cfm` -> DB / business logic

Use:

- `receiver.cfm` -> shared Calendar task service -> DB / business logic
- `action.cfm` -> shared Calendar task service -> DB / business logic

## Why This Is Better

This solves the real architectural weakness, not just the visible error.

Benefits:

- removes dependency on login/session behavior during batch upload
- removes dependency on cookies in server-to-server calls
- removes need to parse HTML success markers
- allows structured success/failure results
- reduces duplicate business logic over time
- makes errors easier to log and troubleshoot
- makes both manual and batch task creation use the same rules

## Suggested Implementation Shape

### Shared Service

Create or extract a shared Calendar task creation service, for example:

- a Calendar CFC/service under the app
- or a library CFC used by both pages

The exact location can be decided in the implementation workspace, but the important part is that task creation logic exists in one reusable place.

### Service Responsibilities

The shared service should handle:

- task input normalization
- validation
- permission checks
- duplicate detection
- task insert/update logic
- reminder creation / follow-up processing that belongs to task creation
- structured return values

### Return Structure

The shared method should return structured data, not HTML.

Example shape:

```cfml
{
    success: true,
    duplicate: false,
    permissionDenied: false,
    taskName: "Task Name",
    returnLink: "/ehs/calendar/task.cfm?...",
    message: "",
    errorCode: "",
    debugDetails: ""
}
```

For failures:

```cfml
{
    success: false,
    duplicate: false,
    permissionDenied: false,
    taskName: "Task Name",
    returnLink: "",
    message: "Unable to create task due to validation or processing error.",
    errorCode: "VALIDATION_ERROR",
    debugDetails: ""
}
```

## Changes by File Area

### `receiver.cfm`

Change `receiver.cfm` so that it:

- keeps row parsing and row-level validation
- stops calling `action.cfm` with `cfhttp`
- calls the shared task creation service directly
- renders upload results from the returned struct/object

This page should no longer depend on:

- `DataReturned`
- HTML success comments
- internal HTTP retries for normal row submission

### `action.cfm`

Refactor `action.cfm` so that it:

- remains responsible for request/form handling and page response behavior
- delegates task creation work to the shared service
- uses the same service result for UI output or AJAX output

This keeps the web page behavior intact while removing ownership of core task creation logic from the page itself.

## Migration Approach

Recommended order:

1. Identify the minimum task creation path that both manual entry and batch upload need.
2. Extract that logic into a shared service without changing behavior.
3. Update `action.cfm` to use the shared service first.
4. Verify manual task entry still works.
5. Update `receiver.cfm` to use the shared service directly.
6. Remove or bypass the internal `cfhttp` row submission path.
7. Add logging around structured service failures.

This reduces risk by changing one caller at a time.

## Testing Expectations

At minimum, test:

- normal manual Calendar task add
- batch upload success path
- duplicate row handling
- permission denied handling
- validation failures
- business priority scenarios
- additional/custom field scenarios
- closure verifier / escalation scenarios if used
- U.S.-only instance behavior where the original issue occurred

Specific regression check:

- batch upload should succeed or fail with a clear structured message even if web session behavior differs by instance

## Short-Term vs Long-Term

This document is for the long-term fix.

Short-term hardening can still be done separately:

- always set a fallback `DataReturned` value
- improve error logging when the internal HTTP call fails
- log whether login HTML or connection failure was returned

That short-term change would reduce noisy exceptions, but it would not remove the architectural weakness.

## Recommendation

Recommended handoff summary:

The best fix is to refactor Calendar task creation into a shared backend service and have both `action.cfm` and `receiver.cfm` call it directly. The current batch upload path depends on an internal HTTP post to `action.cfm`, which makes upload success depend on session/login behavior and HTML parsing. Removing that dependency is the cleanest long-term fix.
