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
 # Verify that the executable rejects untrusted process arguments before
 # reading any framed input, without writes or stdout protocol confusion.
 $stem=Join-Path $base ('reject-args-'+[Guid]::NewGuid().ToString('N'))
 $inputFile=$stem+'.in'
 $outputFile=$stem+'.out'
 $errorFile=$stem+'.err'
 [IO.File]::WriteAllBytes($inputFile, (Frame '{"protocol":1,"requestId":"0123456789abcdef","operation":"health"}'))
 $proc=$null
 try {
  $options=@{ FilePath=$exe;PassThru=$true;NoNewWindow=$true;
   RedirectStandardInput=$inputFile;RedirectStandardOutput=$outputFile;RedirectStandardError=$errorFile }
  if (@($chromeArgs).Count -gt 0) { $options.ArgumentList=$chromeArgs }
  $proc=Start-Process @options
  $exited=$proc.WaitForExit(10000)
  Check $exited ('rejected launch exits: '+$label)
  Check ($proc.ExitCode -eq 2 -and (Get-Item -LiteralPath $outputFile).Length -eq 0) ('rejected launch leaves stdout empty: '+$label)
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
 Check (@($reply.capabilities).Count -eq 2 -and @($reply.capabilities) -contains 'health' -and @($reply.capabilities) -contains 'check') 'only health/check exposed'
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
