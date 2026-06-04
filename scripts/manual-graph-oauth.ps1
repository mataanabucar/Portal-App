Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-GraphClientSecret {
    $candidateValues = @(
        $env:GRAPH_CLIENT_SECRET,
        [Environment]::GetEnvironmentVariable("GRAPH_CLIENT_SECRET", "User"),
        [Environment]::GetEnvironmentVariable("GRAPH_CLIENT_SECRET", "Machine")
    ) | Where-Object {
        $_ -and $_.Trim()
    }

    if ($candidateValues.Count -gt 0) {
        return $candidateValues[0]
    }

    throw (
        "GRAPH_CLIENT_SECRET is not set. Save it once with " +
        "[Environment]::SetEnvironmentVariable(""GRAPH_CLIENT_SECRET"", ""<secret>"", ""User"") " +
        "and reopen PowerShell before rerunning this script."
    )
}

function Get-GraphScopes {
    $candidateScopes = @(
        $env:GRAPH_SCOPES,
        [Environment]::GetEnvironmentVariable("GRAPH_SCOPES", "User"),
        [Environment]::GetEnvironmentVariable("GRAPH_SCOPES", "Machine")
    ) | Where-Object {
        $_ -and $_.Trim()
    }

    if ($candidateScopes.Count -gt 0) {
        return (($candidateScopes[0] -split "\s+") | Where-Object { $_ }) -join " "
    }

    return "offline_access User.Read Mail.Read Calendars.Read"
}

$TenantId = "162035a0-31d1-4b3c-a276-491c1dbea2f1"
$ClientId = "1fb8c198-909a-412b-9b2e-20450f6e7ecc"
$ClientSecret = Get-GraphClientSecret
$RedirectUri = if ($env:GRAPH_TESTER_REDIRECT_URI) {
    $env:GRAPH_TESTER_REDIRECT_URI
} elseif ($env:GRAPH_REDIRECT_URI) {
    $env:GRAPH_REDIRECT_URI
} else {
    "http://localhost:3069/auth/redirect"
}
$Scope = Get-GraphScopes

$TokenCachePath = if ($env:GRAPH_TESTER_TOKEN_CACHE_FILE) {
    $env:GRAPH_TESTER_TOKEN_CACHE_FILE
} else {
    Join-Path (Split-Path -Parent $PSScriptRoot) ".local-auth\graph-tester-token.json"
}

$State = [guid]::NewGuid().ToString()

$AuthUrl = "https://login.microsoftonline.com/$TenantId/oauth2/v2.0/authorize" +
    "?client_id=$ClientId" +
    "&response_type=code" +
    "&redirect_uri=$([uri]::EscapeDataString($RedirectUri))" +
    "&response_mode=query" +
    "&scope=$([uri]::EscapeDataString($Scope))" +
    "&state=$State"

$RedirectParts = [uri]$RedirectUri
$ListenerPrefix = "{0}://{1}:{2}/" -f $RedirectParts.Scheme, $RedirectParts.Host, $RedirectParts.Port

$Listener = [System.Net.HttpListener]::new()
$Listener.Prefixes.Add($ListenerPrefix)
$Listener.Start()

try {
    Write-Host "Opening browser for Microsoft login..."
    Start-Process $AuthUrl

    $Context = $Listener.GetContext()
    $Request = $Context.Request

    $Code = $Request.QueryString["code"]
    $ReturnedState = $Request.QueryString["state"]
    $ErrorMessage = $Request.QueryString["error_description"]

    $ResponseText = "You can close this browser tab."
    $Buffer = [System.Text.Encoding]::UTF8.GetBytes($ResponseText)
    $Context.Response.ContentLength64 = $Buffer.Length
    $Context.Response.OutputStream.Write($Buffer, 0, $Buffer.Length)
    $Context.Response.OutputStream.Close()
} finally {
    $Listener.Stop()
}

if ($ErrorMessage) {
    throw "Auth error: $ErrorMessage"
}

if ($ReturnedState -ne $State) {
    throw "State mismatch. Aborting."
}

if (-not $Code) {
    throw "No authorization code received."
}

if (-not $Scope -or -not $Scope.Trim()) {
    throw "GRAPH_SCOPES resolved to an empty value. Set GRAPH_SCOPES or let the script use its default scopes."
}

Write-Host "Authorization code received. Exchanging for token..."
Write-Host "Using scopes: $Scope"

$TokenUrl = "https://login.microsoftonline.com/$TenantId/oauth2/v2.0/token"
$TokenBody = "client_id=$([uri]::EscapeDataString($ClientId))" +
    "&scope=$([uri]::EscapeDataString($Scope))" +
    "&code=$([uri]::EscapeDataString($Code))" +
    "&redirect_uri=$([uri]::EscapeDataString($RedirectUri))" +
    "&grant_type=authorization_code" +
    "&client_secret=$([uri]::EscapeDataString($ClientSecret))"

$TokenResponse = Invoke-RestMethod `
    -Method Post `
    -Uri $TokenUrl `
    -Body $TokenBody `
    -ContentType "application/x-www-form-urlencoded"

Write-Host "Access token received."

$PersistedToken = @{
    accessToken  = $TokenResponse.access_token
    refreshToken = $TokenResponse.refresh_token
    idToken      = $TokenResponse.id_token
    expiresIn    = [int]$TokenResponse.expires_in
    expiresAt    = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() + ([int64]$TokenResponse.expires_in * 1000)
    scope        = $TokenResponse.scope
}

$TokenCacheDirectory = Split-Path -Parent $TokenCachePath

if ($TokenCacheDirectory) {
    New-Item -ItemType Directory -Force -Path $TokenCacheDirectory | Out-Null
}

$PersistedToken | ConvertTo-Json -Depth 6 | Set-Content -Path $TokenCachePath -Encoding UTF8
Write-Host "Saved token cache to $TokenCachePath"

$Headers = @{
    Authorization = "Bearer $($TokenResponse.access_token)"
}

Write-Host "Access token received."

$Headers = @{
    Authorization = "Bearer $($TokenResponse.access_token)"
}

Write-Host "Testing /me..."
$Me = Invoke-RestMethod `
    -Method Get `
    -Uri "https://graph.microsoft.com/v1.0/me" `
    -Headers $Headers

$Me | Format-List

Write-Host "Testing /me/messages..."
$Messages = Invoke-RestMethod `
    -Method Get `
    -Uri "https://graph.microsoft.com/v1.0/me/messages?`$top=5&`$select=subject,from,receivedDateTime" `
    -Headers $Headers

$Messages.value | Select-Object subject, receivedDateTime
