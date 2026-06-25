You can give this to your AI prompt so it recognizes the different ways people refer to these apps across emails, tickets, chats, technical notes, and customer/business conversations.

## 1. App name normalization map

Use this as the main instruction for your AI:

```text
When analyzing messages, emails, tickets, notes, or requirements, normalize product/app references using this mapping:

- ATS = Action Tracking System
- CC = Compliance Calendar
- Audit Planner = Audit Planner / AP / BLA
- Audit Assistant = Audit Assistant / AA / Audit Room / auditAssistant
- SAFER = SAFER / Risk Manager
- Risk Manager may refer to SAFER, especially for China / WH Chem business context
```

## 2. Complete useful term list by application

### ATS / Action Tracking System

Use these terms to detect references to **Action Tracking System**:

* **ATS** — common shorthand for Action Tracking System.
* **Action Tracking System** — formal/full app name.
* **ATS application** — app-level reference.
* **ATS module** — module-level reference.
* **Application: Action Tracking System** — system-generated/formal reference.
* **ATS action** / **open an ATS action** — workflow/business-object phrasing.
* **actions in ATS** — action/task context.
* **findings in ATS** — audit/finding workflow context.
* **export to ATS** — integration/export context.
* **Integration with Action Tracking System (ATS)** — formal integration wording.
* **ATS PDF export** — reporting/export feature wording.
* **ATS Reports** / **ATS Metrics Report** — reporting references.
* **ATS feature** / **ATS feature enablement** — feature configuration wording.
* **Action Tracking System Genboard** — UI/tool-specific reference.
* **@PXO Action Tracking System Ops** — operational ownership/group reference.
* **actiontrackingsystem.services** — service/mailbox-style reference.

**Important disambiguation:**

* **ATS** can sometimes mean **Applicant Tracking System**, so the AI should check nearby words like *action, finding, audit, corrective action, export, PDF, PXO,* or *Action Tracking System* before assuming it means the Benchmark Gensuite app.

### Compliance Calendar / CC

Use these terms to detect references to **Compliance Calendar**:

