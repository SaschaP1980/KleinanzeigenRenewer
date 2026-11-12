# KAR-167 — Documentation relocation and compatibility matrix (D1)

**Baseline:** previous safe work HEAD `ca6840a0bc87d3d7ced9b7ed434b1003b215d730`, old `main@a1f7878c87deee96d8da1f0ee6c6d1215e9fcfa3`. At resume the live `main` advanced to `e5b1ebceab4bd16116f1cd6532f08e56e1cdfde2` (v1.23.59). This evidence records a source/path-only move and must not be confused with current live release state.

## Normative paths intentionally not moved

`docs/INITIAL_PROMPT.md`, `PROJECT_CONTEXT.md`, `GITHUB_HOWTO.md`, `DEVELOPMENT_GUIDELINES.md`, `RELEASE_PROCESS.md`, `docs/DEV_OPS.md` (historical config record with active references), `docs/templates/WORK_PATH_ROLLING_COMMENT.md` and `docs/user-manuals/windows-updater-einrichten.md` remain in place. The canonical bootstrap and Rolling Comment template have no path changes. Their Git blob SHAs are unchanged by D1.

## Moved full-text canonical documents (9)

The old path is kept as a **small Markdown forward-link**, not a duplicated copy; this avoids breaking older Issue/PR/manual/bookmark links. The full historical content is preserved in the new canonical file. Internal relative links were adjusted only where the document's new depth requires it; Git history retains the original bytes and the source blob SHA below.

| Compatible old path (pointer) | New canonical document (full text) | Role | Source Git blob SHA |
| --- | --- | --- | --- |
| [`docs/KAR85_WINDOWS_UPDATER_MODAL_QA.md`](../KAR85_WINDOWS_UPDATER_MODAL_QA.md) | [`docs/history/qa/KAR85_WINDOWS_UPDATER_MODAL_QA.md`](../history/qa/KAR85_WINDOWS_UPDATER_MODAL_QA.md) | Historical QA | `aefbca67b4f090842901500a7cca70270ac59518` |
| [`docs/KAR86_APPROVED_CHANNEL_QA.md`](../KAR86_APPROVED_CHANNEL_QA.md) | [`docs/history/qa/KAR86_APPROVED_CHANNEL_QA.md`](../history/qa/KAR86_APPROVED_CHANNEL_QA.md) | Historical QA | `d1d423f1307b2584aef42fa554249241cc0332da` |
| [`docs/KAR90_UPDATER_MODAL_UX_QA.md`](../KAR90_UPDATER_MODAL_UX_QA.md) | [`docs/history/qa/KAR90_UPDATER_MODAL_UX_QA.md`](../history/qa/KAR90_UPDATER_MODAL_UX_QA.md) | Historical QA | `12ae885073863208e195dd666f591b3041901dd8` |
| [`docs/KAR91_WINDOWS_CONSOLE_QA.md`](../KAR91_WINDOWS_CONSOLE_QA.md) | [`docs/history/qa/KAR91_WINDOWS_CONSOLE_QA.md`](../history/qa/KAR91_WINDOWS_CONSOLE_QA.md) | Historical QA | `722eb6e29eb55c9c342723ef86e81d5b4908fd82` |
| [`docs/KAR97_UPDATE_IDLE_POLICY.md`](../KAR97_UPDATE_IDLE_POLICY.md) | [`docs/history/qa/KAR97_UPDATE_IDLE_POLICY.md`](../history/qa/KAR97_UPDATE_IDLE_POLICY.md) | Historical QA | `9322d0fc4d544e2c353f9f297872c3630228cbf2` |
| [`docs/WINDOWS_NATIVE_HOST_WAVE1.md`](../WINDOWS_NATIVE_HOST_WAVE1.md) | [`docs/windows/WINDOWS_NATIVE_HOST_WAVE1.md`](../windows/WINDOWS_NATIVE_HOST_WAVE1.md) | Windows technical | `4f23ded0720fb62215575c94f020112029c250ee` |
| [`docs/WINDOWS_NATIVE_INAPP_WAVE02B.md`](../WINDOWS_NATIVE_INAPP_WAVE02B.md) | [`docs/windows/WINDOWS_NATIVE_INAPP_WAVE02B.md`](../windows/WINDOWS_NATIVE_INAPP_WAVE02B.md) | Windows technical | `40e92f7919cd2475979b976d964ad0c454e03ec7` |
| [`docs/WINDOWS_ONECLICK_UPDATER.md`](../WINDOWS_ONECLICK_UPDATER.md) | [`docs/windows/WINDOWS_ONECLICK_UPDATER.md`](../windows/WINDOWS_ONECLICK_UPDATER.md) | Windows technical | `05a82fb340ba3464712fc5a8b75159855664cb56` |
| [`docs/WINDOWS_UPDATER_PHASE1.md`](../WINDOWS_UPDATER_PHASE1.md) | [`docs/windows/WINDOWS_UPDATER_PHASE1.md`](../windows/WINDOWS_UPDATER_PHASE1.md) | Windows technical | `0aa15d36dd61872443d3fcd51e963f21ccdc3765` |

## Navigation and link protection

- [Documentation index](../README.md) links directly to canonical files, not to compatibility pointers.
- [Historical QA index](../history/qa/README.md) and [Windows technical index](../windows/README.md) separate current user-facing guidance from old Wave evidence.
- Existing canonical normative documents, their GitHub references, all old 17 docs paths and the original German user guide continue to resolve.
- Rebase links in relocated historical QA preambles from `README.md` to `../../README.md`, and KAR-90 user manual link to `../../user-manuals/windows-updater-einrichten.md`. Existing Windows Phase-1→Phase-2B link stays within `docs/windows/`. One raw `docs/WINDOWS_NATIVE_HOST_WAVE1.md` reference is updated to its new canonical path.
- New path/compatibility checks run inside `tests/kar167-file-layout.cjs` as part of the mandatory coverage gate; the existing Markdown link walker checks all `docs/**/*.md` local links and old path presence.

## Documentation audit boundaries

- No live Kleinanzeigen account or Chrome product action. No source JS, Chrome identity, manifest or committed extension ZIP changes.
- Historic QA policy outcomes are labeled **historical**, not silently treated as current/authorizing. In particular, KAR-97 `candidate-idle` still **never authorizes updating**.
- External links are deliberately not rewritten; they point to historical GitHub Issues/Actions evidence.
- All 28 previously moved architecture JSON snapshots retain their original Git blob SHA. Their link/index files remain authoritative for archived content only.
- If any consumer requires full content at an old path rather than following a Markdown link, it must be discovered and migrated explicitly; this cleanup is accepted only after exact-head hosted 4/4 validation and artifact parity.
