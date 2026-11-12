# KAR-167 — File-level repository hygiene and compatibility audit

**Baseline:** `main@a1f7878c87deee96d8da1f0ee6c6d1215e9fcfa3`, version `1.23.57`; Git tree returned 768 tracked files without truncation. This is a historic baseline, not a substitute for fresh GitHub state.

## Disposition and risk contract

- The complete 768-file baseline classification (including original blob SHA, size, conservative keep/move/delete decisions) is saved in [FILE_INVENTORY_MAIN_A1F7878.json](FILE_INVENTORY_MAIN_A1F7878.json). Files kept due to potential reference/safety duties are deliberately **not** asserted to be unused.
- Exactly **28** legacy architecture JSONs are relocated byte-for-byte to `docs/history/architecture/`, while test references are updated. Their names retain version identity; historical evidence is not deleted.
- Exact root Chrome entrypoints (`app.html`, `app.css`, `popup.html`, `popup.css`, `manifest.json`, `package.json`, `package-lock.json`) remain where packaging and platform loading expect them.
- `README.md`, `CHANGELOG.md` and `APP_ID.txt` remain in root because `scripts/package.py` includes them in the immutable installable Chrome ZIP; editing them without a new version/ZIP would break exact package parity.
- Two KAR-50-specific, fixed-version one-shot files are retired only after checking historical scope, inactive dedicated branch and replacement generic tooling. Their Git history remains retrievable.
- All committed Chrome ZIPs and Windows kits under `release/` are preserved. No Release/tag assets are touched.
- Historic `tests/` source- and version-coupled contracts remain: a file being old does not prove it is dead. Root reference migration must be validated by exact-HEAD hosted CI.
- `icons/` master/source art is retained pending image provenance/active asset map; `lib/update-idle-policy.js` is retained because `tests/kar97-update-idle-policy.cjs` imports it explicitly.

## Root directory (40 baseline files)

| Baseline group | Count | Decision |
| --- | ---: | --- |
| `architecture-baseline-v1.23.0.json` and `architecture-progress-v1.23.*.json` | 28 | **MOVE** preserving exact blobs, test links rewritten |
| `manifest.json`, `package*.json`, `app.*`, `popup.*` | 7 | **KEEP ROOT** — package/Chrome entrypoints |
| `README.md`, `CHANGELOG.md`, `APP_ID.txt` | 3 | **KEEP ROOT** — ZIP and identity evidence |
| `DEVELOPMENT.md` | 1 | **KEEP ROOT** — intentional docs entrypoint |
| `.gitignore` | 1 | **KEEP ROOT** — repository metadata |

## Docs: full 17/17 individually audited

| Document (original path preserved) | Ownership / use | Decision |
| --- | --- | --- |
| `docs/DEVELOPMENT_GUIDELINES.md` | Normative development policy | KEEP (stable canonical path) |
| `docs/DEV_OPS.md` | Historical ruleset configuration evidence | KEEP; refresh stale status annotation |
| `docs/GITHUB_HOWTO.md` | Normative GitHub and recovery guidance | KEEP (stable canonical path) |
| `docs/INITIAL_PROMPT.md` | Canonical fresh-chat entrypoint | KEEP (stable canonical path) |
| `docs/KAR85_WINDOWS_UPDATER_MODAL_QA.md` | Historical KAR-85 UI QA | KEEP (historic deep links); mark historical |
| `docs/KAR86_APPROVED_CHANNEL_QA.md` | Historical KAR-86 status QA | KEEP (historic deep links); mark historical |
| `docs/KAR90_UPDATER_MODAL_UX_QA.md` | Historical KAR-90 UX QA | KEEP (historic deep links); mark historical |
| `docs/KAR91_WINDOWS_CONSOLE_QA.md` | Historical KAR-91 Windows QA | KEEP (historic deep links); mark historical |
| `docs/KAR97_UPDATE_IDLE_POLICY.md` | Historical isolated candidate policy (not permission) | KEEP (critical fail-closed policy evidence) |
| `docs/PROJECT_CONTEXT.md` | Canonical product and safety context | KEEP (stable canonical path) |
| `docs/RELEASE_PROCESS.md` | Normative release workflow guidance | KEEP (stable canonical path) |
| `docs/WINDOWS_NATIVE_HOST_WAVE1.md` | Historical Windows NativeHost Phase-1 technical guide | KEEP; annotate historical version |
| `docs/WINDOWS_NATIVE_INAPP_WAVE02B.md` | Historical read-only native status guide | KEEP; keep explicit apply limitations |
| `docs/WINDOWS_ONECLICK_UPDATER.md` | Windows one-click technical guide | KEEP (active integration guidance) |
| `docs/WINDOWS_UPDATER_PHASE1.md` | Manual Windows updater guide | KEEP; clarify Phase-2 read-only status |
| `docs/templates/WORK_PATH_ROLLING_COMMENT.md` | Executable Rolling Comment template | KEEP (mandatory contract path) |
| `docs/user-manuals/windows-updater-einrichten.md` | German end-user Windows guide | KEEP (user-facing link) |

