# kleinanzeigen Manager

**kleinanzeigen Manager** is a Chrome Manifest V3 extension for capturing, preserving and managing your own Kleinanzeigen advertisements—including their images—and preparing controlled re-insertion from saved listing data. The **local manager inventory** and the **live Kleinanzeigen account** are different sources of information and are verified separately.

**Platform:** Chrome (minimum version declared in [the manifest](manifest.json): 109) · **Current source version:** [`manifest.json`](manifest.json) · **Installable packages:** [GitHub Releases](https://github.com/SaschaP1980/KleinanzeigenRenewer/releases) · **Version history:** [CHANGELOG.md](CHANGELOG.md)

## Why it exists

The project was created for two equally important practical reasons:

1. **Recover expired listings, including their photos.** Advertisements sometimes expire or disappear from Kleinanzeigen. Without a separate copy, the original title, description, technical attributes and images may no longer be recoverable. The manager lets you retain a reusable *local template* while its data is still available, so an expired advertisement can be recreated later **if the saved copy remains intact and usable**.
2. **Make routine re-insertion easier without relying on paid visibility promotion.** Instead of repeatedly using Kleinanzeigen's paid **`Nach oben schieben`** feature, the manager supports creating a *new listing* from a captured template quickly and repeatedly. **Re-insertion is not a bump of the original ad.** Posting limits, platform policies, payment requirements and confirmation steps still apply; new ads are not guaranteed to be free or accepted.

Inventory, profiles, controlled replacement, local trash, backup and recovery workflows developed around these two objectives. The manager is not an official Kleinanzeigen product.

## Features

- **Capture owned advertisements:** `Anzeigen erfassen` inventories eligible online listings, and `Geöffnete Anzeige erfassen` handles an eligible opened own ad. Saved data includes the identifiable listing fields, category/attributes and validated images in their captured order, subject to what the site actually exposes.
- **Manage local records:** separate inventory profiles and `Inventar`/`Papierkorb` views, with `Kachelansicht` and `Listenansicht`, supported local searches, selection and per-ad actions.
- **Re-insert individual or multiple ads:** prepare a new advertisement from an existing local record or compatible ZIP template. `Mehrere neu inserieren` manages a batch with per-item progress and error handling.
- **Choose verification depth:** `Vollprüfung` (Safe Mode, recommended) and `Schnellprüfung` (Fast Mode). Both retain identity, account, publication and other safety gates. Safe Mode includes independent verification before retiring the source listing.
- **Recover retained templates:** use eligible locally retained records, the currently implemented 30-day local trash and supported profile/ZIP backup and import/export options. Retention cannot recreate data that was never successfully captured.
- **Export diagnostics:** `Diagnosedaten herunterladen` produces a ZIP of relevant, privacy-filtered technical evidence for troubleshooting.
- **Windows update assistance:** optional read-only Native Messaging status/check support and a separately initiated Windows OneClick updater. **Automatic in-app installation is not yet accepted or generally enabled**; see [Windows updater guidance](docs/windows/WINDOWS_ONECLICK_UPDATER.md).

Features that are only planned—notably configurable trash-retention periods and direct in-manager editing of live ads—are tracked in [GitHub Issues](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues), not presented here as shipped.

## Requirements and installation

- A supported Chrome environment with Manifest V3. The manifest currently declares **Chrome 109** as the minimum; a supported browser version alone does not guarantee compatibility with changes to Kleinanzeigen's website.
- Access to your own Kleinanzeigen account. Account-sensitive workflows require the selected local inventory profile to match the verified live account.
- A trusted **installable Chrome ZIP**, obtained from an actual [published GitHub Release](https://github.com/SaschaP1980/KleinanzeigenRenewer/releases) or an explicitly approved [versioned repository ZIP](release/). Files in `release/` can be newer than the last published GitHub Release and must not automatically be treated as a newly approved public release.

For manual unpacked installation:

1. Extract the entire Chrome ZIP into a stable local folder.
2. Open `chrome://extensions` in Chrome and enable **Developer mode** (`Entwicklermodus`).
3. Select **Load unpacked** (`Entpackte Erweiterung laden`) and choose the extracted directory.
4. Open the extension and the manager, then verify the correct profile and signed-in Kleinanzeigen account before capturing or re-inserting listings.

**Do not uninstall an existing extension as a routine update step.** Uninstalling or resetting its Chrome profile can delete local images, templates and settings. Back up important content, preserve the existing installation identity and apply only a verified update procedure. The stable unpacked extension ID is `hafahjhhgiipdegfkgacchmnacgblnah`.

On Windows, updater and NativeHost setup are optional, per-user where supported, and subject to system/company policy. A missing or blocked NativeHost does not make an in-browser automatic update safe. See [Windows setup instructions](docs/user-manuals/windows-updater-einrichten.md), [OneClick updater](docs/windows/WINDOWS_ONECLICK_UPDATER.md) and the [release policy](docs/RELEASE_PROCESS.md).

## Quick start

1. Sign in to your **own** Kleinanzeigen account and open the manager.
2. Choose or create the appropriate `Inventarprofil`. Check the observed `Angemeldet als` account against that profile; missing or contradictory account evidence disables sensitive actions.
3. Use `Anzeigen erfassen` or `Geöffnete Anzeige erfassen`. Verify that the resulting local records contain the needed text, attributes and photos.
4. In the inventory, choose `Neu inserieren` for one saved record or `Mehrere neu inserieren` for an eligible batch. Choose `Vollprüfung` for the recommended fuller replacement checks.
5. Follow status and review prompts, complete any required action on Kleinanzeigen explicitly and verify the result. Review local `Papierkorb` entries when relevant.

**For a listing that has already expired:** first locate an existing local saved record or usable backup. If its original information or images were not captured—or were subsequently purged—there may be nothing to reconstruct. Live category changes, required fields, paid insertion or account uncertainty can still prevent a prepared template from being republished.

## Safety and operational boundaries

- **Account and profile binding:** the selected local profile must agree with the independently observed current Kleinanzeigen account. Uncertain identity fails closed.
- **Exact ad identity:** a new listing has its own ad ID. Safe Mode first verifies the newly published ad independently, then retires the old one only against the authoritative *source ad ID* and verified account; title, price or visual similarity alone never authorize deletion.
- **Guarded publication:** the normal website controls and exact saved-field/required-field verification remain in force. Posting restrictions, checkout or category/schema drift may require an explicit user decision or stop the workflow.
- **Safe versus Fast:** `Schnellprüfung` shortens parts of the workflow but does not remove fundamental identity, lock or publication-safety checks. `Vollprüfung` adds stronger post-publication comparison/retirement requirements.
- **Interruption and recovery:** Chrome tabs or the MV3 service worker can restart. A local workflow reset cannot establish an unknown remote action as successful, and a local trash record is not equivalent to an online Kleinanzeigen ad.
- **Local versus remote deletion:** removing a local inventory or trash record does not delete an online ad. A separate, independently verified Phase-4 replacement operation may retire the remote source ad under exact source-ID/account checks.
- **Publish hard gate:** the renewal workflow can automatically trigger the site's normal publish control only after every required hard-gate check has passed. It must never bypass the real website submit controls; manual review/payment actions may still be required.
- **Website compatibility:** Kleinanzeigen can change page structure and category forms. Saving a template does not guarantee permanent form compatibility or lossless future recreation.

## Local data, diagnostics and privacy

Listing metadata, validated image bytes, inventory profiles and workflow state are held in the extension's local Chrome storage and IndexedDB. The current trash retention policy is **30 days**. Loss of the browser profile, removal of the extension or an unusable backup can lose the only remaining copy of an expired advertisement.

A diagnostic ZIP is generated by the explicit `Diagnosedaten herunterladen` action. It may contain ad IDs, technical field and form evidence, statuses, timestamps and URLs. Sensitive fields are redacted where supported, but **inspect diagnostic archives before sharing them** and treat them as potentially sensitive. This document does not claim all diagnostic data is harmless, or that interacting with the real Kleinanzeigen website makes no remote requests.

## Releases, development and project documentation

**A source-tree version is not proof of a published GitHub Release.** Compare the [source manifest](manifest.json), [published release assets](https://github.com/SaschaP1980/KleinanzeigenRenewer/releases), the [repository ZIP archive](release/) and the [canonical CHANGELOG](CHANGELOG.md) as separate pieces of evidence.

For development, install the pinned dependencies with `npm ci`; run the safety and coverage gate via `bash scripts/coverage-gate.sh`; build a package with `python3 scripts/package.py <output-directory>`. Browser fixture tests are documented in [tests/e2e/README.md](tests/e2e/README.md); hosted CI uses local, logged-out fixtures rather than real account publication or deletion.

The canonical reference material is organized under [the docs index](docs/README.md): [project context and safety](docs/PROJECT_CONTEXT.md), [initial prompt/recovery](docs/INITIAL_PROMPT.md), [development guidelines](docs/DEVELOPMENT_GUIDELINES.md), [GitHub workflow](docs/GITHUB_HOWTO.md), [release process](docs/RELEASE_PROCESS.md), [Windows manuals](docs/windows/README.md) and [test overview](tests/README.md). [Historical text from the old README](docs/history/README_GUIDANCE_PRE_KAR170.md) is retained for provenance only; it is not current guidance.

**Version-specific changes belong in [CHANGELOG.md](CHANGELOG.md), never in this README.** Development progress, exact commit/CI evidence and outstanding scope belong in the relevant [GitHub Issues](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues).
