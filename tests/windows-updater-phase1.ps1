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
 $txFile=Join-Path $target 'State\manual-transaction.json'
 $first=Get-Content -LiteralPath $txFile -Raw|ConvertFrom-Json
 $firstHash=(Get-FileHash -LiteralPath (Join-Path $target 'State\active.json') -Algorithm SHA256).Hash.ToLowerInvariant()
 Check ($first.schema -eq 1 -and $first.origin -ceq 'manual-operator' -and
   $first.command -ceq 'install' -and $first.phase -ceq 'files-installed' -and
   $first.transactionId -cmatch '^[a-f0-9]{32}$' -and
   $first.targetVersion -ceq '1.23.27' -and $first.receiptSha256 -ceq $firstHash -and
   $null -eq $first.workerGeneration -and $null -eq $first.admissionToken -and
   $null -ne $first.completedUtc)
   'R2 genuine manual updater terminal file transaction never claims MV3 identity'
 Call 'installed SHA-256 proof' 'verify' $target $null $null $true
 Call 'duplicate install refused' 'install' $target $channel27 $oldZip $false
 $priorReceipt=(Get-FileHash -LiteralPath (Join-Path $target 'State\active.json') -Algorithm SHA256).Hash
 & $updater -Command oneclick -Yes -TestRoot $target -TestChannel $channel27
 $equalEvents=@(Get-Content -LiteralPath (Join-Path $target 'State\updater.jsonl') | ForEach-Object { $_ | ConvertFrom-Json } | Where-Object { $_.type -ceq 'BEREITS_AKTUELL' })
 Check (($equalEvents.Count -eq 1) -and ($equalEvents[0].detail -match 'Already up to date - no update required') -and
        ((Get-FileHash -LiteralPath (Join-Path $target 'State\active.json') -Algorithm SHA256).Hash -ceq $priorReceipt)) 'oneclick equal is neutral and receipt unchanged'
 $noop=Get-Content -LiteralPath $txFile -Raw|ConvertFrom-Json
 Check ($noop.transactionId -ceq $first.transactionId -and
   $noop.receiptSha256 -ceq $first.receiptSha256)
   'R2 no-op cannot mint a fresh terminal file transaction'
 Call 'reinstall/downgrade refused' 'update' $target $channel27 $oldZip $false
 Call 'verified update' 'update' $target $channel28 $newZip $true
 $updated=Get-Content -LiteralPath $txFile -Raw|ConvertFrom-Json
 $updatedHash=(Get-FileHash -LiteralPath (Join-Path $target 'State\active.json') -Algorithm SHA256).Hash.ToLowerInvariant()
 Check ($updated.command -ceq 'update' -and $updated.phase -ceq 'files-installed' -and
   $updated.transactionId -cne $first.transactionId -and
   $updated.targetVersion -ceq '1.23.28' -and
   $updated.previousReceiptSha256 -ceq $firstHash -and
   $updated.receiptSha256 -ceq $updatedHash -and
   $null -eq $updated.workerGeneration -and $null -eq $updated.admissionToken)
   'R2 updater rotates manual transaction ID and binds predecessor/new receipt hashes'
 & $updater -Command oneclick -Yes -TestRoot $target -TestChannel $channel27
 $olderEvents=@(Get-Content -LiteralPath (Join-Path $target 'State\updater.jsonl') | ForEach-Object { $_ | ConvertFrom-Json } | Where-Object { $_.type -ceq 'KEIN_NEUERES_UPDATE' })
 Check (($olderEvents.Count -eq 1) -and
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
 $rollback=Get-Content -LiteralPath $txFile -Raw|ConvertFrom-Json
 $rollbackHash=(Get-FileHash -LiteralPath (Join-Path $target 'State\active.json') -Algorithm SHA256).Hash.ToLowerInvariant()
 Check ($rollback.command -ceq 'rollback' -and $rollback.phase -ceq 'files-installed' -and
   $rollback.transactionId -cne $updated.transactionId -and
   $rollback.previousReceiptSha256 -ceq $updatedHash -and
   $rollback.receiptSha256 -ceq $rollbackHash -and
   $null -eq $rollback.workerGeneration -and $null -eq $rollback.admissionToken)
   'R2 manual rollback has separate identity and is never MV3 rollback proof'
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
 $recovery=Get-Content -LiteralPath (Join-Path $crash 'State\manual-transaction.json') -Raw|ConvertFrom-Json
 Check ($recovery.phase -ceq 'recovery-unbound' -and
   $recovery.command -ceq 'recover' -and
   $null -eq $recovery.receiptSha256 -and
   $null -eq $recovery.workerGeneration -and $null -eq $recovery.admissionToken)
   'R2 recovery from unbound legacy journal invalidates historic terminal record'
 Call 'post-crash restore verified' 'verify' $crash $null $null $true
 Check (-not (Test-Path (Join-Path $crash 'State\pending.json'))) 'successful crash recovery clears journal'
 # R2: CI-only interruption windows must not mint MV3 update permission.
 $orphan=NewRoot 'before-legacy-journal'
 $env:KAR_UPDATER_TEST_INTERRUPT='after-manual-pending'
 try { Call 'R2 crash before legacy journal write' 'install' $orphan $channel27 $oldZip $false }
 finally { Remove-Item Env:KAR_UPDATER_TEST_INTERRUPT -ErrorAction SilentlyContinue }
 $orphanPath=Join-Path $orphan 'State\manual-transaction.json'
 $orphanProof=Get-Content -LiteralPath $orphanPath -Raw|ConvertFrom-Json
 Check ($orphanProof.phase -ceq 'pending' -and
   -not (Test-Path -LiteralPath (Join-Path $orphan 'State\pending.json')) -and
   -not (Test-Path -LiteralPath (Join-Path $orphan 'Extension')))
   'R2 earlier manual transaction exists without legacy pending journal'
 Call 'R2 unrecovered early transaction blocks reattempt' 'install' $orphan $channel27 $oldZip $false
 Call 'R2 explicit untouched state recovery' 'recover' $orphan $null $null $true
 $orphanRecovered=Get-Content -LiteralPath $orphanPath -Raw|ConvertFrom-Json
 Check ($orphanRecovered.phase -ceq 'recovery-unbound' -and
   $null -eq $orphanRecovered.receiptSha256 -and
   -not (Test-Path -LiteralPath (Join-Path $orphan 'State\pending.json')))
   'R2 no-journal recovery is unbound and never a terminal MV3 proof'
 Call 'R2 clean retry after manual recovery' 'install' $orphan $channel27 $oldZip $true

 $oldRoot=NewRoot 'prior-install-orphan'
 Call 'R2 prior install for interrupted update' 'install' $oldRoot $channel27 $oldZip $true
 $oldHash=(Get-FileHash -LiteralPath (Join-Path $oldRoot 'State\active.json') -Algorithm SHA256).Hash.ToLowerInvariant()
 $env:KAR_UPDATER_TEST_INTERRUPT='after-manual-pending'
 try { Call 'R2 interrupted update before pending journal' 'update' $oldRoot $channel28 $newZip $false }
 finally { Remove-Item Env:KAR_UPDATER_TEST_INTERRUPT -ErrorAction SilentlyContinue }
 Call 'R2 orphan update blocks subsequent update' 'update' $oldRoot $channel28 $newZip $false
 Call 'R2 untouched prior install manual recovery' 'recover' $oldRoot $null $null $true
 Check ((Get-FileHash -LiteralPath (Join-Path $oldRoot 'State\active.json') -Algorithm SHA256).Hash.ToLowerInvariant() -ceq $oldHash)
   'R2 original version bytes remain unchanged by orphan recovery'

 $late=NewRoot 'after-terminal-before-cleanup'
 Call 'R2 prior install for finalization crash' 'install' $late $channel27 $oldZip $true
 $env:KAR_UPDATER_TEST_INTERRUPT='after-terminal-before-journal-cleanup'
 try { Call 'R2 interrupt terminal before legacy journal deletion' 'update' $late $channel28 $newZip $true }
 finally { Remove-Item Env:KAR_UPDATER_TEST_INTERRUPT -ErrorAction SilentlyContinue }
 $terminal=Get-Content -LiteralPath (Join-Path $late 'State\manual-transaction.json') -Raw|ConvertFrom-Json
 Check ($terminal.phase -ceq 'files-installed' -and
   (Test-Path -LiteralPath (Join-Path $late 'State\pending.json')) -and
   $terminal.receiptSha256 -ceq (Get-FileHash -LiteralPath (Join-Path $late 'State\active.json') -Algorithm SHA256).Hash.ToLowerInvariant())
   'R2 durable terminal while pending journal remains recoverable'
 Call 'R2 abandoned terminal prevents one-click' 'oneclick' $late $channel28 $null $false
 Call 'R2 interrupted terminal recovery' 'recover' $late $null $null $true
 $after=Get-Content -LiteralPath (Join-Path $late 'State\manual-transaction.json') -Raw|ConvertFrom-Json
 Check ($after.phase -ceq 'recovery-unbound' -and
   ((Get-Content -LiteralPath (Join-Path $late 'State\active.json') -Raw|ConvertFrom-Json).version -ceq '1.23.27'))
   'R2 recovery revokes earlier terminal and restores previous Windows files'
 Check ($good -ge 24) 'minimum Windows negative and recovery checks'
 Write-Host ("PASS KAR-59 Windows Phase 1 suite: $good assertions, native end-user Chrome-profile acceptance PENDING")
} finally {
 if (Test-Path -LiteralPath $base) { Remove-Item -LiteralPath $base -Recurse -Force -ErrorAction SilentlyContinue }
}
