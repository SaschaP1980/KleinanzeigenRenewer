# KAR-64 Wave 01: standalone, per-user, read-only native host installer.
# Requires Windows PowerShell 5.1 and .NET Framework C# compiler; no administrator rights.
[CmdletBinding()]
param(
 [ValidateSet('install','verify','uninstall')][string]$Action = 'verify',
 [switch]$Yes,
 [string]$TestRoot,
 [string]$TestHostName
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$TestMode=($env:CI -eq 'true' -and $env:KAR_NATIVE_HOST_TEST_MODE -eq '1')
if (($TestRoot -or $TestHostName) -and -not $TestMode) { throw 'KAR_NATIVE_TEST_DISABLED' }
$Root=if ($TestRoot) {
 $temp=[IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\','/')
 $path=[IO.Path]::GetFullPath($TestRoot)
 if (-not $path.StartsWith($temp+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw 'KAR_NATIVE_TEST_ROOT_INVALID' }
 $path
} else { Join-Path $env:LOCALAPPDATA 'KleinanzeigenRenewer' }
$HostName=if ($TestHostName) {
 if ($TestHostName -notmatch '^de\.kleinanzeigenrenewer\.updater\.ci\.[a-f0-9]{32}$') { throw 'KAR_NATIVE_TEST_NAME_INVALID' }
 $TestHostName
} else { 'de.kleinanzeigenrenewer.updater' }
$Origin='chrome-extension://hafahjhhgiipdegfkgacchmnacgblnah/'
$Live=Join-Path $Root 'NativeHost'
$Manifest=Join-Path $Live 'host.json'
$Exe=Join-Path $Live 'KleinanzeigenRenewer.NativeHost.exe'
$Updater=Join-Path $Live 'KleinanzeigenRenewer-Updater.ps1'
$Receipt=Join-Path $Live 'host-receipt.json'
$Reg='HKCU:\Software\Google\Chrome\NativeMessagingHosts\'+$HostName
$SourceRoot=Split-Path $PSScriptRoot -Parent
$HostSource=Join-Path $PSScriptRoot 'KleinanzeigenRenewer.NativeHost.cs'
$UpdaterSource=Join-Path $PSScriptRoot 'KleinanzeigenRenewer-Updater.ps1'
function Assert([bool]$condition,[string]$reason) { if (-not $condition) { throw ('KAR_NATIVE_HOST_FAILED: '+$reason) } }
function Consent([string]$reason) {
 if (-not $Yes) { Assert ((Read-Host ($reason+'; type JA to proceed')) -ceq 'JA') 'User did not approve change' }
}
function Digest([string]$file) { return (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant() }
function Check-Install {
 Assert (Test-Path -LiteralPath $Exe -PathType Leaf) 'Missing installed binary'
 Assert (Test-Path -LiteralPath $Updater -PathType Leaf) 'Missing read-only updater delegate'
 Assert (Test-Path -LiteralPath $Manifest -PathType Leaf) 'Missing host manifest'
 Assert (Test-Path -LiteralPath $Receipt -PathType Leaf) 'Missing install receipt'
 $m=Get-Content -LiteralPath $Manifest -Raw | ConvertFrom-Json
 $r=Get-Content -LiteralPath $Receipt -Raw | ConvertFrom-Json
 Assert ($m.name -ceq $HostName -and $m.type -ceq 'stdio' -and $m.description -ceq 'Kleinanzeigen Renewer read-only updater status host') 'Host manifest mismatch'
 Assert ([string]$m.path -ceq $Exe) 'Host binary path mismatch'
 Assert (@($m.allowed_origins).Count -eq 1 -and [string]$m.allowed_origins[0] -ceq $Origin) 'Forbidden Chrome extension origin'
 Assert ($r.schema -eq 1 -and $r.hostVersion -eq '1') 'Receipt schema mismatch'
 Assert ([string]$r.binarySha256 -ceq (Digest $Exe)) 'Native host binary digest mismatch'
 Assert ([string]$r.updaterSha256 -ceq (Digest $Updater)) 'Updater delegate digest mismatch'
 Assert ([string]$r.manifestSha256 -ceq (Digest $Manifest)) 'Host manifest digest mismatch'
 Assert (Test-Path -LiteralPath $Reg) 'Native Messaging registry key missing'
 $key=(Get-Item -LiteralPath $Reg).GetValue('')
 Assert ([string]$key -ceq $Manifest) 'Native Messaging registry points elsewhere'
 Write-Host ('PASS KAR-64 NATIVE_HOST_VERIFIED: name='+$HostName+' origin='+$Origin)
}
if ($Action -eq 'verify') { Check-Install;return }
if ($Action -eq 'uninstall') {
 Assert (Test-Path -LiteralPath $Reg) 'Host registry key missing'
 Assert ([string](Get-Item -LiteralPath $Reg).GetValue('') -ceq $Manifest) 'Registry ownership mismatch'
 Check-Install
 Consent 'Unregister the read-only Native Messaging helper'
 Remove-Item -LiteralPath $Reg -Force
 Remove-Item -LiteralPath $Live -Recurse -Force
 Write-Host 'PASS KAR-64 NATIVE_HOST_UNINSTALLED (extension/profile untouched)'
 return
}
Assert ($Action -eq 'install') 'Unsupported operation'
Assert (-not (Test-Path -LiteralPath $Live)) 'NativeHost directory already exists; no unsafe overwrite'
Assert (-not (Test-Path -LiteralPath $Reg)) 'Host registry entry already exists; no unsafe overwrite'
Assert ((Test-Path -LiteralPath $HostSource -PathType Leaf) -and (Test-Path -LiteralPath $UpdaterSource -PathType Leaf)) 'Required trusted source files missing'
Consent 'Install read-only per-user Native Messaging host'
[void][IO.Directory]::CreateDirectory($Root)
$Stage=Join-Path $Root ('NativeHost-Staging-'+[Guid]::NewGuid().ToString('N'))
[void][IO.Directory]::CreateDirectory($Stage)
$regCreated=$false
try {
 $stageExe=Join-Path $Stage 'KleinanzeigenRenewer.NativeHost.exe'
 Add-Type -Path $HostSource -ReferencedAssemblies @('System.Web.Extensions.dll') -OutputAssembly $stageExe -OutputType ConsoleApplication
 Assert (Test-Path -LiteralPath $stageExe -PathType Leaf) 'C# host compilation failed'
 Copy-Item -LiteralPath $UpdaterSource -Destination (Join-Path $Stage 'KleinanzeigenRenewer-Updater.ps1')
 $hostJson=@{
   name=$HostName;description='Kleinanzeigen Renewer read-only updater status host';
   path=$Exe;type='stdio';allowed_origins=@($Origin)
 } | ConvertTo-Json -Depth 5
 [IO.File]::WriteAllText((Join-Path $Stage 'host.json'),$hostJson,([Text.UTF8Encoding]::new($false)))
 $receiptJson=@{
   schema=1;hostVersion='1';
   binarySha256=(Digest $stageExe);
   updaterSha256=(Digest (Join-Path $Stage 'KleinanzeigenRenewer-Updater.ps1'));
   manifestSha256=(Digest (Join-Path $Stage 'host.json'))
 } | ConvertTo-Json -Depth 4
 [IO.File]::WriteAllText((Join-Path $Stage 'host-receipt.json'),$receiptJson,([Text.UTF8Encoding]::new($false)))
 Move-Item -LiteralPath $Stage -Destination $Live
 New-Item -Path $Reg -Force | Out-Null
 $regCreated=$true
 Set-Item -LiteralPath $Reg -Value $Manifest
 Check-Install
 Write-Host 'PASS KAR-64 NATIVE_HOST_INSTALLED (read-only, no Chrome permission or file update)'
} catch {
 if ($regCreated -and (Test-Path -LiteralPath $Reg)) {
  $owned=(Get-Item -LiteralPath $Reg).GetValue('')
  if ([string]$owned -ceq $Manifest) { Remove-Item -LiteralPath $Reg -Force }
 }
 if (Test-Path -LiteralPath $Live) { Remove-Item -LiteralPath $Live -Recurse -Force }
 throw
} finally {
 if (Test-Path -LiteralPath $Stage) { Remove-Item -LiteralPath $Stage -Recurse -Force }
}
