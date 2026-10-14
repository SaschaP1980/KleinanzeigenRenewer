# KAR-77 Wave C1 hosted Windows PS5.1; no Chrome/profile/registry/update action.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if ($env:CI -cne 'true' -or $env:GITHUB_ACTIONS -cne 'true' -or $env:KAR77_TEST_MODE -cne '1' -or
    $PSVersionTable.PSEdition -cne 'Desktop') { throw 'KAR77_CI_WINDOWS_ONLY' }
if (-not $env:RUNNER_TEMP) { throw 'KAR77_RUNNER_TEMP_MISSING' }
$root = Split-Path $PSScriptRoot -Parent
$handler = Join-Path $root 'tools\windows\KleinanzeigenRenewer-TrustedUriHandler.ps1'
$preflight = Join-Path $root 'tools\windows\Confirm-KleinanzeigenRenewer-UriHandlerTrust.ps1'
$tmp = Join-Path $env:RUNNER_TEMP ('kar77-' + [Guid]::NewGuid().ToString('N'))
$signer = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
$good = 0
function Check([bool]$Condition,[string]$Label) {
    if (-not $Condition) { throw ('KAR77_TEST_FAIL: ' + $Label) }
    $script:good++
    Write-Host ('PASS KAR77 ' + $Label)
}
function MustDeny([scriptblock]$Invoke,[string]$Code) {
    $failure = $null
    try { & $Invoke | Out-Null } catch { $failure = $_.Exception.Message }
    Check ($null -ne $failure -and $failure.Contains($Code)) ('fail-closed ' + $Code)
}
try {
    [void](New-Item -ItemType Directory -Path $tmp -ErrorAction Stop)
    Check ((Test-Path -LiteralPath $handler -PathType Leaf) -and (Test-Path -LiteralPath $preflight -PathType Leaf)) 'source present'

    # Both are source-only: no browser-origin interpretation, updater or OS mutation.
    $hs = [IO.File]::ReadAllText($handler)
    $ps = [IO.File]::ReadAllText($preflight)
    Check (($hs -match 'MessageBoxDefaultButton\]::Button2') -and
        ($hs -match 'DialogResult\]::Yes') -and
        ($hs -match 'PREVIEW_ONLY') -and ($hs -match 'LOCAL_CONSENT_DENIED')) 'independent Windows-side explicit consent preview'
    Check (-not ($hs -match '(?i)Start-Process|Invoke-WebRequest|Invoke-RestMethod|Start-ScheduledTask|schtasks|cmd\.exe|KleinanzeigenRenewer-Updater|\%1|Register-ScheduledTask|New-ItemProperty|Set-ItemProperty')) 'no update, child process, URL or registration surface'
    Check (($ps -match 'Get-AuthenticodeSignature') -and ($ps -match 'Get-FileHash') -and
        ($ps -match 'Zone.Identifier') -and ($ps -match 'ExpectedSignerThumbprint')) 'signature, hash, signer and zone contract'

    $unsigned = Join-Path $tmp 'handler-unsigned.ps1'
    Copy-Item -LiteralPath $handler -Destination $unsigned -ErrorAction Stop
    $hash = (Get-FileHash -LiteralPath $unsigned -Algorithm SHA256).Hash
    MustDeny { & $preflight -Candidate (Join-Path $tmp 'missing.ps1') -ExpectedSha256 $hash -ExpectedSignerThumbprint $signer } 'MISSING_CANDIDATE'
    MustDeny { & $preflight -Candidate $unsigned -ExpectedSha256 ('0' * 64) -ExpectedSignerThumbprint $signer } 'HASH_MISMATCH'
    MustDeny { & $preflight -Candidate $unsigned -ExpectedSha256 $hash -ExpectedSignerThumbprint $signer } 'SIGNATURE_NOT_VALID'

    $marked = Join-Path $tmp 'handler-zone3.ps1'
    Copy-Item -LiteralPath $unsigned -Destination $marked -ErrorAction Stop
    Set-Content -LiteralPath $marked -Stream 'Zone.Identifier' -Value "[ZoneTransfer]`nZoneId=3" -ErrorAction Stop
    MustDeny { & $preflight -Candidate $marked -ExpectedSha256 $hash -ExpectedSignerThumbprint $signer } 'INTERNET_ZONE'

    MustDeny { & $handler 'kar77poc://caller-controlled-data' } 'KAR77_URI_ARGUMENT_DENIED'
    Check (-not (Test-Path -LiteralPath (Join-Path $tmp 'Extension'))) 'no installation effects'
    Write-Host ('PASS KAR77 Windows security contract: ' + $good + ' assertions; enterprise ASR/signing acceptance PENDING')
} finally {
    if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction Stop }
}
