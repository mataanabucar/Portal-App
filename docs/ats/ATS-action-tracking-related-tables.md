# Action Tracking System (ATS) - tables and objects

Single reference for `TblAudit` / `tblAuditID`, ATS-owned lifecycle tables, `ltb*` lookups, and how `pm/audit` and `library/cfc` (`apps/ats`, `lookup/audit`) use them. Evidence: Sourcebot on `code.gensuite.com/pm/audit` and `code.gensuite.com/pm/library/cfc` (default branch), plus local `tblaudit schema.csv`.

This inventory separates confirmed ATS-owned tables from draft/read-across tables and integration surfaces so cross-app dependencies do not get mixed into the core ATS schema list.

---

## Files in this folder (`SQL Stuff/`)

- `ATS-action-tracking-related-tables.md` (this document)
- `tblaudit schema.csv` (column list for `TblAudit`)

---

## Quick reference: tables and objects named in this document

**Anchor and core ATS**

- `TblAudit` / `tblAudit`
- `TblAudit_Step` / `tblAudit_Step`
- `TblAudit_Archive`
- `tblAudit_DueDateExtend`
- `Extensions_Data`

**Draft, pending, read-across**

- `tblaudit_pending`
- `tblAudit_Step_Pending`
- `tblAuditPending_Status`
- `tblAudit_ltbStatus`
- `Extensions_Data_Pending`
- `tblAudit_ReadAcrossActionType`
- `tblAudit_ReadAcrossAction`
- `tblAudit_ExtendType`

**Org, site, contacts, attachments**

- `Org`
- `Site`
- `ltbWorkstation`
- `ltbContact`
- `SiteAttach`

**`ltb*` lookups**

- `ltbAuditType`
- `ltbAppReference`
- `ltbCategory`
- `ltbCategory_Sub`
- `ltbFindingType`
- `ltbClosure`
- `ltbEnvPriority`
- `ltbCOE`
- `ltbCOE_sub`
- `ltbBuilding`
- `ltbContact_Extended`
- `ltbContact_Permissions`
- `ltbEvent`
- `ltbiandi`
- `ltbUnsafeCondition`
- `ltbUnsafeAction`
- `ltbManagementSystems`
- `ltbPersonalFactor`
- `ltbPersonalFactorGroup`
- `ltbJobFactor`
- `ltbJobFactorGroup`
- `ltbAppPermissions`
- `ltbRoles`
- `ltbSubsite`

**Views and other query objects**

- `Profile_Data`
- `Setup_Business`
- `v_extensionsData`
- `qryOrgSite`
- `qrySiteSiteDetail`

**Integration surfaces (cross-app; not ATS-owned lifecycle)**

- `fiveWhyRCA`
- `siteEvent`
- `SiteHandsCase`
- `SiteNOV`
- `SiteFines`
- `SiteInspec`
- `AA_Observations`
- `aa_auditroom`
- `sitefindingmodule`
- `siteapplicmodule`
- `siteapplicmoduledetail`

---

## Library layout (ATS CFCs)

There is **no** `library/cfc/apps/audit` tree. ATS shared components live under:

- **`library/cfc/apps/ats/`** - CFCs such as `audit.cfc`, `atsRCA.cfc`, `auditExtended.cfc`, `restapi.cfc`, `atslookups.cfc`.
- **`library/cfc/lookup/audit.cfc`** - canonical SQL for many `getLtb*` lookups; `apps/ats/atslookups.cfc` wraps that component for REST-oriented projections.

---

## Anchor table

| Table | Role |
| --- | --- |
| **TblAudit** / **tblAudit** | Core finding / corrective-action row. Natural key in app code is often `(OrgName, Location, ID)`; **`tblAuditID`** is the surrogate used for links, APIs, drafts, and cross-app `RefType` / `RefID`. |

---

## Core ATS tables (finding lifecycle)

