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
    $fixedCommands=$text.Contains(' -Command oneclick') -and
        ([regex]::Matches($text,'powershell\.exe')).Count -eq 1 -and
        (-not $text.Contains(' -Command check')) -and (-not $text.Contains(' -Command update')) -and
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
    # KAR-94: real detached Windows .cmd entrypoint executed only in hosted scratch paths.
    # Test real distributed ZIP bytes, not Git-checkout PS1 (Windows checkout may CRLF-convert files).
    $bundle=Join-Path $base 'verified-bundle'
    $zip=Join-Path $repo 'release\kleinanzeigen-oneclick-einrichtung-v1.23.36.zip'
    Expand-Archive -LiteralPath $zip -DestinationPath $bundle -Force
    $setup=Join-Path $bundle 'OneClick-Einrichtung.cmd'
    Check (Test-Path -LiteralPath $setup -PathType Leaf) 'first-user setup entrypoint exists'
    $root3=Join-Path $base 'new-user-kit'
    $desktop3=Join-Path $base 'new-user-desktop'
    New-Item -Path $desktop3 -ItemType Directory -Force | Out-Null
    $env:KAR94_TEST_ROOT=$root3
    $env:KAR94_TEST_DESKTOP=$desktop3
    try {
      $firstRun= & $env:ComSpec /d /c $setup 2>&1 | Out-String
      Write-Host ('KAR94_FIRST_SETUP_OUTPUT '+$firstRun)
      Check ($LASTEXITCODE -eq 0) 'first-user installer exits successfully'
      Check (Test-Path -LiteralPath (Join-Path $desktop3 $name) -PathType Leaf) 'fresh user Desktop shortcut exists'
      Invoke-Manager 'check' $root3 $desktop3 $source | Out-Null
      & $env:ComSpec /d /c $setup | Out-Null
      Check ($LASTEXITCODE -eq 0) 'repeat setup is idempotent'
      $staged=Join-Path $base 'altered-bundle'
      New-Item -Path $staged -ItemType Directory -Force | Out-Null
      foreach($file in @('OneClick-Einrichtung.cmd','Manage-KleinanzeigenRenewer-OneClick.ps1','OneClick-Update-KleinanzeigenRenewer.cmd','KleinanzeigenRenewer-Updater.ps1')) {
        Copy-Item -LiteralPath (Join-Path $bundle $file) -Destination (Join-Path $staged $file) -ErrorAction Stop
      }
      Add-Content -LiteralPath (Join-Path $staged 'KleinanzeigenRenewer-Updater.ps1') -Value '# altered' -Encoding ASCII
      & $env:ComSpec /d /c (Join-Path $staged 'OneClick-Einrichtung.cmd') | Out-Null
      Check ($LASTEXITCODE -ne 0) 'modified package fails before manager install'
      Invoke-Manager 'check' $root3 $desktop3 $source | Out-Null
      Remove-Item -LiteralPath (Join-Path $staged 'KleinanzeigenRenewer-Updater.ps1') -Force
      & $env:ComSpec /d /c (Join-Path $staged 'OneClick-Einrichtung.cmd') | Out-Null
      Check ($LASTEXITCODE -ne 0) 'missing package file fails before manager install'
      Invoke-Manager 'check' $root3 $desktop3 $source | Out-Null
      $foreignRoot=Join-Path $base 'fresh-foreign-kit'
      $foreignDesk=Join-Path $base 'fresh-foreign-desktop'
      New-Item -Path $foreignDesk -ItemType Directory -Force | Out-Null
      $linkForeign=Join-Path $foreignDesk $name
      $conflict=$shell.CreateShortcut($linkForeign)
      $conflict.TargetPath=Join-Path $env:SystemRoot 'System32\notepad.exe'
      $conflict.Save()
      $env:KAR94_TEST_ROOT=$foreignRoot
      $env:KAR94_TEST_DESKTOP=$foreignDesk
      & $env:ComSpec /d /c $setup | Out-Null
      Check ($LASTEXITCODE -ne 0) 'foreign Desktop shortcut blocked'
      Check ((-not (Test-Path -LiteralPath $foreignRoot)) -and (Test-Path -LiteralPath $linkForeign)) 'foreign shortcut and existing files untouched'
    } finally {
      Remove-Item Env:\KAR94_TEST_ROOT -ErrorAction SilentlyContinue
      Remove-Item Env:\KAR94_TEST_DESKTOP -ErrorAction SilentlyContinue
    }
    Write-Host ("PASS KAR80 Windows one-click suite: $passed assertions; real corporate launch PENDING")
}finally{
    if (Test-Path -LiteralPath $base){Remove-Item -LiteralPath $base -Recurse -Force -ErrorAction Stop}
}
