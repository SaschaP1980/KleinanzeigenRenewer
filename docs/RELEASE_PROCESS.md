# KAR Release Process

KAR deliberately uses a short release cycle. It does not copy the Candidate/Stage/Finalize chains of larger projects.

## 1. Source and artifacts

- Git `main` is the source authority.
- Do not publish Source ZIPs.
- A GitHub Release contains the installable Chrome package only:
  `kleinanzeigen-renewal-chrome-vX.Y.Z.zip`
- **Additionally**, archive exactly the same checked Chrome ZIP as `release/kleinanzeigen-renewal-chrome-vX.Y.Z.zip` on `main`, visible at https://github.com/SaschaP1980/KleinanzeigenRenewer/tree/main/release. This is a real committed repository file, not the GitHub Releases asset listing. SHA-256 and size must match the published asset.
- `scripts/archive-release-zip.sh` verifies the published single-asset Release, tag source commit, bytes, hash, ZIP manifest, and main SHA before a fast-forward-only push. It uses `git add -f` because `*.zip` is gitignored; the installable runtime package remains unchanged.
- Release notes must include the source commit SHA, development path, ZIP byte size and SHA-256.
- The Chrome extension identity/key must remain stable.

## 2. Development paths feeding a release

### Fast release

For Patch/Hotfix:

`fresh main → focused RED/GREEN if bug → validation → KAR Release(mode=fast)`

No Candidate. No mandatory PR.

### Work release

For Feature/Minor/Major:

`Issue → Rolling Comment → work/KAR-N → PR → KAR Work PR GREEN → merge main → KAR Release(mode=work)`

No Candidate.

The release workflow must not be used to bypass a missing Work/PR contract.

## 2a. Autonomous nonpublishing main CI

Every accepted push to `main` triggers `.github/workflows/kar-ci.yml`. This is the read-only autonomous feedback loop for Fast Path corrections: exact-commit runtime, safety, 100% dynamic public-function coverage, architecture, Chrome ZIP integrity and local-fixture packaged-browser E2E. It neither publishes a GitHub Release nor changes a Kleinanzeigen account. A newer push cancels stale in-flight main CI; skipped/cancelled and unexecuted gates are not PASS.

Analyze the first real RED on the exact SHA, correct narrowly, and commit again; the new main push should trigger a fresh CI. A trigger is only proven when a matching hosted run actually exists. Do not treat a prior SHA's GREEN as validation of an amended commit.

Manual `KAR Release(mode=fast|work)` remains the only GitHub Release publication entry point and requires explicit owner authorization. It independently executes its own mandatory gates on the to-be-published SHA.

## 3. Current hosted release gate

`.github/workflows/kar-release.yml` is the executable publication contract and must be read live before each release.

Its intended responsibilities are deliberately compact:

1. verify version identity and selected development path;
2. install dependencies;
3. run `scripts/coverage-gate.sh`;
4. build the installable Chrome ZIP once;
5. integrity-check the ZIP;
6. run packaged Browser E2E;
7. create the version tag/GitHub Release with exactly that lean ZIP asset;
8. commit that byte-identical ZIP to `main/release/` with the archive script (only after successful publish).

If the workflow currently differs from this document, executable workflow behaviour is stronger authority and the documentation must be corrected in the same workstream.

## 4. No duplicated heavyweight release work

Do not add repeated full builds, Candidate workflows, source-intake stages or postrelease pipelines merely for process symmetry.

Add a second build or extra hosted gate only when there is a concrete failure mode that cannot be covered cheaply and deterministically by the existing gate.

A failed workflow is evidence. Inspect the exact failing step/log and fix the narrow root cause; do not respond by blindly adding another pipeline layer.

## 5. Browser E2E

Packaged Browser E2E uses local fixtures and an isolated browser profile. It must not require a real Kleinanzeigen account and must not mutate real remote ads.

Read `tests/e2e/README.md` and the current runner before changing the E2E contract.

Infrastructure failure is failure/blocked, never a synthetic PASS.

## 6. Native acceptance

Hosted CI cannot prove live Kleinanzeigen compatibility for account-bound publication/deletion flows.

Native acceptance is a separate evidence class:

- real Windows/Chrome extension load;
- real account/profile binding;
- scope-specific smoke;
- when required, real Mass Renewal / Fast-3 performance and diagnostic export.

Never report native acceptance PASS unless it was actually executed.

## 7. Performance evidence

When a release/performance scope requires the Fast-3 run, carry both hardware Gold lines:

- reference computer: v1.23.20_c1 — 61.277 s total / 20.426 s average;
- old computer: v1.23.20_c1 — 110.340 s total / 36.771 s average.

Compare within the same machine line. Record three item durations, total, average, warning/error totals and diagnostic package SHA-256 when available.

## 8. Release state reconstruction

A fresh chat must distinguish:

- source version on `main`;
- existing version tag;
- existing GitHub Release;
- latest relevant Actions run;
- native acceptance state.

These are separate facts. Never infer a successful public Release merely because source `main` contains a version number or because a build passed locally.

## 9. Publication authorization

Analysis/planning requests do not authorize publication.

Implementation/build work follows the user's explicit scope. GitHub Release publication is performed when the user explicitly requests/authorizes release or manually starts the release workflow. Do not publish a new version merely because a fresh chat discovers unreleased source.

## 10. Release failure handling

On failure:

1. read the exact workflow run/job/log;
2. identify whether failure is product/test, packaging, E2E, permissions, GitHub infrastructure or workflow logic;
3. do not rerun blindly if source/workflow changed or the previous write outcome is ambiguous;
4. preserve the failed run as evidence;
5. apply the smallest correction using the correct Fast or Work path;
6. rerun only the required gate.

Do not mark an Issue/release complete while a mandatory gate is failed, skipped or not actually executed.
