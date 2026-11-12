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


## Exhaustive currently accessible GitHub discussion corpus — 2026-11-12 follow-up

**Scope and pagination:** GitHub REST `GET /issues?state=all&per_page=100&page=1,2` returned **168 numbered conversations: 109 Issues and 59 PRs**. Repository-wide `GET /issues/comments?per_page=100&page=1,2,3` returned **122 issue/PR conversation comments** (100 + 22 + empty terminal page). Repository-wide `GET /pulls/comments?per_page=100&page=1,2` returned **zero inline PR review comments**. All **59 actual pull requests** were individually queried for `/pulls/{number}/reviews?per_page=100&page=1`; each returned an empty review list, so no follow-up review pagination was required. This is a complete enumeration of the **currently accessible** discussion bodies/comments/reviews, not deleted/revised content or off-repository bookmarks. All links below are historical evidence, never instructions to mutate real accounts.

### Original Markdown paths used in historic Issues/PR comments

The following independently observed sources refer to one of the **nine** moved historical Markdown documents. The canonical content remains under `docs/history/qa/` or `docs/windows/`; old paths remain link-only compatibility shims. Direct `blob/main` links will resolve to the compatibility shim after merge, not the old full text.

| Former Markdown filename | Issue/PR bodies | Issue/PR conversation comments | Disposition |
| --- | --- | --- | --- |
| `KAR85_WINDOWS_UPDATER_MODAL_QA.md` | — | [#85](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/85#issuecomment-6183827488) | KEEP old-path pointer |
| `KAR86_APPROVED_CHANNEL_QA.md` | — | [#86](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/86#issuecomment-6184079346) | KEEP old-path pointer |
| `KAR90_UPDATER_MODAL_UX_QA.md` | — | [#90](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/90#issuecomment-6185008448) | KEEP old-path pointer |
| `KAR91_WINDOWS_CONSOLE_QA.md` | [#89](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/89) | [#79](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/79#issuecomment-6165592070), [#91](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/91#issuecomment-6185255417) | KEEP old-path pointer |
| `KAR97_UPDATE_IDLE_POLICY.md` | [#97](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/97) | [#97](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/97#issuecomment-6200315164) | KEEP old-path pointer; do not treat historical policy as update authorization |
| `WINDOWS_NATIVE_HOST_WAVE1.md` | [#66](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/66), [#72](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/72) | [#66](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/66#issuecomment-6144280831) | KEEP old-path pointer; pinned historical source/hash remains authoritative for past installs |
| `WINDOWS_NATIVE_INAPP_WAVE02B.md` | — | — | KEEP old-path pointer for external compatibility even though none found in available discussion corpus |
| `WINDOWS_ONECLICK_UPDATER.md` | [#79](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/79), [#90](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/90), [#91](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/91) | [#79](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/79#issuecomment-6165592070), [#80](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/80#issuecomment-6165752994), [#81](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/81#issuecomment-6166152613), [#90](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/90#issuecomment-6185008448) | KEEP old-path pointer |
| `WINDOWS_UPDATER_PHASE1.md` | [#60](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/60), [#145](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/145) | — | KEEP old-path pointer and SHA-pinned Phase-1 evidence |

Additional conversation bodies/comments contain references to **nonmoved** `docs/KAR99_P1_3A_OWNER_AUTHORITY_INVENTORY.md`, `docs/KAR103_OWNER_AUTHORITY_MAP.md`, `docs/KAR141_M2_SOURCE_RECONCILIATION.md` or `docs/WINDOWS_TRUSTED_URI_HANDLER_WAVE_C1.md`. Their existence in historical text is *not* evidence that #167 moved these files; they are outside the nine-document relocation matrix. No source path was removed merely because a historical reference existed.

### Other relocated/retired paths in the discussions

- The original master artwork names `icons/app-master-1240.png` and `icons/taskbar-master-1240.png` appeared in #167's own current Rolling Comment but not independently in other currently accessible Issue/PR bodies/comments or PR review content. The corresponding two Git blobs are SHA-identically preserved under `assets/artwork/`, with old commit-pinned access retained. **Unindexed external bookmarks and raw URLs cannot be proven absent.** Do not assert redirects for binary old paths.
- The root original `architecture-baseline-v1.23.0.json` occurred in #167's Issue body. The 28 original snapshot Git blob SHAs remain preserved at `docs/history/architecture/`; versioned test consumers were migrated and current CI validates their SHA. Search of currently accessible discussions found no independent other root architecture filename reference.
- Historic retired `scripts/kar50-atomic-patch.py` occurs in [#52's comment](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/52#issuecomment-6132635630), and retired `.github/workflows/kar50-atomic-next-patch.yml` in [#54's comment](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/54#issuecomment-6136941073). Both remain retrievable from exact historical Git refs; an obsolete historical command should not be made executable merely for an old link. `scripts/coverage-analyze.cjs` is referenced by #167's own records, not separately in other discussion items.

### Closure verdict and explicit limits

**COMPLETE for the observable repository-hosted discussion corpus** (168 bodies, 122 conversation comments, zero inline comments, zero PR reviews across 59 PRs), with all specifically moved old Markdown paths having retained pointers and all relocated immutable binary evidence preserved by SHA and pinned Git history. Previous partial search-index counts are superseded by complete currently accessible REST enumeration. This census **cannot prove** that deleted comments, older edited revisions, out-of-repository raw GitHub links, third-party websites or privately saved bookmarks are nonexistent; these are external unknowns, not invented evidence. No archive, source-code behavior, Chrome extension identity, test baseline or release artifact is changed by this report.

**Integration still requires** current `main` reconciliation, one exact-HEAD four-job Work CI run, then separate owner approval for merge and post-merge `main` CI.
