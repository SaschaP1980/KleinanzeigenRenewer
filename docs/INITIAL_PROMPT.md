# Kleinanzeigen Renewer – Initial Prompt

> **Single entry point for a new ChatGPT chat**
>
> If the user starts a new chat with only:
>
> `Read https://github.com/SaschaP1980/KleinanzeigenRenewer/blob/main/docs/INITIAL_PROMPT.md`
>
> treat this file as an instruction to reconstruct the complete current project state from GitHub. Do not ask the user to repeat earlier chat history, handovers, release rules, architecture decisions or backlog items.

## 1. Repository and authority

Repository:

`SaschaP1980/KleinanzeigenRenewer`

Project prefix:

`KAR`

GitHub is the durable project authority. The Git repository contains the sources; GitHub Issues contain the backlog and implementation history; the canonical Rolling Comment in an Issue contains recoverable in-progress Work state.

Previous chats, model memory, local source ZIPs and old chat handovers may be useful hints, but they are never stronger than current GitHub state.

Use the GitHub connector for repository, Issue, PR, commit, workflow and comment state whenever it is available. For private or mutable repository state, do not substitute ordinary web search.

## 2. Complete bootstrap – execute before planning or implementation

Always perform this sequence first:

1. Read current `main` and record its exact SHA.
2. Re-read this file from that exact current `main`.
3. Read in full:
   - `docs/PROJECT_CONTEXT.md`
   - `docs/GITHUB_HOWTO.md`
   - `docs/DEVELOPMENT_GUIDELINES.md`
   - `docs/RELEASE_PROCESS.md`
   - `docs/templates/WORK_PATH_ROLLING_COMMENT.md`
4. Read the current version and release metadata:
   - `manifest.json`
   - `package.json`
   - the newest relevant section of `CHANGELOG.md`.
5. Read the executable CI/release contracts:
   - `.github/workflows/kar-work-pr.yml`
   - `.github/workflows/kar-ci.yml`
   - `.github/workflows/kar-release.yml`
   - `scripts/coverage-gate.sh`
   - `scripts/package.py`
   - `tests/e2e/README.md`
   - `tests/e2e/gold-v1.21.15.json`.
6. Read the current architecture/coverage closure evidence relevant to the version being changed, especially the newest `architecture-progress-*.json` files and the tests for the current/relevant version.
7. Reconstruct the live GitHub project state:
   - fetch **all open Issues**;
   - fetch an index of **all closed Issues** as project history;
   - fetch open Pull Requests;
   - fetch active `work/KAR-*` branches;
   - fetch recent GitHub Actions runs;
   - fetch current tags and GitHub Releases.
8. Read every open Issue body. For closed Issues, read the full Issue/comments when it is related to the requested scope, current architecture, a regression, the current/previous release, or an active Epic.
9. If an active `work/KAR-<N>` branch or PR exists, read Issue `#N`, its canonical Rolling Comment, current Work HEAD, PR and referenced CI evidence before doing anything else.
10. Re-read `main` immediately before any consequential write. If it advanced, refresh the basis instead of guessing or overwriting.

### Live Issue registry

Do not maintain a second static backlog in Markdown.

- Open Issues: https://github.com/SaschaP1980/KleinanzeigenRenewer/issues?q=is%3Aissue%20state%3Aopen
- Closed Issues: https://github.com/SaschaP1980/KleinanzeigenRenewer/issues?q=is%3Aissue%20state%3Aclosed
- All Issues: https://github.com/SaschaP1980/KleinanzeigenRenewer/issues?q=is%3Aissue

The bootstrap must query both open and closed Issue state through GitHub, because closed Issues are the durable implementation/decision history for later regressions and follow-up work.

## 3. Authority order

When facts disagree, use this precedence:

1. current GitHub `main`, especially executable source, tests and workflows;
2. current normative documents under `docs/`;
3. current GitHub Issues, canonical Rolling Comments, PRs and verified CI evidence;
4. release notes/tags and historical repository artifacts;
5. previous chat context or model memory.

If a durable fact needed for safe continuation exists only in a chat, capture it in GitHub before treating it as a project contract.

## 4. Development-path decision

KAR intentionally has only two product-development paths.

### Fast Path — Patch / Hotfix

Use for small bounded corrections.

- Issue optional.
- No Work branch or PR required.
- Start from freshly verified `main`.
- Confirmed bugs/regressions require focused RED on the unfixed basis before the fix, then GREEN.
- Run the directly relevant validation plus mandatory release gates.
- If an Issue is used, the canonical Rolling Comment becomes mandatory.

### Work / PR Path — Feature / Minor / Major

Issue is mandatory.

Exact sequence:

`Issue → Rolling Comment BOOTSTRAP/readback → work/KAR-<issue> → development/checkpoints → PR → KAR Work PR GREEN → merge → release when authorized`

There is **no Candidate layer**.

Never create `work/KAR-*` before the Issue's canonical Rolling Comment has been created and read back.

### General Issue work budget and Wave split