| Table | Role |
| --- | --- |
| **TblAudit_Step** / **tblAudit_Step** | Sub-actions / step corrective actions keyed by org, location, **`ID`**, and **`Step_ID`**. |
| **TblAudit_Archive** | Row-level history when `ATS_AUDIT_TRAIL` is on (`VersionNo` plus mirrored columns). |
| **tblAudit_DueDateExtend** | Due-date extension requests and approver linkage (`auditExtended.cfc`). |
| **Extensions_Data** | Additional/custom field storage used by ATS, including custom comment-history values in **`Record_Value`**. |

---

## Draft, pending, and read-across tables

| Table | Role |
| --- | --- |
| **tblaudit_pending** | Draft / publish flow (`tblAuditID`, **`ExportedTblAuditID`**); alias **`tap`** in extended reporting. |
| **tblAudit_Step_Pending** | Draft sub-actions / pending step rows before publish. |
| **tblAuditPending_Status** | Draft title/status metadata associated with pending ATS actions. |
| **tblAudit_ltbStatus** | Lookup backing the draft status labels used by **`tblAuditPending_Status`**. |
| **Extensions_Data_Pending** | Draft-side custom/additional field rows paired with pending findings. |
| **tblAudit_ReadAcrossActionType** | Read-across action type lookup. |
| **tblAudit_ReadAcrossAction** | Read-across action rows tied to ATS findings. |
| **tblAudit_ExtendType** | Lookup for due-date extension type / reason values. |

ATS comment helpers do **not** use separate ATS comment tables. Sourcebot evidence points to comments being stored in **`TblAudit.CloseComment`**, **`TblAudit_Step.Step_CloseComment`**, and **`Extensions_Data.Record_Value`**.

---

## Organization, site, contacts, attachments

| Table | Role |
| --- | --- |
| **Org** | Organization; joined to **`TblAudit`** on **`OrgName`** (for example `pm/audit` `audit.cfc`). |
| **Site** | Site / location and security context (`attachments.cfm`, reporting joins). |
| **ltbWorkstation** | Workstation lookup, validation, and report filtering used in ATS UI flows and reporting. |
| **ltbContact** | Contact directory; emails for step owners, approvals, batch mapping, and "created by" parsing. |
| **SiteAttach** | Attachment metadata; `PARENT_TYPE = 'Audit'` with org, location, and finding `ID`. |

---

## `ltb*` lookup tables (deduplicated)

| Table | Typical role |
| --- | --- |
| **ltbAuditType** | Action / audit type; scoped with **`ltbAppReference`** when scope-specific audit types are enabled. |
| **ltbAppReference** | Links **`ltbUID`** (for example **`ltbAuditTypeID`**) to Org / SubOrg / Site for app id `3` (ATS). |
| **ltbCategory** | Finding category; joins **`TblAudit.Category`**. |
| **ltbCategory_Sub** | Site-scoped subcategories; foreign key to **`ltbCategory`**. |
| **ltbFindingType** | Finding type list; tollgates and updates. |
| **ltbClosure** | Closure / classification; joins **`TblAudit.Classification`**. |
| **ltbEnvPriority** | Risk / priority wording; joins **`TblAudit.ClassificationType`**. |
| **ltbCOE** | Department / COE by org and location. |
| **ltbCOE_sub** | Sub-department; **`TblAudit.SubCOEID`**. |
| **ltbBuilding** | Buildings by org/location. |
| **ltbContact_Extended** | Contact scope (dept / subdept). |
| **ltbContact_Permissions** | Per-contact app permissions (due-date approvers, batch import). |
| **ltbEvent** | List rows (for example management system failure, scoped variants) for RCA / dropdowns. |
| **ltbiandi** | I&I-style list validation (`dataupload_validation.cfc`). |
| **ltbUnsafeCondition** | RCA lookup. |
| **ltbUnsafeAction** | RCA lookup. |
| **ltbManagementSystems** | RCA lookup. |
| **ltbPersonalFactor** | RCA; grouped by **`ltbPersonalFactorGroup`**. |
| **ltbPersonalFactorGroup** | RCA grouping. |
| **ltbJobFactor** | RCA; grouped by **`ltbJobFactorGroup`**. |
| **ltbJobFactorGroup** | RCA grouping. |
| **ltbAppPermissions** | Special rights (for example application = Action Tracking System). |
| **ltbRoles** | Role ids (for example task auto-escalation for app id `3`). |
| **ltbSubsite** | Subsite metadata with **`ltbCOE`** paths (`dueDateExtend.cfc`). |