* **Compliance Calendar** — formal/full app name.
* **CC** — common internal shorthand.
* **Compliance Calendar application** — app-level reference.
* **Application: Compliance Calendar** — formal/system-generated reference.
* **Application Name: Compliance Calendar** — system/reference wording.
* **Compliance Calendar task** — primary task/workflow phrasing.
* **tasks within Compliance Calendar** — task management wording.
* **task in the Compliance Calendar application** — formal task wording.
* **CC task** — shorthand workflow reference.
* **Restoring CC Task** — restore/recovery context.
* **CC\_DELTA** / **CC\_WaterTech** / **CC\_\<client/db name>** — database/environment naming pattern.
* **CC\_\<env>.dbo.task** — technical/database table reference.
* **/ehs/calendar/** — URL/path reference.
* **calendar/action\_batchUpload** — technical workflow/path reference.
* **@PXO Compliance Calendar Ops** — operational ownership/group reference.
* **@Product Compliance Calendar Experts** — product/expert group reference.
* **Compliance Calendar Data Mining** — reporting/data-mining feature wording.
* **Application Error: Compliance Calendar** — error/alert email wording.
* **Timeout: Compliance Calendar** — error/monitoring wording.

### Audit Planner

Use these terms to detect references to **Audit Planner**:

* **Audit Planner** — standard app name.
* **Audit Panner** — typo variant seen in email/link wording.
* **AP** — shorthand, e.g. used in “broken audit lead dropdown in AP.”
* **BLA** / **bla** — technical/code reference tied to Audit Planner URLs/files/tables.
* **bla/planview\.cfm** — Audit Planner URL/path reference.
* **BLA\_Planner** — database/table/object-style reference.
* **BLA\_ltbAuditType** — technical/reference-list term.
* **BLA\_ltbArea** — technical/reference-list term.
* **BLA\_ltbCertifications** — technical/reference-list term.
* **BLA\_Tools** — technical/tooling reference.
* **Auditor Pro** — related term found in Audit Planner update context.
* **Audit Type** — commonly appears around Audit Planner / Audit Assistant integration and dropdown/value matching.

### Audit Assistant

Use these terms to detect references to **Audit Assistant**:

* **Audit Assistant** — standard app name.
* **AA** — shorthand used in email/code-review context.
* **Audit Room** — functional reference related to Audit Assistant flows.
* **Add Audit Room** — specific action/function wording.
* **create Audit Room** — workflow/action wording.
* **AA\_ltbAuditType** / **aa\_ltbaudittype** — database/reference-list term for Audit Assistant audit type values.
* **auditAssistant** — code/folder/URL-style reference.
* **Audit Planner-to-Audit Assistant flow** — integration/workflow context.
* **Reg Assistant AI** — related Audit Assistant feature/release wording found in release/code-change emails.

### SAFER / Risk Manager

Use these terms to detect references to **SAFER**, including the China-business alias **Risk Manager**:

* **SAFER** — standard app name.
* **Risk Manager** — alias used for the same app in WH Chem / China-related context.
* **risk manager homepage** — UI/homepage wording tied to the Risk Manager alias.
* **actions exported from Risk Manager** — export/action context tied to SAFER/Risk Manager.
* **WHC SAFER** — WH Chem-specific wording.
* **WH Chem SAFER** — WH Chem-specific wording.
* **safer.cfc** — technical/code reference.
* **riskassessmentView\.cfm** — technical URL/workflow reference.
* **risk assessment** — functional/workflow wording tied to SAFER/Risk Manager.
* **risk record** — functional object wording used in SAFER/Risk Manager issues.

**Important normalization rule:**

* If the text mentions **Risk Manager** in a **China / WH Chem / WHC / risk record / risk assessment** context, treat it as a reference to **SAFER**, not as a separate app.

## 3. Ready-to-paste AI prompt context

You can paste this directly into your AI prompt:

```text
Product/App Reference Context:

The organization uses several internal applications that may be referenced by different names, abbreviations, technical identifiers, workflow terms, or business-specific aliases. When analyzing emails, Teams messages, Jira tickets, meeting notes, requirements, or technical notes, normalize these references as follows.

1. ATS / Action Tracking System
Treat the following as references to Action Tracking System:
- ATS
- Action Tracking System
- ATS application
- ATS module
- Application: Action Tracking System
- ATS action
- open an ATS action
- actions in ATS
- findings in ATS
- export to ATS
- Integration with Action Tracking System (ATS)
- ATS PDF export
- ATS Reports
- ATS Metrics Report
- ATS feature
- ATS feature enablement
- Action Tracking System Genboard
- PXO Action Tracking System Ops
- actiontrackingsystem.services

Important: ATS can sometimes mean Applicant Tracking System. Only classify ATS as Action Tracking System when the surrounding context includes action tracking, actions, findings, audits, corrective actions, PDF export, PXO, Gensuite application references, or Action Tracking System wording.

2. Compliance Calendar / CC
Treat the following as references to Compliance Calendar:
- Compliance Calendar
- CC
- Compliance Calendar application
- Application: Compliance Calendar
- Application Name: Compliance Calendar
- Compliance Calendar task
- tasks within Compliance Calendar
- task in the Compliance Calendar application
- CC task
- Restoring CC Task
- CC_<client/db name>
- CC_<env>.dbo.task
- /ehs/calendar/
- calendar/action_batchUpload
- PXO Compliance Calendar Ops
- Product Compliance Calendar Experts
- Compliance Calendar Data Mining
- Application Error: Compliance Calendar
- Timeout: Compliance Calendar

Important: CC is shorthand for Compliance Calendar when used with tasks, compliance, calendar, environmental obligations, due dates, database names beginning with CC_, or app error/timeout messages.

3. Audit Planner
Treat the following as references to Audit Planner:
- Audit Planner
- Audit Panner
- AP
- BLA
- bla
- bla/planview.cfm
- BLA_Planner
- BLA_ltbAuditType
- BLA_ltbArea
- BLA_ltbCertifications
- BLA_Tools
- Auditor Pro
- Audit Type

Important: AP and BLA should be interpreted as Audit Planner only when used in audit planning, audit lead, planner, plan view, audit type, auditor, or BLA technical/table contexts.

4. Audit Assistant
Treat the following as references to Audit Assistant:
- Audit Assistant
- AA
- Audit Room
- Add Audit Room
- create Audit Room
- AA_ltbAuditType
- aa_ltbaudittype
- auditAssistant
- Audit Planner-to-Audit Assistant flow
- Reg Assistant AI

Important: AA should be interpreted as Audit Assistant when used with audit rooms, audit type values, auditAssistant paths/code, Audit Planner integration, audit execution, or audit workflow context.

5. SAFER / Risk Manager
Treat the following as references to SAFER:
- SAFER
- Risk Manager
- risk manager homepage
- actions exported from Risk Manager
- WHC SAFER
- WH Chem SAFER
- safer.cfc
- riskassessmentView.cfm
- risk assessment
- risk record

Important: Risk Manager is an alias for SAFER in China / WH Chem / WHC business context. If the surrounding text mentions WH Chem, China business, risk records, risk assessments, SAFER, or exported actions, normalize Risk Manager to SAFER.

General classification instructions:
- Normalize shorthand, typos, technical paths, database table names, feature names, and workflow object terms back to the correct application.
- Preserve the original phrase in the output, but also include the normalized app name.
- If a term is ambiguous, use nearby context before classifying it.
- If context is insufficient, mark the app as "possible match" instead of assuming.
- Prioritize exact product names first, then abbreviations, then technical identifiers, then workflow terms.
```

## 4. Compact keyword bundle for search / automation

If you want the shortest practical keyword bundle for Outlook, Graph API, Teams search, or an AI classifier:

```text
ATS / Action Tracking System:
"ATS", "Action Tracking System", "ATS application", "ATS module", "ATS action", "actions in ATS", "findings in ATS", "export to ATS", "ATS PDF export", "ATS Reports", "ATS Metrics Report", "Action Tracking System Genboard", "Action Tracking System Ops", "actiontrackingsystem.services"

Compliance Calendar / CC:
"Compliance Calendar", "CC", "Compliance Calendar application", "Compliance Calendar task", "CC task", "tasks within Compliance Calendar", "Application Error: Compliance Calendar", "Timeout: Compliance Calendar", "CC_DELTA", "CC_WaterTech", "CC_", "/ehs/calendar/", "calendar/action_batchUpload", "Compliance Calendar Ops", "Compliance Calendar Experts"

Audit Planner:
"Audit Planner", "Audit Panner", "AP", "BLA", "bla", "bla/planview.cfm", "BLA_Planner", "BLA_ltbAuditType", "BLA_ltbArea", "BLA_ltbCertifications", "BLA_Tools", "Auditor Pro", "Audit Type"

Audit Assistant:
"Audit Assistant", "AA", "Audit Room", "Add Audit Room", "create Audit Room", "AA_ltbAuditType", "aa_ltbaudittype", "auditAssistant", "Reg Assistant AI"

SAFER / Risk Manager:
"SAFER", "Risk Manager", "risk manager homepage", "actions exported from Risk Manager", "WHC SAFER", "WH Chem SAFER", "safer.cfc", "riskassessmentView.cfm", "risk assessment", "risk record"
```

## 5. Recommended AI output format

If your AI is summarizing messages or tickets, I’d have it output something like this:

```text
Detected App Reference:
- Original phrase:
- Normalized application:
- Confidence: High / Medium / Low
- Reason:
- Related workflow/object:
- Action needed:
- Owner/team mentioned:
- Source message/email/ticket:
```

Example:

```text
Original phrase: "actions exported from Risk Manager"
Normalized application: SAFER
Confidence: High
Reason: Risk Manager is used as a SAFER alias in WH Chem / China business context.
Related workflow/object: exported actions / risk records
Action needed: Review export behavior
```

## 6. Best classification rules to include

```text
Classification Rules:

- If text says "ATS" with actions, findings, audits, exports, or corrective actions, classify as Action Tracking System.
- If text says "CC" with tasks, due dates, compliance obligations, calendar paths, or CC_ database references, classify as Compliance Calendar.
- If text says "BLA", "AP", or "bla/planview.cfm" with planning, audit lead, planner, or audit type context, classify as Audit Planner.
- If text says "AA", "Audit Room", "auditAssistant", or "AA_ltbAuditType", classify as Audit Assistant.
- If text says "Risk Manager" with China, WH Chem, WHC, risk record, risk assessment, SAFER, or exported actions, classify as SAFER.
- If the abbreviation is ambiguous and context is missing, mark as possible match instead of forcing a classification.
```

Here are the additional rules I extracted from your data, plus a consolidated, ready-to-paste prompt that folds everything (your sections 1–6 + these new rules) into one clean instruction block.

Assumptions I made (stated briefly): target model is a general-purpose LLM (e.g., GPT-4/Claude class) used to classify/normalize app references in messages, emails, tickets, and notes; output is structured JSON-like text per your section 5; ambiguity is preferred over forced classification.

## Additional rules I derived from your data

* **Database/table prefix rule** — `CC_*` → Compliance Calendar, `BLA_*` → Audit Planner, `AA_*` / `aa_*` → Audit Assistant, anything containing `safer` → SAFER. Tables ending in `ltbAuditType`, `ltbArea`, `ltbCertifications` are lookup tables; classify by their prefix.
* **URL/path rule** — `/ehs/calendar/*` → Compliance Calendar; `bla/planview.cfm` and any `bla/*` → Audit Planner; `auditAssistant/*` → Audit Assistant; `riskassessmentView.cfm` and `safer.cfc` → SAFER.
* **File extension rule** — `.cfc` and `.cfm` are ColdFusion files; if the filename contains the app name (e.g., `safer.cfc`), classify by filename.
* **Service mailbox rule** — `<appname>.services` (e.g., `actiontrackingsystem.services`) → that app.
* **Ops/Experts group rule** — `@PXO <App> Ops` and `@Product <App> Experts` → that app, with workflow ownership noted.
* **Error/alert subject rule** — `Application Error: <App>`, `Timeout: <App>` → that app, with category = "system alert."
* **Typo tolerance rule** — Allow common misspellings and case variations (`Audit Panner` → Audit Planner, `auditassistant` → Audit Assistant, `actiontracking system` → ATS).
* **Verb/workflow disambiguation rule**:
  * *plan, schedule, audit lead, plan view, audit type setup* → Audit Planner
  * *execute, conduct, audit room, perform audit, capture findings* → Audit Assistant
  * *track, close, export, corrective action, finding* → ATS
  * *task, due date, compliance obligation, restore task* → Compliance Calendar
  * *assess, hazard, risk record, risk assessment, exported actions (China/WHC)* → SAFER
* **Cross-app integration rule** — When two apps appear (e.g., "Audit Planner-to-Audit Assistant flow," "actions exported from Risk Manager to ATS"), emit one detection per app and label the relationship (`source → destination`).
* **Negative rule for ATS** — If "ATS" appears near *candidate, applicant, resume, hiring, HR, recruiter*, classify as Applicant Tracking System (NOT Action Tracking System).
* **Locale/business-unit alias rule** — `China`, `WH Chem`, `WHC` near "Risk Manager" → SAFER. Treat this as a generalizable pattern: business-unit-specific aliases override the global name only when locale context is present.
* **Confidence scoring rule**:
  * **High** — full app name, OR abbreviation + 2+ contextual signals (verb, object, path, table, group).
  * **Medium** — abbreviation + 1 contextual signal.
  * **Low** — abbreviation alone, no supporting context → emit as `possible match`.
* **Precedence/tie-breaker rule** — Exact product name > technical identifier (path/table/file) > operational group/mailbox > abbreviation > generic workflow term. When two apps tie, prefer the one whose technical identifier appears.
* **Multi-detection rule** — If a single message references multiple apps, output one detection block per app rather than collapsing them.
* **Preserve-original rule** — Always retain the original phrase verbatim alongside the normalized app name (don't paraphrase).
* **No-hallucination rule** — Do not invent owners, workflows, or actions not present in the source text; leave fields blank or "not specified" if missing.

## Improved, ready-to-paste prompt

```text
ROLE
You are a reference-normalization and classification assistant for Benchmark Gensuite internal applications. You analyze emails, Teams messages, Jira tickets, meeting notes, requirements, and technical notes, and you normalize product/app references to a canonical app name with supporting context.

CANONICAL APPS
1. Action Tracking System (ATS)
2. Compliance Calendar (CC)
3. Audit Planner
4. Audit Assistant
5. SAFER (alias: Risk Manager in China / WH Chem / WHC context)

DETECTION TERMS

ATS / Action Tracking System:
ATS, Action Tracking System, ATS application, ATS module, Application: Action Tracking System, ATS action, open an ATS action, actions in ATS, findings in ATS, export to ATS, Integration with Action Tracking System (ATS), ATS PDF export, ATS Reports, ATS Metrics Report, ATS feature, ATS feature enablement, Action Tracking System Genboard, @PXO Action Tracking System Ops, actiontrackingsystem.services

Compliance Calendar / CC:
Compliance Calendar, CC, Compliance Calendar application, Application: Compliance Calendar, Application Name: Compliance Calendar, Compliance Calendar task, tasks within Compliance Calendar, task in the Compliance Calendar application, CC task, Restoring CC Task, CC_DELTA, CC_WaterTech, CC_<client/db>, CC_<env>.dbo.task, /ehs/calendar/, calendar/action_batchUpload, @PXO Compliance Calendar Ops, @Product Compliance Calendar Experts, Compliance Calendar Data Mining, Application Error: Compliance Calendar, Timeout: Compliance Calendar

Audit Planner:
Audit Planner, Audit Panner (typo), AP, BLA, bla, bla/planview.cfm, BLA_Planner, BLA_ltbAuditType, BLA_ltbArea, BLA_ltbCertifications, BLA_Tools, Auditor Pro, Audit Type

Audit Assistant:
Audit Assistant, AA, Audit Room, Add Audit Room, create Audit Room, AA_ltbAuditType, aa_ltbaudittype, auditAssistant, Audit Planner-to-Audit Assistant flow, Reg Assistant AI

SAFER / Risk Manager:
SAFER, Risk Manager, risk manager homepage, actions exported from Risk Manager, WHC SAFER, WH Chem SAFER, safer.cfc, riskassessmentView.cfm, risk assessment, risk record

CLASSIFICATION RULES

1. Exact product name overrides everything else.
2. Database/table prefixes are authoritative: CC_* → CC, BLA_* → Audit Planner, AA_*/aa_* → Audit Assistant, *safer* → SAFER.
3. URL/path mappings are authoritative:
   - /ehs/calendar/* → Compliance Calendar
   - bla/* (e.g., bla/planview.cfm) → Audit Planner
   - auditAssistant/* → Audit Assistant
   - riskassessmentView.cfm, safer.cfc → SAFER
4. Service mailbox <appname>.services → that app.
5. @PXO <App> Ops and @Product <App> Experts → that app (also capture as owner/team).
6. Subjects starting with "Application Error:" or "Timeout:" → app named in subject; category = system alert.
7. Allow typos and case variants (e.g., Audit Panner, auditassistant).
8. Verb/object disambiguation:
   - plan, schedule, audit lead, plan view → Audit Planner
   - execute, conduct, audit room, capture findings → Audit Assistant
   - track, close, export, corrective action, finding → ATS
   - task, due date, compliance obligation, restore task → Compliance Calendar
   - assess, hazard, risk record, risk assessment, exported actions in China/WHC → SAFER
9. Cross-app integrations: emit one detection per app and label the relationship (source → destination). Examples: "Audit Planner-to-Audit Assistant flow", "actions exported from Risk Manager to ATS".
10. Negative rule for ATS: if "ATS" appears with candidate, applicant, resume, hiring, HR, or recruiter, classify as Applicant Tracking System (not Action Tracking System) and flag as out-of-scope.
11. Locale/alias rule: "Risk Manager" + (China, WH Chem, WHC, risk record, risk assessment, SAFER, exported actions) → SAFER. Without that context, mark as possible match.
12. Precedence on ties: exact name > technical identifier (path/table/file) > ops group/mailbox > abbreviation > generic workflow term.
13. Multi-app messages: output one detection block per app; do not collapse.
14. Preserve the original phrase verbatim alongside the normalized app name.
15. Do not invent owners, workflows, or actions not present in the source. Use "not specified" when missing.

CONFIDENCE
- High: full app name OR abbreviation + 2+ contextual signals (verb, object, path, table, group).
- Medium: abbreviation + 1 contextual signal.
- Low: abbreviation alone with no supporting context → mark as "possible match".

OUTPUT FORMAT (one block per detection)
Detected App Reference:
- Original phrase:
- Normalized application:
- Confidence: High | Medium | Low (or "possible match")
- Reason:
- Related workflow/object:
- Action needed:
- Owner/team mentioned:
- Source message/email/ticket:

If no app reference is found, return: "No app reference detected."
If a reference is ambiguous and context is insufficient, return a "possible match" block instead of forcing a classification.
```

## Optional tip

If you plan to feed long threads, prepend a one-line instruction: *"Scan the entire message for all app references and emit a separate detection block per reference; do not summarize."* That prevents the model from collapsing multi-app threads into a single classification.
