# KAR-80: non-elevated per-user desktop shortcut to the existing trusted Phase 1 updater.
# No Host.exe, Task Scheduler, URI registration, Chrome mutations, or execution-policy changes.
[CmdletBinding()]
param(
    [ValidateSet('check','install','remove')][string]$Action='check',
    [string]$TestRoot,
    [string]$TestDesktop,
    [string]$TestSource
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
function Stop-KAR([string]$Reason) { throw ('KAR80_ONECLICK_DENIED: '+$Reason) }
# With powershell.exe -File, strict mode may leave $args undefined.
# InvocationInfo reports unbound arguments in both direct and in-process calls.
$unboundArguments=$MyInvocation.UnboundArguments
if ($null -ne $unboundArguments -and @($unboundArguments).Count -ne 0) {
    Stop-KAR 'UNEXPECTED_ARGUMENTS'
}
$ci=($env:CI -ceq 'true' -and $env:KAR_ONECLICK_TEST_MODE -ceq '1')
if (($TestRoot -or $TestDesktop -or $TestSource) -and -not $ci) {
    Stop-KAR 'TEST_OVERRIDES_DISABLED'
}
if (-not $ci) {
    $identity=[Security.Principal.WindowsIdentity]::GetCurrent()
    $principal=New-Object Security.Principal.WindowsPrincipal($identity)
    if ($principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        Stop-KAR 'RUN_AS_NORMAL_USER_NOT_ADMINISTRATOR'
    }
}
if (-not $env:LOCALAPPDATA) { Stop-KAR 'LOCALAPPDATA_MISSING' }
$source=if ($TestSource) { [IO.Path]::GetFullPath($TestSource) } else { $PSScriptRoot }
$kit=if ($TestRoot) { [IO.Path]::GetFullPath($TestRoot) } else {
    Join-Path $env:LOCALAPPDATA 'KleinanzeigenRenewer\Updater'
}
$desktop=if ($TestDesktop) { [IO.Path]::GetFullPath($TestDesktop) } else {
    [Environment]::GetFolderPath('DesktopDirectory')
}
if ([string]::IsNullOrWhiteSpace($desktop)) { Stop-KAR 'DESKTOP_MISSING' }
$kit=[IO.Path]::GetFullPath($kit)
$desktop=[IO.Path]::GetFullPath($desktop)
if ($ci -and ($TestRoot -or $TestDesktop)) {
    if (-not $env:RUNNER_TEMP) { Stop-KAR 'RUNNER_TEMP_MISSING' }
    $runner=[IO.Path]::GetFullPath($env:RUNNER_TEMP).TrimEnd('\','/')
    foreach ($location in @($kit,$desktop)) {
        if (-not $location.StartsWith($runner+[IO.Path]::DirectorySeparatorChar,
            [StringComparison]::OrdinalIgnoreCase)) { Stop-KAR 'OUTSIDE_TEST_ROOT' }
    }
}
$shortcut=Join-Path $desktop 'Kleinanzeigen Manager aktualisieren.lnk'
$launcher='OneClick-Update-KleinanzeigenRenewer.cmd'
$updater='KleinanzeigenRenewer-Updater.ps1'
$names=@($launcher,$updater)
$receiptName='owner.json'
$receipt=Join-Path $kit $receiptName
$target=Join-Path $kit $launcher
function Assert-NoJunction([string]$Path) {
    $current=[IO.Path]::GetFullPath($Path)
    while ($true) {
        if (Test-Path -LiteralPath $current) {
            $attributes=(Get-Item -LiteralPath $current -Force -ErrorAction Stop).Attributes
            if (($attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
                Stop-KAR 'REPARSE_POINT'
            }
        }
        $parent=Split-Path -Path $current -Parent
        if (-not $parent -or $parent -eq $current) { break }
        $current=$parent
    }
}
function FileSha([string]$File) {
    return (Get-FileHash -LiteralPath $File -Algorithm SHA256 -ErrorAction Stop).Hash.ToLowerInvariant()
}
function Read-Owner {
    if (-not (Test-Path -LiteralPath $receipt -PathType Leaf)) {
        Stop-KAR 'UNOWNED_UPDATER_DIRECTORY'
    }
    $data=Get-Content -LiteralPath $receipt -Raw -ErrorAction Stop | ConvertFrom-Json -ErrorAction Stop
    $invalidOwner=($data.schema -ne 1) -or ($data.owner -cne 'KAR-80-OneClick') -or (@($data.files).Count -ne 2)
    if ($invalidOwner) { Stop-KAR 'INVALID_OWNER_RECEIPT' }
    $actual=@(Get-ChildItem -LiteralPath $kit -Force -ErrorAction Stop)
    if ($actual.Count -ne 3) { Stop-KAR 'UNEXPECTED_KIT_CONTENT' }
    foreach ($name in $names) {
        $entry=@($data.files | Where-Object { $_.name -ceq $name })
        if ($entry.Count -ne 1 -or [string]$entry[0].sha256 -cnotmatch '^[a-f0-9]{64}$') {
            Stop-KAR 'INVALID_RECEIPT_FILE'
        }
        $file=Join-Path $kit $name
        if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { Stop-KAR 'KIT_FILE_MISSING' }
        Assert-NoJunction $file
        if ((FileSha $file) -cne [string]$entry[0].sha256) { Stop-KAR 'KIT_HASH_MISMATCH' }
    }
}
function Get-Shell { return (New-Object -ComObject WScript.Shell) }
function Assert-ShortcutOwned {
    if (-not (Test-Path -LiteralPath $shortcut -PathType Leaf)) {
        Stop-KAR 'SHORTCUT_MISSING'
    }
    Assert-NoJunction $shortcut
    $link=(Get-Shell).CreateShortcut($shortcut)
    $owned=($link.TargetPath -ieq $target) -and ([string]::IsNullOrWhiteSpace($link.Arguments)) -and ($link.WorkingDirectory -ieq $kit)
    if (-not $owned) { Stop-KAR 'FOREIGN_SHORTCUT' }
}
function Approve([string]$What) {
    if ($ci) { return }
    if ((Read-Host ($What+'; type YES to confirm')) -cne 'YES') {
        Stop-KAR 'USER_DECLINED'
    }
}
Assert-NoJunction $kit
Assert-NoJunction $desktop
if (-not (Test-Path -LiteralPath $desktop -PathType Container)) {
    Stop-KAR 'DESKTOP_NOT_AVAILABLE'
}
if ($Action -eq 'check') {
    if (-not (Test-Path -LiteralPath $kit)) {
        if (Test-Path -LiteralPath $shortcut) { Stop-KAR 'FOREIGN_SHORTCUT' }
        Write-Host 'NOT_CONFIGURED: One-Click Desktop shortcut is missing.'
        return
    }
    Read-Owner
    Assert-ShortcutOwned
    Write-Host 'PASS: One-Click Desktop shortcut and both Updater copy files verified.'
    return
}
if ($Action -eq 'remove') {
    if (-not (Test-Path -LiteralPath $kit)) {
        if (Test-Path -LiteralPath $shortcut) { Stop-KAR 'FOREIGN_SHORTCUT' }
        Write-Host 'NOT_CONFIGURED: No installed One-Click kit to remove.'
        return
    }
    Read-Owner
    Assert-ShortcutOwned
    Approve 'Remove only the owned One-Click Desktop shortcut and owned Updater copy'
    Remove-Item -LiteralPath $shortcut -Force -ErrorAction Stop
    Remove-Item -LiteralPath $kit -Recurse -Force -ErrorAction Stop
    Write-Host 'PASS: Owned One-Click Desktop shortcut and Updater copy removed.'
    return
}
# Only 'install' remains. Do not modify an existing/unknown installation.
if (Test-Path -LiteralPath $kit) {
    Read-Owner
    Assert-ShortcutOwned
    Write-Host 'PASS: One-Click Desktop shortcut is already configured. Existing receipt-bound kit remains unchanged.'
    return
}
if (Test-Path -LiteralPath $shortcut) { Stop-KAR 'FOREIGN_SHORTCUT' }
if (-not (Test-Path -LiteralPath $source -PathType Container)) { Stop-KAR 'SOURCE_MISSING' }
Assert-NoJunction $source
foreach ($name in $names) {
    $file=Join-Path $source $name
    if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { Stop-KAR 'SOURCE_FILE_MISSING' }
    Assert-NoJunction $file
}
Approve 'Install the One-Click updater in your user profile and create the Desktop shortcut'
$parent=Split-Path -Path $kit -Parent
Assert-NoJunction $parent
if (-not (Test-Path -LiteralPath $parent)) {
    [void][IO.Directory]::CreateDirectory($parent)
}
$stage=Join-Path $parent ('.oneclick-stage-'+[guid]::NewGuid().ToString('N'))
$created=$false
$linkCreated=$false
try {
    [void][IO.Directory]::CreateDirectory($stage)
    $files=@()
    foreach ($name in $names) {
        $original=Join-Path $source $name
        $staged=Join-Path $stage $name
        Copy-Item -LiteralPath $original -Destination $staged -ErrorAction Stop
        if ((FileSha $staged) -cne (FileSha $original)) { Stop-KAR 'SOURCE_COPY_MISMATCH' }
        $files+=@{ name=$name; sha256=(FileSha $staged) }
    }
    @{ schema=1; owner='KAR-80-OneClick'; files=$files } |
        ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $stage $receiptName) -Encoding UTF8 -ErrorAction Stop
    if (Test-Path -LiteralPath $kit) { Stop-KAR 'CONCURRENT_DESTINATION_CREATED' }
    [IO.Directory]::Move($stage,$kit)
    $created=$true
    Read-Owner
    if (Test-Path -LiteralPath $shortcut) { Stop-KAR 'CONCURRENT_SHORTCUT_CREATED' }
    $link=(Get-Shell).CreateShortcut($shortcut)
    $link.TargetPath=$target
    $link.Arguments=''
    $link.WorkingDirectory=$kit
    $link.Description='Kleinanzeigen Manager: run the approved Windows update'
    $link.Save()
    $linkCreated=$true
    Assert-ShortcutOwned
    Write-Host 'PASS: Desktop shortcut created. Close all Chrome processes before replacing program files; explicit consent is required in the updater.'
} catch {
    $originalError=$_
    if ($linkCreated -and (Test-Path -LiteralPath $shortcut)) {
        try { Assert-ShortcutOwned; Remove-Item -LiteralPath $shortcut -Force -ErrorAction Stop } catch {}
    }
    if ($created -and (Test-Path -LiteralPath $kit)) {
        try { Read-Owner; Remove-Item -LiteralPath $kit -Recurse -Force -ErrorAction Stop } catch {}
    }
    throw $originalError
} finally {
    if (Test-Path -LiteralPath $stage) {
        Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction Stop
    }
}
