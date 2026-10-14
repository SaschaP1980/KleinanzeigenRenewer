# KAR-59 Phase 1 hosted Windows fixture suite. Never uses a real Chrome profile.
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
if ($env:CI -ne 'true' -or $env:KAR_UPDATER_TEST_MODE -ne '1') { throw 'CI test mode required' }
$root=Split-Path $PSScriptRoot -Parent
$updater=Join-Path $root 'tools\windows\KleinanzeigenRenewer-Updater.ps1'
$oldZip=Join-Path $root 'release\kleinanzeigen-renewal-chrome-v1.23.27.zip'
$newZip=Join-Path $root 'release\kleinanzeigen-renewal-chrome-v1.23.28.zip'
$nativeZip=Join-Path $root 'release\kleinanzeigen-renewal-chrome-v1.23.30.zip'
$base=Join-Path ([IO.Path]::GetTempPath()) ('kar59-'+[Guid]::NewGuid().ToString('N'))
[void][IO.Directory]::CreateDirectory($base)
$good=0
$bad=0
function Check([bool]$Ok,[string]$Name) {
 if (-not $Ok) { throw ('KAR59_WINDOWS_TEST_FAILED: '+$Name) }
 $script:good++
 Write-Host ('PASS KAR-59 '+$Name)
}
function Channel([string]$Name,[string]$Version,[string]$File,[string]$Hash='') {
 $digest=if ($Hash) { $Hash } else { (Get-FileHash -LiteralPath $File -Algorithm SHA256).Hash.ToLowerInvariant() }
 $data=@{schema=1;version=$Version;commit='2e18f8069f46537b94bcf01a39ae0a65950f675f';
         sha256=$digest;bytes=(Get-Item -LiteralPath $File).Length;extensionId='hafahjhhgiipdegfkgacchmnacgblnah'}
 $out=Join-Path $base ($Name+'.json')
 [IO.File]::WriteAllText($out,($data|ConvertTo-Json -Depth 6))
 return $out
}
function Call([string]$Name,[string]$Command,[string]$InstallRoot,[string]$ChannelFile,[string]$Zip,[bool]$Success) {
 $thrown=$null
 try {
  $params=@{Command=$Command;Yes=$true;TestRoot=$InstallRoot}
  if ($ChannelFile) { $params.TestChannel=$ChannelFile }
  if ($Zip) { $params.TestZip=$Zip }
  & $updater @params | Out-Null
 } catch { $thrown=$_.Exception.Message }
 if ($Success) { Check ($null -eq $thrown) ($Name+': success: '+$thrown) }
 else { Check ($null -ne $thrown) ($Name+': rejected as required') }
}
function NewRoot([string]$Name) { return (Join-Path $base ('root-'+$Name)) }
try {
 $channel27=Channel 'approved27' '1.23.27' $oldZip
 $channel28=Channel 'approved28' '1.23.28' $newZip
 $starter=Get-Content -LiteralPath (Join-Path $root 'tools\windows\OneClick-Update-KleinanzeigenRenewer.cmd') -Raw
 Check (($starter.Contains(' -Command oneclick')) -and
        ([regex]::Matches($starter,'powershell\.exe')).Count -eq 1 -and
        (-not $starter.Contains(' -Command check')) -and
        (-not $starter.Contains(' -Command update'))) 'one-click invokes a single fixed PowerShell operation'
 $target=NewRoot 'positive'
 Call 'not-installed status' 'check' $target $channel27 $null $true
 Call 'initial offline install' 'install' $target $channel27 $oldZip $true
 Check ((Test-Path (Join-Path $target 'Extension\manifest.json')) -and (Test-Path (Join-Path $target 'State\active.json'))) 'stable extension path and receipt'
 Call 'installed SHA-256 proof' 'verify' $target $null $null $true
 Call 'duplicate install refused' 'install' $target $channel27 $oldZip $false
 $priorReceipt=(Get-FileHash -LiteralPath (Join-Path $target 'State\active.json') -Algorithm SHA256).Hash
 $equalOutput=@(& $updater -Command oneclick -Yes -TestRoot $target -TestChannel $channel27)
 Check ((($equalOutput -join [Environment]::NewLine) -match 'BEREITS_AKTUELL: Bereits aktuell - kein Update erforderlich') -and
        ((Get-FileHash -LiteralPath (Join-Path $target 'State\active.json') -Algorithm SHA256).Hash -ceq $priorReceipt)) 'oneclick equal is neutral and receipt unchanged'
 Call 'reinstall/downgrade refused' 'update' $target $channel27 $oldZip $false
 Call 'verified update' 'update' $target $channel28 $newZip $true
 $olderOutput=@(& $updater -Command oneclick -Yes -TestRoot $target -TestChannel $channel27)
 Check ((($olderOutput -join [Environment]::NewLine) -match 'KEIN_NEUERES_UPDATE:') -and
        ((Get-Content -LiteralPath (Join-Path $target 'State\active.json') -Raw | ConvertFrom-Json).version -eq '1.23.28')) 'oneclick older approval does not downgrade'
 $clickTarget=NewRoot 'oneclick-newer'
 Call 'oneclick fixture initial install' 'install' $clickTarget $channel27 $oldZip $true
 Call 'oneclick strictly newer approval installs' 'oneclick' $clickTarget $channel28 $newZip $true
 Check (((Get-Content -LiteralPath (Join-Path $clickTarget 'State\active.json') -Raw | ConvertFrom-Json).version -eq '1.23.28') -and
        (Test-Path -LiteralPath (Join-Path $clickTarget 'Backups') -PathType Container)) 'oneclick newer retains backup and receipt'
 $current=(Get-Content -LiteralPath (Join-Path $target 'State\active.json') -Raw|ConvertFrom-Json)
 Check ($current.version -eq '1.23.28' -and $current.activation -eq 'reload-required') 'version advanced without claiming Chrome reload'
 Check (@(Get-ChildItem -LiteralPath (Join-Path $target 'Backups') -Directory).Count -ge 1) 'previous program-file backup retained'
 Call 'updated files verify' 'verify' $target $null $null $true
 $channel30=Channel 'approved30' '1.23.30' $nativeZip
 $nativeTarget=NewRoot 'reviewed-native-permission'
 Call 'reviewed nativeMessaging 1.23.30 permission install' 'install' $nativeTarget $channel30 $nativeZip $true
 Call 'reviewed nativeMessaging installed file verify' 'verify' $nativeTarget $null $null $true

 Call 'verified rollback' 'rollback' $target $null $null $true
 $recovered=(Get-Content -LiteralPath (Join-Path $target 'State\active.json') -Raw|ConvertFrom-Json)
 Check ($recovered.version -eq '1.23.27') 'rollback restored earlier version'
 Call 'rollback file proof' 'verify' $target $null $null $true
 [IO.File]::AppendAllText((Join-Path $target 'Extension\app.html'),'MODIFIED')
 Call 'tampered installed file refused' 'verify' $target $null $null $false
 $wrong=NewRoot 'sha'
 $badChannel=Channel 'wrong-sha' '1.23.28' $newZip ('0'*64)
 Call 'wrong approved digest fails closed' 'install' $wrong $badChannel $newZip $false
 Check (-not (Test-Path (Join-Path $wrong 'Extension'))) 'bad digest never activated'
 $trunc=Join-Path $base 'truncated.zip'
 [IO.File]::WriteAllBytes($trunc,[IO.File]::ReadAllBytes($newZip)[0..300])
 $truncChannel=Channel 'truncated' '1.23.28' $trunc
 Call 'truncated ZIP rejected' 'install' (NewRoot 'truncated') $truncChannel $trunc $false
 [void][Reflection.Assembly]::LoadWithPartialName('System.IO.Compression.FileSystem')
 $traversal=Join-Path $base 'traversal.zip'
 Copy-Item -LiteralPath $newZip -Destination $traversal
 $z=[IO.Compression.ZipFile]::Open($traversal,[IO.Compression.ZipArchiveMode]::Update)
 try {
  $escape=$z.CreateEntry('../escape.js')
  $stream=[IO.StreamWriter]::new($escape.Open())
  try { $stream.Write('untrusted') } finally { $stream.Dispose() }
 } finally { $z.Dispose() }
 $traversalChannel=Channel 'traversal' '1.23.28' $traversal
 Call 'ZIP traversal rejected' 'install' (NewRoot 'traversal') $traversalChannel $traversal $false
 Check (-not (Test-Path (Join-Path $base 'escape.js'))) 'no ZIP extraction outside staging'
 $duplicate=Join-Path $base 'duplicate.zip'
 Copy-Item -LiteralPath $newZip -Destination $duplicate
 $z=[IO.Compression.ZipFile]::Open($duplicate,[IO.Compression.ZipArchiveMode]::Update)
 try { [void]$z.CreateEntry('app.html') } finally { $z.Dispose() }
 $duplicateChannel=Channel 'duplicate' '1.23.28' $duplicate
 Call 'duplicate ZIP entry rejected' 'install' (NewRoot 'duplicate') $duplicateChannel $duplicate $false
 $manifestAttack=Join-Path $base 'manifest-attack.zip'
 Copy-Item -LiteralPath $newZip -Destination $manifestAttack
 $z=[IO.Compression.ZipFile]::Open($manifestAttack,[IO.Compression.ZipArchiveMode]::Update)
 try {
  $entry=$z.GetEntry('manifest.json')
  $mStream=[IO.StreamReader]::new($entry.Open())
  try { $manifestText=$mStream.ReadToEnd() } finally { $mStream.Dispose() }
  $entry.Delete()
  $m=$manifestText|ConvertFrom-Json
  $m.permissions=@('storage')
  $replacement=$z.CreateEntry('manifest.json')
  $writer=[IO.StreamWriter]::new($replacement.Open())
  try { $writer.Write(($m|ConvertTo-Json -Depth 15 -Compress)) } finally { $writer.Dispose() }
 } finally { $z.Dispose() }
 $attackChannel=Channel 'manifest-attack' '1.23.28' $manifestAttack
 Call 'wrong permissions rejected despite matching attacker ZIP SHA' 'install' (NewRoot 'permissions') $attackChannel $manifestAttack $false
 $noBackup=NewRoot 'no-backup'
 Call 'rollback without backup refused' 'rollback' $noBackup $null $null $false
 # Controlled crash fixture: simulate old Extension renamed to Backup AFTER journal was durably recorded.
 $crash=NewRoot 'crash'
 Call 'recovery fixture initial install' 'install' $crash $channel27 $oldZip $true
 $old=(Get-Content -LiteralPath (Join-Path $crash 'State\active.json') -Raw|ConvertFrom-Json)
 $backupName='backup-'+[Guid]::NewGuid().ToString('N')
 [void][IO.Directory]::CreateDirectory((Join-Path $crash 'Backups'))
 $journal=@{schema=1;backup=$backupName;hadPrevious=$true;receipt=$old;target='1.23.28'}
 [IO.File]::WriteAllText((Join-Path $crash 'State\pending.json'),($journal|ConvertTo-Json -Depth 12))
 Move-Item -LiteralPath (Join-Path $crash 'Extension') -Destination (Join-Path $crash ('Backups\'+$backupName))
 Call 'pending transaction blocks ordinary updates' 'update' $crash $channel28 $newZip $false
 Call 'journal crash recovery' 'recover' $crash $null $null $true
 Call 'post-crash restore verified' 'verify' $crash $null $null $true
 Check (-not (Test-Path (Join-Path $crash 'State\pending.json'))) 'successful crash recovery clears journal'
 Check ($good -ge 24) 'minimum Windows negative and recovery checks'
 Write-Host ("PASS KAR-59 Windows Phase 1 suite: $good assertions, native end-user Chrome-profile acceptance PENDING")
} finally {
 if (Test-Path -LiteralPath $base) { Remove-Item -LiteralPath $base -Recurse -Force -ErrorAction SilentlyContinue }
}
