<#
.SYNOPSIS
  Manual test script for the assistant / docs-search / research HTTP endpoints.
  Run `npm run dev` (or `npm run server:dev`) first — this only talks to an
  already-running server, it doesn't start one.

.EXAMPLES
  ./scripts/test-rag-endpoints.ps1 -Action health
  ./scripts/test-rag-endpoints.ps1 -Action modelStatus
  ./scripts/test-rag-endpoints.ps1 -Action docsSearch -Query "how does the KB research pipeline work"
  ./scripts/test-rag-endpoints.ps1 -Action researchItem -Query "why is the audit form not saving" -ItemContext "Title: Audit form save error`nApplication: Audit Assistant"
  ./scripts/test-rag-endpoints.ps1 -Action chat -Message "What model are you running right now?"
  ./scripts/test-rag-endpoints.ps1 -Action ask -Prompt "Summarize what this app does."

.NOTES
  -Action chat calls /api/assistant/chat, which requires a Graph sign-in
  already cached at .local-auth/graph-tester-token.json (run `npm run
  graph-tester` and sign in once if you haven't). docsSearch/researchItem/ask
  don't need that.
#>

param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("health", "modelStatus", "docsSearch", "chat", "researchItem", "ask")]
  [string]$Action,

  [string]$BaseUrl = "http://127.0.0.1:3000",
  [string]$Query = "",
  [string]$Message = "",
  [string]$Prompt = "",
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
    Remove-Item $tempFile -ErrorAction SilentlyContinue
  }
}

switch ($Action) {
  "health" {
    curl.exe -s "$BaseUrl/api/health"
  }
  "modelStatus" {
    curl.exe -s "$BaseUrl/api/assistant/model-status"
  }
  "docsSearch" {
    if (-not $Query) { Write-Error "-Query is required for -Action docsSearch"; exit 1 }
    Invoke-JsonPost -Url "$BaseUrl/api/docs/search" -Body @{ query = $Query }
  }
  "chat" {
    if (-not $Message) { Write-Error "-Message is required for -Action chat"; exit 1 }
    Invoke-JsonPost -Url "$BaseUrl/api/assistant/chat" -Body @{
      messages = @(@{ role = "user"; content = $Message })
    }
  }
  "researchItem" {
    if (-not $Query) { Write-Error "-Query is required for -Action researchItem"; exit 1 }
    Invoke-JsonPost -Url "$BaseUrl/api/item/research" -Body @{
      query       = $Query
      itemContext = $ItemContext
      messages    = @()
    }
  }
  "ask" {
    if (-not $Prompt) { Write-Error "-Prompt is required for -Action ask"; exit 1 }
    Invoke-JsonPost -Url "$BaseUrl/api/ask" -Body @{ prompt = $Prompt }
  }
}

Write-Host ""
