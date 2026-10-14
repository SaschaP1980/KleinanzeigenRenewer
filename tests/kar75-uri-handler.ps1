# KAR-75 isolated CI-only Windows handler. Not an updater.
param([Parameter(Mandatory=$true)][string]$Marker)
$ErrorActionPreference = 'Stop'
if ($env:CI -cne 'true' -or $env:GITHUB_ACTIONS -cne 'true' -or $env:KAR75_POC -cne '1') { throw 'KAR75_LAB_ONLY' }
$root=[IO.Path]::GetFullPath($env:RUNNER_TEMP).TrimEnd('\','/')
$target=[IO.Path]::GetFullPath($Marker)
if (-not $target.StartsWith($root+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw 'KAR75_MARKER_OUTSIDE_RUNNER_TEMP' }
if ([IO.Path]::GetFileName($target) -cnotmatch '^kar75-[a-f0-9]{32}\.txt$') { throw 'KAR75_UNEXPECTED_MARKER' }
[IO.File]::WriteAllText($target,'KAR75_USER_CONSENT_HANDLER', [Text.Encoding]::ASCII)
