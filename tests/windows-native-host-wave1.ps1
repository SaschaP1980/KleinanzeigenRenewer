# KAR-64: hosted Windows PowerShell 5.1 Native Messaging contract tests.
# Uses a random HKCU test host entry and disposable %TEMP% directory, never a Chrome profile.
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
if ($env:CI -ne 'true' -or $env:KAR_NATIVE_HOST_TEST_MODE -ne '1') { throw 'KAR-64 tests require hosted CI test mode' }
$root=Split-Path $PSScriptRoot -Parent
$installer=Join-Path $root 'tools\windows\Install-KleinanzeigenRenewer-NativeHost.ps1'
$base=Join-Path ([IO.Path]::GetTempPath()) ('kar64-'+[Guid]::NewGuid().ToString('N'))
$name='de.kleinanzeigenrenewer.updater.ci.'+[Guid]::NewGuid().ToString('N')
$reg='HKCU:\Software\Google\Chrome\NativeMessagingHosts\'+$name
$live=Join-Path $base 'NativeHost'
$exe=Join-Path $live 'KleinanzeigenRenewer.NativeHost.exe'
$updater=Join-Path $live 'KleinanzeigenRenewer-Updater.ps1'
$params=@{TestRoot=$base;TestHostName=$name;Yes=$true}
$good=0
function Check([bool]$ok,[string]$reason) {
 if (-not $ok) { throw ('KAR64_NATIVE_TEST_FAILED: '+$reason) }
 $script:good++
 Write-Host ('PASS KAR-64 '+$reason)
}
function Run-Host([byte[]]$request,[string[]]$chromeArgs=@('chrome-extension://hafahjhhgiipdegfkgacchmnacgblnah/','--parent-window=0')) {
 # Windows PowerShell 5.1/.NET Framework wraps redirected Process.StandardInput in a
 # BOM-producing StreamWriter. File-backed native stdin is required to test binary
 # Chrome Native Messaging frames without adding a UTF-8 BOM to the four-byte header.
 $stem=Join-Path $base ('native-frame-'+[Guid]::NewGuid().ToString('N'))
 $inputFile=$stem+'.in'
 $outputFile=$stem+'.out'
 $errorFile=$stem+'.err'
 [IO.File]::WriteAllBytes($inputFile,$request)
 $proc=$null
 try {
  # Chrome on Windows passes the origin, then the parent-window handle (0 for MV3 service workers).
  $proc=Start-Process -FilePath $exe -ArgumentList $chromeArgs -PassThru -NoNewWindow -RedirectStandardInput $inputFile -RedirectStandardOutput $outputFile -RedirectStandardError $errorFile
  Check ($proc.WaitForExit(90000)) 'native host exits after one response'
  $response=[IO.File]::ReadAllBytes($outputFile)
  if ($response.Length -lt 6) { throw 'Native host returned no complete frame' }
  $length=[uint32]$response[0] -bor ([uint32]$response[1] -shl 8) -bor ([uint32]$response[2] -shl 16) -bor ([uint32]$response[3] -shl 24)
  if ($length -lt 2 -or $length -gt 8192 -or $response.Length -ne (4+[int]$length)) {
   throw 'Native host returned invalid, truncated or trailing response bytes'
  }
  $utf8=New-Object Text.UTF8Encoding($false,$true)
  $text=$utf8.GetString($response,4,[int]$length)
  return ($text|ConvertFrom-Json)
 } finally {
  if ($null -ne $proc) {
   if (-not $proc.HasExited) { $proc.Kill();[void]$proc.WaitForExit(10000) }
   $proc.Dispose()
  }
  foreach ($file in @($inputFile,$outputFile,$errorFile)) {
   if (Test-Path -LiteralPath $file) { Remove-Item -LiteralPath $file -Force }
  }
 }
}
function Deny-Launch([string[]]$chromeArgs,[string]$label) {
 # Direct .NET process launcher is needed here: Windows PowerShell 5.1
 # Start-Process -PassThru does not reliably expose an ExitCode for rapid exits.
 # Intentionally close stdin: a wrongly accepted caller must still terminate.
 $proc=New-Object System.Diagnostics.Process
 try {
  $info=New-Object System.Diagnostics.ProcessStartInfo
  $info.FileName=$exe
  $info.Arguments=(@($chromeArgs) -join ' ')
  $info.UseShellExecute=$false
  $info.CreateNoWindow=$true
  $info.RedirectStandardInput=$true
  $info.RedirectStandardOutput=$true
  $info.RedirectStandardError=$true
  $proc.StartInfo=$info
  Check ($proc.Start()) ('rejected launch process started: '+$label)
  $proc.StandardInput.Close()
  $exited=$proc.WaitForExit(10000)
  Check $exited ('rejected launch exits: '+$label)
  $output=$proc.StandardOutput.ReadToEnd()
  $errorOutput=$proc.StandardError.ReadToEnd()
  $proc.Refresh()
  $exitCode=$proc.ExitCode
  Write-Host ('KAR-66 HOST_LAUNCH_DIAGNOSTIC: label='+$label+' exit='+$exitCode+' stdoutBytes='+[Text.Encoding]::UTF8.GetByteCount($output)+' stderrBytes='+[Text.Encoding]::UTF8.GetByteCount($errorOutput))
  Check ($exitCode -eq 2 -and $output.Length -eq 0) ('rejected launch exits 2 without stdout: '+$label)
 } finally {
  if (-not $proc.HasExited) { $proc.Kill();[void]$proc.WaitForExit(10000) }
  $proc.Dispose()
 }
}
function Frame([string]$text) {
 $bytes=[Text.Encoding]::UTF8.GetBytes($text)
 $prefix=[BitConverter]::GetBytes([int]$bytes.Length)
 $frame=New-Object byte[] (4+$bytes.Length)
 [Buffer]::BlockCopy($prefix,0,$frame,0,4)
 [Buffer]::BlockCopy($bytes,0,$frame,4,$bytes.Length)
 if ([BitConverter]::ToInt32($frame,0) -ne ($frame.Length-4)) { throw 'KAR64_TEST_FRAMING_INVALID' }
 return ,$frame
}
function Expect-Deny([string]$json,[string]$code) {
 $x=Run-Host (Frame $json)
 Check ($x.ok -eq $false -and $x.error -ceq $code) ('refused '+$code)
}
[void][IO.Directory]::CreateDirectory($base)
try {
 & $installer -Action install @params | Out-Null
 Check ((Test-Path -LiteralPath $exe) -and (Test-Path -LiteralPath $reg)) 'installer created executable and HKCU registration'
 & $installer -Action verify @params | Out-Null
 Check ($true) 'installer receipt verification passed'
 $manifest=Get-Content -LiteralPath (Join-Path $live 'host.json') -Raw|ConvertFrom-Json
 Check ($manifest.name -ceq $name -and @($manifest.allowed_origins).Count -eq 1 -and
       [string]$manifest.allowed_origins[0] -ceq 'chrome-extension://hafahjhhgiipdegfkgacchmnacgblnah/') 'host manifest has exact trusted Chrome origin'
 Check ([string](Get-Item -LiteralPath $reg).GetValue('') -ceq (Join-Path $live 'host.json')) 'HKCU registry default value points to exact manifest'
 $id='0123456789abcdef'
 $reply=Run-Host (Frame ('{"protocol":1,"requestId":"'+$id+'","operation":"health"}'))
 Check ($reply.ok -eq $true -and $reply.requestId -ceq $id -and $reply.operation -ceq 'health') 'valid local read-only health message'
 Check (@($reply.capabilities).Count -eq 3 -and @($reply.capabilities) -contains 'health' -and @($reply.capabilities) -contains 'check' -and @($reply.capabilities) -contains 'inspect_transaction') 'health advertises only the three read-only host capabilities'
 $origin='chrome-extension://hafahjhhgiipdegfkgacchmnacgblnah/'
 $health=Frame ('{"protocol":1,"requestId":"'+$id+'","operation":"health"}')
 $nonSlash=Run-Host $health @('chrome-extension://hafahjhhgiipdegfkgacchmnacgblnah','--parent-window=0')
 Check ($nonSlash.ok -eq $true -and $nonSlash.operation -ceq 'health') 'Chrome origin without trailing slash is accepted'
 $handle=Run-Host $health @($origin,'--parent-window=4294967296')
 Check ($handle.ok -eq $true -and $handle.operation -ceq 'health') 'numeric 64-bit Windows parent handle is accepted'
 Deny-Launch @() 'missing Chrome arguments'
 Deny-Launch @($origin) 'origin without parent handle'
 Deny-Launch @('--parent-window=0') 'handle without origin'
 Deny-Launch @('https://www.kleinanzeigen.de/','--parent-window=0') 'webpage origin'
 Deny-Launch @('chrome-extension://hafahjhhgiipdegfkgacchmnacgblnaha/','--parent-window=0') 'unlisted extension origin'
 Deny-Launch @($origin,'--parent-window=-1') 'negative parent handle'
 Deny-Launch @($origin,'--parent-window=abc') 'non-numeric parent handle'
 Deny-Launch @($origin,'--parent-window=18446744073709551616') 'overflow parent handle'
 Deny-Launch @($origin,'--parent-window=0','apply_update') 'extra command arguments'
 Deny-Launch @('--parent-window=0',$origin) 'reversed Chrome arguments'
 Expect-Deny ('{"protocol":1,"requestId":"'+$id+'","operation":"apply_update"}') 'OPERATION_DENIED'
 Expect-Deny ('{"protocol":1,"requestId":"'+$id+'","operation":"rollback"}') 'OPERATION_DENIED'
 Expect-Deny ('{"protocol":1,"requestId":"'+$id+'","operation":"health","path":"C:\\Temp\\x"}') 'INVALID_REQUEST'
 Expect-Deny ('{"protocol":2,"requestId":"'+$id+'","operation":"health"}') 'INVALID_REQUEST'
 Expect-Deny '{"protocol":1,"requestId":"short","operation":"health"}' 'INVALID_REQUEST'
 Expect-Deny '{"protocol":1,"requestId":"0123456789abcdef","operation":"health"' 'INVALID_REQUEST'
 $huge=[byte[]]@(1,32,0,0) # 8193 little endian
 $rejected=Run-Host $huge
 Check ($rejected.ok -eq $false -and $rejected.error -ceq 'FRAME_REJECTED') 'oversized frame refused before allocation'
 $missing=Join-Path $live 'updater-saved.ps1'
 Move-Item -LiteralPath $updater -Destination $missing
 try {
  $r=Run-Host (Frame ('{"protocol":1,"requestId":"'+$id+'","operation":"check"}'))
  Check ($r.ok -eq $false -and $r.error -ceq 'UPDATER_NOT_INSTALLED') 'missing delegate explicit nonfatal error'
 } finally { Move-Item -LiteralPath $missing -Destination $updater }
 # Offline read-only positive fixture; never accesses real GitHub, Chrome or application files.
 $real=[IO.File]::ReadAllBytes($updater)
 try {
  $mock='param([string]$Command) if ($Command -eq ''check'') { Write-Output ''CHECK: installed=1.23.28 approved=1.23.29 sha256='+('a'*64)+' sourceCommit='+('b'*40)+''' }'
  [IO.File]::WriteAllText($updater,$mock)
  $r=Run-Host (Frame ('{"protocol":1,"requestId":"'+$id+'","operation":"check"}'))
  Check ($r.ok -eq $true -and $r.installed -ceq '1.23.28' -and $r.approved -ceq '1.23.29' -and $r.sha256 -ceq ('a'*64) -and $r.sourceCommit -ceq ('b'*40)) 'read-only fixed updater check parsed'
  $r=Run-Host (Frame ('{"protocol":1,"requestId":"'+$id+'","operation":"health"}'))
  Check ($r.ok -eq $true) 'health remains local with offline delegate'
 } finally { [IO.File]::WriteAllBytes($updater,$real) }
 # KAR-99 P1.3: authentic NativeHost read-only transaction probe.
 # The CI-only root is supplied through the host process environment, never
 # through arbitrary Native Messaging request fields. Nothing touches owner PC.
 $inspectRoot=Join-Path $base 'transaction-observer-fixture'
 $previousRoot=$env:KAR_NATIVE_HOST_INSPECT_TEST_ROOT
 $env:KAR_NATIVE_HOST_INSPECT_TEST_ROOT=$inspectRoot
 $inspectRequest=Frame ('{"protocol":1,"requestId":"'+$id+'","operation":"inspect_transaction"}')
 try {
  $proof=Run-Host $inspectRequest
  Check ($proof.ok -eq $true -and $proof.operation -ceq 'inspect_transaction' -and
    $proof.requestId -ceq $id -and $proof.status -ceq 'unverified' -and
    $proof.journal -ceq 'absent' -and $proof.lock -ceq 'absent') 'missing native transaction artifacts are unverified, never idle'
  Check ($proof.nativeOutcomeVerified -eq $false -and $proof.rollbackVerified -eq $false -and
    $proof.eligibleForLease -eq $false) 'absent native artifacts never prove transaction or lease'
  Check ($proof.transactionPhase -ceq 'unknown' -and $proof.identityBound -eq $false -and
    $proof.journalFormat -ceq 'unknown' -and $null -eq $proof.journalFingerprint)
    'R2 no journal is unknown, not a verified terminal transaction'
  Check ($proof.receipt -ceq 'absent' -and $proof.receiptFormat -ceq 'unknown' -and
    $null -eq $proof.receiptFingerprint -and $null -eq $proof.receiptVersion -and
    $proof.nativeOutcomeVerified -eq $false)
    'R2 missing active.json is not a terminal native transaction'
  Check (-not (Test-Path -LiteralPath $inspectRoot)) 'native inspector never creates missing state root'
  $state=Join-Path $inspectRoot 'State'
  [void][IO.Directory]::CreateDirectory($state)
  $pending=Join-Path $state 'pending.json'
  $lockFile=Join-Path $state 'updater.lock'
  # R2: the manual Windows updater writes active.json independently of MV3.
  # Its exact stable bytes are observable, but it contains NO Worker token,
  # original update transaction ID, or proof of browser activation.
  $activePath=Join-Path $state 'active.json'
  $activeSample=@{schema=1;version='1.24.2';sha256=('a'*64);bytes=4096;
    commit=('b'*40);files=@(@{path='manifest.json';sha256=('c'*64)});
    activation='reload-required';createdUtc='2026-11-16T05:00:00Z'}
  [IO.File]::WriteAllText($activePath,($activeSample|ConvertTo-Json -Compress -Depth 8))
  $receiptHash=(Get-FileHash -LiteralPath $activePath -Algorithm SHA256).Hash.ToLowerInvariant()
  $activeProof=Run-Host $inspectRequest
  Check ($activeProof.receipt -ceq 'present' -and
    $activeProof.receiptFormat -ceq 'legacy-installed' -and
    $activeProof.receiptVersion -ceq '1.24.2' -and
    $activeProof.receiptFingerprint -ceq $receiptHash -and
    $activeProof.nativeOutcomeVerified -eq $false -and
    $activeProof.rollbackVerified -eq $false -and
    $activeProof.identityBound -eq $false -and
    $activeProof.eligibleForLease -eq $false)
    'R2 authentic stable legacy installed receipt is evidence, never update terminality'
  Check ((Get-FileHash -LiteralPath $activePath -Algorithm SHA256).Hash.ToLowerInvariant() -ceq $receiptHash)
    'R2 NativeHost leaves active receipt bytes untouched'
  $activeSample.version='1.24.3'
  [IO.File]::WriteAllText($activePath,($activeSample|ConvertTo-Json -Compress -Depth 8))
  $changedReceipt=Run-Host $inspectRequest
  Check ($changedReceipt.receiptFingerprint -cne $receiptHash -and
    $changedReceipt.receiptVersion -ceq '1.24.3' -and
    $changedReceipt.nativeOutcomeVerified -eq $false)
    'R2 changed active receipt revision does not prove update success'
  [IO.File]::WriteAllText($activePath,'{"schema":1,"version":"1.24.3"}')
  $malformedReceipt=Run-Host $inspectRequest
  Check ($malformedReceipt.receipt -ceq 'present' -and
    $malformedReceipt.receiptFormat -ceq 'malformed' -and
    $null -eq $malformedReceipt.receiptVersion -and
    $malformedReceipt.eligibleForLease -eq $false)
    'R2 partial active receipt never attests native terminality'
  [IO.File]::WriteAllText($activePath,('x'*65537))
  $largeReceipt=Run-Host $inspectRequest
  Check ($largeReceipt.receipt -ceq 'present' -and
    $largeReceipt.receiptFormat -ceq 'unknown' -and
    $null -eq $largeReceipt.receiptFingerprint -and
    $largeReceipt.nativeOutcomeVerified -eq $false)
    'R2 oversized native receipt cannot produce a fingerprint or success'
  Remove-Item -LiteralPath $activePath
  $vanishedReceipt=Run-Host $inspectRequest
  Check ($vanishedReceipt.receipt -ceq 'absent' -and
    $null -eq $vanishedReceipt.receiptVersion -and
    $vanishedReceipt.nativeOutcomeVerified -eq $false)
    'R2 active receipt disappearing cannot launder earlier terminal status'
  [IO.File]::WriteAllText($pending,'{malformed transaction journal')
  $journalHash=(Get-FileHash -LiteralPath $pending -Algorithm SHA256).Hash
  $proof=Run-Host $inspectRequest
  Check ($proof.ok -eq $true -and $proof.status -ceq 'blocked' -and
    $proof.journal -ceq 'present' -and $proof.lock -ceq 'absent') 'malformed pending journal blocks NativeHost assessment'
  Check ((Get-FileHash -LiteralPath $pending -Algorithm SHA256).Hash -ceq $journalHash) 'NativeHost does not modify transaction journal bytes'
  Check ($proof.transactionPhase -ceq 'pending-install-or-rollback' -and
    $proof.journalFormat -ceq 'malformed' -and
    $proof.journalFingerprint -ceq $journalHash.ToLowerInvariant() -and
    $proof.identityBound -eq $false -and $proof.nativeOutcomeVerified -eq $false)
    'R2 malformed durable journal fingerprint proves presence, never completion'
  $legacy='{"schema":1,"backup":"backup-00000000000000000000000000000000","hadPrevious":false,"receipt":null,"target":"1.24.2"}'
  [IO.File]::WriteAllText($pending,$legacy)
  $legacyHash=(Get-FileHash -LiteralPath $pending -Algorithm SHA256).Hash.ToLowerInvariant()
  $proof=Run-Host $inspectRequest
  Check ($proof.status -ceq 'blocked' -and $proof.journalFormat -ceq 'legacy-pending' -and
    $proof.journalFingerprint -ceq $legacyHash -and
    $proof.transactionPhase -ceq 'pending-install-or-rollback' -and
    $proof.nativeOutcomeVerified -eq $false -and $proof.eligibleForLease -eq $false)
    'R2 native host reads immutable original legacy transaction journal, still no owner token'
  [IO.File]::WriteAllText($pending,$legacy.Replace('1.24.2','1.24.3'))
  $changed=Run-Host $inspectRequest
  Check ($changed.journalFingerprint -cne $legacyHash -and
    $changed.transactionPhase -ceq 'pending-install-or-rollback' -and
    $changed.nativeOutcomeVerified -eq $false)
    'R2 journal byte revision changes without laundering an update outcome'
  [IO.File]::WriteAllText($lockFile,'busy')
  $proof=Run-Host $inspectRequest
  Check ($proof.status -ceq 'blocked' -and $proof.journal -ceq 'present' -and
    $proof.lock -ceq 'present') 'concurrent update lock and journal are both observed'
  Remove-Item -LiteralPath $pending
  $proof=Run-Host $inspectRequest
  Check ($proof.status -ceq 'blocked' -and $proof.journal -ceq 'absent' -and
    $proof.lock -ceq 'present') 'native lock alone blocks, even without journal'
  Check ($proof.transactionPhase -ceq 'lock-unverified' -and
    $proof.identityBound -eq $false -and $null -eq $proof.journalFingerprint)
    'R2 lock artifact never certifies terminal native update'
  Remove-Item -LiteralPath $lockFile
  $proof=Run-Host $inspectRequest
  Check ($proof.status -ceq 'unverified' -and $proof.journal -ceq 'absent' -and
    $proof.lock -ceq 'absent' -and $proof.nativeOutcomeVerified -eq $false -and
    $proof.rollbackVerified -eq $false -and $proof.eligibleForLease -eq $false) 'artifact disappearance cannot attest native rollback or completed update'
  Check (-not (Test-Path -LiteralPath (Join-Path $state 'updater.jsonl'))) 'native inspection never creates updater event log'
  $env:KAR_NATIVE_HOST_INSPECT_TEST_ROOT='C:\\Windows'
  $proof=Run-Host $inspectRequest
  Check ($proof.ok -eq $true -and $proof.status -ceq 'unverified' -and
    $proof.journal -ceq 'unknown' -and $proof.lock -ceq 'unknown' -and
    $proof.eligibleForLease -eq $false) 'out-of-TEMP CI root cannot redirect native inspection to real files'
  Check ($proof.transactionPhase -ceq 'unknown' -and
    $proof.identityBound -eq $false -and
    $null -eq $proof.journalFingerprint)
    'R2 path rejection preserves unknown transaction identity'
  $env:KAR_NATIVE_HOST_INSPECT_TEST_ROOT=$inspectRoot
  Expect-Deny ('{"protocol":1,"requestId":"'+$id+'","operation":"inspect_transaction","path":"C:\\\\unsafe"}') 'INVALID_REQUEST'
 } finally {
  $env:KAR_NATIVE_HOST_INSPECT_TEST_ROOT=$previousRoot
  if (Test-Path -LiteralPath $inspectRoot) { Remove-Item -LiteralPath $inspectRoot -Recurse -Force }
 }
 & $installer -Action verify @params | Out-Null
 Check ($true) 'receipt intact after protocol tests'
 $failed=$false
 try { & $installer -Action install @params | Out-Null } catch { $failed=$true }
 Check $failed 'existing host cannot be overwritten'
 & $installer -Action uninstall @params | Out-Null
 Check (-not (Test-Path -LiteralPath $exe) -and -not (Test-Path -LiteralPath $reg)) 'uninstall removes only owned host and registry entry'
 Check ($good -ge 23) 'minimum native host assertions'
 Write-Host ("PASS KAR-64 Native Messaging host suite: $good assertions; real owner-PC Chrome activation PENDING")
} finally {
 if (Test-Path -LiteralPath $reg) { Remove-Item -LiteralPath $reg -Force -ErrorAction SilentlyContinue }
 if (Test-Path -LiteralPath $base) { Remove-Item -LiteralPath $base -Recurse -Force -ErrorAction SilentlyContinue }
}
