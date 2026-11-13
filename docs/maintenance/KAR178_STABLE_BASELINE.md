# KAR-178: Immutable historical stable baseline v1.23.48

## Owner-native acceptance and source provenance

The owner reported approximately **60 successfully renewed live advertisements** with the installed **v1.23.48** Chrome extension on **2026-11-09**. The owner separately confirmed that `Daten aktualisieren` works. This is native owner-reported product acceptance and **not** a claim that 60 distinct Ad-ID diagnostics were submitted, that hosted CI renewed real listings, or that all future category changes have native acceptance.

Primary evidence is the [KAR-143 canonical Rolling Comment](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/143#issuecomment-6748212424). The accepted Work source head was `3dd79502ad765a4b2f693db76bc5b2fab944d529` in [PR #144](https://github.com/SaschaP1980/KleinanzeigenRenewer/pull/144), merged into historical `main` as **`f2225155e403d89d07a674c9e20f397a4f86694d`** (the single intended target of `refs/tags/v1.23.48`). The historical manifest, npm package, package-lock root and release spec identify `1.23.48`.

Historical hosted evidence: [Work PR CI #42703769728](https://github.com/SaschaP1980/KleinanzeigenRenewer/actions/runs/42703769728) **4/4 SUCCESS**; [post-merge main CI #42708145765](https://github.com/SaschaP1980/KleinanzeigenRenewer/actions/runs/42708145765) **2/2 SUCCESS**, including 9/9 local-fixture Chromium E2E. These are not live-renewal proofs.

## Existing original installable archive

- Historical source: `f2225155e403d89d07a674c9e20f397a4f86694d`
- Existing unchanged file: [release/kleinanzeigen-renewal-chrome-v1.23.48.zip](https://github.com/SaschaP1980/KleinanzeigenRenewer/blob/f2225155e403d89d07a674c9e20f397a4f86694d/release/kleinanzeigen-renewal-chrome-v1.23.48.zip)
- Exact size: **772335 bytes**
- SHA-256: **`c709b084949891423ae36bd65fe8baa28278ee2725d5198fc26c7948987fa8d6`**
- Chrome extension ID: `hafahjhhgiipdegfkgacchmnacgblnah` (historical/current `APP_ID.txt` blob equal)
- The archive bytes and digest were independently read and recomputed from the **historical merge commit** during implementation of [KAR-178](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/178). Do not rebuild or overwrite this immutable archive.

## Historical publication contract

`v1.23.48` is an **owner-designated historical stable reference**, not `latest`, the current update/approved channel, a NativeHost update, or an instruction to downgrade. Preserve the **literal three-component tag** rather than renaming it `v1.23.48.0` as future [KAR-176](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/176) introduces 4-component comparisons.

The dedicated `.github/workflows/kar178-historical-stable-tag.yml` is a **one-shot, SHA/hash-fenced** historical annotated Git tag creation procedure, **not** `kar-release.yml`: it is triggered only when first added to `main`, only on its expected merge diff, checks no existing tag or GitHub Release, and creates the tag only at the original historical merge SHA. Its result and annotated tag-object/peeled target must be read back and recorded in the Issue. A Git tag is **not** a downloadable GitHub Release. Creating a separate GitHub Release with the already proven byte-identical ZIP requires distinct owner authorization; no automatic updater/channel promotion is permitted.

### Documentation package-parity boundary

`CHANGELOG.md` is an **included member of the installable Chrome ZIP** in `scripts/package.py`. Editing it without creating a new properly versioned archive fails the mandatory exact-ZIP parity gate; it is therefore intentionally **unchanged** in KAR-178. This non-packaged maintenance note plus the Issue's canonical Rolling Comment retain the historical stable acceptance record without modifying current v1.23.89 package bytes or claiming a new release.

## Separately owner-authorized GitHub Release publication (2026-11-13)

After the immutable annotated historical tag was verified and KAR-178 initially closed, the owner explicitly requested a **separate GitHub Release for that existing tag**. Issue #178 was reopened to document and verify this publication without rewriting the prior evidence.

The existing `.github/workflows/kar-release.yml` is restricted to the current `main` and an advancing version; it **must not** be used for a historical 1.23.48 Release. A new, narrow `.github/workflows/kar178-historical-stable-release.yml` publishes only when that workflow is **first added to `main`** in the expected four-file PR merge. It verifies the existing annotated tag's exact object SHA `99fcb135d6bac40a23287a370d373da35d856366`, peeled original merge SHA, all historical version/extension identity metadata, the original committed archive size/hash and Release absence.

The workflow uses a draft for initial upload and verifies the only asset by name, size, remote-download byte parity and SHA-256 **before** making the Release visible. Publication explicitly specifies `make_latest=false` and readbacks the unchanged latest-release identity. No new tag, rebuild, current-version change, ZIP rewrite, approved/update-channel promotion or account mutation is permitted. A missing/incorrect tag or existing Release is a fail-closed block, **not** permission to recreate, move, force-push or overwrite it. If publication fails after draft creation, inspect the exact draft/asset state before further action; never blindly replay the one-shot workflow.

The release notes must identify owner-reported approximately 60 real renewals on 2026-11-09 as historical native evidence, not as hosted CI results or independent per-Ad-ID logs; and list the historical commit, development path, ZIP bytes and SHA-256. Actual published Release URL, asset metadata/digest and latest-readback evidence belong in Issue #178's existing canonical Rolling Comment. This historical owner-approved exception does not alter the normal future-version `KAR Release` path.

### First historical Release attempt and permission-scoped recovery (2026-11-13)

The first owner-authorized Release publisher [run 43380692211](https://github.com/SaschaP1980/KleinanzeigenRenewer/actions/runs/43380692211) passed exact tag, historical source, extension-ID, ZIP byte length/SHA-256 and original ZIP manifest checks. The GitHub Actions `GITHUB_TOKEN` then received **HTTP 403 "Resource not accessible by integration"** when the script tried to list all repository Releases, before draft creation. Independent Release API readback showed no `v1.23.48` Release or draft, the annotated tag stayed fixed, and the latest Release remained `v1.23.24`.

The narrowly scoped recovery updates the *same* workflow, not a new publication path, and is executable on **only one main merge immediately following original failed publisher main `af27c843ed0777d7a6d9e26aeba88f265691912e`**, with exactly two modified files: this non-packaged maintenance note and `.github/workflows/kar178-historical-stable-release.yml`. Instead of the unsupported Releases-list call, it checks for an existing release by the exact tag with an authenticated 404-only fail-closed probe. It uses the public GitHub latest-Release endpoint to capture and compare the latest-release identity without granting additional token permissions. Draft upload, original-archive download/hash parity, final `make_latest=false`, tag/readback and the absence of updater promotion remain unchanged.

This recovery does not permit unlimited retries, ref moves, bypassing existing release collisions, or an unverified claim of successful publication. The new exact-head Work PR CI, merge/main CI, publisher run and final independent GitHub Release API readback must be recorded in Issue #178.
