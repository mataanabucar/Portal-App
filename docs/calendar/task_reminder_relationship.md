# TASK and TASK_REMINDER Relationship Schema

Compact reference for `dbo.TASK` and `dbo.TASK_REMINDER` based on the supplied column and key metadata.

---

## Relationship summary

- `dbo.TASK` primary key: `(ORGNAME, LOCATION, TASK_NAME)`
- `dbo.TASK_REMINDER` primary key: `(ORGNAME, LOCATION, TASK_NAME, REMINDER_DATE)`
- `dbo.TASK_REMINDER (ORGNAME, LOCATION, TASK_NAME)` -> `dbo.TASK (ORGNAME, LOCATION, TASK_NAME)` via `FK_TaskReminder_task`
- `dbo.TASK.ParentTaskId` -> `dbo.TASK.TaskID` via `FK_TASK_ParentTaskId_TASK_TaskID`
- `dbo.TASK.BldgID` -> `dbo.ltbBuilding.BldgID` via `FK_TASK_ltbBuilding_BldgID`
- `dbo.TASK.WkstID` -> `dbo.ltbWorkstation.WkstID` via `FK_TASK_ltbWorkstation_WkstID`

```text
dbo.TASK
  PK: ORGNAME + LOCATION + TASK_NAME
  ID: TaskID
  Self link: ParentTaskId -> TaskID

dbo.TASK_REMINDER
  PK: ORGNAME + LOCATION + TASK_NAME + REMINDER_DATE
  Parent link: ORGNAME + LOCATION + TASK_NAME -> dbo.TASK
```

## dbo.TASK

**Key notes**

- Business key: `ORGNAME`, `LOCATION`, `TASK_NAME`
- `TaskID` is a non-null surrogate-style identifier used by the self-reference
- `ParentTaskId` supports parent/child task hierarchy
- Both `TASK_PRIORITY` and `Priority` exist as separate columns in the supplied schema

### Core identity and ownership

| Column | Type | Null | Default | Key / note |
| --- | --- | --- | --- | --- |
| `ORGNAME` | `nvarchar(50)` | No | `-` | PK |
| `LOCATION` | `nvarchar(50)` | No | `-` | PK |
| `TASK_NAME` | `nvarchar(255)` | No | `-` | PK |
| `TaskID` | `int` | No | `-` | Surrogate-style ID |
| `ParentTaskId` | `int` | Yes | `-` | FK to `dbo.TASK.TaskID` |
| `RESP_PERSON` | `nvarchar(150)` | No | `-` | Responsible person |
| `RESP_CC` | `nvarchar(150)` | Yes | `-` | CC recipient |
| `MULT_CC` | `nvarchar(1000)` | Yes | `-` | Multi-CC list |
| `MEDIA` | `nvarchar(250)` | Yes | `-` | Media/reference field |
| `COE` | `nvarchar(50)` | Yes | `-` | COE |
| `SubCOEID` | `int` | Yes | `-` | Sub-COE reference |
| `INT_CONT` | `nvarchar(50)` | Yes | `-` | Internal contact |

### Reminder configuration

| Column | Type | Null | Default | Key / note |
| --- | --- | --- | --- | --- |
| `REMIND` | `bit` | No | `1` | Reminder enabled flag |
| `FIRST_REM_DATE` | `datetime` | No | `-` | First reminder date |
| `REM_FREQ` | `nvarchar(50)` | No | `-` | Reminder frequency |
| `REM_DAYS_PRIOR` | `int` | No | `0` | Days before due date |
| `LATEST_REM_DATE` | `datetime` | Yes | `-` | Latest reminder sent |
| `MultiRemindDays` | `nvarchar(25)` | Yes | `-` | Multi-reminder config |
| `LastMultiRemind` | `int` | Yes | `-` | Last multi-reminder value |
| `WarnOnlyCC` | `smallint` | No | `0` | Warn-only CC mode |
| `DefaultSent` | `bit` | Yes | `0` | Default sent flag |
| `DefaultWarn` | `bit` | Yes | `0` | Default warn flag |
| `DefaultLate` | `bit` | Yes | `0` | Default late flag |
| `NotifyCC` | `bit` | No | `0` | Notify CC flag |
| `Escalation_CC` | `nvarchar(150)` | Yes | `-` | Escalation CC |
| `Escalation_Mult_CC` | `nvarchar(2000)` | Yes | `-` | Escalation multi-CC |
| `AutoEscalation` | `bit` | No | `0` | Auto-escalation enabled |
| `AutoEscalationDays` | `smallint` | Yes | `-` | Days before escalation |
| `deferCreationUntil` | `datetime` | Yes | `-` | Deferred creation date |

