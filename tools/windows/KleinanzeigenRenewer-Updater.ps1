# KAR-59 Phase 1. Standalone Windows PowerShell 5.1-compatible program updater.
[CmdletBinding()]
param(
 [ValidateSet('check','install','update','verify','rollback','recover','accept')][string]$Command='check',
 [switch]$Yes,
 [string]$TestRoot,
 [string]$TestChannel,
 [string]$TestZip
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$Repo='SaschaP1980/KleinanzeigenRenewer'
$ExtensionId='hafahjhhgiipdegfkgacchmnacgblnah'
$KeySha='70507977688f3465a60227cd0261bd07d92fad620625cd7ebff8f0856d9c5ed3'
$TestMode=($env:CI -eq 'true' -and $env:KAR_UPDATER_TEST_MODE -eq '1')
if (($TestRoot -or $TestChannel -or $TestZip) -and -not $TestMode) { throw 'KAR_UPDATER_TEST_DISABLED' }
if ($TestRoot) {
 $tmp=[IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\','/')
 $full=[IO.Path]::GetFullPath($TestRoot)
 if (-not $full.StartsWith($tmp+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw 'KAR_UPDATER_INVALID_TEST_ROOT' }
 $Root=$full
} else {
 if (-not $env:LOCALAPPDATA) { throw 'KAR_UPDATER_LOCALAPPDATA_MISSING' }
 $Root=Join-Path $env:LOCALAPPDATA 'KleinanzeigenRenewer'
}
$Live=Join-Path $Root 'Extension'
$State=Join-Path $Root 'State'
$StageRoot=Join-Path $Root 'Staging'
$BackupRoot=Join-Path $Root 'Backups'
$ReceiptPath=Join-Path $State 'active.json'
$JournalPath=Join-Path $State 'pending.json'
$LogPath=Join-Path $State 'updater.jsonl'
[void][IO.Directory]::CreateDirectory($State)
$Lock=$null
function Require([bool]$Ok,[string]$Message) { if (-not $Ok) { throw ('KAR_UPDATER_FAILED: '+$Message) } }
function Event([string]$Type,[string]$Message) {
 $entry=@{utc=[DateTime]::UtcNow.ToString('o'); type=$Type; detail=$Message}
 [IO.File]::AppendAllText($LogPath,(($entry|ConvertTo-Json -Compress)+[Environment]::NewLine))
 Write-Host ("{0}: {1}" -f $Type,$Message)
}
function ReadJson([string]$File) {
 Require (Test-Path -LiteralPath $File -PathType Leaf) ('Missing file '+$File)
 return (Get-Content -LiteralPath $File -Raw | ConvertFrom-Json)
}
function SaveJson([string]$File,$Data) {
 $temp=$File+'.'+[Guid]::NewGuid().ToString('N')+'.tmp'
 try {
  [IO.File]::WriteAllText($temp,($Data|ConvertTo-Json -Depth 12 -Compress),(New-Object Text.UTF8Encoding($false)))
  if (Test-Path -LiteralPath $File) { [IO.File]::Replace($temp,$File,$null) } else { [IO.File]::Move($temp,$File) }
 } finally { if (Test-Path -LiteralPath $temp) { Remove-Item -LiteralPath $temp -Force } }
}
function Digest([string]$File) { return (Get-FileHash -LiteralPath $File -Algorithm SHA256).Hash.ToLowerInvariant() }
function RequireIdle {
 if (-not $TestMode) {
  Require (@(Get-Process -Name chrome -ErrorAction SilentlyContinue).Count -eq 0) 'Close ALL Chrome processes: no update may interrupt a running ad workflow'
 }
}
function Consent([string]$Prompt) {
 if ($Yes) { return }
 Require ((Read-Host ($Prompt+'; type JA to proceed')) -ceq 'JA') 'User did not approve change'
}
function Approved {
 if ($TestChannel) { $a=ReadJson $TestChannel }
 else {
  $ref=Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/git/ref/heads/main" -TimeoutSec 30 -Headers @{'User-Agent'='KAR-Windows-Updater'}
  $sha=[string]$ref.object.sha
  Require ($sha -cmatch '^[a-f0-9]{40}$') 'Invalid GitHub main commit'
  $a=Invoke-RestMethod -Uri "https://raw.githubusercontent.com/$Repo/$sha/release/windows-updater-channel.json" -TimeoutSec 30 -Headers @{'User-Agent'='KAR-Windows-Updater'}
 }
 Require ($a.schema -eq 1) 'Approval schema changed'
 Require ([string]$a.version -cmatch '^\d+\.\d+\.\d+$') 'Malformed approved version'
 Require ([string]$a.commit -cmatch '^[a-f0-9]{40}$') 'Missing immutable approved commit'
 Require ([string]$a.sha256 -cmatch '^[a-f0-9]{64}$') 'Missing approved SHA-256'
 Require ($a.extensionId -ceq $ExtensionId) 'Approval extension ID changed'
 Require ([long]$a.bytes -gt 0 -and [long]$a.bytes -le 12000000L) 'Approval size out of bounds'
 return $a
}
function CheckManifest([string]$Folder,[string]$Version) {
 $m=ReadJson (Join-Path $Folder 'manifest.json')
 Require ($m.manifest_version -eq 3 -and [string]$m.version -ceq $Version) 'Incorrect ZIP/manifest version'
 $key=[Convert]::FromBase64String([string]$m.key)
 $h=[BitConverter]::ToString(([Security.Cryptography.SHA256]::Create()).ComputeHash($key)).Replace('-','').ToLowerInvariant()
 Require ($h -ceq $KeySha) 'Public key / extension identity changed'
 $p=@($m.permissions|Sort-Object)
 $h=@($m.host_permissions|Sort-Object)
 Require (($p -join '|') -ceq 'activeTab|scripting|storage|unlimitedStorage') 'Permission change requires security review'
 Require (($h -join '|') -ceq 'https://img.kleinanzeigen.de/*|https://kleinanzeigen.de/*|https://www.kleinanzeigen.de/*') 'Host permission change requires security review'
 Require ([IO.File]::ReadAllText((Join-Path $Folder 'APP_ID.txt')).Contains('Chrome Extension ID: '+$ExtensionId)) 'Extension ID differs'
 $required=@('manifest.json','APP_ID.txt','app.html','popup.html','src/background/background.js',[string]$m.background.service_worker)
 foreach ($script in @($m.content_scripts)) { $required+=@($script.js) }
 foreach ($html in @('app.html','popup.html')) {
  $source=[IO.File]::ReadAllText((Join-Path $Folder $html))
  foreach ($match in [regex]::Matches($source,'<script\s+src=["'']([^"'']+\.js)["'']')) { $required+=[string]$match.Groups[1].Value }
 }
 foreach ($name in ($required|Select-Object -Unique)) {
  Require ($name -cmatch '^[a-zA-Z0-9._/-]+$' -and $name -notmatch '(^/|//|(^|/)\.\.?(/|$))') 'Invalid declared runtime path'
  Require (Test-Path -LiteralPath (Join-Path $Folder $name) -PathType Leaf) ('Runtime file missing: '+$name)
 }
}
function Proof([string]$Folder,$Receipt) {
 Require (Test-Path -LiteralPath $Folder -PathType Container) 'Install directory absent'
 Require ([string]$Receipt.version -cmatch '^\d+\.\d+\.\d+$') 'Receipt version invalid'
 Require ([string]$Receipt.sha256 -cmatch '^[a-f0-9]{64}$') 'Receipt digest invalid'
 $expected=@($Receipt.files)
 $actual=@(Get-ChildItem -LiteralPath $Folder -File -Recurse -Force)
 Require ($expected.Count -ge 7 -and $expected.Count -eq $actual.Count -and $actual.Count -le 250) 'Installed file set differs'
 $names=New-Object 'System.Collections.Generic.HashSet[string]' ([StringComparer]::OrdinalIgnoreCase)
 foreach ($file in $expected) {
  $name=[string]$file.path
  Require ($name -cmatch '^[a-zA-Z0-9._/-]+$' -and $name -notmatch '(^/|//|(^|/)\.\.?(/|$))' -and $names.Add($name)) 'Duplicate/unsafe receipt file'
  $path=Join-Path $Folder ($name.Replace('/',[IO.Path]::DirectorySeparatorChar))
  Require (Test-Path -LiteralPath $path -PathType Leaf) ('Missing installed file: '+$name)
  Require ((Digest $path) -ceq [string]$file.sha256) ('Modified installed file: '+$name)
 }
 CheckManifest $Folder ([string]$Receipt.version)
}
function ExtractZip([string]$Zip,$Approval,[string]$Folder) {
 Require ((Get-Item -LiteralPath $Zip).Length -eq [long]$Approval.bytes) 'ZIP length mismatch'
 Require ((Digest $Zip) -ceq [string]$Approval.sha256) 'ZIP SHA-256 mismatch'
 [void][Reflection.Assembly]::LoadWithPartialName('System.IO.Compression')
 [void][IO.Directory]::CreateDirectory($Folder)
 $stream=[IO.File]::OpenRead($Zip)
 $archive=$null
 try {
  $archive=New-Object IO.Compression.ZipArchive($stream,[IO.Compression.ZipArchiveMode]::Read,$false)
  $entries=@($archive.Entries)
  Require ($entries.Count -ge 7 -and $entries.Count -le 250) 'ZIP entries outside limits'
  $seen=New-Object 'System.Collections.Generic.HashSet[string]' ([StringComparer]::OrdinalIgnoreCase)
  $total=0L
  foreach ($item in $entries) {
   $name=[string]$item.FullName
   Require ($name -cmatch '^[a-zA-Z0-9._/-]+$' -and $name -notmatch '(^/|//|(^|/)\.\.?(/|$)|/$)' -and $seen.Add($name)) 'ZIP traversal, directory, or duplicate entry'
   $kind=(($item.ExternalAttributes -shr 16) -band 0xF000)
   Require ($kind -eq 0 -or $kind -eq 32768) 'ZIP special file/symlink forbidden'
   Require ($item.Length -ge 0 -and $item.Length -le 15000000L) 'ZIP entry too large'
   Require ($item.CompressedLength -gt 0 -or $item.Length -eq 0) 'Invalid compression length'
   if ($item.CompressedLength -gt 0) { Require (($item.Length/[double]$item.CompressedLength) -le 500) 'ZIP bomb ratio' }
   $total+=$item.Length
   Require ($total -le 50000000L) 'ZIP bomb uncompressed total'
  }
  $files=@()
  $prefix=[IO.Path]::GetFullPath($Folder).TrimEnd('\','/')+[IO.Path]::DirectorySeparatorChar
  foreach ($item in $entries) {
   $name=[string]$item.FullName
   $path=[IO.Path]::GetFullPath((Join-Path $Folder ($name.Replace('/',[IO.Path]::DirectorySeparatorChar))))
   Require ($path.StartsWith($prefix,[StringComparison]::OrdinalIgnoreCase)) 'ZIP path escaped staging'
   [void][IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($path))
   $src=$item.Open()
   $dst=[IO.File]::Open($path,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write)
   try { $src.CopyTo($dst) } finally { $dst.Dispose();$src.Dispose() }
   $files+=@{path=$name;sha256=(Digest $path)}
  }
  $receipt=@{schema=1;version=[string]$Approval.version;sha256=[string]$Approval.sha256;bytes=[long]$Approval.bytes;commit=[string]$Approval.commit;files=@($files);activation='reload-required';createdUtc=[DateTime]::UtcNow.ToString('o')}
  Proof $Folder $receipt
  return $receipt
 } finally { if ($null -ne $archive) { $archive.Dispose() } else { $stream.Dispose() } }
}
function RestoreJournal {
 Require (Test-Path -LiteralPath $JournalPath) 'No journal to recover'
 RequireIdle
 $j=ReadJson $JournalPath
 Require ($j.schema -eq 1 -and [string]$j.backup -cmatch '^backup-[a-f0-9]{32}$') 'Unsafe transaction journal'
 $previous=Join-Path $BackupRoot ([string]$j.backup)
 if ($j.hadPrevious -eq $true) {
  if (Test-Path -LiteralPath $previous) {
   Proof $previous $j.receipt
   if (Test-Path -LiteralPath $Live) {
    [void][IO.Directory]::CreateDirectory($StageRoot)
    Move-Item -LiteralPath $Live -Destination (Join-Path $StageRoot ('quarantine-'+[Guid]::NewGuid().ToString('N')))
   }
   Move-Item -LiteralPath $previous -Destination $Live
  } else {
   Require (Test-Path -LiteralPath $Live) 'Both previous install and backup missing; manual recovery'
   Proof $Live $j.receipt
  }
  SaveJson $ReceiptPath $j.receipt
 } else {
  if (Test-Path -LiteralPath $Live) {
   [void][IO.Directory]::CreateDirectory($StageRoot)
   Move-Item -LiteralPath $Live -Destination (Join-Path $StageRoot ('quarantine-'+[Guid]::NewGuid().ToString('N')))
  }
  if (Test-Path -LiteralPath $ReceiptPath) { Remove-Item -LiteralPath $ReceiptPath -Force }
 }
 Remove-Item -LiteralPath $JournalPath -Force
 Event 'RECOVERED' 'Previous program files restored. No browser data was touched.'
}
function Switch([string]$Ready,$Receipt) {
 RequireIdle
 Require (-not (Test-Path -LiteralPath $JournalPath)) 'Recover pending transaction first'
 $old=$null
 $hadOld=Test-Path -LiteralPath $Live
 if ($hadOld) { $old=ReadJson $ReceiptPath;Proof $Live $old }
 $backup='backup-'+[Guid]::NewGuid().ToString('N')
 [void][IO.Directory]::CreateDirectory($BackupRoot)
 SaveJson $JournalPath @{schema=1;backup=$backup;hadPrevious=$hadOld;receipt=$old;target=[string]$Receipt.version}
 try {
  RequireIdle
  if ($hadOld) {
   Move-Item -LiteralPath $Live -Destination (Join-Path $BackupRoot $backup)
   SaveJson (Join-Path $BackupRoot ($backup+'.receipt.json')) $old
  }
  Move-Item -LiteralPath $Ready -Destination $Live
  Proof $Live $Receipt
  SaveJson $ReceiptPath $Receipt
  Remove-Item -LiteralPath $JournalPath -Force
  Event 'FILES_INSTALLED_RELOAD_REQUIRED' ("version={0} zipSha256={1} commit={2}" -f $Receipt.version,$Receipt.sha256,$Receipt.commit)
 } catch {
  $problem=$_.Exception.Message
  try { RestoreJournal } catch { throw ('KAR_UPDATER_RECOVERY_REQUIRED: '+$problem+'; '+$_.Exception.Message) }
  throw ('KAR_UPDATER_ROLLED_BACK: '+$problem)
 }
}
try {
 $Lock=[IO.File]::Open((Join-Path $State 'updater.lock'),[IO.FileMode]::OpenOrCreate,[IO.FileAccess]::ReadWrite,[IO.FileShare]::None)
 if ($Command -eq 'recover') { Consent 'Recover last program-file installation';RestoreJournal;return }
 Require (-not (Test-Path -LiteralPath $JournalPath)) 'Interrupted transaction: run recover'
 if ($Command -eq 'verify' -or $Command -eq 'accept') {
  $active=ReadJson $ReceiptPath;Proof $Live $active
  if ($Command -eq 'accept') {
   Consent 'Confirm you have manually reloaded Chrome extension and observed its version'
   $active.activation='operator-confirmed'
   SaveJson $ReceiptPath $active
   Event 'OPERATOR_CONFIRMED' ('Chrome activation self-reported: '+$active.version+'; not independently verified')
  } else { Event 'FILES_VERIFIED' ("version=$($active.version), activation=$($active.activation); browser reload may still be needed") }
  return
 }
 if ($Command -eq 'rollback') {
  RequireIdle
  $backups=@(Get-ChildItem -LiteralPath $BackupRoot -Filter 'backup-*.receipt.json' -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTimeUtc -Descending)
  $candidate=$null
  foreach ($file in $backups) {
   $name=$file.Name.Replace('.receipt.json','')
   if ($name -notmatch '^backup-[a-f0-9]{32}$') { continue }
   $path=Join-Path $BackupRoot $name
   try { $receipt=ReadJson $file.FullName;Proof $path $receipt;$candidate=@{folder=$path;receipt=$receipt};break }
   catch { Event 'BACKUP_REJECTED' $name }
  }
  Require ($null -ne $candidate) 'No verified backup to restore'
  Consent ('Rollback program files to '+$candidate.receipt.version)
  [void][IO.Directory]::CreateDirectory($StageRoot)
  $target=Join-Path $StageRoot ('candidate-'+[Guid]::NewGuid().ToString('N'))
  Copy-Item -LiteralPath $candidate.folder -Destination $target -Recurse
  Proof $target $candidate.receipt
  Switch $target $candidate.receipt
  return
 }
 $approval=Approved
 $active=$null
 if (Test-Path -LiteralPath $Live) { $active=ReadJson $ReceiptPath;Proof $Live $active }
 else { Require (-not (Test-Path -LiteralPath $ReceiptPath)) 'Stale receipt; manual recovery needed' }
 if ($Command -eq 'check') {
  $current=if ($active) { [string]$active.version } else { 'not installed' }
  Event 'CHECK' ("installed=$current approved=$($approval.version) sha256=$($approval.sha256) sourceCommit=$($approval.commit)")
  return
 }
 if ($Command -eq 'install') { Require ($null -eq $active) 'Already installed: use update' }
 if ($Command -eq 'update') {
  Require ($null -ne $active) 'Not installed: use install'
  Require ([version]$approval.version -gt [version]$active.version) 'Approved version must be strictly newer'
 }
 Consent ('Install approved version '+$approval.version+' (commit '+$approval.commit+')')
 RequireIdle
 [void][IO.Directory]::CreateDirectory($StageRoot)
 $slot=Join-Path $StageRoot ('candidate-'+[Guid]::NewGuid().ToString('N'))
 [void][IO.Directory]::CreateDirectory($slot)
 $zip=Join-Path $slot 'download.zip'
 $payload=Join-Path $slot 'payload'
 try {
  if ($TestZip) { Copy-Item -LiteralPath $TestZip -Destination $zip }
  else {
   $url="https://raw.githubusercontent.com/$Repo/$($approval.commit)/release/kleinanzeigen-renewal-chrome-v$($approval.version).zip"
   Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing -TimeoutSec 60 -Headers @{'User-Agent'='KAR-Windows-Updater'} | Out-Null
  }
  Require ((Get-Item -LiteralPath $zip).Length -le 12000000L) 'Downloaded ZIP too large'
  $proof=ExtractZip $zip $approval $payload
  Remove-Item -LiteralPath $zip -Force
  Switch $payload $proof
  Event 'ACTION_REQUIRED' 'Open same Chrome profile, reload the existing unpacked extension under chrome://extensions/, then verify version. Do not remove/reinstall existing extension!'
 } finally { if (Test-Path -LiteralPath $slot) { Remove-Item -LiteralPath $slot -Recurse -Force -ErrorAction SilentlyContinue } }
} catch { Event 'ERROR' $_.Exception.Message;throw }
finally { if ($null -ne $Lock) { $Lock.Dispose() } }
