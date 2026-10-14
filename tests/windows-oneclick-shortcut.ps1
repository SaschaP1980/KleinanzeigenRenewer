# KAR-80: hosted Windows 5.1 disposable shortcut lifecycle, no actual updater launch.
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
if ($env:CI -cne 'true' -or $env:KAR_ONECLICK_TEST_MODE -cne '1' -or
    $PSVersionTable.PSEdition -cne 'Desktop' -or -not $env:RUNNER_TEMP) {
    throw 'KAR80_CI_WINDOWS_ONLY'
}
$repo=Split-Path $PSScriptRoot -Parent
$source=Join-Path $repo 'tools\windows'
$manager=Join-Path $source 'Manage-KleinanzeigenRenewer-OneClick.ps1'
$launcher=Join-Path $source 'OneClick-Update-KleinanzeigenRenewer.cmd'
$base=Join-Path $env:RUNNER_TEMP ('kar80-'+[guid]::NewGuid().ToString('N'))
$root=Join-Path $base 'managed'
$desktop=Join-Path $base 'desktop'
$root2=Join-Path $base 'foreign-managed'
$desktop2=Join-Path $base 'foreign-desktop'
$name='Kleinanzeigen Manager aktualisieren.lnk'
$passed=0
function Check([bool]$Condition,[string]$Name){
    if (-not $Condition){throw ('KAR80_TEST_FAILED: '+$Name)}
    $script:passed++
    Write-Host ('PASS KAR80 '+$Name)
}
function Invoke-Manager([string]$Action,[string]$InstallRoot,[string]$Desk,[string]$Src){
    & $manager -Action $Action -TestRoot $InstallRoot -TestDesktop $Desk -TestSource $Src
}
function MustFail([scriptblock]$Call,[string]$Name){
    $failure=$null
    try { & $Call | Out-Null } catch { $failure=$_.Exception.Message }
    Check (-not [string]::IsNullOrEmpty($failure)) $Name
}
try{
    New-Item -Path $base -ItemType Directory -Force | Out-Null
    foreach($d in @($desktop,$desktop2)){New-Item -Path $d -ItemType Directory -Force|Out-Null}
    Check (Test-Path -LiteralPath $manager -PathType Leaf) 'manager exists'
    Check (Test-Path -LiteralPath $launcher -PathType Leaf) 'one-click launcher exists'
    $text=[IO.File]::ReadAllText($launcher)
    $fixedCommands=$text.Contains(' -Command update') -and $text.Contains(' -Command check') -and
        (-not ($text -match '(?i)ExecutionPolicy\s+Bypass|\%[*1]|Start-ScheduledTask|schtasks|runas'))
    Check $fixedCommands 'fixed non-elevated updater commands'
    Check (-not (Test-Path -LiteralPath $root)) 'initially absent'
    Invoke-Manager 'install' $root $desktop $source | Out-Null
    $link=Join-Path $desktop $name
    Check (Test-Path -LiteralPath $link -PathType Leaf) 'desktop LNK created'
    $shell=New-Object -ComObject WScript.Shell
    $item=$shell.CreateShortcut($link)
    $target=Join-Path $root 'OneClick-Update-KleinanzeigenRenewer.cmd'
    Check ($item.TargetPath -ieq $target -and [string]::IsNullOrWhiteSpace($item.Arguments)) 'LNK fixed target no arguments'
    Check ((Test-Path -LiteralPath (Join-Path $root 'KleinanzeigenRenewer-Updater.ps1')) -and
        (Test-Path -LiteralPath (Join-Path $root 'owner.json'))) 'stable kit and owner manifest exist'
    Check (-not (Test-Path -LiteralPath (Join-Path $root 'KleinanzeigenRenewer.NativeHost.exe'))) 'works without NativeHost'
    Invoke-Manager 'check' $root $desktop $source | Out-Null
    Invoke-Manager 'install' $root $desktop $source | Out-Null
    Check ((Test-Path -LiteralPath $link) -and (Test-Path -LiteralPath $target)) 'idempotent provision'
    # Foreign shortcut: no overwriting an arbitrary existing user item.
    $foreign=Join-Path $desktop2 $name
    $other=$shell.CreateShortcut($foreign)
    $other.TargetPath=Join-Path $env:SystemRoot 'System32\notepad.exe'
    $other.Save()
    MustFail { Invoke-Manager 'install' $root2 $desktop2 $source } 'foreign shortcut refused'
    Check (-not (Test-Path -LiteralPath $root2)) 'foreign collision has no install side effects'
    # Bad inputs: no using data outside hosted runner's scratch directory.
    MustFail { & $manager -Action install -TestRoot (Join-Path $env:LOCALAPPDATA 'KAR80-unsafe') -TestDesktop $desktop -TestSource $source } 'test-root outside runner refused'
    MustFail { & $manager -Action install -TestRoot $root2 -TestDesktop $desktop2 -TestSource (Join-Path $base 'missing-source') } 'missing source fails closed'
    Invoke-Manager 'remove' $root $desktop $source | Out-Null
    Check (-not (Test-Path -LiteralPath $link) -and -not (Test-Path -LiteralPath $root)) 'owned remove fully cleans'
    Invoke-Manager 'remove' $root $desktop $source | Out-Null
    Check (-not (Test-Path -LiteralPath $root)) 'remove idempotent'
    Write-Host ("PASS KAR80 Windows one-click suite: $passed assertions; real corporate launch PENDING")
}finally{
    if (Test-Path -LiteralPath $base){Remove-Item -LiteralPath $base -Recurse -Force -ErrorAction Stop}
}
