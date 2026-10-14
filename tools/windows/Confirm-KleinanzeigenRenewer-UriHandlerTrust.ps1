# KAR-77 Wave C1 — read-only trust preflight for a future user-authorized URI handler.
# This does NOT sign, unblock, install, register, start, or trust any file.
[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][ValidateNotNullOrEmpty()][string]$Candidate,
    [Parameter(Mandatory=$true)][ValidatePattern('^[a-fA-F0-9]{64}$')][string]$ExpectedSha256,
    [Parameter(Mandatory=$true)][ValidatePattern('^[a-fA-F0-9]{40}$')][string]$ExpectedSignerThumbprint
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Deny([string]$Reason) { throw ('KAR77_TRUST_DENIED: ' + $Reason) }
if ($args.Count -ne 0) { Deny 'EXTRA_ARGUMENTS' }
if (-not (Test-Path -LiteralPath $Candidate -PathType Leaf)) { Deny 'MISSING_CANDIDATE' }
$file = Get-Item -LiteralPath $Candidate -ErrorAction Stop
if (($file.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { Deny 'REPARSE_POINT' }
$actual = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256 -ErrorAction Stop).Hash
if ($actual -cne $ExpectedSha256.ToUpperInvariant()) { Deny 'HASH_MISMATCH' }

# Read the Mark-of-the-Web ADS only. Missing stream is accepted, but an
# existing stream that is malformed or originates in Internet/Restricted is not.
$streams = @(Get-Item -LiteralPath $file.FullName -Stream * -ErrorAction Stop)
$zoneStreams = @($streams | Where-Object { $_.Stream -ieq 'Zone.Identifier' })
if ($zoneStreams.Count -gt 1) { Deny 'ZONE_METADATA_INVALID' }
if ($zoneStreams.Count -eq 1) {
    # An unreadable/empty/malformed present ADS is a denial, not an absent mark.
    $ads = @(Get-Content -LiteralPath $file.FullName -Stream 'Zone.Identifier' -ErrorAction Stop)
    $zoneLines = @($ads | Where-Object { $_ -match '^ZoneId\s*=\s*(\d+)\s*$' })
    if ($zoneLines.Count -ne 1) { Deny 'ZONE_METADATA_INVALID' }
    $zone = [int]([regex]::Match($zoneLines[0], '^ZoneId\s*=\s*(\d+)\s*$').Groups[1].Value)
    if ($zone -ge 3) { Deny 'INTERNET_ZONE' }
}

$signature = Get-AuthenticodeSignature -LiteralPath $file.FullName -ErrorAction Stop
if ([string]$signature.Status -cne 'Valid' -or $null -eq $signature.SignerCertificate) {
    Deny 'SIGNATURE_NOT_VALID'
}
$thumbprint = [string]$signature.SignerCertificate.Thumbprint
if ($thumbprint.ToUpperInvariant() -cne $ExpectedSignerThumbprint.ToUpperInvariant()) {
    Deny 'UNEXPECTED_SIGNER'
}

# This proves only file metadata and Authenticode status observed by the
# current OS. It is never an ASR/WDAC acceptance or executable launch proof.
Write-Output ('KAR77_TRUST_PREFLIGHT_PASS: SHA256=' + $actual + ';Signer=' + $thumbprint.ToUpperInvariant())