`TblAudit` stores string values for type, category, and finding; `ltb*` rows are the usual list sources, with optional org/site scope. SQL Server identifiers may differ in case (`LtbCategory`, `ltbCOE`).

---

## Views and other objects used in the same queries

| Object | Role |
| --- | --- |
| **Profile_Data** | Root-cause options (`getRootCause` in `lookup/audit.cfc`). |
| **Setup_Business** | Business / One EHS style filters (`auditExtended.cfc`). |
| **v_extensionsData** | View used as an alternate read path for ATS extension/custom-field values. |
| **qryOrgSite** | Site scoping / tagged audit types (`lookup/audit.cfc`). |
| **qrySiteSiteDetail** | Scoped joins from **`ltbEvent`** (`apps/ats/audit.cfc`). |

---

## Integration surfaces and related objects

These objects show up in ATS reporting or `RefType` / `RefID` integration logic, but they should stay separate from the ATS-owned schema list.

| Object | Role |
| --- | --- |
| **fiveWhyRCA** | Related RCA record set used by ATS five-why flows and pending-action joins. |
| **siteEvent** | Cross-app source object when ATS references site event records. |
| **SiteHandsCase** | Cross-app source object for hand/case integrations. |
| **SiteNOV** | Cross-app source object for NOV integrations. |
| **SiteFines** | Cross-app source object for fines integrations. |
| **SiteInspec** | Cross-app source object for inspection integrations. |
| **AA_Observations** | Cross-app source object for observation integrations. |
| **aa_auditroom** | Cross-app source object for audit room integrations. |
| **sitefindingmodule** | Cross-app source object used in ATS-linked finding modules. |
| **siteapplicmodule** | Cross-app source object used in ATS-linked applicability modules. |
| **siteapplicmoduledetail** | Detail rows supporting ATS-linked applicability modules. |

---

## Cross-application linkage

- **`TblAudit.RefType`** and **`TblAudit.RefID`** point to originating records in other apps.
- Other `pm/*` repos may reference **`tblAuditID`** in watch or integration templates; treat those as integration surfaces, not core ATS schema.
- The integration-surface objects above are real ATS dependencies in some code paths, but they are not ATS-owned lifecycle tables in the same way as **`TblAudit`**, **`TblAudit_Step`**, or the pending/read-across tables.

---

## `lookup/audit` vs `apps/ats/atslookups`

| File | URL |
| --- | --- |
| **`lookup/audit.cfc`** | [browse .../lookup/audit.cfc](https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/library/cfc@refs/heads/master/-/blob/lookup%2Faudit.cfc) |
| **`apps/ats/atslookups.cfc`** | [browse .../apps/ats/atslookups.cfc](https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/library/cfc@refs/heads/master/-/blob/apps%2Fats%2Fatslookups.cfc) |

`atslookups.cfc` creates **`lookup.audit`** and shapes **`getLtbClosure`**, **`getLtbFindingType`**, **`getLtbAuditType`**, **`getLtbCategory`**, **`getLtbCategorySub`**, **`getLtbEnvPriority`**, and related lookup payloads.

---

## `pm/audit` - calls into `library/cfc/apps/ats`

| Pattern | Example files |
| --- | --- |
| `#Request.Library.CFC.DotPath#/apps/ats/...` | `RCAinclude.cfm`, `closeFinding.cfm`, `IandI_Integration.cfm`, `RCAInclude_Export.cfm` plus `beta/` copies |
| Virtual path plus **`apps/ats/audit.cfc`** | `Admin_Category.cfm`, `admin_Category_action.cfm` |
| **`apps/ats/approvals.cfc`** (AJAX) | `js/approvals.js` |
| Dot path plus **`/apps/ats/`** | `remoteproxy.cfm` |

