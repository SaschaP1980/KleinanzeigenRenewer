# KAR-99 P1.3: Windows updater negative-only, read-only transaction journal probe.
# This must not attest native completion, all-owner IDLE or update lease eligibility.
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
if ($env:CI -ne 'true' -or $env:KAR_UPDATER_TEST_MODE -ne '1') { throw 'KAR99_JOURNAL_TEST_REQUIRES_CI' }
$inspector=Join-Path (Split-Path $PSScriptRoot -Parent) 'tools\windows\Inspect-KleinanzeigenRenewer-UpdateTransaction.ps1'
$base=Join-Path ([IO.Path]::GetTempPath()) ('kar99-journal-'+[Guid]::NewGuid().ToString('N'))
$root=Join-Path $base 'isolated'
$state=Join-Path $root 'State'
$journal=Join-Path $state 'pending.json'
$count=0
function Verify([bool]$condition,[string]$message) {
 if (-not $condition) { throw ('KAR99_JOURNAL_TEST_FAILED: '+$message) }
 $script:count++
 Write-Host ('PASS KAR-99 P1.3 '+$message)
}
function Inspect {
 $lines=@(& $inspector -TestRoot $root)
 return ($lines -join "`n").Trim()
}
$unknown='NATIVE_TRANSACTION_INSPECTION: status=unverified journal=absent nativeOutcomeVerified=false eligibleForLease=false'
$held='NATIVE_TRANSACTION_INSPECTION: status=blocked journal=present nativeOutcomeVerified=false eligibleForLease=false'
[void][IO.Directory]::CreateDirectory($base)
try {
 Verify ((Inspect) -ceq $unknown) 'missing journal remains unverified, never idle'
 Verify (-not (Test-Path -LiteralPath $root)) 'inspection does not create updater root'
 [void][IO.Directory]::CreateDirectory($state)
 [IO.File]::WriteAllText($journal,'{"schema":1,"backup":"backup-00000000000000000000000000000000"}')
 $bytes=[IO.File]::ReadAllBytes($journal)
 Verify ((Inspect) -ceq $held) 'persistent interrupted transaction blocks regardless of age'
 Verify ([Convert]::ToBase64String($bytes) -ceq [Convert]::ToBase64String([IO.File]::ReadAllBytes($journal))) 'journal bytes are untouched'
 Verify (-not (Test-Path -LiteralPath (Join-Path $state 'updater.lock'))) 'inspection does not open/create update lock'
 Verify (-not (Test-Path -LiteralPath (Join-Path $state 'updater.jsonl'))) 'inspection does not append updater event log'
 [IO.File]::WriteAllText($journal,'{not valid json')
 Verify ((Inspect) -ceq $held) 'malformed journal cannot be treated as safe'
 Remove-Item -LiteralPath $journal
 Verify ((Inspect) -ceq $unknown) 'journal disappearance is not native completion proof'
 Verify (-not (Test-Path -LiteralPath (Join-Path $state 'updater.lock'))) 'no lock or update mutation after repeated probes'
 Write-Host ('PASS KAR-99 P1.3 read-only journal inspection: '+$count+' checks')
} finally { if (Test-Path -LiteralPath $base) { Remove-Item -LiteralPath $base -Recurse -Force } }
