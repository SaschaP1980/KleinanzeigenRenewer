# KAR-77 Wave C1 — intentionally inert local Windows URI handler source.
# A raw URI cannot authenticate Chrome or an extension. No URI argument is
# forwarded; this source contains NO updater, network, registration or child process.
# Deployment only after a separate trusted signing/distribution and enterprise
# execution-policy acceptance. Never override a managed security decision.
[CmdletBinding()]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ($args.Count -ne 0) {
    throw 'KAR77_URI_ARGUMENT_DENIED: fixed invocation only'
}

# An independent Windows-side decision is mandatory even for this inert preview.
# There is no execution path for installing, downloading or updating anything.
Add-Type -AssemblyName System.Windows.Forms -ErrorAction Stop
$message = @'
Kleinanzeigen Renewer: local handler safety preview ONLY.

An external URI can also be requested by unrelated websites.
An external URI alone does not authenticate the Kleinanzeigen Manager.

This preview will NOT check or install updates, change files, register tasks,
run an updater, or change Windows security settings.

Do you want to acknowledge this harmless preview?
'@
$reply = [System.Windows.Forms.MessageBox]::Show(
    $message,
    'Kleinanzeigen Renewer — local handler preview',
    [System.Windows.Forms.MessageBoxButtons]::YesNo,
    [System.Windows.Forms.MessageBoxIcon]::Information,
    [System.Windows.Forms.MessageBoxDefaultButton]::Button2
)
if ($reply -ne [System.Windows.Forms.DialogResult]::Yes) {
    Write-Output 'KAR77_LOCAL_CONSENT_DENIED: no action'
    exit 2
}
Write-Output 'KAR77_PREVIEW_ONLY: no update action implemented'
exit 0
