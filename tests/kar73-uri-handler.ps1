# KAR-73: CI-only URI protocol probe handler. NEVER an updater or privileged command.
[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$Marker)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ($env:CI -cne 'true' -or $env:KAR73_URI_POC_TEST_MODE -cne '1') {
    throw 'KAR73_LAB_ONLY: handler requires hosted CI opt-in'
}
if (-not $env:RUNNER_TEMP) { throw 'KAR73_RUNNER_TEMP_MISSING' }
$root = [IO.Path]::GetFullPath($env:RUNNER_TEMP).TrimEnd('\','/')
$target = [IO.Path]::GetFullPath($Marker)
if (-not $target.StartsWith($root + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'KAR73_UNSAFE_MARKER_PATH'
}
if ([IO.Path]::GetFileName($target) -cnotmatch '^kar73-proof-[a-f0-9]{32}\.txt$') {
    throw 'KAR73_UNSAFE_MARKER_NAME'
}
# No input URI, dynamic command, path, update action or browser/account data is accepted.
[IO.File]::WriteAllText($target, 'KAR73_WINDOWS_SHELL_URI_TRIGGERED', [Text.Encoding]::ASCII)
