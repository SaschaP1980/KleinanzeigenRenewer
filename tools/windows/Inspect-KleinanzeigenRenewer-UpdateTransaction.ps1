# KAR-99 P1.3: independent, offline, negative-only Windows update-journal witness.
# Never infers NativeHost outcome, completed rollback, all-owner idle or update permission.
[CmdletBinding()]
param([string]$TestRoot)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$testMode=($env:CI -eq 'true' -and $env:KAR_UPDATER_TEST_MODE -eq '1')
if ($TestRoot) {
 if (-not $testMode) { throw 'KAR99_INSPECTION_TEST_ROOT_DISABLED' }
 $temp=[IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\','/')
 $full=[IO.Path]::GetFullPath($TestRoot)
 if (-not $full.StartsWith($temp+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) {
  throw 'KAR99_INSPECTION_INVALID_TEST_ROOT'
 }
 $root=$full
} elseif ($env:LOCALAPPDATA) {
 $root=Join-Path $env:LOCALAPPDATA 'KleinanzeigenRenewer'
} else {
 Write-Output 'NATIVE_TRANSACTION_INSPECTION: status=unverified journal=unknown nativeOutcomeVerified=false eligibleForLease=false'
 return
}
$journal=Join-Path (Join-Path $root 'State') 'pending.json'
$presence='unknown'
$status='unverified'
try {
 if (Test-Path -LiteralPath $journal -ErrorAction Stop) {
  $presence='present'
  $status='blocked'
 } else { $presence='absent' }
} catch { $presence='unknown' }
Write-Output ("NATIVE_TRANSACTION_INSPECTION: status={0} journal={1} nativeOutcomeVerified=false eligibleForLease=false" -f $status,$presence)