### Planning and work definition

| Column | Type | Null | Default | Key / note |
| --- | --- | --- | --- | --- |
| `REG_COMP` | `bit` | Yes | `1` | Regulatory/compliance flag |
| `TASK_PLAN` | `nvarchar(max)` | Yes | `-` | Task plan |
| `WEBLINK` | `nvarchar(1500)` | Yes | `-` | Web link |
| `TASK_PRIORITY` | `tinyint` | Yes | `-` | Legacy/alternate priority field |
| `Priority` | `int` | No | `0` | Priority field |
| `TIM_EST` | `int` | Yes | `0` | Time estimate |
| `COST_EST` | `money` | Yes | `0` | Cost estimate |
| `CONSENT_ORDER` | `nvarchar(150)` | Yes | `-` | Consent order |
| `CO_DATE` | `nvarchar(50)` | Yes | `-` | Consent order date text |
| `COMP_PLAN_DESC` | `nvarchar(max)` | Yes | `-` | Compliance plan description |
| `COMP_REPT_FREQ` | `nvarchar(50)` | Yes | `-` | Compliance report frequency |
| `COMP_REPT_FIRST_DATE` | `nvarchar(50)` | Yes | `-` | First compliance report date |
| `PROJECT` | `bit` | No | `0` | Project flag |
| `SubTaskType` | `int` | No | `0` | Subtask type |
| `ExternalSubmit` | `bit` | No | `0` | External submit flag |
| `isAttachmentRequired` | `bit` | No | `0` | Attachment required |
| `referenceOnClose` | `varchar(25)` | Yes | `-` | Close reference text |
| `Administrative` | `bit` | Yes | `0` | Administrative flag |

### Completion and control

| Column | Type | Null | Default | Key / note |
| --- | --- | --- | --- | --- |
| `COMP` | `bit` | No | `0` | Completed flag |
| `COMP_DATE` | `datetime` | Yes | `-` | Completion date |
| `Verifier` | `nvarchar(150)` | Yes | `-` | Verifier |
| `Verify_Plan` | `nvarchar(max)` | Yes | `-` | Verification plan |
| `LOCK_TASK` | `bit` | No | `1` | Task lock flag |
| `LOCK_MAIL` | `bit` | No | `1` | Mail lock flag |

### Integration, location, and audit fields

| Column | Type | Null | Default | Key / note |
| --- | --- | --- | --- | --- |
| `UPDATE_DATE` | `datetime` | Yes | `getdate()` | Update timestamp |
| `RefType` | `nvarchar(50)` | Yes | `-` | External reference type |
| `RefID` | `nvarchar(255)` | Yes | `-` | External reference ID |
| `UpdateUser` | `nvarchar(150)` | Yes | `-` | Last updated by |
| `UpdateHistory` | `nvarchar(max)` | Yes | `-` | Update history |
| `MXWasChecked` | `bit` | No | `0` | MX flag |
| `MXHasDouble` | `bit` | No | `0` | MX flag |
| `MXWasUpdated` | `bit` | No | `0` | MX flag |
| `MXEncode` | `varchar(30)` | Yes | `-` | MX encode value |
| `BldgID` | `int` | Yes | `-` | FK to `dbo.ltbBuilding.BldgID` |
| `WkstID` | `int` | Yes | `-` | FK to `dbo.ltbWorkstation.WkstID` |
| `TemplateID` | `int` | Yes | `-` | Template reference |
| `TemplateRevDate` | `datetime` | Yes | `-` | Template revision date |
| `isArchived` | `bit` | No | `0` | Archive flag |
| `CreatedBy` | `nvarchar(150)` | Yes | `-` | Created by |
| `CreatedDate` | `datetime` | Yes | `-` | Created date |

