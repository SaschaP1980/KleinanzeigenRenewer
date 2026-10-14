# KAR-77 Wave C1 — trust-gated local URI handler, inert source only

## Observed device problem and limits

On the corporate-managed Windows PC, Chrome displayed an external-protocol confirmation
and a PowerShell process window after the user approved. The copied unsigned
`KAR75-Handler.ps1` had Mark-of-the-Web `ZoneId=3`; launching it via fixed
`-NonInteractive -File` ended with `AuthorizationManager check failed.`
These observations do not prove Microsoft Defender ASR was the cause.

**Crucial:** Writing a PowerShell script, verifying SHA-256 or adding a signature
does not grant enterprise execution trust. OS ASR/WDAC/AppLocker policy can still
block the signed handler. We have no enterprise signing/allowlisting authority.
No PowerShell policy changes, `Unblock-File`, task broker elevation, file relocation
or app reputation workarounds are permitted by this design.

## Delivered source-only components

- `tools/windows/KleinanzeigenRenewer-TrustedUriHandler.ps1`: zero-parameter
  inert local preview handler. Independently displays a native Windows Yes/No
  MessageBox explaining that any website can request the URI, and performs
  **no update, network, file, registry or process action**, even when Yes is clicked.
  No/Cancel denies. The default button is No. Unexpected URI/arguments deny.
- `tools/windows/Confirm-KleinanzeigenRenewer-UriHandlerTrust.ps1`: strictly
  **read-only** owner-side trust preflight. Candidate file must exist and not be
  a reparse point; its SHA-256 must match a separately pinned 64-hex value;
  Internet/restricted Zone.Identifier (`ZoneId>=3`) or malformed Zone metadata
  are refused; Windows Authenticode status must be `Valid` with a separately
  pinned expected 40-hex certificate thumbprint.
  This is not a signer, installer, registry registration or a runtime permission grant.
- `tests/windows-trusted-uri-wave-c1.ps1`: hosted CI Windows PowerShell 5.1
  negatives for missing candidate, bad digest, unsigned source, Internet-marked
  source, extra URI arguments and lack of update/mutation code surface. Disposable
  CI scratch files only. The test does not trust its own unsigned test source.

## Gates before any real owner-device application

1. Previous KAR75 test Chrome extension, HKCU URI registration and probe folder
   must be owner-confirmed removed with the original ownership-aware cleanup.
2. A company-compliant trusted certificate/software distribution channel must
   exist to obtain a signed, unblocked final script through *approved* means;
   do not self-sign or manually unblock files as a substitute for enterprise approval.
3. Only after the signed exact file is independently approved by system policy
   and the owner accepts a narrowly scoped installer wave may a URI scheme
   be registered under HKCU. The registered command must not forward `%1`.
4. Even an approved URI launch is not authenticated to the manager. A production
   update must require independent Windows-side explicit consent and preserve
   the immutable approved version/ZIP/SHA, Chrome-closed safety, journaling,
   rollback and manual browser reactivation rules of Phase 1.
5. A later Wave must separately prove a real managed-Chrome launch and an
   approved, read-only status check before considering an update call.

**Not shipped / not ready to install:** Wave C1 has no registration script, no
one-click update, no bypass switch, no signed artifact and no live Windows run.
No manifest, product version, published ZIP or approved channel changes.

Parent: #72. Previous hosted positive Chrome URI click: #75. Corporate-device
noninteractive AuthorizationManager failure: #75 canonical Rolling Comment.
