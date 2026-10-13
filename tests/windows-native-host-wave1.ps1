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
function Run-Host([byte[]]$request) {
 $psi=[Diagnostics.ProcessStartInfo]::new()
 $psi.FileName=$exe
 $psi.RedirectStandardInput=$true
 $psi.StandardInputEncoding=[Text.UTF8Encoding]::new($false) # Native Messaging is binary; no StreamWriter BOM.
 $psi.RedirectStandardOutput=$true
 $psi.RedirectStandardError=$true
 $psi.UseShellExecute=$false
 $psi.CreateNoWindow=$true
 $proc=[Diagnostics.Process]::Start($psi)
 try {
  $proc.StandardInput.BaseStream.Write($request,0,$request.Length)
  $proc.StandardInput.BaseStream.Flush()
  $proc.StandardInput.Close()
  $output=$proc.StandardOutput.BaseStream
  $header=New-Object byte[] 4
  $read=0
  while ($read -lt 4) {
   $n=$output.Read($header,$read,4-$read)
   if ($n -eq 0) { throw 'Native host returned no frame' }
   $read+=$n
  }
  $length=[uint32]$header[0] -bor ([uint32]$header[1] -shl 8) -bor ([uint32]$header[2] -shl 16) -bor ([uint32]$header[3] -shl 24)
  if ($length -lt 2 -or $length -gt 8192) { throw 'Invalid response frame length' }
  $data=New-Object byte[] ([int]$length)
  $read=0
  while ($read -lt $length) {
   $n=$output.Read($data,$read,([int]$length-$read))
   if ($n -eq 0) { throw 'Truncated native response' }
   $read+=$n
  }
  $text=[Text.Encoding]::UTF8.GetString($data)
  $value=$text|ConvertFrom-Json
  Check ($proc.WaitForExit(90000)) 'native host exits after one response'
  return $value
 } finally {
  if (-not $proc.HasExited) { $proc.Kill() }
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
 Check (@($reply.capabilities).Count -eq 2 -and @($reply.capabilities) -contains 'health' -and @($reply.capabilities) -contains 'check') 'only health/check exposed'
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
