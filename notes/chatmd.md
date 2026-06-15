

> sourcebot mcp, dont use memory or local files, actually use sourcebot mcp and tell me what audfinding.cfm does

<details><summary>6 previous messages</summary>

> You want a Sourcebot-only answer. I’m locating the repository and reading `audfinding.cfm` through Sourcebot MCP directly; I won’t use memory or local files.
>
> <details><summary>Called 2 tools</summary>
>
> MCP tool call
>
> sourcebot.list_repos
>
> ```json
> {
>   "query": "audit",
>   "perPage": 20,
>   "sort": "name",
>   "direction": "asc"
> }
> ```
>
> ```text
> {"repos":[{"name":"code.gensuite.com/it/serverops/audit-iisvirtualdirectories","url":"https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/it/serverops/audit-iisvirtualdirectories/-/tree/","pushedAt":"2026-02-05T16:58:37.000Z","defaultBranch":"main","isFork":false,"isArchived":false},{"name":"code.gensuite.com/pm/audit","url":"https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit/-/tree/","pushedAt":"2026-06-03T06:43:13.000Z","defaultBranch":"master","isFork":false,"isArchived":false},{"name":"code.gensuite.com/pm/auditassistant","url":"https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/auditassistant/-/tree/","pushedAt":"2026-05-20T10:25:10.000Z","defaultBranch":"master","isFork":false,"isArchived":false}],"totalCount":3}
> ```
>
> MCP tool call
>
> sourcebot.search_code
>
> ```json
> {
>   "query": "audfinding.cfm",
>   "includeCodeSnippets": false,
>   "maxTokens": 10000
> }
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/inside@refs/heads/master/-/blob/GoTo.bak
> num_matches: 1
> repo: code.gensuite.com/pm/inside
> language:
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/inside@refs/heads/master/-/blob/GoTo.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/inside
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/mapper@refs/heads/master/-/blob/cfc%2Fats.cfc
> num_matches: 1
> repo: code.gensuite.com/pm/mapper
> language: ColdFusion CFC
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/hatbeard/thehighlander@refs/heads/master/-/blob/moarcode%2FGoTo.bak
> num_matches: 1
> repo: code.gensuite.com/hatbeard/thehighlander
> language:
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/hatbeard/thehighlander@refs/heads/master/-/blob/moarcode%2FGoTo.cfm
> num_matches: 1
> repo: code.gensuite.com/hatbeard/thehighlander
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/calendar@refs/heads/master/-/blob/task.cfm
> num_matches: 3
> repo: code.gensuite.com/pm/calendar
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/dlg@refs/heads/master/-/blob/item.cfm
> num_matches: 2
> repo: code.gensuite.com/pm/dlg
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/inside@refs/heads/master/-/blob/indexPDA.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/inside
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/inside@refs/heads/master/-/blob/beta%2FGoTo.bak
> num_matches: 1
> repo: code.gensuite.com/pm/inside
> language:
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/inside@refs/heads/master/-/blob/beta%2FGoTo.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/inside
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/audit.cfm
> num_matches: 2
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/measure@refs/heads/master/-/blob/istatus.cfm
> num_matches: 2
> repo: code.gensuite.com/pm/measure
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/measure@refs/heads/master/-/blob/nstatus.cfm
> num_matches: 3
> repo: code.gensuite.com/pm/measure
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/hatbeard/thehighlander@refs/heads/master/-/blob/moarcode%2FindexPDA.cfm
> num_matches: 1
> repo: code.gensuite.com/hatbeard/thehighlander
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/measure@refs/heads/master/-/blob/fstatus.cfm
> num_matches: 2
> repo: code.gensuite.com/pm/measure
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/measure@refs/heads/master/-/blob/estatus.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/measure
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/calendar@refs/heads/master/-/blob/Index.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/calendar
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/topbar.cfm
> num_matches: 7
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/world@refs/heads/master/-/blob/watch%2Fats.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/world
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/export.cfm
> num_matches: 6
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/status.cfm
> num_matches: 10
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/dgroup@refs/heads/master/-/blob/form2.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/dgroup
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/pha@refs/heads/master/-/blob/pha.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/pha
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/swp@refs/heads/master/-/blob/swpadd.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/swp
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/inside@refs/heads/master/-/blob/beta%2FindexPDA.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/inside
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/NoGroup.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/reflink.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/ai-agents/code-researcher@refs/heads/main/-/blob/src%2Fapp.py
> num_matches: 2
> repo: code.gensuite.com/ai-agents/code-researcher
> language: Python
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/msds@refs/heads/master/-/blob/STATUS.CFM
> num_matches: 1
> repo: code.gensuite.com/pm/msds
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/measure@refs/heads/master/-/blob/novaction.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/measure
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/measure@refs/heads/master/-/blob/eventedit.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/measure
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/auditPDA.cfm
> num_matches: 2
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/library/apps@refs/heads/master/-/blob/tags%2FtagData_3.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/library/apps
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/ace@refs/heads/master/-/blob/addForm.cfm
> num_matches: 2
> repo: code.gensuite.com/pm/ace
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/receiver.cfm
> num_matches: 2
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/safety@refs/heads/master/-/blob/jsatp.cfm
> num_matches: 2
> repo: code.gensuite.com/pm/safety
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/measure@refs/heads/master/-/blob/novSummary.cfm
> num_matches: 2
> repo: code.gensuite.com/pm/measure
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/measure@refs/heads/master/-/blob/inspStatus.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/measure
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/measure@refs/heads/master/-/blob/fineaction.cfm
> num_matches: 2
> repo: code.gensuite.com/pm/measure
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/obs@refs/heads/master/-/blob/obsItem.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/obs
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/ih@refs/heads/master/-/blob/ihedit.cfm
> num_matches: 2
> repo: code.gensuite.com/pm/ih
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/world@refs/heads/master/-/blob/beta%2Fwatch%2Fats.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/world
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/COELookup.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/inside@refs/heads/master/-/blob/AppCenterScopeLinks.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/inside
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/hatbeard/thehighlander@refs/heads/master/-/blob/moarcode%2FAppCenterScopeLinks.cfm
> num_matches: 1
> repo: code.gensuite.com/hatbeard/thehighlander
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/equip@refs/heads/master/-/blob/equipadd.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/equip
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/audit_DIV.cfm
> num_matches: 3
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/actexport.cfm
> num_matches: 6
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/audaction.cfm
> num_matches: 15
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/diy@refs/heads/devmaster/-/blob/addForm.cfm
> num_matches: 2
> repo: code.gensuite.com/pm/diy
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/measure@refs/heads/master/-/blob/eventaction.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/measure
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/gsportal@refs/heads/master/-/blob/katalon%2Fstart.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/gsportal
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/inside@refs/heads/master/-/blob/beta%2FAppCenterScopeLinks.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/inside
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/vehicle@refs/heads/master/-/blob/vehiclefollow.cfm
> num_matches: 2
> repo: code.gensuite.com/pm/vehicle
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/audit_beta.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/audfinding.cfm
> num_matches: 11
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/virtualassistant@refs/heads/master/-/blob/js%2Fmodules%2F3.js
> num_matches: 1
> repo: code.gensuite.com/pm/virtualassistant
> language: JavaScript
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/dlg@refs/heads/master/-/blob/adddlg.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/dlg
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/calendar@refs/heads/master/-/blob/emailrem.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/calendar
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/ergoevaluator@refs/heads/master/-/blob/AuditExportCA.cfm
> num_matches: 2
> repo: code.gensuite.com/pm/ergoevaluator
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/exportbyurl.cfm
> num_matches: 3
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/dlg@refs/heads/master/-/blob/status.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/dlg
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/measure@refs/heads/master/-/blob/penaltystatus.cfm
> num_matches: 2
> repo: code.gensuite.com/pm/measure
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/status_mini.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/wwwroot/help_archive@refs/heads/master/-/blob/CCenter%2FATS%2FSample_Emails%2FEmail_HTM%2FClosed%20Finding.htm
> num_matches: 1
> repo: code.gensuite.com/wwwroot/help_archive
> language: HTML
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/XMLreceiver.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/batchupload.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/export_Joel.cfm
> num_matches: 2
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/js%2Faudfinding.js
> num_matches: 3
> repo: code.gensuite.com/pm/audit
> language: JavaScript
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/closeFinding.cfm
> num_matches: 2
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/CustomReport.cfm
> num_matches: 5
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/js%2FdependentDD.js
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: JavaScript
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/measure@refs/heads/master/-/blob/tools%2FcauseMap.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/measure
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/FindingSelect.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/mapper@refs/heads/master/-/blob/mappervue%2Fserver%2Fcfc%2Fats.cfc
> num_matches: 1
> repo: code.gensuite.com/pm/mapper
> language: ColdFusion CFC
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/measure@refs/heads/master/-/blob/incidentSummary.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/measure
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/measure@refs/heads/master/-/blob/eventedit_audit.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/measure
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/measure@refs/heads/master/-/blob/iandicasefollow.cfm
> num_matches: 4
> repo: code.gensuite.com/pm/measure
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/wwwroot/help_archive@refs/heads/master/-/blob/CCenter%2FATS%2FSample_Emails%2FEmail_HTM%2FFinding%20Added-Edited%20.htm
> num_matches: 1
> repo: code.gensuite.com/wwwroot/help_archive
> language: HTML
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/world@refs/heads/master/-/blob/beta%2Futilities%2Fstartmenu.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/world
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/atsTableAsync.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/incident@refs/heads/master/-/blob/incidentadd.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/incident
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/exportXLSlist.cfm
> num_matches: 6
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/measure@refs/heads/master/-/blob/atsMultipleSites.cfm
> num_matches: 2
> repo: code.gensuite.com/pm/measure
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/audfinding_BU.cfm
> num_matches: 5
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/audfindingPDA.cfm
> num_matches: 6
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/measure@refs/heads/master/-/blob/inspectionaction.cfm
> num_matches: 2
> repo: code.gensuite.com/pm/measure
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/swp@refs/heads/master/-/blob/swpadd_v2.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/swp
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/measure@refs/heads/master/-/blob/iandicasedisplay.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/measure
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/library/cfc@refs/heads/master/-/blob/apps%2Fats%2Faudit.cfc
> num_matches: 3
> repo: code.gensuite.com/pm/library/cfc
> language: ColdFusion CFC
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/qualityincident@refs/heads/master/-/blob/incidentadd.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/qualityincident
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/safety@refs/heads/master/-/blob/jsaadmin.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/safety
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/actexportbyurl.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/wwwroot/help_archive@refs/heads/master/-/blob/CCenter%2FATS%2FSample_Emails%2FEmail_HTM%2FClosure%20Due%20Date%20Updated%20.htm
> num_matches: 1
> repo: code.gensuite.com/wwwroot/help_archive
> language: HTML
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/world@refs/heads/master/-/blob/widgets%2FSCMGatewayComponent.cfm
> num_matches: 4
> repo: code.gensuite.com/pm/world
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/ehspower@refs/heads/master/-/blob/customform.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/ehspower
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/pit@refs/heads/master/-/blob/index_left3.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/pit
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/wwwroot/help_archive@refs/heads/master/-/blob/CCenter%2FATS%2FSample_Emails%2FEmail_HTM%2FClosure%20Verification%20Needed.htm
> num_matches: 1
> repo: code.gensuite.com/wwwroot/help_archive
> language: HTML
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/replicateSites.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/measure@refs/heads/master/-/blob/firstreportfollow.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/measure
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/actexport_Joel.cfm
> num_matches: 3
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/contacts@refs/heads/master/-/blob/rp_replace%2Fats.cfm
> num_matches: 6
> repo: code.gensuite.com/pm/contacts
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/regtracker@refs/heads/master/-/blob/cfc_regs.cfc
> num_matches: 1
> repo: code.gensuite.com/pm/regtracker
> language: ColdFusion CFC
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/audfinding_mod.cfm
> num_matches: 5
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/wwwroot/help_archive@refs/heads/master/-/blob/CCenter%2FATS%2FSample_Emails%2FEmail_HTM%2FClosure%20Verification%20Rejected.htm
> num_matches: 1
> repo: code.gensuite.com/wwwroot/help_archive
> language: HTML
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/js%2FdueDateExtend.js
> num_matches: 2
> repo: code.gensuite.com/pm/audit
> language: JavaScript
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/world@refs/heads/master/-/blob/beta%2Fwidgets%2FSCMGatewayComponent.cfm
> num_matches: 4
> repo: code.gensuite.com/pm/world
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/inside@refs/heads/master/-/blob/customreporter%2Freports%2FuoEHSSpotlight%2Fats.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/inside
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/wwwroot/help_archive@refs/heads/master/-/blob/CCenter%2FATS%2FSample_Emails%2FEmail_HTM%2FClosure%20Verification%20Completed.htm
> num_matches: 1
> repo: code.gensuite.com/wwwroot/help_archive
> language: HTML
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/wwwroot/help_archive@refs/heads/master/-/blob/CCenter%2FATS%2FSample_Emails%2FEmail_HTM%2FFinding%20Added-Edited%20_Template.htm
> num_matches: 1
> repo: code.gensuite.com/wwwroot/help_archive
> language: HTML
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/hatbeard/thehighlander@refs/heads/master/-/blob/moarcode%2Fcustomreporter%2Freports%2FuoEHSSpotlight%2Fats.cfm
> num_matches: 1
> repo: code.gensuite.com/hatbeard/thehighlander
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/swp@refs/heads/master/-/blob/swpadd.cfm.bak
> num_matches: 1
> repo: code.gensuite.com/pm/swp
> language:
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/measure@refs/heads/master/-/blob/tools%2F5WhyAnalysis.cfm
> num_matches: 2
> repo: code.gensuite.com/pm/measure
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/measure@refs/heads/master/-/blob/eventedit_avianbat.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/measure
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/batchUploadEdit.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/genny%2FappCommands.js
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: JavaScript
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/measure@refs/heads/master/-/blob/DbForms%2FeventStatus.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/measure
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/measure@refs/heads/master/-/blob/simplepenaltyStatus.cfm
> num_matches: 2
> repo: code.gensuite.com/pm/measure
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/world@refs/heads/master/-/blob/widgets%2FIandMFormLauncher%2FlauncherContent_Amazon.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/world
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/replicate_emails.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/world@refs/heads/master/-/blob/widgets%2FIandMFormLauncher%2FlauncherContent_Allegion.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/world
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/world@refs/heads/master/-/blob/beta%2Fwidgets%2FIandMFormLauncher%2FlauncherContent_Amazon.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/world
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/world@refs/heads/master/-/blob/beta%2Fwidgets%2FIandMFormLauncher%2FlauncherContent_Allegion.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/world
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/auditPDA_results.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/customreport.dep.cfm
> num_matches: 4
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/ace@refs/heads/master/-/blob/batchAddForm.cfm
> num_matches: 2
> repo: code.gensuite.com/pm/ace
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/obs@refs/heads/master/-/blob/obsObserver.cfm
> num_matches: 3
> repo: code.gensuite.com/pm/obs
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/scorecard@refs/heads/master/-/blob/scorecopy.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/scorecard
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/airlog@refs/heads/master/-/blob/resolveException.cfm
> num_matches: 2
> repo: code.gensuite.com/pm/airlog
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/IandI_Integration.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/measure@refs/heads/master/-/blob/eventedit_audit_heico.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/measure
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/measure@refs/heads/master/-/blob/firstreportaddResults.cfm
> num_matches: 4
> repo: code.gensuite.com/pm/measure
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/extensions@refs/heads/master/-/blob/audit%2Fsafer%2Friskassessment.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/extensions
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/audfinding_subAdd.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/pcm@refs/heads/master/-/blob/add_actionItem.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/pcm
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/safer@refs/heads/devmaster/-/blob/riskassessment2.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/safer
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/audfindingPDA.cfm.bak
> num_matches: 2
> repo: code.gensuite.com/pm/audit
> language:
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/updateOpenAudit_v2.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/extensions@refs/heads/master/-/blob/businesscomps%2FWHChem_ATS_OA.cfc
> num_matches: 2
> repo: code.gensuite.com/pm/extensions
> language: ColdFusion CFC
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/security@refs/heads/master/-/blob/securityadd.cfm
> num_matches: 2
> repo: code.gensuite.com/pm/security
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/extensions@refs/heads/master/-/blob/audit%2Fsafer%2Friskassessment2.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/extensions
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/measure@refs/heads/master/-/blob/eventedit_eventfollowup.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/measure
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/DraftsCustomReport.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/safer@refs/heads/devmaster/-/blob/riskassessmentV2.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/safer
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/extensions@refs/heads/master/-/blob/audit%2Ftemplate%2FTemplateAdmin.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/extensions
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/incident@refs/heads/master/-/blob/incidentaction.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/incident
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/dlg@refs/heads/master/-/blob/addconfirm.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/dlg
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/incident@refs/heads/master/-/blob/incidentaddPDA.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/incident
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/updateauditemail_v2.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/qualityincident@refs/heads/master/-/blob/incidentaction.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/qualityincident
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/CreateFieldsFromTemp.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/qualityincident@refs/heads/master/-/blob/incidentaddPDA.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/qualityincident
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/archive%2FCustomReport.cfm
> num_matches: 4
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/securityconcern@refs/heads/master/-/blob/incidentaction.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/securityconcern
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/extensions@refs/heads/master/-/blob/audit%2Fsafer%2FriskassessmentV2.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/extensions
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/updateOpenAudit_v2_DL.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/enhancedActionHistory.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/fscorecard@refs/heads/master/-/blob/test_export.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/fscorecard
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/measure@refs/heads/master/-/blob/customContent%2F1471%2Festatus.cfm
> num_matches: 2
> repo: code.gensuite.com/pm/measure
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/js%2Fcustom%2Fbusid_2%2Fcustom.js
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: JavaScript
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/pcm@refs/heads/master/-/blob/request_followup.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/pcm
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/js%2Fcustom%2Fbusid_35%2Fcustom.js
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: JavaScript
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/contacts@refs/heads/master/-/blob/beta%2Frp_replace%2Fats.cfm
> num_matches: 6
> repo: code.gensuite.com/pm/contacts
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/js%2Fcustom%2Fbusid_24%2Fcustom.js
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: JavaScript
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/js%2Fcustom%2Fbusid_52%2Fcustom.js
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: JavaScript
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/js%2Fcustom%2Fbusid_54%2Fcustom.js
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: JavaScript
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/wwwroot/apptracking@refs/heads/master/-/blob/AdminTools%2FBusinessPage.cfm
> num_matches: 1
> repo: code.gensuite.com/wwwroot/apptracking
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/js%2Fcustom%2Fbusid_76%2Fcustom.js
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: JavaScript
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/js%2Fcustom%2Fbusid_98%2Fcustom.js
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: JavaScript
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/js%2Fcustom%2Fbusid_49%2Fcustom.js
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: JavaScript
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/js%2Fcustom%2Fbusid_97%2Fcustom.js
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: JavaScript
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/js%2Fcustom%2Fbusid_26%2Fcustom.js
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: JavaScript
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/obs@refs/heads/master/-/blob/obsObservation.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/obs
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/js%2Fcustom%2Fbusid_132%2Fcustom.js
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: JavaScript
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/js%2Fcustom%2Fbusid_101%2Fcustom.js
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: JavaScript
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/js%2Fcustom%2Fbusid_102%2Fcustom.js
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: JavaScript
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/js%2Fcustom%2Fbusid_108%2Fcustom.js
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: JavaScript
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/js%2Fcustom%2Fbusid_119%2Fcustom.js
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: JavaScript
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/pit@refs/heads/master/-/blob/topbar.recharge.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/pit
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/safety@refs/heads/master/-/blob/inc_jobsteps.cfm
> num_matches: 2
> repo: code.gensuite.com/pm/safety
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/devops/gscontainerization@refs/heads/develop/-/blob/docs%2Fbugs%2Fecs-container-bugs.md
> num_matches: 2
> repo: code.gensuite.com/devops/gscontainerization
> language: Markdown
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/extensions@refs/heads/master/-/blob/audit%2Fsaferbeta%2Friskassessment.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/extensions
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/regtracker@refs/heads/master/-/blob/dsp_pushToApp.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/regtracker
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/js%2Fcustom%2Fbusid_1471%2Fcustom.js
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: JavaScript
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/library/cfc@refs/heads/master/-/blob/apps%2Fats%2Fexceltemplate.cfc
> num_matches: 1
> repo: code.gensuite.com/pm/library/cfc
> language: ColdFusion CFC
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/js%2Fcustom%2Fbusid_1502%2Fcustom.js
> num_matches: 3
> repo: code.gensuite.com/pm/audit
> language: JavaScript
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/js%2Fcustom%2Fbusid_1493%2Fcustom.js
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: JavaScript
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/safer@refs/heads/devmaster/-/blob/beta%2Friskassessment2.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/safer
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/js%2Fcustom%2Fbusid_1728%2Fcustom.js
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: JavaScript
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/js%2Fcustom%2Fbusid_1092%2Fcustom.js
> num_matches: 2
> repo: code.gensuite.com/pm/audit
> language: JavaScript
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/js%2Fcustom%2Fbusid_1489%2Fcustom.js
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: JavaScript
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/safer@refs/heads/devmaster/-/blob/riskassessmentlegacy.cfm
> num_matches: 1
> repo: code.gensuite.com/pm/safer
> language: ColdFusion
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/js%2Fcustom%2Fbusid_1461%2Fcustom.js
> num_matches: 2
> repo: code.gensuite.com/pm/audit
> language: JavaScript
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/library/cfc@refs/heads/master/-/blob/apps%2Fats%2FdueDateExtend.cfc
> num_matches: 5
> repo: code.gensuite.com/pm/library/cfc
> language: ColdFusion CFC
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/js%2Fcustom%2Fbusid_1103%2Fcustom.js
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: JavaScript
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/js%2Fcustom%2Fbusid_1098%2Fcustom.js
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: JavaScript
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/js%2Fcustom%2Fbusid_1335%2Fcustom.js
> num_matches: 2
> repo: code.gensuite.com/pm/audit
> language: JavaScript
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/js%2Fcustom%2Fbusid_1914%2Fcustom.js
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: JavaScript
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/extensions@refs/heads/master/-/blob/businesscomps%2FTeleflex_Calendar.cfc
> num_matches: 1
> repo: code.gensuite.com/pm/extensions
> language: ColdFusion CFC
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/js%2Fcustom%2Fbusid_1486%2Fcustom.js
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: JavaScript
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/js%2Fcustom%2Fbusid_1660%2Fcustom.js
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: JavaScript
> ```
>
> ```text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/js%2Fcustom%2Fbusid_1383%2Fcustom.js
> num_matches: 1
> repo: code.gensuite.com/pm/audit
> language: JavaScript
> ```
>
> ```text
> The response was truncated because the number of tokens exceeded the maximum limit of 10000.
> ```
>
> </details>
>
> I’ve confirmed the canonical file is `code.gensuite.com/pm/audit/audfinding.cfm`. I’m pulling the page’s structural markers and companion JS through Sourcebot now so the summary stays tied to the actual repo.
>
> <details><summary>Called 4 tools</summary>
>
> MCP tool call
>
> sourcebot.read_file
>
> ```json
> {
>   "repo": "code.gensuite.com/pm/audit",
>   "path": "js/audfinding.js",
>   "ref": "master"
> }
> ```
>
> ```text
> {"source":"// Created By: Diego serrano\n// Created On: March 2018\n// Purpose: Eventually it will be all of the JS functionality for audfinding.cfm\n// -----------------------------------------------------------------\n// Edited On        Edited By       Explanation / Reason\n// -----------------------------------------------------------------\n// 2020/02/14       Alex Saines     Moved \"ClosedFields\" function over from .cfm\n\n// TODO: write explanation\n$(function() {\n\tats.id != ''?atsObj.fn.readonlyFields():''; \n\n\t$('.sca_batchUpload:not(.click-rendered)').click(launchSCABatchUploadModal).addClass('click-rendered');\n});\nvar objJSTranslator = new GS.fn.translator({groupPage:\"audfinding.cfm\", appID:3});\n/**\n * TODO: write explanation\n * @param {object} oSelect status selection reference\n * @param {string} accessName user's name\n * @param {boolean} lockedCloseDate is the close date locked?\n * @param {string} closureCommentLabel what the comment closure comment is labeled as\n */\nfunction CloseFields(oSelect,accessName,lockedCloseDate,closureCommentLabel) {\n\tif (oSelect.value == 'Open') {\n\t\tif(!lockedCloseDate){\n\t\t\toSelect.form.CloseDate.flatpickr().clear();\n\t\t\t$('#CloseDate').flatpickr({\n\t\t\t\tmaxDate:$('[name=AuditDateEndDate]').val(),\n\t\t\t\tminDate:new Date(validCloseDate),\n\t\t\t\tdateFormat:\"d-M-Y\"\n\t\t\t})\n\t\t}\n\t\toSelect.form.ClosePerson.value = '';\n\t\t$(\"#ClosePerson\").val(null).trigger(\"change\"); // this is for select2\n\t\toSelect.form.CloseDate.value = '';\n\t\tdocument.getElementById('OpenStyle').disabled = false;\n\t\tdocument.getElementById('ClosedStyle').disabled = true;\n\t} else {\n\t\tif($('#ClosePerson').val()== '' || $('#ClosePerson').val() == null){\n\t\t\t$(\"#ClosePerson\").gsContactSearch({\n\t\t\t\tvalue: accessName // Data initially returned from the select will be parsed looking for this value and set if found.\n\t\t\t})\n\t\t\tif($('#ClosePerson').hasClass('gsContactSearch-rendered')){\n\t\t\t\t$('#ClosePerson').val(accessName).trigger('change');\n\t\t\t}\n\t\t}\n\t\t\n\t\tif (oSelect.form.CloseDate.value.trim() == '') {\n\t\t\toSelect.form.CloseDate.value = moment(new Date()).format('DD-MMM-YYYY');\n\t\t\tif (lockedCloseDate == false){\n\t\t\t\t$('#CloseDate').trigger('change');\n\t\t\t}\n\t\t}\n\t\tdocument.getElementById('OpenStyle').disabled = true;\n\t\tdocument.getElementById('ClosedStyle').disabled = false;\n\t}\n\tif (closureCommentLabel != ''){\n\t\toSelect.form.CloseComment.focus();\n\t}\n\telse{\n\t\tif (oSelect.value == 'Open') {\n\t\t\t$('#CloseComment').val('');\n\t\t}\n\t\telse{\n\t\t\tif($('#CCommentDefault').val().trim() != \"\"){\n\t\t\t\t$('#CloseComment').val($('#CCommentDefault').val().trim());\n\t\t\t}\n\t\t}\n\t}\n}\n\n/**\n * TODO: write explanation\n * @param {object} oSelect \n */\nfunction ClearRelated(oSelect) {\n\tvar oForm = oSelect.form;\n\n\tif (oSelect.value == 'Open') {\n\t\toForm.CloseDate.value = '';\n\t\toForm.ClosePerson.value = '';\n\t\tif (oForm.VerifyDate){\n\t\t\toForm.VerifyDate.value = '';\n\t\t}\n\t/* \n\t\tkeep commented out section\n\t\tif (oForm.VerifyComment){\n\t\t\toForm.VerifyComment.value = '';\n\t\t}\n\t} else if (oForm.VerifyDate) {\n\t\tif (Trim(oForm.VerifyDate.value) == '') {\n\t\t\tif (oForm.VerifyComment){\n\t\t\t\toForm.VerifyComment.value = '';\n\t\t\t}\n\t\t}\n\t*/\n\t}\n}\n\n/**\n * determines what needs to happen upon selecting a new risk category\n * Note: some variables are declared as page level in the CF (aClosure, aClosureDesc, Disconnect_RiskCategory_ClosureCategory,Unlock_ClosureCategory_BasedOnRC)\n * @param {object} riskSelect vanilla JS object referencing the risk category selection field\n * @param {string} eventType \n */\nfunction RiskCategoryOnchange(riskSelect,eventType) {\n\t// FIX for CAI 750195, Perrigo\n\t// Only allow people with BA permissions to edit Risk Category so that others have no control over the closure due date but if you aren't within the company, Perrigo, then don't block progress\n\tvar isBA \t\t\t\t\t= true;\n\tvar isNewFinding \t\t\t= ats.id == '' ? true : false;\n\tvar managementSelected \t\t= false;\n\tvar selectedRisk\t\t\t= '';\n\tvar $closureList\t\t\t= $('#closureList');\n\tvar closureListContainer \t= $('#closureList-container');\n\tvar closureListReadOnly \t= $('#ClosureList-readonly');\n\t// var aClosure \t\t\t\t= [] --> array of risk category id values\n\t// var aClosureDesc \t\t\t= [''] --> array of risk category descriptions for the id's\n\n\n\t//console.log('rc on change bind')\n\tif (eventType != \"onload\") {\n\t\t// return;\n\t\n\n\t\tif (GS.data.scope.busID == 1103){\n\t\t\tisBA \t\t\t\t= typeof(ats.accessRights)!=\"undefined\" ? ats.accessRights.indexOf(\"Business Administrator\")>-1 : false;\n\t\t\tmanagementSelected \t= riskSelect.value == '9|8' || riskSelect.value == '9|9' ? true : false;\n\t\t}\n\t\t\n\t\tif (isBA || (isBA == false & isNewFinding)){\n\t\t\t// set the value of the risk category sub-label / description\n\t\t\tdocument.getElementById('RiskCategoryDesc').innerHTML = aClosureDesc[riskSelect.selectedIndex];\n\n\t\t\tif (Disconnect_RiskCategory_ClosureCategory){\n\t\t\t\treturn;\n\t\t\t}\n\n\t\t\tvar ClosureID = riskSelect.value.split('|')[0];\n\t\t\tif (ClosureID != ''){ \n\t\t\t\tselectedRisk = aClosure[ClosureID];\n\t\t\t}\n\t\t\telse{\n\t\t\t\tif (eventType != \"onload\"){\n\t\t\t\t\tclosureListReadOnly.addClass('hidden');\n\t\t\t\t\tclosureListContainer.removeClass('hidden');\t\n\t\t\t\t\t$closureList.val('').trigger('change');\n\t\t\t\t\t$closureList.attr(\"disabled\", false);\n\t\t\t\t\thandleDisabledSelect(closureList);\n\t\t\t\t}\n\t\t\t\treturn;\n\t\t\t}\n\n\t\t\t// Now we're dealing with the closure list in relation to the riskCategory\n\t\t\tclosureList \t\t= document.getElementById('closureList');\n\t\t\tclosureList.value = selectedRisk; // the var name is confusing here, it is actually corresponding closure cat\n\n\t\t\t//closureList.val(closureListValue).trigger('change');\n\n\t\t\tif (isBA & managementSelected){\n\t\t\t\t// FIX for CAI 759773, Perrigo\n\t\t\t\t// BA's need to be allowed to edit the closure list if on the \"Management\" risk categories is selected\n\t\t\t\t$closureList.attr(\"disabled\", false);\n\t\t\t} else if (closureList.value != ''){\n\t\t\t\t$closureList.attr(\"disabled\", true);\n\t\t\t} else {\n\t\t\t\t$closureList.attr(\"disabled\", false);\n\t\t\t}\n\n\t\t\tif (eventType != \"onload\"){\n\t\t\t\tclosureList.onchange();\n\t\t\t}\n\n\t\t\t// closure list value needs to de displayed on closureList-Readonly element\n\t\t\t// TODO: maybe merge with if block above the \"$closureList.change()\" ??\n\t\t\tif (isBA & managementSelected) {\n\t\t\t\tclosureListReadOnly.addClass('hidden');\n\t\t\t\tclosureListContainer.removeClass('hidden');\t\n\t\t\t} else if(selectedRisk !== ''){\n\t\t\t\tclosureListReadOnly.removeClass('hidden').html(selectedRisk);\n\t\t\t\tclosureListContainer.addClass('hidden');\t\n\t\t\t} else {\n\t\t\t\tclosureListReadOnly.addClass('hidden');\n\t\t\t\tclosureListContainer.removeClass('hidden');\t\n\t\t\t}\n\n\t\t\t\n\t\t\tif (Unlock_ClosureCategory_BasedOnRC){\n\t\t\t\tunlockClosureCategory();\n\t\t\t}\n\n\t\t\thandleDisabledSelect(closureList);\n\t\t} else {\n\t\t\t// for some reason an automatic trigger is trying to trigger a restricted action, block it and make sure the item is turned off\n\t\t\triskSelect.disabled = true;\n\t\t}\n\t}\n} \n\n\nfunction unlockClosureCategory(){\n\tvar closureListVal = $('#closureList').val();\n\t$('#ClosureList-readonly').addClass('hidden');\n\t$('#closureList-container').removeClass('hidden');\t\n\t$('#closureList').val(closureListVal).trigger('change');\n\t$('#closureList').attr(\"disabled\", false);\n\n}\n\n\nfunction saveFormAsDraft(){\n\n\tvar draftID = $('#draftID').val();\n\tvar draftTitle = $('#draftedTitle').val();\n\n\tGS.fn.launchModal({\n\t\tid: \"draftModal\", \n\t\ttitle: \"Choose a title to save<b class='text-danger'>*</b>\",\n\t\tcontent: \"<input type='text' name='draftFormName' id='draftFormName' maxlength='100' class='form-control required' value='\"+ draftTitle +\"'>\",\t\n\t\tclass: \"modal-md\",\n\t\thideCloseButton: true,\n\t\tbuttons:[{\n\t\t\t\ttext: \"OK\",\n\t\t\t\tevent: \"saveDraft()\",\n\t\t\t\tclass: \"btn-primary\"\n\t\t\t}\n\t\t\t, {\n\t\t\t\ttext: \"Cancel\",\n\t\t\t\tevent: \"cancelData()\",\n\t\t\t\tclass: \"btn-primary\"\n\t\t\t}\n\t\t]\n\t});\n}\n\nfunction saveDraft() {\n\tvar trimmedDraftName = $.trim($(\"#draftFormName\").val());\n\tif(trimmedDraftName == ''){\n\t\ttrimmedDraftName = $('#draftedTitle').val();\n\t}\n\t// $(\"#draftFormName\").val(trimmedDraftName);\n\t//$(\"#draftFormName\").val(trimmedDraftName);\n\t\n\tif (trimmedDraftName != '' && trimmedDraftName != undefined) {\n\n\t\tvar subCAData = getSubCorrectiveActionsData();\n\n\t\tvar addAudit = $(\"#addAudit\").serialize();\n\t\tvarFinalFormData = addAudit.concat(\"&isActive=false\");\n\t\t//varFinalFormData = varFinalFormData.replace(\"ClosureList\", \"Classification\");\n\t\tvarFinalFormData = getCorrectedKeys(varFinalFormData);\n\n\t\t//var subCAData = getSubCorrectiveActionsData();\n\n\t\tif(subCAData.length > 0){\n\t\t\tvarFinalFormData = varFinalFormData.concat(\"&SubCAData=\" + encodeURIComponent(JSON.stringify(subCAData)));\n\t\t}\n\n\t\t\n\t\tvar draftID = $('#draftID').val();\n\t\tvar draft_method = hasOnlyDigits(draftID) ? 'updateActionFinding' : 'insertActionFinding';\n\t\t\n\n\t\tGS.fn.showMask();\n\n\t\t$.ajax({\n\t\t\turl: \"remoteproxy.cfm?method=\"+ draft_method +\"&orgname=\"+GS.data.scope.orgName+\"&business=\"+GS.data.scope.business+\"&loc=\"+GS.data.scope.site+\"&updateUser=\"+GS.data.user.accessName+\"&draftTitle=\"+trimmedDraftName,\n\t\t\ttype: 'post',\n\t\t\tdata: varFinalFormData\n\t\t}).done(function(data){\n\t\t\t//GS.fn.alert(\"Your draft was saved successfuly.\");\n\t\t\tGS.fn.hideMask();\n\t\t\tvar actionData = JSON.parse(data);\n\n\t\t\tif(actionData.success){\n\t\t\t\tGS.fn.confirm({\n\t\t\t\t\t\t\t\tmessage: objJSTranslator.translate('Your draft was saved successfully.'),\n\t\t\t\t\t\t\t\tbuttons: {\n\t\t\t\t\t\t\t\t\t\t\tconfirm: {\n\t\t\t\t\t\t\t\t\t\t\t\t\t\tlabel: objJSTranslator.translate('OK') \n\t\t\t\t\t\t\t\t\t\t\t}\n\t\t\t\t\t\t\t\t},\n\t\t\t\t\t\t\t\tcallback: function (result) {\n\t\t\t\t\t\t\t\t\t\t\tif(result)\n\t\t\t\t\t\t\t\t\t\t\t{\n\t\t\t\t\t\t\t\t\t\t\t\t\tconsole.log(result);\n\t\t\t\t\t\t\t\t\t\t\t\t\tvar actionData = JSON.parse(data);\n\t\t\t\t\t\t\t\t\t\t\t\t\tconsole.log(JSON.parse(data));\n\t\t\t\t\t\t\t\t\t\t\t\t\tdraftID = hasOnlyDigits(draftID) ? draftID : actionData.data;\n\n\t\t\t\t\t\t\t\t\t\t\t\t\t// Not to reload if it's other app(reg aud) using the url param\n\t\t\t\t\t\t\t\t\t\t\t\t\tvar allUrlParam = GS.fn.getAllUrlParams();\n\t\t\t\t\t\t\t\t\t\t\t\t\tif(allUrlParam && allUrlParam.viewdraftfindings != 'true'){\n\t\t\t\t\t\t\t\t\t\t\t\t\t\tGS.fn.windowOpen({pageType:'reload', url:\"audfinding.cfm?org=\"+GS.data.scope.orgID+\"&loc=\"+encodeURIComponent(GS.data.scope.site)+\"&draftID=\"+draftID+\"&ats_page_type=standard&isActive=false\"})\n\t\t\t\t\t\t\t\t\t\t\t\t\t}\n\n\t\t\t\t\t\t\t\t\t\t\t}\n\t\t\t\t\t\t\t\t\t\t\telse{\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t//cancel\n\t\t\t\t\t\t\t\t\t\t\t}\n\t\t\t\t\t\t\t\t}\n\t\t\t\t\t\t\t});\n\n\t\t\t}\n\t\t\telse{\n\t\t\t\tGS.fn.alert(objJSTranslator.translate(\"An error has occurred, your draft has not been saved.\"));\n\t\t\t}\n\t\t\t\n\t\t\tcancelData();\n\t\t}).fail(function(){\n\t\t\tGS.fn.alert(\"An error has occurred, your draft has not been saved.\");\n\t\t});\n\t}else{\n\t\tGS.fn.alert('Please add a title!');\n\t}\n}\n\nfunction cancelData() {\n\t$(\"#draftModal\").modal(\"hide\");\n}\n\nfunction hasOnlyDigits(value) {\n    return /^-?\\d+$/.test(value);\n}\n\nfunction getCorrectedKeys(varFinalFormData){\n\tvarFinalFormData = varFinalFormData.replace(\"ClosureList\", \"Classification\");\n\tvarFinalFormData = varFinalFormData.replace(\"VerifyBy=\", \"VerifyPerson=\");\n\n\tvar multicc = $('#MULT_CC').val() != undefined ? $('#MULT_CC').val().join(',') : \"\";\n\tvarFinalFormData = varFinalFormData.concat(\"&MultiCC=\" + multicc);\n\n\tif($('[name=RiskCategory]') != undefined){\n\t\tvarFinalFormData = varFinalFormData.concat(\"&ClassificationType=\" + $('[name=RiskCategory]').val().split('|').pop());\n\t}\n\n\treturn varFinalFormData;\n}\n\nfunction getSubCorrectiveActionsData(){\n    //debugger;\n\tvar subCAList = [];\n\tvar subCAElementList = [];\n\tvar subCALength = 0; \n\n\tif($('#SubCorrectiveAction').is(\":checked\")){\n\t\t$(\".subCorrectiveContainer\").each(function() {\n\t\t  \tif(!$(this).hasClass( \"subCARemoved\" )){\n\t\t\t\tsubCALength++;\n\t\t\t\tsubCAElementList.push($(this));\n\t\t  \t}\n\t\t  \telse{\n\t\t\t\t$(this).remove();\n\t\t  \t}\n\t\t});\n\n\t\tfor (var i = 0; i < subCAElementList.length; i++) {\n\t\t\tvar subCA = {};\n\t\t\tsubCA['Desciption'+ (i+1)] = $($(subCAElementList)[i]).find('.subCADesc').val();\n\t\t\tsubCA['CloseComment'+ (i+1)] = $($(subCAElementList[i])).find('.subCACloseComment').val();\n\t\t\tsubCA['ResponPerson'+ (i+1)] = $($(subCAElementList[i])).find('.subCAResponPerson').val() == null ? \"\" : $($(subCAElementList[i])).find('.subCAResponPerson').val();\n\t\t\tsubCA['ClosureDueDate'+ (i+1)] = $($(subCAElementList[i])).find('.subCAClosureDueDate').val();\n\t\t\tsubCAList.push(subCA);\n\t\t}\n\n\t\t// for (var i = 1; i <= subCALength; i++) {\n\t\t// \tvar subCA = {};\n\t\t// \tsubCA['Desciption'+ i] = $('[name=\"Desciption'+ i +'\"]').val();\n\t\t// \tsubCA['CloseComment'+ i] = $('[name=\"CloseComment'+ i +'\"]').val();\n\t\t// \tsubCA['ResponPerson'+ i] = $('[name=\"ResponPerson'+ i +'\"]').val() == null ? \"\" : $('[name=\"ResponPerson'+ i +'\"]').val();\n\t\t// \tsubCA['ClosureDueDate'+ i] = $('[name=\"ClosureDueDate'+ i +'\"]').val();\n\t\t// \tsubCAList.push(subCA);\n\t\t// }\n\n\t\t//$('#')\n\t}\n\n\n\treturn subCAList;\n}\n\nvar createSCAHOTColsArr = function(){\n\tvar hotColArr = [];\n\n\thotColArr.push({\n\t\tlabel: objJSTranslator.translate(ats.subCorrectiveLabel)\n\t\t,name: 'scaHot_description'\n\t\t,required: true \n\t});\n\n\tif(ats.subCorrectiveFindingTypeLabel.length){\n\t\thotColArr.push({\n\t\t\tlabel: objJSTranslator.translate(ats.subCorrectiveFindingTypeLabel)\n\t\t\t,name: 'scaHot_findingType'\n\t\t\t,required: true\n\t\t\t,type:'dropdown'\n\t\t\t,source: _.map(_.queryToArray(ats.findingTypes),'findingname')\n\t\t});\n\n\n\t}\n\n\tif(ats.subCorrectiveCategoryLabel.length){\n\t\thotColArr.push({\n\t\t\tlabel: objJSTranslator.translate(ats.subCorrectiveCategoryLabel)\n\t\t\t,name: 'scaHot_category'\n\t\t\t,required: true \n\t\t\t,type:'dropdown'\n\t\t\t,source: _.map(_.queryToArray(ats.categories),'category')\n\t\t});\n\t}\n\n\tif(ats.subCorrectiveClosureCommentLabel.length){\n\t\thotColArr.push({\n\t\t\tlabel: objJSTranslator.translate(ats.subCorrectiveClosureCommentLabel)\n\t\t\t,name: 'scaHot_closeComment'\n\t\t\t,required: false\n\t\t});\n\t}\n\n\tif(ats.subCorrectiveResponsiblePersonLabel.length){\n\t\thotColArr.push({\n\t\t\tlabel: objJSTranslator.translate(ats.subCorrectiveResponsiblePersonLabel)\n\t\t\t,name: 'scaHot_responPerson'\n\t\t\t,required: true\n\t\t\t,type:'dropdown'\n\t\t\t,source: _.compact(_.map(_.queryToArray(ats.contacts),function(obj){if(obj.deactivated == null){return obj.contact_name}})).sort()\n\t\t});\n\t}\n\n\tif(ats.subCorrectiveClosureDueDateLabel.length){\n\t\tlet datePickerConfig = {\n\t\t\t\tminDate: moment().toDate()\n\t\t}\n\n\t\tif(moment($('#ClosureDueDate').val()).toDate() != \"Invalid Date\")\n\t\t\tdatePickerConfig.maxDate = moment($('#ClosureDueDate').val()).toDate();\n\n\t\thotColArr.push({\n\t\t\tlabel: objJSTranslator.translate(ats.subCorrectiveClosureDueDateLabel)\n\t\t\t,name: 'scaHot_closureDueDate'\n\t\t\t,required: true\n\t\t\t,type: 'date'\n\t\t\t,dateFormat: 'DD-MMM-YYYY'\n\t\t\t,datePickerConfig:datePickerConfig\n\t\t});\n\t}\n\n\treturn hotColArr;\n}\n\nvar getSCAHOTColLabels = function(hotColArr){\n\tvar hotColLabels = [];\n\n\t_.forEach(hotColArr,function(col){\n\t\tvar label = col.label\n\n\t\tif(col.required != null && col.required){\n\t\t\tlabel += '<span class=\"text-danger\">*</span>'\n\t\t}\n\n\t\thotColLabels.push(label)\n\t});\n\n\treturn hotColLabels;\n}\n\nvar getSCAHOTColData = function(hotColArr){\n\tvar hotColData = [];\n\n\t_.forEach(hotColArr,function(col){\n\t\tvar obj = {}\n\n\t\tobj.data = col.name;\n\n\t\tif(col.type != null) obj.type = col.type;\n\t\tif(col.dateFormat != null) obj.dateFormat = col.dateFormat;\n\t\tif(col.datePickerConfig != null) obj.datePickerConfig = col.datePickerConfig;\n\t\tif(col.source != null) obj.source = col.source;\n\n\t\thotColData.push(obj)\n\t});\n\n\treturn hotColData;\n}\n\nvar sca_batchUpload_modal_hot = null;\n\nvar launchSCABatchUploadModal = function(){\n\tvar hotColArr = createSCAHOTColsArr();\n\tvar hotColLabels = getSCAHOTColLabels(hotColArr);\n\tvar hotColData = getSCAHOTColData(hotColArr);\n\n\tif(!$('#sca_batchUpload_modal').length){\n\t\tGS.fn.launchModal({\n\t\t\t title : objJSTranslator.translate('Batch Upload '+ ats.subCorrectiveLabel)\n\t\t\t,content : \"<div id=\\\"sca_batchUpload_modal_hot\\\"></div>\"\n\t\t\t,id    : 'sca_batchUpload_modal'\n\t\t\t,class : 'modal-lg'\n\t\t\t,buttons:[{\n\t\t\t\t\ttext: objJSTranslator.translate('Upload to form'),\n\t\t\t\t\tevent: \"uploadSCAHOTToForm();\",\n\t\t\t\t\tclass: \"btn-primary\"\n\t\t\t\t}\n\t\t\t]\n\t\t});\n\n\t\t$('#sca_batchUpload_modal .modal-dialog').css('max-width','1000px')\n\t\t$('#sca_batchUpload_modal').css('z-index','9998')\n\n\n\t\t//var hotColArr = createSCAHOTColsArr();\n\t\t//var hotColLabels = getSCAHOTColLabels(hotColArr);\n\t\t//var hotColData = getSCAHOTColData(hotColArr);\n\t\t\n\t\tsca_batchUpload_modal_hot = new Handsontable(document.getElementById('sca_batchUpload_modal_hot'), {\n\t\t\t\tcolWidths: 150,\n\t\t\t\trowHeaders: true,\n\t\t\t\tstartRows: 10,\n\t\t\t\tminSpareRows:1,\n\t\t\t\tcolHeaders: hotColLabels,\n\t\t\t\tcontextMenu: false,\n\t\t\t\tcolumns:hotColData,\n\t\t\t\trenderAllRows:true,\n\t\t\t\tafterInit:function(){\n\t\t\t\t\t$this = this\n\t\t\t\t\t$('#sca_batchUpload_modal_hot').css('height',$('#sca_batchUpload_modal_hot .wtHider').height().toString()+'px')\n\t\t\t\t\t$this.updateSettings({})\n\t\t\t\t\tvar style = '<style id=\"HOTscroll\">#sca_batchUpload_modal_hot{max-height: '+(window.innerHeight-200)+'px !important;}</style>'\n\t\t\t\t\t$('#HOTscroll').replaceWith($(style))\n\t\t\t\t}\n\t\t\t\t,afterChange:function(){\n\t\t\t\t\t$this = this\n\t\t\t\t\t$('#sca_batchUpload_modal_hot').css('height',$('#sca_batchUpload_modal_hot .wtHider').height().toString()+'px')\n\t\t\t\t\t$this.updateSettings({})\n\t\t\t\t}\n\t\t\t\t,beforeChangeRender:function(){\n\t\t\t\t\tvar style = '<style id=\"HOTscroll\">#sca_batchUpload_modal_hot{max-height: '+(window.innerHeight-200)+'px !important;}</style>'\n\t\t\t\t\t$('#HOTscroll').replaceWith($(style))\n\t\t\t\t}\n\t\t});\n\t}else{\n\t\tsca_batchUpload_modal_hot.updateSettings({\n\t\t\tcolumns:hotColData\n\n\t\t})\n\t\t$('#sca_batchUpload_modal').modal('show');\n\n\t\t//This is hacky but HOT is weird. If anyone has a better way to do it, be my guest\n\t\tsetTimeout(function(){\n\t\t\t$('#sca_batchUpload_modal .modal-content').click();\n\t\t\n\t\t\t//Blank out any dates that are past the due date. \n\t\t\tvar data = sca_batchUpload_modal_hot.getData();\n\n\t\t\t_.forEach(data,function(row,rowNum){\n\t\t\t\t_.forEach(row,function(data,colNum){\n\t\t\t\t\tif(hotColArr[colNum].name == \"scaHot_closureDueDate\"){\n\t\t\t\t\t\tlet cdd = moment($('#ClosureDueDate').val()).toDate();\n\t\t\t\t\t\tlet scacdd = moment(data).toDate();\n\n\t\t\t\t\t\tif(cdd != \"Invalid Date\" && scacdd != \"Invalid Date\" && cdd < scacdd)\n\t\t\t\t\t\t\tsca_batchUpload_modal_hot.setDataAtCell(rowNum,colNum,null);\n\t\t\t\t\t}\n\t\t\t\t});\n\t\t\t});\n\n\t\t},500);\n\t}\n}\n\nvar uploadSCAHOTToForm = function(){\n\tvar data = sca_batchUpload_modal_hot.getData();\n\tvar hotColArr = createSCAHOTColsArr();\n\t//First let's get the data out of the columns that at least one of the cells were populated\n\tvar insertData = [];\n\n\t_.forEach(data,function(row){\n\t\tvar foundData = false;\n\t\tvar formattedRow = {};\n\t\t_.forEach(row,function(data,colNum){\n\n\t\t\tformattedRow[hotColArr[colNum].name] = data;\n\n\t\t\tif(data != null && data != '') foundData = true;\n\t\t});\n\t\tif(foundData) insertData.push(formattedRow);\n\t});\n\n\tif(insertData.length){\n\t\t$('#SubCorrectiveAction').prop('checked',true);\n\t\t$('#SubCorrectiveActionRow').css('display','');\n\t\t$('#loader').removeClass('d-none');\n\t\t$.ajax({\n\t\t\ttype  : \"POST\"\n\t\t\t,url  : \"audFinding_subadd.cfm?TblAuditStep=\"+ats.tblAuditStep+\"&ID=\"+ats.id+\"&isActive=\"+ats.isActive+\"&currentRow=\"+getSubCACount(document.addAudit)+\"&org=\"+GS.data.scope.orgID+\"&loc=\"+encodeURIComponent(GS.data.scope.site)+\"&iCount=\"+document.addAudit.SubCAAddCount.value\n\t\t\t,data : {\n\t\t\t\tbatchCreate : JSON.stringify(insertData)\n\t\t\t}\n\t\t\t,dataType : \"html\"\n\t\t}).done(function(d){\n\t\t\t$('#loader').addClass('d-none')\n\t\t\t$('#SubCorrect').append(d)\n\t\t\tdocument.addAudit.SubCAAddCount.value = parseInt(document.addAudit.SubCAAddCount.value) + insertData.length;\n\t\t\t$('#sca_batchUpload_modal').modal('hide');\n\t\t\t//Stupid remove has to be delayed or the backdrop gets stuck.\n\t\t\tsetTimeout(function(){$('#sca_batchUpload_modal').remove()},500);\n\t\t});\n\t}\n};","language":"JavaScript","path":"js/audfinding.js","url":"https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@master/-/blob/js%2Faudfinding.js"}
> ```
>
> MCP tool call
>
> sourcebot.search_code
>
> ```json
> {
>   "query": "\"Add #request.ATSFindingName#\"",
>   "filterByRepos": [
>     "code.gensuite.com/pm/audit"
>   ],
>   "filterByFilepaths": [
>     "audfinding.cfm"
>   ],
>   "includeCodeSnippets": true,
>   "maxTokens": 10000
> }
> ```
>
> ```text
> No results found for the query: "\"Add #request.ATSFindingName#\"" (repo:code\.gensuite\.com/pm/audit) (file:audfinding\.cfm)
> ```
>
> MCP tool call
>
> sourcebot.search_code
>
> ```json
> {
>   "query": "\"Closure Verification\"",
>   "filterByRepos": [
>     "code.gensuite.com/pm/audit"
>   ],
>   "filterByFilepaths": [
>     "audfinding.cfm"
>   ],
>   "includeCodeSnippets": true,
>   "maxTokens": 10000
> }
> ```
>
> ```text
> No results found for the query: "\"Closure Verification\"" (repo:code\.gensuite\.com/pm/audit) (file:audfinding\.cfm)
> ```
>
> MCP tool call
>
> sourcebot.search_code
>
> ```json
> {
>   "query": "\"Delete #request.ATSFindingName#\"",
>   "filterByRepos": [
>     "code.gensuite.com/pm/audit"
>   ],
>   "filterByFilepaths": [
>     "audfinding.cfm"
>   ],
>   "includeCodeSnippets": true,
>   "maxTokens": 10000
> }
> ```
>
> ```text
> No results found for the query: "\"Delete #request.ATSFindingName#\"" (repo:code\.gensuite\.com/pm/audit) (file:audfinding\.cfm)
> ```
>
> </details>
>
> The companion JS confirms this page handles status/closure logic, draft save, and sub-corrective-action batch upload. I’m pulling the ColdFusion page markers with broader searches now because exact-string matching in Sourcebot is stricter than expected.
>
> <details><summary>Called 8 tools</summary>
>
> MCP tool call
>
> sourcebot.search_code
>
> ```json
> {
>   "query": "request.ATSFindingName",
>   "filterByRepos": [
>     "code.gensuite.com/pm/audit"
>   ],
>   "filterByFilepaths": [
>     "audfinding.cfm"
>   ],
>   "includeCodeSnippets": true,
>   "maxTokens": 12000
> }
> ```
>
> ````text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/audfinding.cfm
> num_matches: 179
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
>
> ```
> <cfset variables.objAudit = createObject("component","#library.CFC.dotPath#.apps.ats.audit").init(odbc)>
> <cfset request.debugLastTime = getTickCount()>
> <cfset request.atsAuditName =""/>
>
> <cfset variables.businessActionID_show   = api.go.getSetupVar(var="businessActionID_show", default=false)/>
> <cfset variables.businessActionID_label  = api.go.getSetupVar(var="businessActionID_label", default="Business #REQUEST.ATSFindingName# ID")/>
> <cfset variables.referenceUniqueRefIDValue = go.getSetupVar(var='referenceUniqueRefIDValue',default="false")/>
> <cfset variables.isAuditNameAsText = api.go.getsetupvar(var='isAuditNameAsText', default='false') />
> <cfset variables.additionalReminderRegDays = api.go.getsetupvar(var='additionalReminderRegDays', default=RegDays) />
> <!---22/06/2023 Edith added subDeptRequired setup var--->
> <cfset variables.subDeptRequired ="#api.go.getSetupVar(var="SubDeptRequired",default="yes")#">
>
> ```
> ```
> 		1.- Validate that it doesnt exists on setup system, if it doesn't then i dont want a default value because i want what is in the setup file.
> 		2.- if it does exists then return whatever is set to in the setup system
> 		note : we specify the appid :) 
> 		You might see many conditions like this above of these lines.
> 	*/
> 	variables.numItemsDesc = !len(trim(go.getSetupVar(var='NumItemsDesc',default="",appid=3)))?'Number of distinct items grouped within this #request.atsFindingName#; used in metric calculations':go.getSetupVar(var='NumItemsDesc',default="",appid=3);
> 	variables.isRMEQuickLinksVisible = go.getSetupVar(var="ats_isRMEQuickLinksVisible",default="false");
> 	variables.summernotePlainText = go.getSetupVar(var="summernotePlainText",default=true);
> </cfscript>
>
> <cfset variables.isRiskCategoryRequired = go.getSetupVar(var="ats_isRiskCategoryRequired",default=false)/>
>
> ```
> ```
> <cfset variables.multipleSitesLabel  = api.go.getSetupVar(var="multipleSitesLabel", default="Submit for Multiple #Lcase(siteLabel)#s!")/>
> <cfset variables.showCVCommentOnAdd  = api.go.getSetupVar(var="showCVCommentOnAdd", default=false)/>
>
> <cfset variables.isDraftsToBePreserved = api.go.getSetupVar(var="isDraftsToBePreserved", default=false)/> <!--- var used to hide the "Add Action" button if the draft has already been exported --->
> <cfset variables.isPermissTollgateRequiredForDraft = api.go.getSetupVar(var="isPermissTollgateRequiredForDraft", default=false)/> <!---var used to show tollgate if permission level is not 3 for SW--->
> <cfset variables.AuditNameText = api.go.getSetupVar(var='AuditNameText',default="Use for optional grouping (e.g., January Business #request.ATSFindingName#)")/>
> <cfset variables.atsAdditionalfields = go.getSetupVar(var='atsAdditionalfields',default="")/>
> <cfif isStruct(variables.atsAdditionalfields)>
> 		<cfset additionalATSFields = variables.atsAdditionalfields/>
> 	</cfif>
> <cfif isJson(variables.atsAdditionalfields)>
>
> ```
> ```
>  
> <cfparam name="LangIndex" default="1">
> <CFSET Translator = CreateObject("component", "#Library.CFC.DotPath#.TranslationPage").init("audfinding.cfm")>
> <cfset gitAssignmentObj = createObject("component","#request.Library.CFC.DotPath#.apps.pit.assignment").init(dsn=ODBC)/>
>  
> <cfset variables.title = translator.translate("Add #request.ATSFindingName#") />
>
> <cfif structKeyExists(url, "id") && isValid('integer',url.id)>
>
> 	<cfset variables.title = translator.translate("Edit #request.ATSFindingName#") & " ###url.id#" />
> 	
> 	<cfif variables.businessActionID_show and  structKeyExists(url, 'org') and isnumeric(url.org) and structKeyExists(url, 'loc') and url.loc neq "">
> 		<cfset variables.siteDetails = api.get('sitelookup').getsiteqry(orgid=url.org,site=url.loc)>
> 		<cfif variables.siteDetails.recordcount and variables.siteDetails.orgname neq "" and variables.siteDetails.site neq "">
> 			<cfquery name="variables.qGetTblauditID" datasource="#odbc#">
>
> ```
> ```
> <cfparam name="variables.employee" default=""/>
> <cfparam name="sSubCADisplay" default="none">
> <cfparam name="variables.auditNameNumberLabel" default="Action Name/Number"/>
> <cfparam name="variables.phoneLabel" default="Contact Phone"/>
> <cfparam name="variables.closurePriorityLabel" default="Closure Priority"/>
> <cfparam name="variables.coResponPersonLabel" default="#request.atsfindingname# Co-Owner"/>
> <cfparam name="variables.auditorLabelHelpText" default="">
> <cfparam name="variables.sURLAttachAppID" default=""/>
> <cfparam name="contribFactorsLabel" default="Contributing Factors" />
> <cfparam name="measureResourcePath" default="#MeasureMasterPath#resources/">
>
>
> ```
> ```
> <cfparam name = "variables.isCitationRequiredPriorClosure"	  		default="false">
> <cfparam name = "variables.isSubCorrectiveRequiredPriorClosure"		default="false">
> <cfparam name = "variables.isRootCauseRequiredPriorClosure"			default="false">
> <cfparam name = "variables.hideVerificationCheckBox"			  	default="false">
> <cfparam name = "variables.isCorrectiveActionRequiredPriorClosure" 	default="false">
> <cfparam name = "variables.descriptionPlacedAt"				   		default="#request.atsfindingname# Highlights">
> <cfparam name = "URL.isActive"				   						default="true">
> <cfparam name = "variables.closeDate_validStartDate"				default="">
> <cfparam name = "variables.closeDate_validEndDate"					default="">
> <cfset variables.editorialAIResultElement = variables.enableDescribeItAI ? "editorialAIResult" : "" />
>
>
> ```
> ```
>  
> <CFIF isDefined("URL.ID") AND URL.ID IS NOT "" AND IsNumeric(URL.ID) NEQ "Yes">
>  
> 	<CFMODULE TEMPLATE="#request.Library.framework.VirtualPath#tollgateMessage.cfm" TYPE="ERROR">
> 	<CFOUTPUT>
> 		<Font size=+1>Note: An Invalid #LCase(request.ATSFindingName)# ID has been specified for the #request.ATSAppName#!</font><BR><BR>
> 		Please <A HREF="#ContactsHome#email.cfm">contact</A> the administrator or
> 		<A HREF="audit.cfm?Org=#org#&Loc=#EncodeForURL(Loc)#" onMouseOver="self.status='Click for the #request.ATSAppName# Main';return true;">
> 		</CFOUTPUT>
> 		click</A> to go to the<BR>
> 		<CFOUTPUT>#request.ATSAppName# Homepage and select a valid #LCase(request.ATSFindingName)#.</CFOUTPUT>
> 	</CFMODULE>
>  
> </CFIF>
>
>
>
> ```
> ```
> <cfset findingRefTypeList = replaceNoCase(findingRefTypeList,"Initial Injury",request.initRepRecName)/>
>
> <cfset findingRefTypeList_allowInput = replaceNoCase(findingRefTypeList_allowInput, "Change Manager", request.changeManagerAppName)/>
> <cfset findingRefTypeList_allowInput = replaceNoCase(findingRefTypeList_allowInput,"Initial Injury", request.initRepRecName)/>
>  
> <CFPARAM Name="CitationLabel" Default="#request.ATSFindingName# Citation(s)">
> <CFPARAM Name="citationHelpText" Default="">
> <CFPARAM NAME="ReportPwd" DEFAULT="">
> <CFPARAM NAME="FindingID" DEFAULT = "">
> <CFPARAM Name="OrgContactsOnly" Default="Yes">
> <CFPARAM NAME="CenterDeptLabel" DEFAULT="Center/Dept">
> <CFPARAM NAME="SubCOELabel" DEFAULT="Sub-Dept">
> <CFPARAM NAME="CenterDeptProtect" DEFAULT="No">
> <CFPARAM NAME="NumItemsDesc" DEFAULT="Critical for Non-Compliance Items in Regulatory #request.ATSFindingName#s">
> <cfparam name="RequireCorrectiveAction" default="Yes">
> <cfparam name="DefaultEmailonAdd" default="Yes">
> <cfparam name="ContactNotListedOption" default="Yes"> <!--- Show the not listed below option for contact dropdowns? --->
> <cfparam name="AuditorLabel" default="Auditor/Contact"> <!--- Auditor/contact person label --->
> <cfparam name="WorkstationLabel" default="Workstation"> <!--- Workstation label --->
>
> ```
> ```
> <cfparam name="ProtectTags" default="No"> <!--- AuditType, FindingType, FindingCategory --->
> <cfparam name="RequireEmailonAdd" default="No"> <!--- User cannot change email option on new findings addition --->
> <cfparam name="BuildingLabel" default="Building"> <!--- Building label --->
> <cfparam name="PhoneLabel" default="Contact Phone"> <!--- Contact Phone label --->
> <cfparam name="UsePhoneDropDown" default="No"> <!--- Use a Contact Phone drop down list --->
> <cfparam name="ReferenceLabel" default="#request.ATSFindingName# Reference"> <!--- Finding Reference label --->
> <cfparam name="WorkstationLookup" default="">
> <cfparam name="EmailAlwaysCheck" default="">
> <CFPARAM NAME="SubSiteLabel" DEFAULT= "Sub-Site">
> <CFPARAM NAME="CopyRef" DEFAULT= "Yes">
> <CFPARAM NAME="ClosureCategoryLabel" DEFAULT= "Closure Category">
>
> ```
> ```
> <cfparam name="CategoryAdminLink" default="true">
> <cfparam name="closureCategoryGuidanceText" default="Select based on closure priority.">
> <cfparam name="citationGuidanceText" default="(if applicable)">
> <cfparam name="fileAttachmentsGuidanceText" default="">
> <cfparam name="subCorrectiveGuidanceText" default="Sub-Corrective Action Required">
> <cfparam name="closureVerificationCBLabel" default="Is Closure Verification required for this #LCase(request.ATSFindingName)#?">
> <cfparam name="closureVerificationLabel" default="Closure Verification">
> <cfparam name="ByPassExport" default="false">
> <cfparam name="CAPA_uncheck" default="false">
> <cfparam name="block_CAPAreview" default="false">
> <cfparam name="ToVerifyClosureLabel" default="to verify closure">
>
> ```
> ```
>  
> <CFPARAM NAME="ClosedByLabel" DEFAULT="Closed By">
> <CFPARAM NAME="ClosureCommentLabel" DEFAULT="Closure Comment">
> <CFPARAM NAME="DisableAllDeletes" DEFAULT="no">
>  
> <cfparam name="variables.findingDateLabel" default="#request.ATSFindingName# Date"/>
> <cfparam name="variables.numberOfItemsLabel" default="Number of Items in Action"/>
> <cfparam name="variables.numberOfItemsRequired" default="true">
> <cfparam name="ResponsiblePersonLabel" default="Responsible Person">
> <cfparam name="variables.multipleEmailLabel" default="Multiple Email CC"/>
> <cfparam name="variables.multipleEmailAllowUserInput" default="true"/>
>
> ```
> ```
> <CFPARAM NAME="ClosureDueDateMessage" DEFAULT="">
> <cfparam name="multiSiteReplicationEnabled" default="#api.go.getSetupVar(var="multiSiteReplicationEnabled",default=true)#">
> <cfparam name="variables.replicateSiteLimit" default="#api.go.getSetupVar(var="replicateSiteLimit",default=125)#">
>  
> <!---SSTPC Customizations--->
> <cfparam name="FindingHighlightsLabel" default="#request.ATSFindingName# Highlights">
> <cfset FindingHighlightsLabel = Translator.Translate(FindingHighlightsLabel)>
> <cfparam name="DefaultClosureCategory" default="">
> <cfparam name="ShowDeptLeadsWithDept" default="false">
> <cfparam name="FindingTypeRequired" default="true">
> <cfparam name="AuditTypeRequired" default="true">
>
> ```
> ```
> <CFSET ClosureCategoryLabel = Translator.Translate(ClosureCategoryLabel)>
> <CFSET ClosureCommentLabel = Translator.Translate(ClosureCommentLabel)>
> <CFSET PhoneLabel = Translator.Translate(PhoneLabel)>
> <CFSET DateClosedLabel = Translator.Translate(DateClosedLabel)>
> <CFSET ClosedByLabel = Translator.Translate(ClosedByLabel)>
> <CFSET ClosedByAlert = Translator.Translate("A Closed #request.ATSFindingName# requires a ##ClosedByLabel## Person", ClosedByLabel)>
> <cfset closureCategoryGuidanceText = Translator.Translate(closureCategoryGuidanceText)>
> <cfset citationGuidanceText = Translator.Translate(citationGuidanceText)>
> <cfset fileAttachmentsGuidanceText = Translator.Translate(fileAttachmentsGuidanceText)>
> <cfset subCorrectiveGuidanceText = Translator.Translate(subCorrectiveGuidanceText)>
> <cfset closureVerificationCBLabel = Translator.Translate(closureVerificationCBLabel)>
>  
>  
> <cfparam name="AuditNameText" default="Use for optional grouping (e.g., January Business #request.ATSFindingName#)"><!--- Specific text for the Audit Name field --->
> <CFSET AuditNameText = Translator.Translate(AuditNameText)>
>  
> <CFPARAM NAME="ExcludedATSAuditTypes" DEFAULT="">
> <CFPARAM NAME="AuditGroupLimitType" DEFAULT="Framework Review">
> <!--- 08/15/02 --->
>
> ```
> ```
> <CFPARAM NAME="DefaultCAPAChecked" DEFAULT="false">
>  
> <!--- 03/15/05--->
> <CFPARAM NAME="CAPALAbel" DEFAULT="CAPA">
> <CFPARAM  NAME="CAPALongLabel" DEFAULT="Corrective and Preventative Action">
> <cfparam name="capaquestion" default="Is this #LCase(request.ATSFindingName)# subject to #CAPALongLabel# (#CAPALabel#) requirements"/>
> <cfparam name="capaquestionSubText" default="#api.go.getSetupVar(var="capaquestionSubText",default='')#">
> <cfparam name="capastatement" default="This #LCase(request.ATSFindingName)# is subject to #CAPALongLabel# (#CAPALabel#) requirements"/>
> <CFPARAM NAME="RootCauseColumn" DEFAULT="optional_3">
> <CFPARAM NAME="EffectiveDateColumn" DEFAULT="optional_4">
> <CFPARAM NAME="CAPARequiredColumn" DEFAULT="CAPARequired">
> <CFPARAM NAME="EffectivityColumn1" DEFAULT="optional_1">
> <CFPARAM NAME="EffectivityColumn2" DEFAULT="optional_5">
>
> ```
> ```
> <CFPARAM NAME="CAPAHelp" DEFAULT="">
> <CFPARAM NAME="ClosedByHelp" DEFAULT="">
> <CFPARAM NAME="CategoryHelp" DEFAULT="">
> <CFPARAM NAME="CenterDeptHelp" DEFAULT="">
> <CFPARAM NAME="CenterDeptText" DEFAULT="">
> <CFPARAM NAME="RiskCategoryHelp" DEFAULT="The #RiskCategoryLabel# aligns the #ClosureCategoryLabel# for #LCase(request.ATSFindingName)#s to standardize the #ClosureDueDateLabel# across the business.<BR>If the selected #RiskCategoryLabel# is associated with a #ClosureCategoryLabel#, it will be locked and the #ClosureCategoryLabel# cannot be modified.">
> <CFPARAM NAME="SubCorrectiveActionHelp" DEFAULT="Enable multiple #CorrectiveActionLabel# Steps for a single #LCase(request.ATSFindingName)#.">
> <cfparam name="showBatchUpload" default="true">
> <cfparam name="variables.actionDetailsCardLabel" default="#request.ATSFindingName# Details"/>
>  
>  
> <!--- 1/11/2006 ergo integration with ats --->
> <CFPARAM name="url.AppCaller" default="">
> <CFPARAM name="url.ergoid" default="">
>
> ```
> ```
> <cfparam name="form.findingCatUpdated" default="">
>
>
> <CFPARAM NAME="ReferenceInstructions" DEFAULT="">
> <CFIF ReferenceInstructions EQ "">
> 	<CFSET ReferenceInstructions = Translator.Translate("Select only if #LCase(request.ATSFindingName)# is associated with a specific")  &' '& Translator.Translate("cross-reference. ID may be alphanumeric.")>
> </CFIF>
>  
> <cfset variables.WorkStationRequired = go.getSetupVar(var='ats_WorkStationRequired',default="False")/>
> <cfset variables.EquipmentRequired = go.getSetupVar(var="ats_EquipmentRequired", default=false)>
> <cfparam name="variables.citationMaxLength" default="#go.getSetupVar(var='citationMaxLength',default="255")#">
>
> ```
> ```
> </cfif>
> <!--- adding check for actual app activation --->
> <cfsavecontent variable="appdesc">
> 	<cfoutput>
> 	<font class="mediumtext">
> 		#Translator.Translate("The <font color='blue'><b>#request.ATSAppName#</b></font> is used to track non-compliance #LCase(request.ATSFindingName)#s and associated corrective actions that result from various types of audits and inspections.")#
> 		#Translator.Translate("Each audit #Lcase(request.ATSFindingName)# is assigned to a Responsible Person#coResponPersonText#, who is responsible for closing the #Lcase(request.ATSFindingName)# in the system once the corrective action has been implemented.")#
> 		<p>
> 			#Translator.Translate("Non-compliance <b><i>summary emails</i></b> are periodically sent to the Responsible Person(s)#coResponPersonText# assigned to open #LCase(request.ATSFindingName)#s, as well as to the Site Lead and Managers.")#
> 			#Translator.Translate("The emails summarize open non-compliance #LCase(request.ATSFindingName)#s by <i>#request.ATSFindingName# Category, Responsible Person#coResponPersonText# and ##ClosureCategoryLabel##.", ClosureCategoryLabel)#
> <CFIF showBatchUpload IS true>
> 		<p>
> 			#Translator.Translate("The <font color='blue'><b>#request.ATSAppName#</b></font> also features an <b><i>Upload Template</i></b> to upload a batch of #request.ATSAuditName# #request.ATSFindingName#s for a Site.")#
> 			#Translator.Translate("See the Templates tab for further information!")#
> </CFIF>
> 		<p>
> 		<i>#Translator.Translate("Additional #request.ATSAppName# Features")#: </i>
> 		<ul>
> 			<li>#Translator.Translate("Manage issues in <b><i>real-time</i></b> by quickly viewing #LCase(request.ATSFindingName)#s that are past due for a site.")#
> 			<li>#Translator.Translate("Data mine compliance status with advanced <b><i>charting and reporting features</i></b>.")#
> 		</ul>
> 	</font>
> 	</cfoutput>
> </cfsavecontent>
>
> ```
> ```
> 		<CFMODULE TEMPLATE="#Request.Library.framework.VirtualPath#tollgateMessage.cfm" TYPE="ERROR">
> 			<div class="row">
> 	            <div class="col-md-12">
> 	        <cfoutput>
> 	            <p class="largetext">
> 	                <strong><em>#Translator.Translate("#request.ATSFindingName# ID ##ID##",iID)#</em> #Translator.Translate("does not correspond to an existing ##ATSFindingName##",LCase(REQUEST.ATSFindingName))#</strong>
> 	            </p>
> 	        </cfoutput>
> 	            </div>
> 	        </div>
> 		</CFMODULE>
>
> ```
> ```
> 		AND api.get('contactlookup').getContactByName(name=trim(Exist.ResponPerson),busID=request.businessid).contactID neq request.user.accessid
> 		AND api.get('contactlookup').getContactByName(name=trim(Exist.CoResponPerson),busID=request.businessid).contactID neq request.user.accessid
> 		AND api.get('contactlookup').getContactByName(name=trim(Exist.VerifyPerson),busID=request.businessid).contactID neq request.user.accessid
> 		AND api.get('contactlookup').getContactByName(name=trim(Exist.ContactPerson),busID=request.businessid).contactID neq request.user.accessid AND NOT variables.hasVerifierRoleAssignmentRight) OR (AccessLevel eq 0)>			
> 		<!--- deny access to this Finding --->
> 			<cfset DenyType = Translator.translate("Edit #request.ATSFindingName#")>
> 			<cfif AccessName EQ Exist.ResponPerson>
> 			<cfset DenyLevel = 1>
> 			<cfelse>
> 				<cfset DenyLevel = 3>
> 			</cfif>				
> 			<cfset DenyText = "To edit this #LCase(request.ATSFindingName)#, you must have minimum Level 1 permissions if you are the assigned Responsible Person, the " & AuditorLabel & " Person or Closure Verification Person; or the Business Administrator special right. Otherwise, minimum pemission level to edit #LCase(request.ATSFindingName)#s is Level 3.">
> 			<cfif variables.showCoResponPerson>
> 				<cfset DenyText = "To edit this #LCase(request.ATSFindingName)#, you must have minimum Level 1 permissions if you are the assigned Responsible Person, the #coResponPersonLabel#, the " & AuditorLabel & " Person or Closure Verification Person; or the Business Administrator special right. Otherwise, minimum pemission level to edit #LCase(request.ATSFindingName)#s is Level 3.">
> 			</cfif>
> 			<cfset DenyText = Translator.translate(DenyText)/>
> 			<cfinclude template = "#ContactsHome#DenySignOn.cfm">
> 			<cfabort/>
> 		</cfif>
>
> ```
> ```
> 	<CFINCLUDE TEMPLATE ="#variables.auditMasterPath##variables.custompath#"/>
> </cfif>
>  
> <cfif ID is "" and SingleSignOn eq "Yes" and AccessLevel eq 0>
> 	<!--- deny ability to add Finding --->
> 	<cfset DenyType = Translator.translate("Add #request.ATSFindingName#")>
> 	<cfset DenyLevel = 1>
> 	<cfset DenyText = Translator.translate("To add a new #LCase(request.ATSFindingName)#, you must have minimum Level 1 permissions.")>
> 	<cfinclude template = "#ContactsHome#DenySignOn.cfm">
> 	<cfabort>
> </cfif>
>
> <!---Check custom permissions--->
>
> ```
> ```
> 	// TODO: write explanation
> 	function edittask(inForm) {
>   var link = inForm.CurrTask.value
>   if (link == '') {
> 	<!--- alert('You must select one of the findings from the pull-down list before it can be edited.') --->
> 				Ext.MessageBox.alert('Status', '<cfoutput>#Translator.JSTranslate("You must select one of the #LCase(request.ATSFindingName)#s from the pull-down list before it can be edited.")#</cfoutput>');
> 		return false
>   }
>   link = 'audfinding.cfm?Org=<CFOUTPUT>#Org#</CFOUTPUT>&Loc=<CFOUTPUT>#EncodeForURL(Loc)#</CFOUTPUT>&ID=' + link;
> 		GS.fn.windowOpen({url:link,pageType:'edit',sameWindow:true});
> 		return true;
>
> ```
> ```
> 	inForm.Action.value=sAction;
> 		}
> 	
>  <cfif !structKeyExists(url, "customTemplate")>
> 	  if (Trim(inForm.AuditDate.value) == "") {
> 				submitAlert('<cfoutput>#Translator.JSTranslate("#findingDateLabel# (mm/dd/yy) is required in order to enter a #LCase(request.ATSFindingName)#!")#</cfoutput>',inForm.AuditDate);
> 			return false
> 	  }
>  </cfif>
> 		<CFIF AuditNameRequired IS true>
> 			if (Trim(inForm.AuditName.value) == '') {
> 				submitAlert('<cfoutput>#Translator.JSTranslate("#auditNameNumberLabel# is required for the #LCase(request.ATSFindingName)#")#</cfoutput>',inForm.AuditName);
> 	return false
>   }
> 		</CFIF>
> 		<CFIF (FindingTypeRequired IS true) AND (findingTypeLabel is not "")>
>   if (Trim(inForm.FindingType.value) == "") {
> 				submitAlert('<cfoutput>#Translator.JSTranslate("#findingTypeLabel# must be selected for the #LCase(request.ATSFindingName)#!")#</cfoutput>',inForm.FindingType);
> 	return false
>   }
> 		</CFIF>
> 		<cfif structKeyExists(request,"CustomTaggerEnabled") and request.CustomTaggerEnabled eq true>
>             <cfif variables.embedCustomTagger eq true and request.businessid eq 1299>
> 			if(!$('#taggedStuff_3974').text().length){
> 				submitAlert('<cfoutput>#Translator.JSTranslate("Related Product Company must be selected for the #LCase(request.ATSFindingName)#!")#</cfoutput>',$('#taggedStuff_3974')[0]);
> 				return false
> 			}
> 			if(!$('#taggedStuff_3981').text().length){
> 				submitAlert('<cfoutput>#Translator.JSTranslate("Related Product/Sub Product Line must be selected for the #LCase(request.ATSFindingName)#!")#</cfoutput>',$('#taggedStuff_3981')[0]);
> 				return false
> 			}
> 		</cfif>
> 			<!--- Checks if Outage Tagger entries are not filled --->
>             <cfif structKeyExists(request, "CustomTaggerEnabled") AND request.CustomTaggerEnabled eq true AND variables.ats_enableOutageTracker>
>
> ```
> ```
>                 }
>             </cfif>
>         </cfif>
> 		<cfif (AuditTypeRequired IS true) AND (AuditTypeLabel is not "")>
>   if (!$('#audit_type_required').hasClass('d-none') && Trim(inForm.AuditType.value) == "") {
> 				submitAlert('<cfoutput>#Translator.JSTranslate("#AuditTypeLabel# must be selected for the #LCase(request.ATSFindingName)#!")#</cfoutput>',inForm.AuditType);
> 	return false
>   }
> 		</cfif>
> 		<CFIF numberOfItemsLabel IS NOT "">
> 			<cfif numberOfItemsRequired is true>
> 				if (Trim(inForm.NumItems.value) == "" || isNaN(inForm.NumItems.value)) {
> 					submitAlert('<cfoutput>#Translator.JSTranslate("#numberOfItemsLabel# (>0) associated with this #LCase(request.ATSFindingName)# is required!")#</cfoutput>',inForm.NumItems);
> 					return false
> 				}
> 			<cfelse>
> 				if (Trim(inForm.NumItems.value) == "" || isNaN(inForm.NumItems.value)) {
> 					inForm.NumItems.value = 1
>
> ```
> ```
> 			</cfif>
> 		</CFIF>
> 		
> 		<cfif findingCategoryLabel is not "" AND variables.findingCategoryRequired>
>   if (Trim(inForm.Category.value) == "") {
> 				submitAlert('<cfoutput>#Translator.JSTranslate("#findingCategoryLabel# must be selected for the #request.ATSFindingName#!")#</cfoutput>',inForm.Category);
> 	return false
>   }
> 		</cfif>
>   <cfif Coeq.RecordCount GT 0 and CenterDeptLabel is not "" and variables.deptRequired>
> 	  if (Trim(inForm.COE.value) == "") {
> 				submitAlert('<cfoutput>#Translator.JSTranslate("A ##Department## must be selected for the #LCase(request.ATSFindingName)#!", CenterDeptLabel)#</cfoutput>',inForm.COE);
> 		return false
> 		}
> 		<!---22/06/2023 Edith added subDeptRequired setup var--->
> 		<cfif variables.subDeptRequired>
> 			if(inForm.SubCOEID.options.length > 1) {
>
> ```
> ```
> 			}
> 		</cfif>
>   </cfif>
> 		<cfif variables.isBuildingRequired eq true>
> 	if(Trim(inForm.Bldg.value) == ""){
> 				submitAlert('<cfoutput>#Translator.JSTranslate("A ##BuildingLabel## must be selected for the #LCase(request.ATSFindingName)#", BuildingLabel)#</cfoutput>',inForm.Bldg);
> 		return false
> 	}
> 		</cfif>
> 		<CFIF WorkStationRequired EQ "True" && workstationsExist>
> 	if(Trim(inForm.WorkStation.value) == ""){
> 				submitAlert('<cfoutput>#Translator.JSTranslate("A ##WorkstationLabel## must be selected for the #LCase(request.ATSFindingName)#", WorkstationLabel)#</cfoutput>',inForm.WorkStation);
> 		return false
> 	}
> 		</CFIF>
> 		<cfif EquipmentRequired is true and variables.showETIntegration is true>
> 	if(Trim(inForm.Audit_ET.value) == ""){
> 				submitAlert('<cfoutput>#Translator.JSTranslate("A ##EquipmentLabel## must be selected for the #LCase(request.ATSFindingName)#", "Equipment")#</cfoutput>',inForm.Audit_ET)
> 		return false
> 	}
> 		</cfif>
> 		<CFIF ReferenceRequired IS true>
> 			if (Trim(inForm.RefType.value) == '' && (window.referenceReq =='undefined' || window.referenceReq==true) ) {
> 				submitAlert('<cfoutput>#Translator.JSTranslate("A ##ReferenceLabel## must be selected for the #LCase(request.ATSFindingName)#", ReferenceLabel)#</cfoutput>',inForm.RefType);
> 	return false
>   }
> 		</CFIF>
> 		<CFIF Len(Trim(FindingRefTypeList)) && Len(Trim(ReferenceLabel))>
>   if (inForm.RefType.value != "") {
> 	if (Trim(inForm.RefID.value) == "") {
> 		if (Trim(inForm.RefID.type) != "select-one") {
> 						submitAlert('<cfoutput>#Translator.JSTranslate("You must provide the ##ReferenceLabel## ID to submit this #LCase(request.ATSFindingName)#.", ReferenceLabel)#</cfoutput>!',inForm.RefID);
> 			return false
> 		}
> 	}
>   } else {
> 	if (inForm.RefID.value != "") {
>
> ```
> ```
> 	}
>   }
> 		</CFIF>
>  
>   if (Trim(inForm.ResponPerson.value) == "") {
> 			submitAlert('<cfoutput>#Translator.JSTranslate("#responsiblePersonLabel# must be selected for the #LCase(request.ATSFindingName)#!")#</cfoutput>',inForm.ResponPerson);
> 	return false
>   }
>
>   <cfif variables.showCoResponPerson eq true>
> 	var dateAudit = moment(inForm.AuditDate.text).format('DD-MM-YYYY');
> 	var findingCoOwnerReleaseDate = moment("12/14/2017"); //Adding validation only for those Findings created after release date
>    
> 	<cfif variables.isCoResponPersonRequired eq true>
> 	if (Trim(inForm.coResponPerson.value) == "" && (findingCoOwnerReleaseDate.diff(dateAudit,"days")) <= 0) {
> 					submitAlert('<cfoutput>#Translator.JSTranslate("#coResponPersonLabel# must be selected for the #LCase(request.ATSFindingName)#!")#</cfoutput>',inForm.coResponPerson);
> 		return false
> 	  }
> 	</cfif>
>
> 	if (Trim(inForm.coResponPerson.value) == Trim(inForm.ResponPerson.value)){
> 				submitAlert('<cfoutput>#Translator.JSTranslate("#responsiblePersonLabel# must be different than #coResponPersonLabel# for the #LCase(request.ATSFindingName)#!")#</cfoutput>',inForm.coResponPerson);
> 		return false
> 	}
>   </cfif>
>
>   if($("#invalidReplicateEntries").length&& parseInt($("#invalidReplicateEntries").val())>0){
>
> ```
> ```
> 			<cfif variables.isAlertForResponsiblePersonEnabled>
> 				if ((inForm.ResponPerson.value.trim() != sAccess) <cfif len(trim(auditorLabel))>&&  (inForm.ContactPerson.value.trim() != sAccess)</CFIF>) {
> 				<cfif variables.showCoResponPerson eq true>
> 					if (inForm.coResponPerson.value.trim() != sAccess){
>                         <cfif len(trim(auditorLabel)) && len(trim(coResponPersonLabel))>
> 						submitAlert('<cfoutput>#Translator.JSTranslate("Either the ##responsiblePersonLabel##, the ##coResponPersonLabel## or the ##AuditorLabel## must be ##Hillary LaMuth## to add/edit this #LCase(request.ATSFindingName)#!", Translator.Translate(responsiblePersonLabel), Translator.Translate(coResponPersonLabel), Translator.Translate(AuditorLabel), sAccess2)#</cfoutput>',inForm.ResponPerson);
>                         <cfelseif len(trim(coResponPersonLabel)) && !len(trim(auditorLabel))>
>                             submitAlert('<cfoutput>#Translator.JSTranslate("Either the ##responsiblePersonLabel## or the ##coResponPersonLabel## must be ##Hillary LaMuth## to add/edit this #LCase(request.ATSFindingName)#!", Translator.Translate(responsiblePersonLabel), Translator.Translate(coResponPersonLabel), sAccess2)#</cfoutput>',inForm.ResponPerson);
>                         <cfelse>
>                             submitAlert('<cfoutput>#Translator.JSTranslate("The ##responsiblePersonLabel## must be ##Hillary LaMuth## to add/edit this #LCase(request.ATSFindingName)#!", Translator.Translate(responsiblePersonLabel), sAccess2)#</cfoutput>',inForm.ResponPerson);
>                         </cfif>
> 						return false;
> 					} else {
> 						return true;
> 					}
> 				</cfif>
> 				<cfif !(variables.byPassLevel2_RPEdit AND AccessLevel EQ 2)>
>                     <cfif len(trim(auditorLabel))>
> 					submitAlert('<cfoutput>#Translator.JSTranslate("Either the ##responsiblePersonLabel## or the ##AuditorLabel## must be ##Hillary LaMuth## to add/edit this #LCase(request.ATSFindingName)#!", Translator.Translate(responsiblePersonLabel),Translator.Translate(AuditorLabel), sAccess2)#</cfoutput>',inForm.ResponPerson);
>                     <cfelse>
>                         submitAlert('<cfoutput>#Translator.JSTranslate("The ##responsiblePersonLabel## must be ##Hillary LaMuth## to add/edit this #LCase(request.ATSFindingName)#!", Translator.Translate(responsiblePersonLabel), sAccess2)#</cfoutput>',inForm.ResponPerson);
>                     </cfif>
> 						return false;
> 				</cfif>
> 			}
> 			</cfif>
> 		</cfoutput>
> 	</cfif>
> 		<CFIF AuditorRequired IS true and AuditorLabel is not "">
> 			if (Trim(inForm.ContactPerson.value) == "") {
> 				submitAlert('<CFOUTPUT>#Translator.JSTranslate("A ##AuditorLabel## is required for the #LCase(request.ATSFindingName)#!", Translator.Translate(AuditorLabel))#</CFOUTPUT>!',inForm.ContactPerson);
> 	return false
>   }
> 		</CFIF>
> 		<CFIF PhoneRequired IS true>
> 			if (Trim(inForm.ContactPhone.value) == "") {
> 				submitAlert('<CFOUTPUT>#Translator.JSTranslate("A ##PhoneLabel## is required for the #LCase(request.ATSFindingName)#", Replace(PhoneLabel, ":", ""))#</CFOUTPUT>!',inForm.ContactPhone);
> 	return false
>   }
> 		</CFIF>
> 		<cfif variables.isRiskCategoryRequired eq true>
> 			if($('[name=RiskCategory]').val() == ""){
> 				submitAlert('<cfoutput>#Translator.JSTranslate("A ##RiskCategoryLabel## must be selected for the #LCase(request.ATSFindingName)#", RiskCategoryLabel)#</cfoutput>',inForm.RiskCategory);
> 				return false
> 			}
> 		</cfif>
> 	
> 	var CL = "";
>
> ```
> ```
> 	// CHETHAN
> 	<CFIF variables.isCIActiveForSite AND CI_LOCK_ATS_FindingType IS NOT "" AND CILink.actionsComplete IS "" AND (ByPassExport IS FALSE OR EXPCIMandatory contains "CIExport") AND !variables.bypassClosureLockforCIExport>
> 	<CFOUTPUT>
> 					if (inForm.Status.value == 'Closed' && '#JSStringFormat(CI_LOCK_ATS_FindingType)#'.indexOf(inForm.FindingType.value) != -1) {
> 						if('#JSStringFormat(EXPCIMandatory)#'.indexOf("CIExport") != -1){
> 							Ext.MessageBox.alert('Status', '#Translator.JSTranslate("The #Lcase(request.ATSFindingName)# cannot be closed when the Closure is rejected<BR>Submit the #Lcase(request.ATSFindingName)# as open by clicking on Submit and Export to CI button which will automatically export the #Lcase(request.ATSFindingName)# to Continuous Improvement.", CI_LOCK_ATS_FindingType)#');
> 						}else{
> 							Ext.MessageBox.alert('Status', '#Translator.JSTranslate("The #Lcase(request.ATSFindingName)# cannot be closed when the #request.ATSFindingName# Type is any of the following:<BR> ##List##<BR>Submit the #Lcase(request.ATSFindingName)# as open and export it to Continuous Improvement.", CI_LOCK_ATS_FindingType)#');
> 						}
> 			return false;
> 		}
> 	</CFOUTPUT>
> 	</CFIF>
>
> ```
> ```
>  
> 	<!--- 08/29/02 --->
> 	<!--- only run the verification if the information can be changed --->
> 	<CFIF VerifyDisable IS "" OR variables.disableCVOnEdit>
> 				if (inForm.VerifyDate && inForm.VerifyDate.value != '' && inForm.Status.value != 'Closed') {
> 					submitAlert('<cfoutput>#Translator.JSTranslate("The status must be Closed in order to verify closure of this #LCase(request.ATSFindingName)#!")#</cfoutput>',inForm.Status);
> 		return false;
> 	}
> 				if (inForm.VerifyDate && Trim(inForm.VerifyDate.value) != '' && Trim(inForm.VerifyComment.value) == '') {
> 	<CFOUTPUT>
> 						submitAlert('#Translator.JSTranslate("#ClosureVerificationCommentLabel# is required to verify closure of this #LCase(request.ATSFindingName)#!")#',inForm.VerifyComment);
> 	</CFOUTPUT>
> 		return false;
> 	}
> 				if (inForm.VerifyDate && Trim(inForm.VerifyDate.value) != '' && Trim(inForm.VerifyBy.value) == '') {
> 	<CFOUTPUT>
> 						submitAlert('#Translator.JSTranslate("#ClosureVerificationByLabel# is required to verify closure of this #LCase(request.ATSFindingName)#!")#',inForm.VerifyBy);
> 	</CFOUTPUT>
> 		return false;
> 	}
> 	</CFIF>
>  
>
> ```
> ```
> 		</cfif>
>
> 			<cfif len(trim(InvestigationDetailsLabel)) AND variables.isInvestigationDetailsRequired>	   
> 						if (Trim(inForm.InvestigationDetails.value) == '' ) {
> 				<!--- 03/15/05 --->
> 							submitAlert('<cfoutput>#Translator.JSTranslate("A Closed ##CAPALabel## #request.ATSFindingName# requires ##Investigation Details##!", CAPALabel, InvestigationDetailsLabel)#</cfoutput>',inForm.InvestigationDetails);
> 					return false;
> 				}
> 			</cfif>
>  
> 					if (inForm.RootCause1 != null && Trim(inForm.RootCause1.value) == '') {
> 						submitAlert('<cfoutput>#Translator.JSTranslate("A Closed ##CAPALabel## #request.ATSFindingName# requires a ##RootCause1Label## be added", CAPALabel, RootCause1Label)#!</cfoutput>',inForm.RootCause1)
> 				return false;
> 			}
> 					if (inForm.RootCause2 != null && Trim(inForm.RootCause2.value) == '') {
> 						submitAlert('<cfoutput>#Translator.JSTranslate("A Closed ##CAPALabel## #request.ATSFindingName# requires a ##RootCause1Label## be added", CAPALabel, RootCause2Label)#!</cfoutput>',inForm.RootCause2);
> 				return false;
> 			}
> 			<cfif trim(RootCauseLabel) neq "">
> 					if (Trim(inForm.RootCause.value) == '') {
> 						submitAlert('<cfoutput>#Translator.JSTranslate("A Closed ##CAPALabel## #request.ATSFindingName# requires a ##Root Cause## be added!", CAPALabel, RootCauseLabel)#</cfoutput>',inForm.RootCause);
> 				return false;
> 			}
> 			</cfif>
> 			
> 			<CFIF ATS_CAPA_EFFECTIVITY_REQUIRED IS true>
> 					<cfif len(trim(EffectivityInformationLabel))>
> 						if (Trim(inForm.Effectivity.value) == '') {
> 							submitAlert('<cfoutput>#Translator.JSTranslate("A Closed ##CAPALabel## #request.ATSFindingName# requires ##Effectivity Information##!", CAPALabel, EffectivityInformationLabel)#</cfoutput>',inForm.Effectivity);
> 							return false;
> 						}
> 					</cfif>
>  
> 						if (Trim(inForm.EffectiveDate.value) == '') {
> 							submitAlert('<cfoutput>#Translator.JSTranslate("A Closed ##CAPALabel## #request.ATSFindingName# requires an ##Date##!", CAPALabel, EffectivityDateLabel)#</cfoutput>',inForm.EffectiveDate);
> 				return false;
> 				}
> 			</CFIF>
> 		}
> 	</CFIF>
>
> ```
> ```
>
> 		$('[name=CloseComment]').val('Completed per finding');
> 	}
> 				if ((inForm.Status.options[inForm.Status.selectedIndex].value == 'Closed') && (Trim(inForm.CloseDate.value) == '')) {
> 	<CFOUTPUT>
> 						submitAlert('#Translator.JSTranslate("A Closed #request.ATSFindingName# requires a ##Date Closed##!", DateClosedLabel)#',inForm.CloseDate);
> 	</CFOUTPUT>
>
> 	
>
>
>
> ```
> ```
>   if ((inForm.Status.options[inForm.Status.selectedIndex].value == 'Closed') && (Trim(inForm.ClosePerson.value) == '')) {
> 	submitAlert('<cfoutput>#Translator.JSTranslate(ClosedByAlert)#</cfoutput>',inForm.ClosePerson);
> 	return false;
>   }
>   if ((inForm.Status.options[inForm.Status.selectedIndex].value == 'Closed') && (Trim(inForm.CloseComment.value) == '') && (Trim(inForm.PriorCloseComment.value) == '')) {
> 					submitAlert('<cfoutput>#Translator.JSTranslate("A Closed #request.ATSFindingName# requires a Closure Comment!", DateClosedLabel)#</cfoutput>',inForm.CloseComment);
> 	return false
>   }
>   if ((inForm.Status.options[inForm.Status.selectedIndex].value == 'Open') && (inForm.CloseDate.value != '')) {
> 	<CFOUTPUT>
> 						submitAlert('#Translator.JSTranslate("Only a Closed #request.ATSFindingName# is allowed to have a ##Date Closed##!", DateClosedLabel)#',inForm.CloseDate);
> 	</CFOUTPUT>
> 	return false
>   }
> 				if ((inForm.Status.options[inForm.Status.selectedIndex].value == 'Open') && (inForm.ClosePerson.value != '')) {
> 					submitAlert('<cfoutput>#Translator.JSTranslate("Only a Closed #request.ATSFindingName# is allowed to have a Closed By Person!")#</cfoutput>',inForm.ClosePerson);
> 	return false
>   }
> 	</cfif>
> 		</CFIF>
>
> 	<!--- 11/05/02 - Validation to prevent same person for RP and Closure Verifier --->
> 	<cfif NOT variables.allowSamePersonRPandCV>
> 		if (inForm.VerifyBy && inForm.VerifyBy.value == inForm.ResponPerson.value) {
> 			submitAlert('<cfoutput>#Translator.JSTranslate("The individual responsible for #closureVerificationLabel# must be different than the #responsiblePersonLabel# for #LCase(request.ATSFindingName)# closure!")#</cfoutput>',inForm.VerifyBy);
> 		return false;
> 	}
> 	</cfif>
> 		<!--- 08/20/07 --->
> 		<CFPARAM NAME="BlockCloseVerify" DEFAULT="true">
>
> ```
> ```
>  
> 		<!--- 04/28/03 --->
> 		<CFIF ((RequireClosureVerification IS true AND ID IS NOT "") OR RequireClosureVerificationOnAdd IS true) AND VerifyDisable IS "">
> 			if (inForm.VerifyBy && Trim(inForm.VerifyBy.value) == ''<CFIF RequireClosureVerificationOnAdd IS false> && inForm.Status.value == 'Closed'</CFIF>) {
> 		<cfoutput>
> 					submitAlert('#Translator.JSTranslate("Select a person #ToVerifyClosureLabel# of this #LCase(request.ATSFindingName)#.")#',inForm.VerifyBy);
> 		</cfoutput>
> 		inForm.VerifyBy.focus();
> 		return false;
> 	}
> 		</CFIF>
>
> ```
> ```
> 		}
> 		if ((ClosureVerificationRequired && Trim(inForm.VerifyBy.value) == '') 
> 					|| (typeof ClosureVerificationRequiredChck.val() === 'undefined' && Trim(inForm.VerifyBy.value) == '')) {
>  
> 		<CFOUTPUT>
> 					submitAlert('#Translator.JSTranslate("Select a person #ToVerifyClosureLabel# of this #LCase(request.ATSFindingName)# when specifying a ##Date##!", ScheduledVerificationDateLabel)#',inForm.VerifyBy);
> 		</CFOUTPUT>
> 			return false;
> 		}
>
> 		var ClosureListArray = inForm.ClosureList.value.split(' ');
>
> ```
> ```
> 		//console.log(_.trim($('#VerifyBy').val()) == "");
> 		//debugger;
>
> 		if (inForm.VerifyBy && _.trim(inForm.VerifyBy.value) == "" && $('#ClosureVerificationRequired').is(':checked')) {
> 			<cfoutput>
> 				submitAlert('#Translator.JSTranslate("Select a person #ToVerifyClosureLabel# of this #LCase(request.ATSFindingName)#.")#',inForm.VerifyBy);
> 			</cfoutput>
> 			inForm.VerifyBy.focus();
> 			return false;
> 		}
> 	</CFIF>
>
> ```
> ```
> 			VALIDATIONTYPE	="Javascript" 
> 			FORM			="inForm" 
> 			gsversion		="2"
> 			TRANSLATOR		="#Translator#" 
> 			orgid			="#orgid#"
> 			MESSAGE			="##FieldLabel## is required for this #LCase(request.ATSFindingName)#" 
> 			CALLBACK		="focusField" 
> 		  	isActive="#variables.isActive#"
> 			/>
>  
> 		if (inForm.Status.value == 'Closed') {
>
> ```
> ```
> 				FORM="inForm" 
> 				REQUIRED="REQUIREDONCLOSE" 
> 				gsversion="2"
> 				TRANSLATOR="#Translator#" 
> 				orgid="#orgid#"
> 				MESSAGE="##FieldLabel## is required when this #LCase(request.ATSFindingName)# is closed." 
> 				CALLBACK="focusField" 
> 			  	isActive="#variables.isActive#"
> 				/>
> 	}
>
>
> ```
> ```
> 				return true
> 			</CFIF>
> 			} else {
> 				<cfif !go.getSetupVar(var="hideCddPopUp",default=false)>
> 					bootbox.dialog({
> 						message: '<CFOUTPUT>#Translator.JSTranslate("Please enter the new ##Date## desired for this #LCase(request.ATSFindingName)# and submit changes.", ClosureDueDateLabel)#<BR><BR>#Translator.JSTranslate("Weekly email reminders for this #LCase(request.ATSFindingName)# will be sent automatically only within ##12 days## days of the ##Date##. You may use the 'Additional Reminders..' input box to receive additional email reminder(s) prior to the ##Date##.", variables.additionalReminderRegDays, ClosureDueDateLabel, ClosureDueDateLabel)#</CFOUTPUT>',	
> 						buttons: {
> 							confirm: {
> 								label:"<CFOUTPUT>#Translator.JSTranslate('Confirm')#</CFOUTPUT>",
> 								className:'btn-primary',
> 								callback: function(){
>
> ```
> ```
> 			}
> 			</cfif>
> 				if (CL.disabled == true || newFinding || closureCategoryLabel == '' || closureDueDateLabel == '') {
> 				confirmChangeClosureList('yes', inForm);
> 				} else {
> 					<CFSET sTranlatedString = Translator.JSTranslate("ALERT: You have changed the ##ClosureCategoryLabel## for this #LCase(request.ATSFindingName)#.", ClosureCategoryLabel)>
> 				/* firstLoad() is declared above, */
> 				$(function () {
> 					if (firstLoad()==false) {
> 						if($('.closureCatList:visible').length){
> 							bootbox.dialog({
>
> ```
> ```
> 				if ((CL=="<CFOUTPUT>#SixthClosure#</CFOUTPUT>" || CL =="Select Closure Due Date" || (enableFifthClosure == true && CL == "<CFOUTPUT>#FifthClosure#</CFOUTPUT>")) && showSixthClosureReminder == 'true') {
>
> 					<cfif variables.closureCategoryPopupMsg neq "">
> 						<cfset variables.closureCategoryMsg = Translator.JSTranslate(variables.closureCategoryPopupMsg, ClosureDueDateLabel)>
> 					<cfelse>
> 						<cfset variables.closureCategoryMsg = Translator.JSTranslate("Weekly email reminders for this #LCase(request.ATSFindingName)# will be sent automatically only within ##12## days of the ##Date2##. You may use the 'Additional Reminders..' input box to receive additional email reminder(s) prior to the ##Date3##.", variables.additionalReminderRegDays, ClosureDueDateLabel, ClosureDueDateLabel)>
> 					</cfif>
>
> 					<cfif !go.getSetupVar(var="hideCddPopUp",default=false)>
> 							GS.fn.alert({
> 					message:'<cfoutput>#Translator.JSTranslate("Please enter the custom ##Date## desired for this #LCase(request.ATSFindingName)#.", ClosureDueDateLabel) & "<br><br>" & variables.closureCategoryMsg#</cfoutput>'
> 					,callback:function(){
> 					</cfif>
> 									SetClosureDueDate(inForm);
> 									focusField(inForm.ClosureDueDate);
> 								   document.getElementById('RemindDaysLabel').style.display = 'block';
>
> ```
> ```
> 		return true
> 		}
>  
> 	<!--- This function runs on focus of the event date text box if the reporting password cookie is not available. --->
> 	function AdminMessage() {
> 		submitAlert('<cfoutput>#Translator.JSTranslate("This data element for an existing #request.ATSFindingName# may be edited only by a Business Administrator.")#</cfoutput>',document.addAudit.AuditType);
> 	}
>  
> 	// TODO: write explanation
> 	function DisplayComment(oSelect) {
> 		<CFIF ID IS NOT "" AND Stat IS "Closed">
>
> ```
> ```
> 					return confirm('Reject closure of this audit finding? OK to Confirm Rejection of Closure; or Cancel.') 
> 					TODO: this pop-up loops, is that okay?
> 				--->
> 				Ext.MessageBox.confirm(
> 					'Confirm'
> 					,'<cfoutput>#ListFirst(Translator.JSTranslate("Reject closure of this #LCase(request.ATSAuditName)# #LCase(request.ATSFindingName)#? OK to Confirm Rejection of Closure; or Cancel."), "?")#</cfoutput>?'
> 					,function (btn){ 
> 						RejectFinding(oForm, 'confirm', btn, rejectComment)
> 		}
> 				);
> 			} else {
>
> ```
> ```
> <CFPARAM NAME="conditionalATSFields" DEFAULT="">
> <CFMODULE TEMPLATE="#request.Library.CustomTags.VirtualPath#ConditionalFields.cfm"
> 	FORM="addAudit" JSON="#conditionalATSFields#" useRecharged="true"/>
>  
> <CFIF ID IS "">
> 	<cfparam name="title" default="Add/Edit #request.ATSAuditName# #request.ATSFindingName#">
> <CFELSE>
> 	<cfparam name="title" default="Edit #request.ATSAuditName# #request.ATSFindingName#">
> </CFIF>
> <cfset title = Translator.Translate(title)>
>  
> <!---  ---><CFOUTPUT><TITLE>#title#</TITLE></CFOUTPUT>
> <SCRIPT>
>
> ```
> ```
> 									invalidCount++;
> 							}
> 						</cfif>
>
> 						if(!moment($('#replicateAuditDate'+sitesList[i]).val(),'DD-MMM-YYYY').isValid()){
> 								GS.fn.alert('Select a <cfoutput>#request.ATSFindingName#</cfoutput> Date');
> 								$('#replicateAuditDate'+sitesList[i]).focus();
> 								$('#replicateAuditDate'+sitesList[i]).css("background-color","yellow");
> 								setTimeout(function() {
> 												$('#replicateAuditDate'+sitesList[i]).css( "background-color","", 1500 );
> 											}, 1000 );
>
> ```
> ```
> 						sMessage = iCount + ' #sitelabel#';
> 					</cfoutput>
> 					if (iCount > 1){
> 						sMessage += 's';
> 					}
> 					sMessage += ' selected for <cfoutput>#Lcase(request.ATSFindingName)#</cfoutput>'
>                     if($('#replicateSubCaCheckbox').prop('checked')){
>                         sMessage += ' and <cfoutput>#Lcase(SubCorrectiveLabel)#</cfoutput>'
>                     }
>                     sMessage += ' replication.'
> 					$('#SelectedSiteCount').html(sMessage);
>
> ```
> ```
> 	<cfif !structKeyExists(url,"customTemplate")>
> 		<CFIF !len(ID)>
> 			<cfif !len(Version)>
> 				<CFIF len(FindingID)>
> 					<cfset break = "<br>">
> 					#Translator.Translate("Note: This new #LCase(request.ATSFindingName)#'s details have been copied from an existing #LCase(request.ATSFindingName)#! Be sure to make the necessary additions/changes and Add #request.ATSFindingName#!",  request.ATSFindingName)#
> 				</CFIF>
> 			<cfelse>
> 				#break#
> 				<cfset break="<br>">
> 				#Translator.Translate("This is version ##Version## of #request.ATSFindingName# ID: ####ID##!", Version, ID)#
> 				<br>
> 				#Translator.Translate("This Archived data is displayed for reference only and cannot be modified!")#
> 			</cfif>
> 		</CFIF>
> 		<CFIF len(TrainingLink)>
>
> ```
> ```
> 				<cfset variables.auditRoomID = refid>
> 			</cfif>
>
> 			<cfset variables.customLinkTextForSpecificRef = ''/>
>             <cfif listfindnocase(variables.refListForCustomLinkText, reftype)>
>                 <cfset variables.customLinkTextForSpecificRef = api.go.getSetupVar(var='customLinkTextForSpecificRef', default='Closure Verification is required for this event-related #LCase(request.ATSFindingName)#. Please select Investigation Team member as the verifier.')>
>             </cfif>
>             <CFMODULE TEMPLATE="reflink.cfm" reftype="#reftype#" refid="#refid#" tblAuditID="#variables.tblAuditID#" customLinkTextForSpecificRef='#variables.customLinkTextForSpecificRef#'/>
>
> 			<cfif listfindnocase("AuditAssistant",trim(reftype))>
> 				
>
> ```
> ```
> 	<cfoutput>
> 	<cfset variables.myJsonTemplate = variables.objAudit.getJsonDefaultShortcut(ItemCode = 'ATS_DATASHORTCUT_DEFAULT', UpdateBy = '#request.User.AccessName#')/>
> 	<div class="row">
> 		<div class="col-sm-12">
> 			<div class="btn-group">
> 				<button type="button" class="btn btn-default" id="mydefaultLink" <cfif variables.myJsonTemplate.recordcount gt 0>onclick="getMyDefaultJsonValues(false);"<cfelse>onclick="showMydefaultModal();"</cfif>>#Translator.JSTranslate("My Default #request.ATSFindingName#")#</button>
> 					<button type="button" class="btn btn-default dropdown-toggle dropdown-toggle-split" data-toggle="dropdown">
> 						<span class="sr-only"></span>
> 					</button>
> 					<div class="dropdown-menu" id="menuItems">
> 						<a class="dropdown-item" href="##" id="editDefault" <cfif variables.myJsonTemplate.recordcount lt 1> style="display: none;" </cfif>><i class="fa fa-pencil mr-1"></i>#Translator.JSTranslate("Edit My Default #request.ATSFindingName#")#</a>
> 						<a class="dropdown-item" href="##" id="addDefault" <cfif variables.myJsonTemplate.recordcount gt 0> style="display: none;" </cfif>><i class="fa fa-pencil-square-o mr-1"></i>#Translator.JSTranslate("Add New My Default #request.ATSFindingName#")#</a>
>
> 						<cfif isJSON(variables.JSONFindingTemplate)>
>
> 						<cfset findingTemplate = deserializeJSON(variables.JSONFindingTemplate)>
> 						<cfif StructKeyExists(findingTemplate,'button')>
>
> ```
> ```
> 	</div>
> 	<div class="modal fade" id="myDefaultFinding">
> 		<div class="modal-dialog modal-lg" role="document">
> 			<div class="modal-content">
> 				<div class="modal-header bg-primary">
> 					<h5>#Translator.translate("Select fields for My Default #request.ATSFindingName#")#</h5>
> 					<button id="close-myDefault" type="button" class="close" data-dismiss="modal" aria-label="Close">
> 					  <span aria-hidden="true">&times;</span>
> 					</button>
> 				</div>
> 				<div class="modal-body">
>
> ```
> ```
> 								for (var x = 0; x < shortcutValue.length; x++) {
> 									shortcutElement.append(new Option(''+shortcutValue[x], ''+shortcutValue[x], true, true)).trigger('change');
> 								}
> 							}else{
> 								if(i=='ContactPerson' && shortcutValue ==""){
> 									shortcutValue = "<cfoutput>#request.ATSFindingName#</cfoutput>"
> 								}
> 								shortcutElement.append(new Option(''+shortcutValue, ''+shortcutValue, true, true)).trigger('change');
> 							}
> 							shortcutElement.gsContactSearch();
> 						}else{
>
> ```
> ```
> 				data: {itemCode:'ATS_DATASHORTCUT_DEFAULT', MemoAnswer:sJSON, updateBy:'<cfoutput>#request.user.AccessName#</cfoutput>'},
> 			}).done(function(data){
> 				var _response = $.parseJSON(data);
> 				GS.fn.alert({
> 					title:"Alert!",
> 					message:"My Default <cfoutput>#request.ATSFindingName#</cfoutput> has been saved ",
> 					callback:function(){
> 						$('#myDefaultFinding').modal('hide');
> 						$('#addDefault').hide();
> 						$('#editDefault').show();
> 						$('#mydefaultLink').removeAttr('onclick');
>
> ```
> ```
> 					sValue = $('[name='+de
>
> ...[content truncated due to token limit]
> ````
>
> ```text
> The response was truncated because the number of tokens exceeded the maximum limit of 12000.
> ```
>
> MCP tool call
>
> sourcebot.search_code
>
> ```json
> {
>   "query": "Submit Changes",
>   "filterByRepos": [
>     "code.gensuite.com/pm/audit"
>   ],
>   "filterByFilepaths": [
>     "audfinding.cfm"
>   ],
>   "includeCodeSnippets": true,
>   "maxTokens": 12000
> }
> ```
>
> ````text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/audfinding.cfm
> num_matches: 10
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
>
> ```
> 		bWarn = false;
> 		}
> 	<!--- 06/19/04 --->
> 	<CFIF ATS_AUDIT_TRAIL IS true>
> 			if (bWarn == true) {
> 			<!--- alert('To add/edit attachments, click on the "Submit Changes" button and use the "Attach" link on the following page.') --->
> 				GS.fn.alert('<cfoutput>#Translator.JSTranslate("To add/edit attachments, click on the 'Submit Changes' button and use the 'Attach' link on the following page.")#</cfoutput>');
> 			return false;
> 		}
> 	</CFIF>
>  
> 	gsWindowOpen(loc, win_no);
>
> ```
> ```
> 				return true
> 			</CFIF>
> 			} else {
> 				<cfif !go.getSetupVar(var="hideCddPopUp",default=false)>
> 					bootbox.dialog({
> 						message: '<CFOUTPUT>#Translator.JSTranslate("Please enter the new ##Date## desired for this #LCase(request.ATSFindingName)# and submit changes.", ClosureDueDateLabel)#<BR><BR>#Translator.JSTranslate("Weekly email reminders for this #LCase(request.ATSFindingName)# will be sent automatically only within ##12 days## days of the ##Date##. You may use the 'Additional Reminders..' input box to receive additional email reminder(s) prior to the ##Date##.", variables.additionalReminderRegDays, ClosureDueDateLabel, ClosureDueDateLabel)#</CFOUTPUT>',	
> 						buttons: {
> 							confirm: {
> 								label:"<CFOUTPUT>#Translator.JSTranslate('Confirm')#</CFOUTPUT>",
> 								className:'btn-primary',
> 								callback: function(){
>
> ```
> ```
> 										<cfif !val(integrationRefDisplay.locked)>
> 											<SPAN class="small">
> 												<span class="clickable" onclick="ClearRef();" ><u>Clear</u></span> #ReferenceLabel#
> 											</SPAN>
> 										
> 											<i class="ml-1 fa fa-question-circle text-secondary" data-html="true" role="button" data-toggle="tooltip" data-original-title="<cfoutput>To change the #ReferenceLabel#, Clear and Submit Changes, then Edit this #LCase(request.ATSFindingName)# to reset the #ReferenceLabel#.</cfoutput>"></i>
> 										</cfif>
> 									</cfoutput>
> 							<!---</CFIF> --->
> 						<CFELSE>
> 							<CFOUTPUT>
>
> ```
> ```
> 										INEMAIL="#!bManage#"
> 										approvedExtensions="#api.go.getsetupvar(var='attachmentsAllowedFileExtensions', default='')#"
> 										INFOTEXT="#InfoText#"/>
> 									<!--- 06/19/04 --->
> 									<CFIF ATS_CAPA_ENABLED IS true AND ID IS NOT "">
> 										<BR><DIV class="mediumtext"><SCRIPT>document.write('<cfoutput>#Translator.JSTranslate("To add/edit attachments, click on the 'Submit Changes' button and use the 'Attach' link on the following page.")#</cfoutput>');</SCRIPT>
> 										</DIV>
> 									</CFIF>
> 									<DIV ID="replicateAttachment" STYLE="display:none">
> 									#Translator.translate("Copy over the existing attachments with this #request.ATSFindingName#?")#
> 										<label for="replicateAttachment1"><INPUT TYPE="Radio" NAME="replicateAttachmentFile" id="replicateAttachment1" VALUE="true" CHECKED> #Translator.translate("Yes")#</label>
>
> ```
> ```
> 			</CFIF>
>  
>  
> 				<CFIF bBlockEdit IS true>
> 					<cfmodule template="#request.Library.CustomTags.VirtualPath#buttonmabob.cfm"
> 						buttontext="#Translator.Translate("Submit Changes")#"<!---Submit Changes--->
> 						ONCLICK="javascript:return 1;"
> 						helptext="#Translator.Translate("This #request.ATSFindingName# is locked and cannot be modified.")#"
> 						helpwidth="200" DISABLED="true"></cfmodule>&nbsp;
>  
>  
> 				<CFELSE>
> 					<CFMODULE TEMPLATE="#request.Library.CustomTags.VirtualPath#OfflineMode/#variables.offlineModeFile#.cfm"
> 						ACTION="Submit"
> 						OFFLINENAME="#sApplication#"
> 						VALUE="#Translator.Translate("Submit Changes")#"<!---Submit Changes--->
> 						APPNAME="#AppName#"
> 						FILENAME="#sFileName#"
> 						buttonClass="btn-secondary mr-2"
> 						DISPLAYNAME="#AccessName# #AppName# #ID# #OName# #Loc# #Abr#"
> 						ID="SubmitButton"
>
> ```
> ```
> 			<TD ALIGN="center">
> 			<CFMODULE 
> 				TEMPLATE="#request.Library.CustomTags.VirtualPath#OfflineMode/#variables.offlineModeFile#.cfm"
> 				ACTION="Submit"
> 				OFFLINENAME="#sApplication#"
> 				VALUE="#Translator.Translate("Submit and Export to CI")#"<!---Submit Changes--->
> 				APPNAME="#AppName#"
> 				FILENAME="#sFileName#"
> 				DISPLAYNAME="#AccessName# #AppName# #ID# #OName# #Loc# #Abr#"
> 				ID="SubmitButton"
> 				VALIDATIONJS="check(document.addAudit, 'Edit')"
>
> ```
> ````
>
> MCP tool call
>
> sourcebot.search_code
>
> ```json
> {
>   "query": "draftID",
>   "filterByRepos": [
>     "code.gensuite.com/pm/audit"
>   ],
>   "filterByFilepaths": [
>     "audfinding.cfm"
>   ],
>   "includeCodeSnippets": true,
>   "maxTokens": 12000
> }
> ```
>
> ````text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/audfinding.cfm
> num_matches: 20
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
>
> ```
>   <cfif ListContainsNoCase(request.Permissions.AccessRights, variables.verifierRoleAssignmentSpecialRight, "|") gt 0>
>     <cfset variables.hasVerifierRoleAssignmentRight = true/>
>   </cfif>
> </cfif>
>  
> <cfset variables.isDraftIdPresentInUrl = false/>
> <cfif structKeyExists(url, "draftID") && url.draftID neq '' && isValid('integer',url.draftID)>
> 	<cfset variables.isDraftIdPresentInUrl = true/>
> 	<cfset variables.draftedTblAuditID = url.draftID>
> 	
> 	<!--- if permission level is not 3 then show tollgate for SW --->
> 	<cfif variables.isPermissTollgateRequiredForDraft and AccessLevel neq 3>
> 		<cfmodule template="#request.library.framework.virtualpath#tollgatemessage.cfm" type="error">
> 			<cfoutput>
>
> ```
> ```
> 	<CFSET variables.strRME = objAudit.getRMELeadNamesStruct(siteid="#siteid#") />
> </CFIF>
>  
> <CFSET StepCount = 0>
> <CFSET iID = ID>
> <cfset variables.draftID = "">
> <cfset variables.draftTitle = "">
> <CFIF ID IS "">
> 	<CFSET iID = FindingID>
> 	<cfif structKeyExists(URL, 'draftID') AND isValid('integer', URL.draftID)>
> 		<cfset variables.qDraftedAction = objAudit.getDraftedAction(draftID="#URL.draftID#") />
> 		<!--- <cfdump var="#variables.qDraftedAction#" abort> --->
> 		<cfset variables.draftID = URL.draftID>
> 		<cfset variables.draftTitle = variables.qDraftedAction.Title>
> 		<cfset iID = variables.qDraftedAction.ID >
>
> 		<!--- Added tollgate if iID value is blank --->
> 		<cfif iID eq ''>
>
> ```
> ```
> 		</div>
> 	</div>
> </cfif>
>
> <!--- Added note saying that few fields will not be saved as drafts --->
> <cfif structKeyExists(url,"draftID") AND len(url.draftID) AND url.draftID NEQ "">
> 	<div class="alert bg-active fade show mt-3">
> 		<cfoutput>
> 			#variables.Translator.Translate('Note: Equipment, Linked Action IDs, 5 Why Analysis fields, attachments in sub-corrective actions are not currently saved as drafts. This functionality is planned for a future update.')#
> 		</cfoutput>
> 	</div>
>
> ```
> ```
> <input type=hidden name="ID" Value="#ID#">
> <input type=hidden name="tblAuditID" Value="#variables.tblAuditID#">
> <input type=hidden name="OrigAuditDate" Value="#FD#">
> <input type=hidden name="ignoreCILock" Value="#ignoreCILock#">
> <input type=hidden name="readOnlyFieldsList" value="#variables.readOnlyFieldsList#">
> <input type=hidden name="draftID" id="draftID" value="#variables.draftID#">
> <input type=hidden name="draftedTitle" id="draftedTitle" value="#variables.draftTitle#">
> <input type=hidden name="draftedTblAuditID" id="draftedTblAuditID" value="#variables.draftedTblAuditID#">
> <cfif variables.enableDescribeItAI>
>     <input type="hidden" name="editorialAIResult" id="editorialAIResult" value="" />
> </cfif>
>
> ```
> ```
> 						VALIDATIONJS="#validationjs#"
> 						editorialAIResultElement="#editorialAIResultElement#"
>                         fieldName="atsSubmit"/>
> 				</cfif>
> 		<cfelse>
> 			<cfif !variables.isDraftIdPresentInUrl or !variables.isPreservedDraft>
> 				<cfparam name="AddFindingText" default="Add #request.ATSFindingName#">
> 				<CFMODULE TEMPLATE="#request.Library.CustomTags.VirtualPath#OfflineMode/#variables.offlineModeFile#.cfm"
> 				ACTION="Submit"
> 				OFFLINENAME="#sApplication#"
> 				VALUE="#Translator.Translate(AddFindingText)#"<!---Add Finding--->
>
> ```
> ````
>
> MCP tool call
>
> sourcebot.search_code
>
> ```json
> {
>   "query": "AppLookups/AppLookup.cfm",
>   "filterByRepos": [
>     "code.gensuite.com/pm/audit"
>   ],
>   "filterByFilepaths": [
>     "audfinding.cfm"
>   ],
>   "includeCodeSnippets": true,
>   "maxTokens": 12000
> }
> ```
>
> ````text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/audfinding.cfm
> num_matches: 2
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
>
> ```
> 					<!---This is just proof of concept/notes--->
> 					<!---<input type="hidden" name="multiRefAppID_1" value=""/>
> 					<input type="hidden" name="multiRefType_1"  value=""/>
> 					<input type="hidden" name="multiRefID_1"    value=""/>--->
> 					<div class="col-md-10">
> 						<cfmodule template="#request.library.customTags.virtualPath#AppLookups/AppLookup.cfm" leftRefType="tblAuditID" leftRefID="#variables.tblAuditID#" leftAppID="3" lookup="Event" mode="add/edit"/>
> 					</div>
> 				</cfoutput>
> 			</cfif>
>
> 			<cfset variables.linkedActions_enabled = api.go.getSetupVar(var="linkedActions_enabled",default=true)/>
>
> ```
> ```
> 							data-toggle="tooltip" 
> 							data-original-title="#Translator.translate(variables.linkedActions_helpText_translated)#"
> 							>
> 						</i></div>
> 					<div class="col-md-10">
> 						<cfmodule template="#request.library.customTags.virtualPath#AppLookups/AppLookup.cfm" leftRefType="tblAuditID" leftRefID="#variables.tblAuditID#" leftAltID="#ID#" leftAppID="3" lookup="Action" mode="add/edit" siteID="#locID#" currentRecordName="#request.atsFindingName#" formName="addAudit" linkText="Link Action" linkMoreText="Link Another" lookupModalInfoMessageTranslated="#variables.linkedActions_helpText_translated#"/>
> 					</div>
> 				</cfoutput>
>
> 				<!--- May want to figure out how to abstract this out in the future --->
> 				<cfif structKeyExists(form,"refData") and api.get('json').isJSONType(form.refData,"object")>
>
> ```
> ````
>
> MCP tool call
>
> sourcebot.search_code
>
> ```json
> {
>   "query": "card-header bg-primary",
>   "filterByRepos": [
>     "code.gensuite.com/pm/audit"
>   ],
>   "filterByFilepaths": [
>     "audfinding.cfm"
>   ],
>   "includeCodeSnippets": true,
>   "maxTokens": 12000
> }
> ```
>
> ````text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/audfinding.cfm
> num_matches: 11
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
>
> ```
> 		}
> 	</script>
> </cfif>
> <br>
> <div class="card mb-4"><!--- Finding Highlights Card --->
> 	<div class="card-header bg-primary" data-toggle="collapse" href="#highlights-collapse" role="button"><cfoutput>#FindingHighlightsLabel#</cfoutput></div>
> 	<div id="highlights-collapse" aria-expanded="true" class="collapse show">
>  
> 	<div class="card-block">
> 			<div class="form-group row">
> 				<cfset hideFindingDateClass = !len(trim(findingDateLabel))?'hideEl':""/>
>
> ```
> ```
> <cfparam name="variables.responsiblePersonHelpText" default="#Translator.Translate("Select person")# #Translator.Translate("Leading closure activity")# #Frequency# #Translator.Translate("E-mail is automatically sent to the Responsible Person.")#">
> <cfif structKeyExists(variables, "ResponPersonDescription") && len(trim(variables.ResponPersonDescription))>
> 	<cfset variables.responsiblePersonHelpText = variables.ResponPersonDescription/>
> </cfif>
> <div class="card mb-4"><!--- Responsibility --->
> 	<div class="card-header bg-primary" data-toggle="collapse" href="#responsibility-collapse" role="button"><cfoutput>#Translator.Translate("Responsibility")#</cfoutput></div>
> 	<div id="responsibility-collapse" aria-expanded="true" class="collapse show">
> 	<div class="card-block">
> 		<div class="form-group row">
> 			<cfparam name="variables.displayNone" default="">
> 			<cfset variables.displayNone = responsiblePersonLabel eq '' ? 'd-none' : ''>
>
> ```
> ```
> 	</div>
> </div>
>  
> <CFOUTPUT>#debugTime()#</CFOUTPUT>
> <div class="card mb-4 single-record" id="closure-priority-card"><!--- Closure Priority card --->
> 	<div class="card-header bg-primary" data-toggle="collapse" href="#closurePriority-collapse" role="button"><cfoutput>#Translator.Translate("#variables.closurePriorityLabel#")#</cfoutput></div>
> 	<div id="closurePriority-collapse" aria-expanded="true" class="collapse show">
> 	<div class="card-block">
> 		<div class="form-group row">
> 		<CFPARAM NAME="ClosureListText" DEFAULT="#Translator.Translate("To input a custom ##Date##, select a ##6## closure period, and set the ##Date2## as needed." ,ClosureDueDateLabel, SixthClosure, ClosureDueDateLabel)#">
> 		<CFSAVECONTENT VARIABLE="sClosureCategoryLabel">
>
> ```
> ```
> <cfif CorrectiveActionLabel is "">
> 	<CFSET bHIDE = true>
> </CFIF>
>  
>  <div class="card mb-4" id="finding-details-card"><!--- finding details card  --->
> 	<div class="card-header bg-primary" data-toggle="collapse" href="#findingDetails-collapse" role="button"><cfoutput>#Translator.Translate(variables.actionDetailsCardLabel)#</cfoutput></div>
> 	<div id="findingDetails-collapse" aria-expanded="true" class="collapse show">
> 	<div class="card-block">
> 				<div class="form-group">
> 					<div class="row">
> 		<cfif CitationLabel IS "" AND CostTracking IS NOT "Yes">
>
> ```
> ```
>  
> 		<CFOUTPUT>#debugTime()#</CFOUTPUT>
> 	<!--- 03/15/05 --->
>
> 	<div class="card mb-4" id="CAPA_card">
> 			<div class="card-header bg-primary"  data-toggle="collapse" href="#capa-collapse" role="button">
> 				<cfoutput>#Translator.Translate(CAPALabel)#</cfoutput>
> 			</div>
> 		<div id="capa-collapse" aria-expanded="true" class="collapse show">
> 		<div class="card-block">
> 			<div class="row form-group">
>
> ```
> ```
> 	<INPUT NAME="Status" VALUE="OPEN" TYPE="Hidden" id="Status">
> <CFELSE>
> <!--- 04/23/03 --->
> <CFOUTPUT>#debugTime()#</CFOUTPUT>
> <div class="card mb-4">
> 	<div class="card-header bg-primary"  data-toggle="collapse" href="#findingClosure-collapse" role="button">
> 		<cfoutput>#Translator.Translate("#request.ATSFindingName# Closure")#</cfoutput>: 
> 	</div>
> 	<div id="findingClosure-collapse" aria-expanded="true" class="collapse show">
> 	<div class="card-block">
> 		<div class="form-group row">
>
> ```
> ```
> 	--->
> 	<SPAN ID="Closure_Tab" STYLE="display: #sDisplay#;">
> 	<BR>
> 		#debugTime()#
> 		<div class="card mb-4 <cfif (ClosureVerificationLabel is '') or ((ScheduledVerificationDateLabel is '') and (ClosureVerificationByLabel is ''))>d-none</cfif>">
> 			<div class="card-header bg-primary" data-toggle="collapse" href="##closureVerify-collapse" role="button">
> 				#Translator.Translate(closureVerificationLabel)#
> 			</div>
> 	<div id="closureVerify-collapse" aria-expanded="true" class="collapse show">
> 		<div class="card-block">
> 			<div class="form-group row">
>
> ```
> ```
> 	<cfif qAttach.RecordCount GTE 1>
> 		
> <CFOUTPUT>#debugTime()#</CFOUTPUT>
>
> 	<div class="card mb-4">
> 		<div class="card-header bg-primary" data-toggle="collapse" href="#copyattach-collapse" role="button"><cfoutput>#translator.translate("Copy File attachments")#</cfoutput></div>
> 			<div id="copyattach-collapse" aria-expanded="true" class="collapse show">
> 				<div class="card-block">
> 					<table>
> 					<cfoutput query="qAttach">
> 						<cfset displayRow = "">
>
> ```
> ```
> </cfif>
> <cfif variables.isMultipleApprovalsActive eq true>
> 	<cfset qGetPeople=Lookup.getLtbContacstByRight(AppName=request.ATSAppName, SpecialRight=CAPA_SpecialRight, OrgName=oname, Location=Loc, OrgContactsOnly=OrgContactsOnly)>
> 	<div id="multiple_approvals" class="gs" style="margin-top:5px;">
> 		<div class="card  mb-4">
> 			<div class="card-header bg-primary" data-toggle="collapse" href="#approval-collapse" role="button"><cfoutput>#translator.translate("Approvals")#</cfoutput></div>
> 			<div class="approval-collapse" aria-expanded="true" class="collapse show">
> 				<div class="card-block" id="multiple_approvals_container">
> 					<cfif StructKeyExists(url, "id") && IsValid("integer", url.id)>
> 						<cfif queryApprovalsSetup.recordCount gt 0>
> 							<cfoutput>
>
> ```
> ```
> 								<!---<form name="RepSiteFilterForm" id="RepSiteFilterForm">--->
> 									<CFPARAM NAME="SiteRegionLabel" DEFAULT="World Region">
>                                     <CFPARAM NAME="SiteCountryLabel" DEFAULT="Country">
>
> 									<div class="card mb-4" id="RepSiteFilterCard">
> 										<div class="card-header bg-primary" data-toggle="collapse" href="##RepSiteFilterPanel" role="button" aria-expanded="false">
> 											<span data-filtertext="true"></span>
> 										</div>
> 										<div id="RepSiteFilterPanel" class="collapse show">
> 											<div class="card-block">
> 												<cfset variables.siteQry = api.get('siteLookup').getSiteQry()/>
>
> ```
> ```
> 	<cfparam name="ServerLocation" default = "Cincinnati, OH, USA">
> 	
> 	<CFSET variables.historyTable = ArrayNew(1)>
>
> 	<div class="card">
> 		<div class="card-header bg-primary" data-toggle="collapse" aria-expanded="false" href="#historyUpdate-collapse" role="button">
> 			<cfoutput>
> 				#Translator.Translate("#request.ATSFindingName# Update History")#
> 			</cfoutput>
> 			<!---<i class="ml-1 fa fa-question-circle text-secondary"  data-html="true" role="button" data-toggle="tooltip" data-original-title="<cfoutput>#Translator.Translate('Server timestamps recorded below are ##ServerTimeZone## (##ServerLocation##) and incorporate applicable Daylight Savings Time adjustments.', ServerTimeZone, ServerLocation)#</cfoutput>"></i>--->
> 			<cfif len(enhancedActionHistoryLabel)>
>
> ```
> ````
>
> MCP tool call
>
> sourcebot.search_code
>
> ```json
> {
>   "query": "Delete Finding",
>   "filterByRepos": [
>     "code.gensuite.com/pm/audit"
>   ],
>   "filterByFilepaths": [
>     "audfinding.cfm"
>   ],
>   "includeCodeSnippets": true,
>   "maxTokens": 12000
> }
> ```
>
> ```text
> No results found for the query: "Delete Finding" (repo:code\.gensuite\.com/pm/audit) (file:audfinding\.cfm)
> ```
>
> MCP tool call
>
> sourcebot.search_code
>
> ```json
> {
>   "query": "Reject Closure",
>   "filterByRepos": [
>     "code.gensuite.com/pm/audit"
>   ],
>   "filterByFilepaths": [
>     "audfinding.cfm"
>   ],
>   "includeCodeSnippets": true,
>   "maxTokens": 12000
> }
> ```
>
> ````text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/audfinding.cfm
> num_matches: 3
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
>
> ```
> 		} else if (step == 'prompt') {
> 			if (btn == 'ok' && Trim(text) != '') {
> 			var rejectComment = text.substring(0,250);
>  
> 				<!--- 
> 					return confirm('Reject closure of this audit finding? OK to Confirm Rejection of Closure; or Cancel.') 
> 					TODO: this pop-up loops, is that okay?
> 				--->
> 				Ext.MessageBox.confirm(
> 					'Confirm'
> 					,'<cfoutput>#ListFirst(Translator.JSTranslate("Reject closure of this #LCase(request.ATSAuditName)# #LCase(request.ATSFindingName)#? OK to Confirm Rejection of Closure; or Cancel."), "?")#</cfoutput>?'
> 					,function (btn){ 
> 						RejectFinding(oForm, 'confirm', btn, rejectComment)
> 		}
> 				);
> 			} else {
>
> ```
> ```
> 		<CFSET Display = "none">
> 	</CFIF>
> 		<CFOUTPUT>
> 		<TD ID="Reject" STYLE="display: #Display#;" ALIGN="center">
> 		</CFOUTPUT>
> 			<cfif RejectCAPA eq "yes"><cfset buttontext ="C&C Rejected"><cfelse><cfset buttontext ="Reject Closure"></cfif>
>  
> 			 <button ONCLICK="this.form.VerifyDate.value=''; if (check(this.form)) RejectFinding(this.form);" class="btn btn-secondary" type="button"><cfoutput>#Translator.Translate(buttontext)#</cfoutput></button>
> 		</TD>
> 		<TD ALIGN="center">
> 			<cfparam name="cancelAction" default="self.close();">
>
> ```
> ````
>
> MCP tool call
>
> sourcebot.search_code
>
> ```json
> {
>   "query": "replicate",
>   "filterByRepos": [
>     "code.gensuite.com/pm/audit"
>   ],
>   "filterByFilepaths": [
>     "audfinding.cfm"
>   ],
>   "includeCodeSnippets": true,
>   "maxTokens": 12000
> }
> ```
>
> ````text
> file: https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/audfinding.cfm
> num_matches: 175
> repo: code.gensuite.com/pm/audit
> language: ColdFusion
>
> ```
> <cfparam name="Crit" default="no">
> <cfparam name="UTF8" default="no">
> <CFPARAM NAME="bRootCauseDropDowns" DEFAULT="true">
> <CFPARAM NAME="ClosureDueDateMessage" DEFAULT="">
> <cfparam name="multiSiteReplicationEnabled" default="#api.go.getSetupVar(var="multiSiteReplicationEnabled",default=true)#">
> <cfparam name="variables.replicateSiteLimit" default="#api.go.getSetupVar(var="replicateSiteLimit",default=125)#">
>  
> <!---SSTPC Customizations--->
> <cfparam name="FindingHighlightsLabel" default="#request.ATSFindingName# Highlights">
> <cfset FindingHighlightsLabel = Translator.Translate(FindingHighlightsLabel)>
> <cfparam name="DefaultClosureCategory" default="">
>
> ```
> ```
> <cfset variables.siteLeadLabel = api.go.getSetupVar(var="siteLeadLabel", default="Site Lead") />
> <cfset variables.atsSiteLeadLabel = api.go.getSetupVar(var="ats_SiteLeadLabel", default=variables.siteLeadLabel) />
> <cfset variables.MgrLabel = api.go.getSetupVar(var="MgrLabel", default="Manager") />
> <cfset variables.opsLeadLabel = api.go.getSetupVar(var="opsMgrLabel", default="Ops Lead") />
>
> <cfset variables.subCaReplicateLimit = api.go.getSetupVar(var="subCaReplicateLimit", default="5")>
>
> <!--- Log Custom History Params --->
> <cfparam name="form.findingCatChanged" default="false">
> <cfparam name="form.findingCatPrev" default="">
> <cfparam name="form.findingCatUpdated" default="">
>
> ```
> ```
> 				submitAlert('<cfoutput>#Translator.JSTranslate("#responsiblePersonLabel# must be different than #coResponPersonLabel# for the #LCase(request.ATSFindingName)#!")#</cfoutput>',inForm.coResponPerson);
> 		return false
> 	}
>   </cfif>
>
>   if($("#invalidReplicateEntries").length&& parseInt($("#invalidReplicateEntries").val())>0){
>   	var repInvalidMsg = "";
>   	if(parseInt($("#invalidReplicateEntries").val())===1){
>   		repInvalidMsg += "<cfoutput>There is an invalid entry marked for replication to other #SiteLabel#s</cfoutput>";
>   	} else {
>   		repInvalidMsg += "There are " + $("#invalidReplicateEntries").val() + " invalid entries marked for replication to other <cfoutput>#SiteLabel#s</cfoutput>";
>   	}
>   	submitAlert(atsJSTranslator.translate(repInvalidMsg));
>   	return false;
>   }
>
>
> ```
> ```
> 				return 1;
>  
> 			var tempArray = List.split(Delimiter);
> 			return tempArray.length;
> 		}
> 		// Code for Replicate window
> 		var bDragging = false;
> 		var oDrag;
> 		var iXOffset = 0;
> 		var iYOffset = 0;
> 		var iTop = 0;
>
> ```
> ```
>
> 				}
>
>
>
> 		var customGroupSitesResolveUrl = <CFOUTPUT>'#request.DOMAINPROTOCOL##request.DOMAINURL##AuditHome#replicateSites.cfm?resolveCustomGroupSites=1<cfif structKeyExists(url,"publishSIC") AND url.publishSIC EQ "true">&publishSIC=true</cfif>'</CFOUTPUT>;
> 		var cgScopeDeniedMsg = '<cfoutput>#translator.jsTranslate("You do not have Level 3 permissions on every site in the selected custom group(s). Adjust your selection or contact your administrator.")#</cfoutput>';
>
> 		function getSelectedCustomGroupNames() {
> 			return $('.replicate-cg-name-cb:checked').map(function () {
> 				return $(this).val();
> 			}).get();
> 		}
>
> 		function isCustomGroupRpSelected() {
> 			return $('#DefaultRP_CG').is(':checked');
> 		}
>
> 		function updateReplicateCgCount() {
> 			$('#replicate-cg-selected-count').text($('.replicate-cg-name-cb:checked').length);
> 		}
>
> 		function replicateOnDefaultRpChanged() {
> 			var $btn = $('#SelectSiteButton');
> 			if (isCustomGroupRpSelected()) {
> 				$('#replicate-custom-group-panel').removeClass('d-none');
> 				$('#replicate-site-tree-wrap').addClass('d-none');
> 				$('#replicate-site-count-line').addClass('d-none');
> 				if ($btn.data('labelCg')) {
> 					$btn.text($btn.data('labelCg'));
> 				}
> 				updateReplicateCgCount();
> 			} else {
> 				$('#replicate-custom-group-panel').addClass('d-none');
> 				$('#replicate-site-tree-wrap').removeClass('d-none');
> 				$('#replicate-site-count-line').removeClass('d-none');
> 				if ($btn.data('labelTree')) {
> 					$btn.text($btn.data('labelTree'));
> 				}
> 				if (typeof myTree === 'undefined' || !myTree) {
> 					if ($('#selectSiteModal').hasClass('show')) {
>
> ```
> ```
> 						TreeLoaded = false;
> 						createTree();
> 						LoadTree();
> 					}
> 				} else {
> 					replicateCustomGroupScheduleReload();
> 				}
> 			}
> 		}
>
> 		function buildCgResolutionForReplicate(resolvedSiteRows) {
> 			var uniqueSiteIdsInOrder = [];
> 			var groupNamesBySiteIdKey = {};
> 			var pathBySiteIdKey = {};
> 			_.each(resolvedSiteRows, function (row) {
> 				var siteIdKey = String(row.siteId);
>
> ```
> ```
> 				siteIDOrder: uniqueSiteIdsInOrder.join(','),
> 				meta: metaBySiteId
> 			};
> 		}
>
> 		function postReplicateSitesForm(triggerElement, $replicateContentContainer, siteIdList, optionalPostFields) {
> 			optionalPostFields = optionalPostFields || {};
> 			var $defaultResponsiblePersonRadios = $(triggerElement.form).find('input[name="DefaultRP"]');
> 			var selectedDefaultRpRole = $defaultResponsiblePersonRadios.filter(':checked').val() || $defaultResponsiblePersonRadios.first().val() || '';
> 			<cfif len(trim(auditorLabel)) >
> 			var replicateAuditor = document.getElementById('ContactPerson').value;
> 			<cfelse>
> 			var replicateAuditor = '';
> 			</cfif>
> 			var replicateAuditDate = document.getElementById('AuditDate').value;
> 			var closureCategory = document.getElementById('closureList').value;
> 			var siteIdListCommaSeparated = Array.isArray(siteIdList) ? siteIdList.join(',') : String(siteIdList);
> 			<cfoutput>
> 			var replicateFormUrl = '#request.DOMAINPROTOCOL##request.DOMAINURL##AuditHome#replicateSites.cfm?replicateForm=yes&loc=#EncodeForURL(loc)#&oname=#EncodeForURL(oName)#&defaultRP=' + encodeURI(selectedDefaultRpRole) + '&replicateAuditor=' + encodeURI(replicateAuditor) + '&replicateAuditDate=' + encodeURIComponent(replicateAuditDate) + '&replicateClosureCategory=' + encodeURIComponent(closureCategory);
> 			</cfoutput>
> 			$replicateContentContainer.html('').addClass('loading');
> 			$.post(
> 				replicateFormUrl,
> 				$.extend({ siteIDList: encodeURIComponent(siteIdListCommaSeparated) }, optionalPostFields),
> 				function (responseHtml) {
> 					$replicateContentContainer.removeClass('loading').html(responseHtml);
> 					GS.fn.initComponents();
> 				}
> 			);
> 			document.getElementById('updateReplicateBtn').disabled = false;
> 			$('#replicate-tab a:last').tab('show');
> 			$('#SelectSiteButton').prop('disabled', false);
> 		}
>
> 		function createTree(){
>
>
> 			var treeURL = <CFOUTPUT>'replicateSites.cfm?getAllSites=true&OName=#EncodeForURL(oname)#&Loc=#EncodeForURL(loc)#&BusLabel=#EncodeForURL(variables.busLabel)#'</CFOUTPUT>+
> 			'&region='+_.trim($('#site_world_region').val())+'&country='+_.trim($('#site_country').val())
>
> 			Ext.onReady(function(){
>  
> 				var Tree = Ext.tree;
>
> ```
> ```
> 					LoadTree();
> 				});
> 			});
> 		}
>
> 		function replicateCustomGroupScheduleReload() {
> 			if (isCustomGroupRpSelected()) {
> 				return;
> 			}
> 			window.requestAnimationFrame(function () {
> 				window.requestAnimationFrame(function () {
>
> ```
> ```
> 				});
> 			});
> 		}
>
> 		$(function () {
> 			$(document).on('change', '.replicate-cg-name-cb', updateReplicateCgCount);
> 			$('#RepSiteShowDataButton').on('click', function () {
> 				if (isCustomGroupRpSelected()) {
> 					if (getSelectedCustomGroupNames().length === 0) {
> 						GS.fn.alert('<cfoutput>#translator.jsTranslate("Please select at least one custom group.")#</cfoutput>');
> 						return;
>
> ```
> ```
>  
> 				if (!bClear)
> 					bClear = false;
>  
> 				if (closeOnly) {
> 					/*$("table#replicateTable .datepicker").each(function(i,v){
> 						$(v).val(moment($(v).attr("value")).format("DD-MMM-YYYY")).trigger("change");
> 					});*/
> 					$("table#replicateTable .gsContactSearch-rendered").each(function(i,v){
> 						$(v).children("option").each(function(j,w){
> 							if($(w).attr("selected")=="selected"){
> 								$(v).val($(w).val()).trigger("change");
> 							}
> 						})
> 					})
> 					$("table#replicateTable .replicateClosure").each(function(i,v){
> 						$(v).val($("#" + $(v).prop("id") + "_firstVal").val());
> 					})
>
> 					//ClearScroll();
> 					//obj.style.display='none';
>  					if($(".replicateSitesFirstValue").length>0){
> 						//$('#selectSiteModal').modal('hide');
> 					} else {
> 						HideScrollDiv(true);
> 					return;
> 					}
> 				} else {
> 					$("table#replicateTable select.replicateClosure").each(function(i,v){
> 						if($("#" + $(v).prop('id') + "_firstVal").length>0){
> 							$("#" + $(v).prop('id') + "_firstVal").remove();
> 							saveFirstVal($(v));
> 						}
> 					});
>
> ```
> ```
> 						}
> 						myTree.collapseAll();
> 					}
>
> 					//ClearScroll();
> 					$('#replicate-content').html("");
> 				}
>  
> 				var iCount = ListLength(document.addAudit.selectedSiteIDList.value);
>  
> 				if (iCount > 0){
> 					// IF CURRENT SITE SELECTED... DO NOT INCLUDE IN LOOP
> 					var sitesList = _.filter($('#selectedSiteIDList').val().split(','), function(replicateSiteID) { 
> 						return replicateSiteID!=GS.data.scope.siteID
> 					});
> 					var invalidCount = 0;
> 					for(i=0;i<sitesList.length;i++){
> 						if($('#replicateRespPerson'+sitesList[i]+' option:selected').length  == 0){
> 								GS.fn.alert('Select a Responsible Person');
> 								$('#replicateRespPerson'+sitesList[i]).focus();
> 								invalidCount++;
> 						}
>  
> 						<cfif AuditorRequired eq true>
> 							if($('#replicateContactPerson'+sitesList[i]+' option:selected').length  == 0){
> 									GS.fn.alert('Select a Contact Person');
> 									$('#replicateContactPerson'+sitesList[i]).focus();
> 									invalidCount++;
> 							}
> 						</cfif>
>
> 						if(!moment($('#replicateAuditDate'+sitesList[i]).val(),'DD-MMM-YYYY').isValid()){
> 								GS.fn.alert('Select a <cfoutput>#request.ATSFindingName#</cfoutput> Date');
> 								$('#replicateAuditDate'+sitesList[i]).focus();
> 								$('#replicateAuditDate'+sitesList[i]).css("background-color","yellow");
> 								setTimeout(function() {
> 												$('#replicateAuditDate'+sitesList[i]).css( "background-color","", 1500 );
> 											}, 1000 );
>  
> 								invalidCount++;
> 						}
> 						if($('#replicateClosureList'+sitesList[i]).val() == ''){
> 							GS.fn.alert('Select a Closure Category');
> 							$('#replicateClosureList'+sitesList[i]).focus();
> 							invalidCount++;
> 						}
> 					}
> 					<cfoutput>
> 						sMessage = iCount + ' #sitelabel#';
>
> ```
> ```
> 					</cfoutput>
> 					if (iCount > 1){
> 						sMessage += 's';
> 					}
> 					sMessage += ' selected for <cfoutput>#Lcase(request.ATSFindingName)#</cfoutput>'
>                     if($('#replicateSubCaCheckbox').prop('checked')){
>                         sMessage += ' and <cfoutput>#Lcase(SubCorrectiveLabel)#</cfoutput>'
>                     }
>                     sMessage += ' replication.'
> 					$('#SelectedSiteCount').html(sMessage);
> 					$('#replicateAttachment').show();
>  
> 				}else{
> 					$('#SelectedSiteCount').html('');
> 				}
>  
> 				//var obj = document.getElementById('selectSite');
> 				//obj.style.display='none';
>
> 				if(invalidCount>0){
> 					$("#replicateTable").after("<input value='" + invalidCount + "' id='invalidReplicateEntries' type='hidden'></input>")
> 					return false;
> 				} else {
> 					$("#invalidReplicateEntries").remove();
> 				$('#selectSiteModal').modal('hide');
> 			}
> 			}
>
> 			function saveFirstVal(selEle){
> 				if(!$("#" + $(selEle).prop('id') + "_firstVal").length){
> 					$(selEle).after("<input type='hidden' class='replicateSitesFirstValue' id='" + $(selEle).prop('id') + "_firstVal' value='" + $(selEle).val() + "'/>")
> 				}
> 			}
>  
> 			var sitesSelected = 0;
> 			
> 			var limitedSites = parseInt("<cfoutput>#variables.replicateSiteLimit#</cfoutput>");
> 			if(isNaN(limitedSites))limitedSites = 125;
> 			
> 			function findChecked (){
> 				var aSelected = [];
> 				//var a = myTree.value;
>
> ```
> ```
> 				}
> 				TreeLoaded = true;
> 			}
>  
> 			function ShowSelected(triggerElement){
> 				var $replicateContentContainer = $("#replicate-content");
> 				var enableSelectSiteButton = function () {
> 					$('#SelectSiteButton').prop('disabled', false);
> 				};
> 				$('#SelectSiteButton').prop('disabled', true);
>
> 				if (isCustomGroupRpSelected()) {
> 					var cgEmptyMsg = '<cfoutput>#encodeForHTML(translator.translate("No sites listed for the selected custom group."))#</cfoutput>';
> 					var showCgEmptySecondTab = function () {
> 						triggerElement.form.selectedSiteIDList.value = '';
> 						$replicateContentContainer.removeClass('loading').html('<p class="text-muted mb-0 p-2">' + cgEmptyMsg + '</p>');
> 						$('#replicate-tab a:last').tab('show');
> 						$('#SelectSiteButton,#updateReplicateBtn').prop('disabled', false);
> 					};
> 					var selectedGroupNames = getSelectedCustomGroupNames();
> 					if (selectedGroupNames.length === 0) {
> 						enableSelectSiteButton();
> 						GS.fn.alert('<cfoutput>#translator.jsTranslate("Please select at least one custom group.")#</cfoutput>');
> 						return false;
> 					}
> 					$replicateContentContainer.html('').addClass('loading');
> 					$.ajax({
> 						type: 'post',
> 						url: customGroupSitesResolveUrl,
> 						data: { groupNamesJson: JSON.stringify(selectedGroupNames) },
> 						dataType: 'json'
> 					}).done(function (resolveResponse) {
> 						if (resolveResponse && resolveResponse.error === 'scope_denied') {
> 							$replicateContentContainer.removeClass('loading').empty();
> 							enableSelectSiteButton();
> 							GS.fn.alert(cgScopeDeniedMsg);
> 							return;
> 						}
> 						var resolvedSiteRows = (resolveResponse && resolveResponse.siteRows) || [];
> 						if (!resolveResponse || resolveResponse.ok !== true || !resolvedSiteRows.length) {
> 							showCgEmptySecondTab();
> 							return;
> 						}
> 						var resolution = buildCgResolutionForReplicate(resolvedSiteRows);
> 						var targetSiteIdList = _.filter(resolution.siteIds, function (siteId) {
> 							return String(siteId) !== String(GS.data.scope.siteID);
> 						});
> 						if (targetSiteIdList.length > limitedSites) {
> 							enableSelectSiteButton();
> 							GS.fn.alert('<cfoutput>#translator.jsTranslate("Please select fewer than ##replicateSiteLimit## Sites",variables.replicateSiteLimit)#</cfoutput>');
> 							return;
> 						}
> 						if (targetSiteIdList.length === 0) {
> 							showCgEmptySecondTab();
> 							return;
> 						}
> 						var metaForReplicateForm = _.pick(resolution.meta, targetSiteIdList.map(String));
> 						triggerElement.form.selectedSiteIDList.value = targetSiteIdList.join(',');
> 						postReplicateSitesForm(triggerElement, $replicateContentContainer, targetSiteIdList, {
> 							siteIDOrder: targetSiteIdList.join(','),
> 							replicateCustomGroupMeta: JSON.stringify(metaForReplicateForm)
> 						});
> 					}).fail(function () {
> 						showCgEmptySecondTab();
> 					});
> 					return;
>
> ```
> ```
> 					return siteId != GS.data.scope.siteID;
> 				});
>
> 				if (targetSiteIdList != '' && targetSiteIdList.length <= limitedSites) {
> 					triggerElement.form.selectedSiteIDList.value = targetSiteIdList.join(',');
> 					postReplicateSitesForm(triggerElement, $replicateContentContainer, targetSiteIdList, {});
> 				} else if (targetSiteIdList.length > limitedSites) {
> 					enableSelectSiteButton();
> 					GS.fn.alert('<cfoutput>#translator.jsTranslate("Please select fewer than ##replicateSiteLimit## Sites",variables.replicateSiteLimit)#</cfoutput>');
> 					
> 					return false;
> 				} else {
> 					enableSelectSiteButton();
> 					GS.fn.alert('<cfoutput>#translator.jsTranslate("No #siteLabel# has been selected. Please select at least one #siteLabel# to continue.")#</cfoutput>');
>
> ```
> ```
> 				$('#' + ats.lockdownFields[i]).attr('disabled','true');
> 				$('#' + ats.lockdownFields[i]).after('<br><span style="color:red; font-size:10px;">Note: Closure Category/Due Date can only be updated by someone with the Business Administrator special right from Action Tracking System. Please contact your Gensuite Business Administrator for assistance.</span>');
> 			}
> 		</cfif>
>  
> 		$('#replicateAttachment').hide();
> 		var replicateModalIsRendered = false;
> 		$('#multipleSitesLink').click(function(){
> 				if(replicateModalIsRendered==false){
> 					if (!isCustomGroupRpSelected()) {
> 						createTree();
> 						LoadTree();
> 					}
> 					replicateModalIsRendered = true;
> 				}
> 				replicateOnDefaultRpChanged();
> 				if(document.getElementById('selectedSiteIDList').value == ''){				  
> 				document.getElementById('updateReplicateBtn').disabled = true;				
> 				} 
> 				$('#selectSiteModal').modal({backdrop:"static",keyboard:false,show:true});
> 		});
>
> 		$("#close-selectSiteModal").off();
>
> ```
> ```
>  
>  	 #selectSiteModal{
>     	z-index: 9000;
>     }
>
> 	#replicate-content {
> 		overflow-x: auto;
> 		max-width: 100%;
> 	}
>
> 	.ActiveWindow
>
> ```
> ```
> 		text-align: left;
> 	}
>
>     #responsiblePersons ul,ol,ul {list-style:square;}
>
> 	#replicate-custom-group-panel .replicate-cg-tree-shell {
> 		position: relative;
> 	}
>
> 	#replicate-custom-group-panel .replicate-cg-scroll {
> 		box-sizing: border-box;
> 		width: 98%;
> 		height: 200px;
> 		overflow-x: hidden;
> 		overflow-y: auto;
>
> ```
> ```
> 		border: 1px solid #333333;
> 		background-color: #ffffff;
> 		padding: 6px 8px;
> 	}
>
> 	#replicate-custom-group-panel .replicate-cg-scroll .form-check {
> 		position: relative;
> 		display: flex;
> 		align-items: flex-start;
> 		gap: 0.35rem;
> 		min-height: 1.35rem;
>
> ```
> ```
> 		margin-bottom: 0.2rem;
> 		padding-left: 0;
> 		list-style: none;
> 	}
>
> 	#replicate-custom-group-panel .replicate-cg-scroll .form-check:last-child {
> 		margin-bottom: 0;
> 	}
>
> 	#replicate-custom-group-panel .replicate-cg-scroll .form-check-input {
> 		position: static;
> 		float: none;
> 		flex-shrink: 0;
> 		margin-top: 0.15rem;
> 		margin-left: 0;
> 	}
>
> 	#replicate-custom-group-panel .replicate-cg-scroll .form-check-label {
> 		flex: 1;
> 		min-width: 0;
> 		padding-left: 0;
> 		word-break: break-word;
> 	}
>
> 	#replicate-custom-group-panel .replicate-cg-footer-line {
> 		width: 98%;
> 	}
>
> 	.ActiveHeader{
> 		background-color:activecaption;
>
> ```
> ```
> 									<!--- 06/19/04 --->
> 									<CFIF ATS_CAPA_ENABLED IS true AND ID IS NOT "">
> 										<BR><DIV class="mediumtext"><SCRIPT>document.write('<cfoutput>#Translator.JSTranslate("To add/edit attachments, click on the 'Submit Changes' button and use the 'Attach' link on the following page.")#</cfoutput>');</SCRIPT>
> 										</DIV>
> 									</CFIF>
> 									<DIV ID="replicateAttachment" STYLE="display:none">
> 									#Translator.translate("Copy over the existing attachments with this #request.ATSFindingName#?")#
> 										<label for="replicateAttachment1"><INPUT TYPE="Radio" NAME="replicateAttachmentFile" id="replicateAttachment1" VALUE="true" CHECKED> #Translator.translate("Yes")#</label>
> 										<label for="replicateAttachment2"><INPUT TYPE="Radio" NAME="replicateAttachmentFile" id="replicateAttachment2" VALUE="false" > #Translator.translate("No")#</label>
> 									</DIV>
> 								</cfoutput>
> 							</div>
> 					</cfif> 
> 				</CFIF>
>
> ```
> ```
>  
> <cfif multiSiteReplicationEnabled>
> 	<cfset variables.customRPRoles =  go.getSetupVar(var="ats_rpRoles",default="")/>
> 	<cfset variables.restrictedSIRreplicationtoATSForCg = api.go.getSetupVar(var="restrictedSIRreplicationtoATS",default=false,appid='10')/>
> 	<cfset variables.publishSICForCg = structKeyExists(url,"publishSIC") AND url.publishSIC EQ "true"/>
> 	<cfset variables.qReplicateCustomGroups = createObject("component", "#Library.CFC.DotPath#.apps.smt.CustomGroup_SMT").filterCustomGroupsBySiteScope(
> 		seedFromGroupList = true,
> 		accessName = request.user.accessName,
> 		appName = request.app.appName,
> 		dsn = ODBC,
> 		restrictedSIRreplicationtoATS = variables.restrictedSIRreplicationtoATSForCg,
>
> ```
> ```
> 	<cfoutput>
> 		<div class="modal fade" id="selectSiteModal">
> 			<div class="modal-dialog modal-lg" role="document">
> 				<div class="modal-content">
> 					<div class="modal-header bg-primary">
> 						<h5>#Translator.translate("Replicate #request.ATSFindingName# to Multiple #SiteLabel#s")#</h5>
> 						<button id="close-selectSiteModal" type="button" class="close" data-dismiss="modal" aria-label="Close">
> 						  <span aria-hidden="true">&times;</span>
> 						</button>
> 					</div>
> 					<div class="modal-body">
> 						
> 						<ul class="nav nav-tabs" id="replicate-tab">
> 							  <li class="nav-item">
> 								<a class="nav-link active" data-toggle="tab" role="tab" href="##scope-tab">#translator.translate("Scope")#</a>
> 							  </li>
> 							  <li class="nav-item">
> 								<a class="nav-link" data-toggle="tab" role="tab" href="##sites-tab">#translator.translate("Selected #sitelabel#(s)")#</a>
>
> ```
> ```
> 												</div>
> 												<cfif variables.EnableSubCorrectiveActions>
>                                                     <div class="row">
>                                                         <div class="col-12">
>                                                             <div class="form-check-label">
>                                                                 <label class="col-form-label" for="replicateSubCaCheckbox">
>                                                                     <input class="form-check-input" type="checkbox" value="" id="replicateSubCaCheckbox">
> 																	#translator.translate("Replicate")# #translator.translate(SubCorrectiveLabel)# <span class="replicateSCAcount"></span>
> 																	<i class="subCaWarning ml-1 fa fa-question-circle text-danger pointer" data-placement="right" data-html="true" role="button" data-toggle="tooltip" 
> 																		data-original-title="#translator.translate('Please note, only the first #variables.subCaReplicateLimit# #SubCorrectiveLabel#s will be replicated')#" tabindex="0"></i>
>                                                                 </label>
>                                                             </div>
>                                                         </div>
>                                                     </div>
>                                                 </cfif>
>
> ```
> ```
> 									</label>
> 									<label for="DefaultRP3">
> 										<INPUT TYPE="Radio" NAME="DefaultRP" id="DefaultRP3" VALUE="OPS_Manager" <CFIF TDRP EQ "OPS_Manager">CHECKED</cfif> ONCLICK="DefaultRPClick(this, 'an Ops Leader');">
> 										#translator.translate(variables.opsLeadLabel)#
> 									</label>
> 								    <cfif api.go.getSetupVar(var="replicateSiteCompLeadOption",default=false)>
>                                         <label class="form-check-label" for="DefaultRP4">
>                                             <INPUT class="form-check-input" TYPE="Radio" NAME="DefaultRP" id="DefaultRP4" VALUE="Compliance_Manager" <CFIF TDRP EQ "Compliance_Manager">CHECKED</cfif> ONCLICK="DefaultRPClick(this, 'a Compliance Lead');">
>                                             #translator.translate(api.go.getSetupVar(var="compLeadLabel" ,default="Compliance Lead"))#
>                                         </label>
>                                     </cfif>
> 									<label for="DefaultRP_CG">
> 										<input type="radio" name="DefaultRP" id="DefaultRP_CG" value="Custom_Group" <cfif TDRP EQ "Custom_Group">checked</cfif> onclick="DefaultRPClick(this);">
> 										#translator.translate("Custom Group")#
> 										<i class="fa fa-question-circle text-secondary ml-1 pointer replicate-cg-scope-help" data-placement="top" role="button" data-toggle="tooltip" tabindex="0" data-original-title="#encodeForHTMLAttribute(translator.translate('A Custom Group will appear only if the user has access to all sites included within that group. If the user does not have permission to even one associated site, the entire Custom Group will be hidden from the selection list.'))#"></i>
> 									</label>
> 				
> 									<div id="replicate-custom-group-panel" class="mt-2 mb-2 d-none">
> 										<div class="replicate-cg-tree-shell">
> 											<div class="replicate-cg-scroll">
> 												<cfloop query="variables.qReplicateCustomGroups">
> 													<div class="form-check mb-0">
> 														<input class="form-check-input replicate-cg-name-cb" type="checkbox" value="#encodeForHTMLAttribute(GROUPNAME)#" id="replicate_cg_cb_#variables.qReplicateCustomGroups.currentRow#">
> 														<label class="form-check-label" for="replicate_cg_cb_#variables.qReplicateCustomGroups.currentRow#">#encodeForHTML(GROUPNAME)#</label>
> 													</div>
> 												</cfloop>
> 											</div>
> 										</div>
> 										<div class="mt-1 extrasmalltext replicate-cg-footer-line">
> 											<span id="replicate-cg-selected-count">0</span>
> 											#translator.translate("Selected Custom Groups")#
> 										</div>
> 									</div>
> 									<cfif isStruct(variables.customRPRoles)&&!structIsEmpty(variables.customRPRoles)>
> 										<cfloop list="#structKeyList(variables.customRPRoles)#" index="roleArr">
>
> ```
> ```
>                                             <INPUT TYPE="Radio" class="subCaRadios" NAME="DefaultSubCaRpRole" id="DefaultSubCaRpRole3" VALUE="OPS_Manager">
>                                             #translator.translate(variables.opsLeadLabel)#
>                                         </label>
>                                     </div>
>                                 </cfif>
> 								<div id="replicate-site-tree-wrap">
> 									<div style="position:relative;">
> 										<div class="ext-ie" style="overflow-y:auto; height:200px; width:98%; text-align:left; border:1px solid black; padding: 5,5,5,5;" id="tree"></div>
> 										<iframe src="<CFOUTPUT>#request.iFrameSource#</CFOUTPUT>" id="TreeLoader" style="display:none;"></iframe>
> 									</div>
> 								</div>
> 								<div id="replicate-site-count-line" style="font-size: 16px;" class="d-inline pull-left pl-2"><span class="siteCount">0</span> #translator.translate("Selected Sites")#: <i class="fa-2x- fa fa-question-circle text-secondary pointer ml-1 siteListToolTip" data-toggle="tooltip"
> 								data-title="" tabindex="0" data-original-title="" title=""></i></div>
> 								<button style="float:right;margin-right:5px;margin-top:2px;" type="button" class="btn btn-secondary" id="SelectSiteButton" onclick="ShowSelected(this);"
> 									data-label-tree="#encodeForHTMLAttribute(translator.translate('Select #siteLabel#s'))#" data-label-cg="#encodeForHTMLAttribute(translator.translate('select sites'))#"><cfoutput>#translator.translate("Select #SiteLabel#s")#</cfoutput></button>
> 							</div><!--- ends tab scope --->
> 							<div class="tab-pane" id="sites-tab" role="tabpanel">
> 								<label class="col-form-label" for="replicateSubCaCheckbox2" style="position: absolute;left: 73%;top: 0;">
> 									<input class="form-check-input" type="checkbox" value="" id="replicateSubCaCheckbox2">
> 									#translator.translate("Replicate")# #translator.translate(SubCorrectiveLabel)# <span class="replicateSCAcount"></span>
> 										<i class="subCaWarning ml-1 fa fa-question-circle text-danger pointer d-none" data-placement="right" data-html="true" role="button" data-toggle="tooltip" data-original-title="#translator.translate('Please note, only the first #variables.subCaReplicateLimit# #SubCorrectiveLabel#s will be replicated')#" tabindex="0"></i>
>                                     </label>
> 								
> 								<div id="replicate-content"></div>
> 							</div>
> 						</div><!--- Ends tab content --->
> 					</div><!--- Ends Modal Body --->
> 					<div class="modal-footer">
> 						<button class="btn btn-default" onclick="HideScrollDiv(null,true);"		 type="button"><cfoutput>#translator.translate("Cancel")#</cfoutput></button>
> 						<button class="btn btn-default" onclick="HideScrollDiv(true);"					 type="button"><cfoutput>#translator.translate("Clear and Close")#</cfoutput></button>	
> 						<button class="btn btn-primary" onclick="HideScrollDiv();" id="updateReplicateBtn" type="button"><cfoutput>#translator.translate("Update")#</cfoutput></button>				
> 					</div><!---$('##close-selectSiteModal').trigger('click');--->
> 				</div>
> 			</div>
> 		</div>
> 		<cfif variables.EnableSubCorrectiveActions>
>
> ```
> ```
>             <script>
>                 var firstOpen = true
>                 var userUnchecked = false
>                 $('##selectSiteModal').on('show.bs.modal', function () {
>                     var subCorrectiveContainer = $('.subCorrectiveContainer:not(.subCARemoved)');
>                     var replicateSubCaCheckbox = $('##replicateSubCaCheckbox,##replicateSubCaCheckbox2');
>                     var replicateSubCaCheckbox2 = $('##replicateSubCaCheckbox2');
>                     var subCorrectiveActionsRP = $('##subCorrectiveActionsRP');
>                     var subCaRadios = $('.subCaRadios');
>                     var subCaWarning = $('.subCaWarning');
>                     
>                     if(subCorrectiveContainer.length #variables.ats_SubcorrectiveActionsLogicalOperator# #variables.subCaReplicateLimit#){
>                         subCaWarning.removeClass('d-none');
>                     }
>                     else{
>                         subCaWarning.addClass('d-none');
>                     }
>                     replicateSubCaCheckbox.off('change').on('change', function (e) {
>                         var $this = $(this);
>                         if($this.prop('checked') == false){
>                             replicateSubCaCheckbox2.prop('checked', false);
>                             subCorrectiveActionsRP.addClass('d-none');
>                             subCaRadios.prop('disabled', true);
>                             if(typeof e.originalEvent=='object'){
>                                 userUnchecked = true;
>                             }
>                         }else{
>                             replicateSubCaCheckbox2.prop('checked', true);
>                             replicateSubCaCheckbox.prop('checked', true);
>                             replicateSubCaCheckbox.prop('disabled', false);
>                             subCorrectiveActionsRP.removeClass('d-none');
>                             subCaRadios.prop('disabled', false);
>                         }
>                     });
>
>                     $('##replicateSubCaCheckbox2').off('change').on('change', function () {
>                         var $this = $(this);
>                         if($this.prop('checked') == false){
>                             $('##replicateSubCaCheckbox').prop('checked', false).trigger('change')
>                         }else{
>                             $('##replicateSubCaCheckbox').prop('checked', true).trigger('change')
>                         }
>                     })
>                     if(userUnchecked == false){
>                         if(subCorrectiveContainer.length > 0 ){
>                             $('.replicateSCAcount').text(' ('+subCorrectiveContainer.length+')');
>                             replicateSubCaCheckbox.prop('checked', true).trigger('change');
>                         }else{
>                             replicateSubCaCheckbox.prop('checked', false).trigger('change');
>                         }
> 						//firstOpen=false;
> 					}
> 					
> 	
> 					<!--- if(subCorrectiveContainer.length > #variables.subCaReplicateLimit#){
> 						replicateSubCaCheckbox.prop('checked', false).trigger('change');
> 					}else{
> 						replicateSubCaCheckbox.prop('checked', true).trigger('change');
> 					} --->
> 				});
>
>             </script>
>         </cfif>
> 		<script>
> 			$(function () {
> 				replicateOnDefaultRpChanged();
> 				$(document).on('change', 'input[name="DefaultRP"]', function () {
> 					replicateOnDefaultRpChanged();
> 				});
> 				$('##selectSiteModal').on('show.bs.modal', function () {
> 					replicateOnDefaultRpChanged();
> 				});
> 			});
> 		</script>
> 	</cfoutput>
> </cfif>
>
> ```
> ````
>
> </details>
</details>

`audfinding.cfm` in `code.gensuite.com/pm/audit` is the main add/edit page for ATS audit findings. It renders the full lifecycle form for a finding, validates it, enforces permissions, and drives related workflows like closure, verification, replication, linked records, drafts, and attachments. Source: [audfinding.cfm](https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@refs/heads/master/-/blob/audfinding.cfm).

At a high level, the page:
- Creates or edits a finding record. The title switches between “Add” and “Edit” based on `url.id`, and it validates the org/site context before loading.
- Loads business-configured behavior through many `getSetupVar(...)` calls, so labels, required fields, CAPA behavior, replication limits, reminder behavior, and optional sections are all tenant-configurable.
- Organizes the UI into major cards: `Finding Highlights`, `Responsibility`, `Closure Priority`, `Finding Details`, `CAPA`, `Finding Closure`, `Closure Verification`, `Approvals`, and `Update History`.
- Enforces extensive client-side validation before submit: finding date, audit/finding type, category, responsible person, risk category, closure data, verification data, CAPA root-cause/effectivity fields, and various business-specific constraints.
- Controls the closure workflow. A finding can be closed only with the required close date / closed-by / closure comment, and closure verification requires status, verifier, comment, and date rules.
- Supports replication to multiple sites through a modal that lets the user choose sites or custom groups, assign default responsible-person roles, optionally replicate sub-corrective actions, and post the selection to `replicateSites.cfm`.
- Supports linked records through `AppLookups/AppLookup.cfm` for linked `Event` and linked `Action` records.
- Supports drafts. The page accepts `draftID`, warns that some fields are not draft-preserved, and the companion JS saves drafts through `remoteproxy.cfm?method=insertActionFinding|updateActionFinding`.
- Supports attachments and follow-on actions. The page explicitly tells users to submit first, then use the follow-up attach flow.
- Includes rejection flow for closure with a “Reject Closure” button and corresponding validation/prompt logic.

The companion JS in [js/audfinding.js](https://sourcebot.benchmarkddev.com/browse/code.gensuite.com/pm/audit@master/-/blob/js%2Faudfinding.js) confirms that frontend behavior is centered on:
- open/closed field state changes,
- risk category driving closure category behavior,
- saving drafts via AJAX,
- serializing sub-corrective actions,
- batch upload of sub-corrective actions with Handsontable.

If you want, I can do the next pass and summarize just the server-side save path for `audfinding.cfm` using Sourcebot only.