Links: [remoteproxy.cfm](https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/remoteproxy.cfm) | [closeFinding.cfm](https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/closeFinding.cfm) | [Admin_Category.cfm](https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/Admin_Category.cfm)

Many `pm/audit` `.cfm` files also use `lookup.audit` for dropdowns and validation, which leads back to the same `ltb*` tables surfaced in `lookup/audit.cfc`.

---

## `pm/audit` - representative SQL entry points

- [audit.cfc](https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/audit.cfc) - **`tblAudit`** plus **`Org`**
- [audaction.cfm](https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/audaction.cfm) - insert/update, archive, steps, and pending flow
- [attachments.cfm](https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/attachments.cfm) - **`SiteAttach`**, **`Org`**, **`Site`**, and **`TblAudit`**

---

## `apps/ats` CFCs (non-exhaustive)

| File | URL |
| --- | --- |
| `apps/ats/audit.cfc` | [browse .../apps/ats/audit.cfc](https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/library/cfc@refs/heads/master/-/blob/apps%2Fats%2Faudit.cfc) |
| `apps/ats/atsRCA.cfc` | [browse .../apps/ats/atsRCA.cfc](https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/library/cfc@refs/heads/master/-/blob/apps%2Fats%2FatsRCA.cfc) |
| `apps/ats/auditExtended.cfc` | [browse .../apps/ats/auditExtended.cfc](https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/library/cfc@refs/heads/master/-/blob/apps%2Fats%2FauditExtended.cfc) |
| `apps/ats/approvals.cfc` | [browse .../apps/ats/approvals.cfc](https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/library/cfc@refs/heads/master/-/blob/apps%2Fats%2Fapprovals.cfc) |
| `apps/ats/dueDateExtend.cfc` | [browse .../apps/ats/dueDateExtend.cfc](https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/library/cfc@refs/heads/master/-/blob/apps%2Fats%2FdueDateExtend.cfc) |
| `apps/ats/BatchFunctions.cfc` | [browse .../apps/ats/BatchFunctions.cfc](https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/library/cfc@refs/heads/master/-/blob/apps%2Fats%2FBatchFunctions.cfc) |
| `apps/ats/dataupload_validation.cfc` | [browse .../apps/ats/dataupload_validation.cfc](https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/library/cfc@refs/heads/master/-/blob/apps%2Fats%2Fdataupload_validation.cfc) |
| `apps/ats/autoEscalationStrategy.cfc` | [browse .../apps/ats/autoEscalationStrategy.cfc](https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/library/cfc@refs/heads/master/-/blob/apps%2Fats%2FautoEscalationStrategy.cfc) |
| `apps/ats/restapi.cfc` | [browse .../apps/ats/restapi.cfc](https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/library/cfc@refs/heads/master/-/blob/apps%2Fats%2Frestapi.cfc) |

---

## Local file in this workspace

| File | Contents |
| --- | --- |
| `SQL Stuff/tblaudit schema.csv` | Column list for **`TblAudit`** (includes **`tblAuditID`**). |

---

## Extending the inventory in Sourcebot

1. Run `search_code` on `code.gensuite.com/pm/audit` for `TblAudit_`, `tblaudit`, `INSERT INTO`, and `FROM ltb`.
2. Run `search_code` on `code.gensuite.com/pm/library/cfc` with `filterByFilepaths: ["apps/ats"]` for `ltb`, `FROM ltb`, `ReadAcross`, and `Pending`.
3. Read `lookup/audit.cfc` end-to-end for any additional `ltb*` tables or views.
4. Read `apps/ats/comments/*.cfc` when you need to confirm whether a behavior uses dedicated tables or writes back into `TblAudit`, `TblAudit_Step`, or `Extensions_Data`.
5. Optional: enable a language model on the Sourcebot host for `ask_codebase` ([Sourcebot LM config](https://docs.sourcebot.dev/docs/configuration/language-model-providers)).

---

*Table names may vary by case (`TblAudit` vs `tblAudit`); align with your database and queries.*