## dbo.TASK_REMINDER

**Key notes**

- Composite primary key: `ORGNAME`, `LOCATION`, `TASK_NAME`, `REMINDER_DATE`
- `ORGNAME`, `LOCATION`, and `TASK_NAME` are also the foreign key back to `dbo.TASK`
- `TaskReminderID` appears to be a surrogate-style identifier, but it is not marked as a primary key in the supplied metadata

### Key and task link

| Column | Type | Null | Default | Key / note |
| --- | --- | --- | --- | --- |
| `ORGNAME` | `nvarchar(50)` | No | `-` | PK, FK to `dbo.TASK` |
| `LOCATION` | `nvarchar(50)` | No | `-` | PK, FK to `dbo.TASK` |
| `TASK_NAME` | `nvarchar(255)` | No | `-` | PK, FK to `dbo.TASK` |
| `REMINDER_DATE` | `datetime` | No | `-` | PK |
| `TaskReminderID` | `int` | No | `-` | Surrogate-style ID |
| `TaskDetailsID` | `int` | Yes | `-` | Detail/reference ID |

### Assignment and reminder execution

| Column | Type | Null | Default | Key / note |
| --- | --- | --- | --- | --- |
| `RESP_PERSON` | `nvarchar(150)` | Yes | `-` | Responsible person |
| `COMPLETE` | `smallint` | No | `0` | Completion flag/status |
| `COMPLETE_DATE` | `datetime` | Yes | `-` | Completion date |
| `COMMENT` | `nvarchar(max)` | Yes | `-` | Comment |
| `REMINDER_PLAN` | `nvarchar(1000)` | Yes | `-` | Reminder plan |

### Email and escalation tracking

| Column | Type | Null | Default | Key / note |
| --- | --- | --- | --- | --- |
| `EMAILSENT` | `bit` | No | `0` | Sent email flag |
| `EMAILWARN` | `bit` | No | `0` | Warning email flag |
| `EMAILLATE` | `bit` | No | `0` | Late email flag |
| `EscalateDueDate` | `datetime` | Yes | `-` | Escalation due date |
| `AutoEscalationStep` | `tinyint` | No | `0` | Auto-escalation step |
| `asyncEmail` | `bit` | Yes | `0` | Async email flag |

### Verification and MX/system fields

| Column | Type | Null | Default | Key / note |
| --- | --- | --- | --- | --- |
| `VerifiedBy` | `nvarchar(150)` | Yes | `-` | Verified by |
| `Verified_Comment` | `nvarchar(max)` | Yes | `-` | Verification comment |
| `Verified_Date` | `smalldatetime` | Yes | `-` | Verification date |
| `Verified_Status` | `smallint` | Yes | `0` | Verification status |
| `MXWasChecked` | `bit` | No | `0` | MX flag |
| `MXHasDouble` | `bit` | No | `0` | MX flag |
| `MXWasUpdated` | `bit` | No | `0` | MX flag |
| `MXEncode` | `varchar(30)` | Yes | `-` | MX encode value |

## Quick join reference

```sql
SELECT t.ORGNAME
     , t.LOCATION
     , t.TASK_NAME
     , tr.REMINDER_DATE
FROM dbo.TASK t WITH (NOLOCK)
INNER JOIN dbo.TASK_REMINDER tr WITH (NOLOCK) ON tr.ORGNAME = t.ORGNAME
    AND tr.LOCATION = t.LOCATION
    AND tr.TASK_NAME = t.TASK_NAME;
```

```sql
SELECT child.TaskID
     , child.TASK_NAME
     , parent.TaskID AS ParentTaskID
     , parent.TASK_NAME AS ParentTaskName
FROM dbo.TASK child WITH (NOLOCK)
INNER JOIN dbo.TASK parent WITH (NOLOCK) ON child.ParentTaskId = parent.TaskID;
```

## Notes

- The supplied metadata lists `TASK_REMINDER.ORGNAME`, `LOCATION`, and `TASK_NAME` twice because those columns participate in both the composite primary key and the foreign key to `dbo.TASK`.
- This document intentionally keeps only the schema details that matter most for day-to-day reading: columns, types, nullability, defaults, and relationships.
