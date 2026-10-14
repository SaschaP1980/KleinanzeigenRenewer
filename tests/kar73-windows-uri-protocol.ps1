# KAR-73: hosted Windows PowerShell 5.1 lab-only Shell URI activation probe.
# It intentionally tests Windows ShellExecute handoff, NOT Chrome MV3 origin,
# enterprise Defender policy, native messaging, installation, or Task Scheduler.
[CmdletBinding()]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ($env:CI -cne 'true' -or $env:KAR73_URI_POC_TEST_MODE -cne '1') {
    throw 'KAR73_LAB_ONLY: no owner-PC registration permitted'
}
if ($PSVersionTable.PSEdition -cne 'Desktop') {
    throw 'KAR73_WINDOWS_PS51_REQUIRED'
}
if (-not $env:RUNNER_TEMP) { throw 'KAR73_RUNNER_TEMP_MISSING' }

$scheme = 'kar73poc'
$key = 'HKCU:\Software\Classes\' + $scheme
$hkr = 'Registry::HKEY_CLASSES_ROOT\' + $scheme
$handler = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'kar73-uri-handler.ps1'))
$powershell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$marker = Join-Path $env:RUNNER_TEMP ('kar73-proof-' + [guid]::NewGuid().ToString('N') + '.txt')
$registered = $false
$command = $null

function Assert-KAR73([bool]$Ok, [string]$Why) {
    if (-not $Ok) { throw ('KAR73_POC_FAILED: ' + $Why) }
}
function Get-OwnedCommand {
    $path = $key + '\shell\open\command'
    if (-not (Test-Path -LiteralPath $path)) { return $null }
    return [string](Get-Item -LiteralPath $path).GetValue('')
}

Assert-KAR73 (-not (Test-Path -LiteralPath $key)) 'Foreign HKCU scheme exists: no overwrite'
Assert-KAR73 (-not (Test-Path -LiteralPath $hkr)) 'Scheme already registered: no takeover'
Assert-KAR73 ((Test-Path -LiteralPath $handler -PathType Leaf)) 'Harmless handler missing'
Assert-KAR73 ((Test-Path -LiteralPath $powershell -PathType Leaf)) 'System PowerShell missing'
Assert-KAR73 ($handler.IndexOf('"') -lt 0 -and $marker.IndexOf('"') -lt 0) 'Unsafe command quoting'
Assert-KAR73 (-not (Test-Path -LiteralPath $marker)) 'Marker path already occupied'

# The operating system receives a single hardcoded script invocation with a
# fixed CI marker path. The protocol URI itself is NEVER passed as an argument.
# This is not a production-safe authenticated browser→Windows update boundary.
$command = '"' + $powershell + '" -NoProfile -NonInteractive -File "' +
    $handler + '" -Marker "' + $marker + '"'
Assert-KAR73 (-not $command.Contains('%1')) 'Untrusted URI must not cross command boundary'
Assert-KAR73 (-not $command.Contains('ExecutionPolicy')) 'Do not weaken execution policy'

try {
    [void](New-Item -Path $key -Force)
    $registered = $true
    Set-Item -LiteralPath $key -Value 'URL:KAR73 CI-only Protocol Proof'
    [void](New-ItemProperty -LiteralPath $key -Name 'URL Protocol' -PropertyType String -Value '' -Force)
    [void](New-Item -Path ($key + '\shell\open\command') -Force)
    Set-Item -LiteralPath ($key + '\shell\open\command') -Value $command

    Assert-KAR73 ((Get-OwnedCommand) -ceq $command) 'Registered command mismatch'
    Assert-KAR73 (((Get-Item -LiteralPath $key).GetValue('URL Protocol')) -ceq '') 'URL Protocol marker missing'
    Write-Host 'PASS KAR73 URI_SCHEME_OWNERSHIP'
    Write-Host 'PASS KAR73 URI_ARGUMENT_NOT_FORWARDED'

    # ShellExecute: this validates Windows system URI protocol dispatch only.
    # Hosted CI may have no interactive desktop: failure is reported as NOT VERIFIED,
    # never downgraded into an assertion of actual Chrome handoff success.
    Start-Process -FilePath 'kar73poc://trigger' -ErrorAction Stop
    $expires = [DateTime]::UtcNow.AddSeconds(15)
    while (-not (Test-Path -LiteralPath $marker -PathType Leaf) -and [DateTime]::UtcNow -lt $expires) {
        Start-Sleep -Milliseconds 150
    }
    Assert-KAR73 ((Test-Path -LiteralPath $marker -PathType Leaf)) 'Shell URI handler did not run in hosted runner'
    $proof = [IO.File]::ReadAllText($marker, [Text.Encoding]::ASCII)
    Assert-KAR73 ($proof -ceq 'KAR73_WINDOWS_SHELL_URI_TRIGGERED') 'Unexpected handler output'
    Write-Host 'PASS KAR73 WINDOWS_SHELL_URI_DISPATCH'
}
finally {
    if ($registered -and (Test-Path -LiteralPath $key)) {
        # Never remove a key that somebody else has changed or taken over.
        Assert-KAR73 ((Get-OwnedCommand) -ceq $command) 'REGISTRY_OWNERSHIP_LOST: refusing cleanup of foreign state'
        Remove-Item -LiteralPath $key -Recurse -Force -ErrorAction Stop
    }
    Assert-KAR73 (-not (Test-Path -LiteralPath $key)) 'Registered scheme not cleaned'
    Assert-KAR73 (-not (Test-Path -LiteralPath $hkr)) 'HKCR scheme not cleaned'
    if (Test-Path -LiteralPath $marker) { Remove-Item -LiteralPath $marker -Force -ErrorAction Stop }
    Write-Host 'PASS KAR73 HKCU_CLEANUP'
}