Before implementation, estimate whether the full scoped Issue, including verification, can be completed in **less than 20 minutes of active ChatGPT work**. This is an observed continuity target, **not** a technical guarantee. Plan **at most 15 minutes of active work** and reserve approximately 5 minutes for verification, recovery and unexpected GitHub/CI latency. If the expected work is larger, first create/identify **independently acceptable, separately scoped Wave Issues** with dependencies and their own recovery checkpoint; keep the parent open as the coordination index. If a Wave overruns its estimate, checkpoint and read back the actual safe GitHub state, then split the remainder. Do not sacrifice tests, safety gates or exact-SHA CI to meet a time estimate. See the authoritative policy in `docs/GITHUB_HOWTO.md`.

### GitHub language, identifiers and agent ownership

All new/changed GitHub-facing writing must be **English**. Every Issue title must start with **`[KAR-N]` where N is that Issue's real number**, corrected and read back after creation if necessary; do not apply Issue rules to PR titles or rewrite historical closed Issue bodies. Existing title/body/label migration is separate work under KAR-24 Waves. Technical identifiers and literal user-facing UI text retain their required semantics.

The owner sets scope, priorities and permission to implement/publish through Issues and explicit chat instructions; the agent conducts ordinary authorized GitHub setup, Issue/comment, branch, PR, CI, labeling and cleanup work without asking the owner to operate GitHub manually. Unsupported actions must be acknowledged, and least-privilege approved GitHub-native alternatives assessed; never fake a successful write or expand authorization. Releases and live-account actions always retain separate safety/owner gates. No unattended work is promised after the interactive session ends without specifically supported automation.

### Active Rolling Comment cadence

During an **actively executing** Issue-backed session, update and **read back the same single canonical Rolling Comment at least every three minutes**, even with no new progress. Record the verified UTC heartbeat, current status, known exact refs/IDs, blockers and next action. **Also update/read back immediately after each meaningful successful intermediate step** and on failure/phase change; preserve actual evidence and never mark queued or incomplete CI GREEN. Continue while actively waiting on CI using real `WAITING_FOR_GITHUB` evidence. This cannot guarantee background heartbeats after a session ends. The exact procedure is in `docs/DEVELOPMENT_GUIDELINES.md` and the Rolling Comment template.

## 5. Recovery rule for active Work

The canonical Issue Rolling Comment is the recovery anchor. Use exactly one comment containing:

`<!-- KAR-ROLLING-COMMENT -->`

and instantiate the complete template from `docs/templates/WORK_PATH_ROLLING_COMMENT.md`.

On a stream break, timeout, new chat or uncertain write:

1. read current `main`;
2. read Issue and canonical Rolling Comment;
3. read current `work/KAR-<N>` head;
4. read the PR if it exists;
5. verify any referenced CI run directly;
6. resume from the last verified safe checkpoint.

Never retry an ambiguous GitHub write blindly; read back state first.

## 6. Engineering baseline

Clean Code and SOLID are mandatory engineering guidance, but boundaries are chosen by **ownership, lifecycle, policy and reason-to-change**, not by file size.

- Keep state ownership explicit.
- Prefer cohesive modules with narrow public interfaces.
- Apply DRY to duplicated rules/knowledge, not to merely similar-looking code.
- Keep separate implementations when lifecycle, failure semantics or safety ownership differ.
- Tests should primarily target public module contracts and observable behaviour.
- Private helpers are implementation details.
- Do not create a new Chrome runtime/message/IPC boundary merely to modularize files.

For confirmed bugs: **focused failing regression test first, then smallest fix, then same test GREEN**.

## 7. Hard safety and quality invariants

Read `docs/PROJECT_CONTEXT.md` for the complete current list. At minimum never weaken:

- fail-closed Account/Profile binding;
- global insertion/workflow locks;
- exact Ad-ID-bound replacement/delete safety;
- independent proof before source retirement;
- no unsafe `.submit()` / `requestSubmit()` bypass;
- exact template/title/scalar verification;
- recovery after service-worker/tab interruption;
- 30-day local trash retention semantics;
- no real Kleinanzeigen mutation from hosted CI;
- stable Chrome extension identity;
- Dynamic Public Function Coverage = **100%**;
- line/branch/architecture no-regression gates.

## 8. Performance Gold lines

Keep both hardware-specific lines separate and carry them into every relevant release/recovery record:

- v1.23.20_c1 reference computer: **61.277 s total / 20.426 s average**, 3/3 success, 0 warnings, 0 errors.
- v1.23.20_c1 old computer: **110.340 s total / 36.771 s average**, 3/3 success, 0 warnings, 0 errors.

Compare performance primarily within the same hardware line. Never average these two machines into one Gold value.

## 9. Initial read-only response

If the user only supplies the Initial Prompt URL and no concrete task:

- perform the complete bootstrap;
- do not pick an arbitrary backlog item;
- do not modify the repository;
- report briefly:
  - current `main` SHA;
  - current product version;
  - current GitHub Release/tag state;
  - active Work branch/PR state, if any;
  - number and most relevant open Issues/Epics;
  - latest relevant CI state;
  - whether the project is ready for direct work.

If a concrete Issue/task is supplied, read that Issue and its comments in full and proceed according to the correct development path.