**Documentation organization decision:** Add one [docs index](../README.md) with canonical policies, technical Windows guides, the user manual and historical QA/security evidence separated conceptually. Keep the 17 pre-existing physical document paths to preserve deep links from GitHub Issues, old instructions and user bookmarks; introduce `docs/history/architecture/` for root evidence and `docs/maintenance/` for the audit only. Do not invent duplicate policy documents or silently relocate live bootstrap/template paths.

## Historical one-shot retirement checks

| Path | Verified evidence / rationale |
| --- | --- |
| `.github/workflows/kar50-atomic-next-patch.yml` | Dedicated trigger only `work/KAR-50`, which is absent among live Work branches; no current main/Work generic CI relies on that dedicated trigger |
| `scripts/kar50-atomic-patch.py` | Hardcoded old `1.23.24 → 1.23.25`, branch `work/KAR-50`, executed only by dedicated old workflow; generic `scripts/kar-atomic-patch.py` remains |

References checked in main's `package.json`, `scripts/build.sh`, sampled KAR-50 tests, `README.md`, `CHANGELOG.md`, normative docs and active generic Work builder; no consumer of those two fixed-version paths was identified there. Because absence in sampled sources is not an exhaustive proof, exact-head CI and the new layout gate are mandatory before acceptance. Historical Git commits preserve both bodies for forensics.

## Required acceptance and boundaries

- Run `node tests/kar167-file-layout.cjs`, the full coverage/safety test gate, ZIP byte-parity, 9/9 packaged Chromium scenarios, and Windows updater fixtures in `KAR Work PR`; inspect all four jobs at exact branch HEAD.
- No source/runtime/manifest/identity/host permissions or behavior changes; a pure file/path/CI/docs cleanup must not be called a product release.
- Historical deep links into QA and normative documents stay valid; moved architecture snapshots are referenced from the docs index and from directly updated consuming tests.
- Keep issue #167 open until full live CI, review of unresolved assets and owner merge acceptance. No automatic merge or GitHub Release on this cleanup.

## Step D1 update — documentation physical organization and compatibility

- Nine full-text documents now live under `docs/history/qa/` (five KAR-specific historical QA/security records) and `docs/windows/` (four Windows technical updater/Native Messaging guides). Old `docs/KAR*.md` and `docs/WINDOWS_*.md` entrypoints are retained as short link pointers, so pre-existing GitHub deep links remain resolvable without maintaining duplicate full-text documents.
- Exact file-by-file source SHA, old→new mapping, updated local links and canonical/not-moved path policy are recorded in [DOCS_RELOCATION_MATRIX.md](DOCS_RELOCATION_MATRIX.md). This supersedes the initial physical-layout decision above, **without overriding historical snapshot values**.
- `docs/README.md` now links directly to new canonical locations, with focused subsection indexes at `docs/history/qa/README.md` and `docs/windows/README.md`.
- Preserve `docs/DEV_OPS.md` at its stable path because normative docs link to it; its text is explicitly labeled historical configuration evidence. Preserve all normative bootstrap/policy paths and the German user manual.
- D1 requires the executable old→new compatibility guard and complete Markdown link check to pass in exact-head hosted CI before it can be considered accepted. No merge, release or account operation is implied.
