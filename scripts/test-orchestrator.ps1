<#
.SYNOPSIS
  Manual test script for the deterministic orchestrator HTTP endpoints.
  Run `npm run dev` (or `npm run server:dev`) first — this only talks to an
  already-running server, it doesn't start one.

.EXAMPLES
  ./scripts/test-orchestrator.ps1 -Action modelStatus
  ./scripts/test-orchestrator.ps1 -Action ask -Prompt "how does the SAFER permit workflow work"
  ./scripts/test-orchestrator.ps1 -Action askTeamgpt -Prompt "Summarize what this app does."
  ./scripts/test-orchestrator.ps1 -Action askLocal -Prompt "hello"
  ./scripts/test-orchestrator.ps1 -Action chat -Message "how does the audit module work"
  ./scripts/test-orchestrator.ps1 -Action chatSummary
  ./scripts/test-orchestrator.ps1 -Action chatActions
  ./scripts/test-orchestrator.ps1 -Action graphAsk
  ./scripts/test-orchestrator.ps1 -Action research -Query "why is the audit form not saving"

.NOTES
  Expected results with default config (ASK_PROVIDER=orchestrator,
  ASSISTANT_MODEL_MODE=orchestrator):
  - ask          -> answer + blocks + route (docs_kb) + provider (gennystudio)
  - askTeamgpt   -> legacy shape (enabled/provider/answer), route legacy_teamgpt
  - askLocal     -> enabled:false with the "archived" reason (unless
                    LEGACY_LOCAL_RAG_ENABLED=true)
  - chat         -> ok/content/answer/blocks/provider/route/modelMode:"orchestrator";
                    works WITHOUT a Graph sign-in for docs questions
  - chatSummary  -> route summary_text, provider teamgpt (needs TeamGPT auth)
  - chatActions  -> route action_items, provider teamgpt (needs TeamGPT auth)
  - graphAsk     -> route graph; sign-in guidance text if no Graph token cached
  - research     -> report/codeFindings/kbFindings/docsFindings/retrievalTrail keys
#>

param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("ask", "askTeamgpt", "askLocal", "chat", "chatSummary", "chatActions", "graphAsk", "research", "modelStatus")]
  [string]$Action,

  [string]$BaseUrl = "http://127.0.0.1:3000",
  [string]$Prompt = "",
  [string]$Message = "",
  [string]$Query = "",
  [string]$ItemContext = ""
)

function Invoke-JsonPost {
  param([string]$Url, [hashtable]$Body)
  $json = $Body | ConvertTo-Json -Depth 10 -Compress
  # Written to a temp file rather than passed as a literal -d string: long
  # JSON bodies containing embedded quotes are unreliable to escape correctly
  # inline in PowerShell -> curl.exe. @file avoids that class of bug entirely.
  $tempFile = New-TemporaryFile
  try {
    Set-Content -Path $tempFile -Value $json -NoNewline -Encoding utf8
    curl.exe -s -X POST $Url -H "Content-Type: application/json" --data "@$tempFile"
  } finally {
    Remove-Item $tempFile -Force -Confirm:$false -ErrorAction SilentlyContinue
  }
}

$sampleNotes = @'
Team sync notes from Tuesday:
The deployment window moves to Thursday evening. Priya owns the rollback runbook and will have it ready by Wednesday noon.
Marcus will confirm the SSL certificate renewal with IT before Wednesday. QA signoff is still pending on the invoice module - Dana to chase.
The vendor call about the API rate limits is rescheduled to next Monday. Alex to send the updated integration doc to the team by Friday.
'@

switch ($Action) {
  "modelStatus" {
    curl.exe -s "$BaseUrl/api/assistant/model-status"
  }
  "ask" {
    if (-not $Prompt) { $Prompt = "how does the SAFER permit workflow work" }
    Invoke-JsonPost -Url "$BaseUrl/api/ask" -Body @{ prompt = $Prompt }
  }
  "askTeamgpt" {
    if (-not $Prompt) { Write-Error "-Prompt is required for -Action askTeamgpt"; exit 1 }
    Invoke-JsonPost -Url "$BaseUrl/api/ask" -Body @{ prompt = $Prompt; provider = "teamgpt" }
  }
  "askLocal" {
    if (-not $Prompt) { $Prompt = "hello" }
    Invoke-JsonPost -Url "$BaseUrl/api/ask" -Body @{ prompt = $Prompt; provider = "local" }
  }
  "chat" {
    if (-not $Message) { $Message = "how does the audit module work" }
    Invoke-JsonPost -Url "$BaseUrl/api/assistant/chat" -Body @{
      messages = @(@{ role = "user"; content = $Message })
    }
  }
  "chatSummary" {
    Invoke-JsonPost -Url "$BaseUrl/api/assistant/chat" -Body @{
      messages = @(@{ role = "user"; content = "Summarize the notes below:`n$sampleNotes" })
    }
  }
  "chatActions" {
    Invoke-JsonPost -Url "$BaseUrl/api/assistant/chat" -Body @{
      messages = @(@{ role = "user"; content = "Extract the action items from the following:`n$sampleNotes" })
    }
  }
  "graphAsk" {
    Invoke-JsonPost -Url "$BaseUrl/api/assistant/chat" -Body @{
      messages = @(@{ role = "user"; content = "what are my most recent emails" })
    }
  }
  "research" {
    if (-not $Query) { Write-Error "-Query is required for -Action research"; exit 1 }
    Invoke-JsonPost -Url "$BaseUrl/api/item/research" -Body @{
      query       = $Query
      itemContext = $ItemContext
      messages    = @()
    }
  }
}

Write-Host ""
