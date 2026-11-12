# KAR-167 — D1 external GitHub reference census (in progress)

## Scope and verified starting point

This is a **bounded, reproducible search checkpoint**, not an exhaustive census of every Issue/PR body, comment, review and historical GitHub link. It documents live GitHub repository search performed on 2026-11-12 while `work/KAR-167@9584710b9955e502e2895056ebf431a31ed5ede2` was unmerged. The previous synchronized base was `main@e5b1ebceab4bd16116f1cd6532f08e56e1cdfde2`; newly observed main has advanced to `5189e949a9d5767d322aea4b736a288081ddb7b4` (v1.23.74). No new source/ZIP migration is implied by this evidence.

## Repository-scoped search queries

Used GitHub Issues search with `repo:SaschaP1980/KleinanzeigenRenewer` plus exact quoted terms. GitHub search results may include a match in an Issue/PR discussion or body even when the current Issue body does not contain that term. **Search-index hits are not an exhaustive enumeration of comments or all historical revisions**.

| Exact searched term | Matching Issue/PR numbers returned |
| --- | --- |
| `docs/KAR` | 167, 35, 25, 22, 162, 75, 26, 54, 141, 91, 79, 58, 103, 24, 72, 84, 97 |
| `docs/WINDOWS` | 167, 91, 79, 72, 81, 66, 80, 90, 85, 145, 94, 59, 63, 89, 86, 64, 141 |
| `WINDOWS_NATIVE_HOST_WAVE1` | 167, 66 |
| `WINDOWS_UPDATER_PHASE1` | 167, 145 |
| `docs/history/qa` | 167 |
| `icons/app-master` / `icons/taskbar-master` | 167 / 167 |
| `architecture-baseline-v1.23.0.json` | 167 |
| `architecture-progress-v1.23.19.json` | none found |
| `docs/maintenance` | 167 |

The nine historical documentation filenames were also queried individually: `KAR85_WINDOWS_UPDATER_MODAL_QA`, `KAR86_APPROVED_CHANNEL_QA`, `KAR90_UPDATER_MODAL_UX_QA`, `KAR91_WINDOWS_CONSOLE_QA`, `KAR97_UPDATE_IDLE_POLICY`, `WINDOWS_NATIVE_HOST_WAVE1`, `WINDOWS_NATIVE_INAPP_WAVE02B`, `WINDOWS_ONECLICK_UPDATER`, `WINDOWS_UPDATER_PHASE1`. Hits for exact filename without extension were: `WINDOWS_NATIVE_HOST_WAVE1` (#167, #66) and `WINDOWS_UPDATER_PHASE1` (#167, #145); remaining filename-term searches returned no hits. This **does not mean** that the files have no historical consumers (notably because broader prefix queries find further discussions).

## Independently inspected concrete historical references

- [Issue #66](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/66) body links to the original `docs/WINDOWS_NATIVE_HOST_WAVE1.md` path on `main` and relies on its pinned NativeHost hashes. **Keep the original Markdown path resolving**, but historical source SHA evidence must remain distinct from newer live instructions.
- [Issue #91](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/91) body explicitly names `docs/WINDOWS_ONECLICK_UPDATER.md` as the technical guide and `docs/user-manuals/windows-updater-einrichten.md` as the user manual. The former original path must remain a compatibility entrypoint, the latter must remain canonical and unchanged.
- [Issue #97](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/97) body explicitly enumerates `docs/KAR97_UPDATE_IDLE_POLICY.md` as a source-contract artifact. The original pointer must resolve, and the archived QA record must never be mistaken for authorization to apply an update.
- [Issue #145](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/145) body references historical `docs/WINDOWS_UPDATER_PHASE1.md` with a byte-identity/history argument. Preserve the original Markdown path and pinned historical source commits; do not overwrite their semantics with the newer current guide.

The nine original Markdown paths currently have explicit compatibility stubs on the Work branch, and the new canonical full texts are enumerated in [DOCS_RELOCATION_MATRIX.md](DOCS_RELOCATION_MATRIX.md). A pointer protects GitHub `blob/main/docs/...` document navigation after merge, but is **not** equivalent to byte-for-byte old-path content for consumers that parse or hash a historical document. Such consumers require a pinned historical Git commit or migration.

The two original binary artwork paths under `icons/` **do not automatically redirect** to `assets/artwork/`. Known Git history and blob SHA preserve the source. Repository-search hits alone cannot prove that externally bookmarked `raw.githubusercontent.com` or `blob/main` binary references do not exist.

## Remaining D1 acceptance work (NOT COMPLETE)

1. Enumerate every historical Issue and PR, including closed items, and fetch all paginated Issue/PR conversation comments and PR review comments. Match the nine old Markdown file paths, two moved artwork paths, 28 architecture names and any removed one-shot tool paths against all body/comment texts. Record each source URL, reference type (live-main versus commit-pinned), content/hash sensitivity and disposition.
2. Verify historic `main` deep-link behavior on the updated Work tree, explicitly distinguishing Markdown pointer from immutable old content and raw binary links.
3. Reconcile the new `main@5189e949a9d5767d322aea4b736a288081ddb7b4` into `work/KAR-167` without losing #134's v1.23.74 package/CI/metadata; revalidate exact-head Work PR 4/4 and refresh the canonical Rolling Comment.
4. Keep D1's first checklist item open until exhaustive enumeration is actually completed. Do not merge, close #167, publish a Release or change any historical ZIP based solely on this search checkpoint.
