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

### KAR-52 reusable Work ZIP-only PATCH tooling

The repeatable, owner-dispatched entrypoint is scripts/kar-atomic-patch.py and .github/workflows/kar-atomic-patch.yml. The workflow only responds to an explicit workflow_dispatch on work/KAR-N with exact expected source and main SHAs. It calculates next compatible PATCH dynamically and requires exactly four version metadata files plus one new archived installable Chrome ZIP in an atomic Git commit. It checks clean source/archive byte parity, package/runtime closure, manifest identity/permissions and the full safety and coverage gate. Legacy historical GitHub Release objects/tags remain untouched; no release object or tag is a ZIP-only path requirement.

Before opening a PR, the canonical single Rolling Comment must be synchronized and read back at the exact new Work HEAD. The strict Work PR contract tolerates a short bounded API readback race but never accepts stale SHA or missing headings. GitHub bot pushes alone do not establish real Work PR CI. Preserve all nine Chromium E2E scenarios against the PR-committed ZIP and repeat the mandatory exact-main test after an owner-authorized merge. See docs/GITHUB_HOWTO.md. KAR-52 itself performs no PATCH bump or release.

### KAR-54: Connector-compatible one-shot Work PATCH trigger

The reusable builder retains its explicit SHA-pinned manual `workflow_dispatch` entry and adds a **strictly guarded push fallback** for the GitHub App connection (whose exposed API has no workflow dispatch action). On `work/KAR-N` only, create an **empty** commit with subject `ci(KAR-N): atomic PATCH base=<exact main 40-hex SHA>`, after the one canonical Rolling Comment has been saved/read back at the exact Work source head. The server-side workflow validates branch/issue syntax, commit subject, empty marker diff and both exact GitHub ref leases; the Python build entrypoint independently rechecks the same marker and SHA. The run uses full safety/coverage/clean-ZIP validation, atomically commits the same **four JSON version metadata paths plus one new Chrome ZIP**, pushes the new Work HEAD and synchronizes/read-backs the unique Issue comment. This mirrors historic KAR-50 but is generalized to an issue-bound branch.

Ordinary source pushes, stale main refs, nonempty marker commits, incorrect issue or malformed marker, and bot-made `build(KAR-N):` pushes may not start a builder job. A job skipped by that guard is **not a passing build**. Real Work PR CI must still be triggered via a genuine PR event after the resulting exact Work SHA has been verified. Do not merge without separate approval; ZIP-only `main/release/` delivery remains distinct from GitHub Release/tag publication. This entry follows discovery of the KAR-52 dispatch-only connector gap; actual hosted behavior must be proven under KAR-54, not assumed from configuration alone.

### KAR-58: Atomic branchless ZIP-only Fast PATCH

A Fast PATCH is **not** performed by pushing only the four metadata JSON files: `KAR CI` requires the corresponding new committed release ZIP on the same exact SHA. The existing `KAR Release(mode=fast)` creates a separate GitHub Release/tag and does not fulfill this ZIP-only pathway.

For owner-authorized narrow, regular 1.23.x PATCH: starting from a freshly verified green `main`, open/read an owning numbered issue and its **sole** canonical Rolling Comment with `Agent-State: ACTIVE`, exact `Base main` SHA and `Current phase: FAST TRIGGER`. The existing GitHub App creates an **empty** commit on `main` with exact subject `ci(KAR-N): fast PATCH base=<previous exact main SHA>`. No Work branch or PR is created. The empty marker retains the previous valid version and ZIP, so no invalid partially bumped `main` exists.

`.github/workflows/kar-fast-patch.yml` checks the explicit marker on `main`, pinned tree/parent and remote SHA, open issue and one exact active authorized canonical comment. `scripts/kar-fast-patch.py` reuses the pure version/metadata planner from `scripts/kar-atomic-patch.py`, canonical package builder and KAR-48 byte-identity verifier. It times version planning, ZIP generation, integrity/identity parity, full safety/coverage gate, commit/push and final CI dispatch separately. It stages **exactly** `manifest.json`, `package.json`, `package-lock.json`, `release/release-spec.json` and the one new `release/kleinanzeigen-renewal-chrome-vX.Y.Z.zip`; refuses extra edits, stale refs, collisions, changed old ZIP or hidden untracked files and pushes an ordinary **non-force fast-forward** five-path commit to `main`.

GitHub Actions' built-in `GITHUB_TOKEN` suppresses follow-on `push` workflow events, so the authenticated builder (least-privilege `actions:write`) calls the existing `KAR CI` **workflow_dispatch** after the new SHA is already readable on `main`. This exception to the event recursion suppression is part of GitHub Actions semantics; **actual** success must still be established by fetching the new `KAR CI` run with the **exact resulting main HEAD**, all mandatory coverage/runtime/ZIP-parity/Chromium-E2E steps completed GREEN. Dispatch acceptance, a skipped workflow, and the builder's own GREEN are *not* acceptance. If dispatch fails after the five-path commit, do not repeat the marker or force-reset main; preserve the build and checkpoint the missing CI evidence for supported recovery.

Preserve separate `KAR Work PR` and `KAR Release` entrypoints unchanged. This Fast pathway **never** creates a GitHub Release/tag, source ZIP or live-account mutation.
