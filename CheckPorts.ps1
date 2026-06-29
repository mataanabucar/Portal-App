3000,3011,3069 | ForEach-Object {
    $conn = Get-NetTCPConnection -LocalPort $_ -State Listen -ErrorAction SilentlyContinue

    if ($conn) {
        $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
        [PSCustomObject]@{
            Port    = $_
            Status  = "Listening"
            PID     = $conn.OwningProcess
            Process = $proc.ProcessName
        }
    }
    else {
        [PSCustomObject]@{
            Port    = $_
            Status  = "Not Listening"
            PID     = ""
            Process = ""
        }
    }
} | Format-Table -AutoSize

Write-Host ""
Read-Host "Press Enter to exit"