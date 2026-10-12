# KAR GitHub How-To & Recovery

## Bootstrap

The single entry point is `docs/INITIAL_PROMPT.md`. A new ChatGPT session must be able to reconstruct the project from GitHub alone.

The minimum live read set is:

- current `main` SHA;
- current version;
- normative `docs/`;
- both KAR workflows;
- all open Issues;
- closed Issue index;
- open PRs;
- active `work/KAR-*` branches;
- recent Actions runs;
- tags and Releases.

Do not use a local Source ZIP as a newer authority than Git.

## GitHub Issues are the backlog

There is no competing in-memory/local backlog after GitHub migration.

Always query:

- open Issues for current work/backlog;
- closed Issues for implemented/declined historical decisions.

Closed Issues must remain searchable and readable because regressions may require reopening or consulting their acceptance evidence.

For a concrete task, read its Issue body and all comments in full. For an Epic step, also read the parent Epic and relevant predecessor Issue(s).

## Timeboxed Issues and independent Waves

**Operational goal:** Complete a single implementation Issue in **less than 20 minutes of active ChatGPT work whenever practicable**. This is an observed stream-continuity planning target, **not** a guaranteed session or execution limit. Before starting, estimate the end-to-end scope, GitHub calls, validation and expected CI cost. Plan no more than **15 minutes of focused active work** and leave approximately **5 minutes for verification, GitHub latency, recovery and unexpected delays**. Do not report a time target as achieved without measured evidence.

- If the expected active work or validation cannot reasonably fit this budget, **split the implementation into separately tracked, independently acceptable Wave Issues before coding**. Keep the parent Issue/Epic as an outcome/dependency index rather than one continuous implementation run.
- Every Wave must specify its own `[KAR-N]` Issue, small bounded scope, dependencies, acceptance criteria, estimated effort, own single canonical Rolling Comment, and a safe stopping point. Sequence dependent Waves explicitly; do not silently implement other Waves while working on one.
- Treat the estimate as a decision aid rather than a reason to weaken validation. Full required RED→GREEN, safety, exact-head PR, CI and release authorization checks remain mandatory.
- If scope expands or the time budget becomes unrealistic, stop at a **verified and read-backed GitHub checkpoint**, record current branch/commit/PR/CI state, failures and next action, then create or request the next bounded Wave as authorized. Never force completion, skip tests, claim unexecuted checks passed, or leave ambiguous writes.
- CI and external service waits may exceed the target; record actual status and continue active heartbeats while the agent is running. An inactive ChatGPT conversation cannot guarantee periodic execution or notifications. A scheduled or hosted runner must be explicitly supported and authorized before claiming unattended coverage.

**Example:** [KAR-24](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/24) tracks separately authorized, independently accepted Waves [KAR-25](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/25) through [KAR-37](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/37). The parent closes only after verified child outcomes; it is not a single 20-minute work package.

## English-only GitHub and Issue identity

GitHub-facing text is **English by default and required for new or edited material**: Issue/PR titles and bodies, canonical Rolling Comments, commit messages, process documentation, workflow names, diagnostic release notes and GitHub metadata. Do not translate code literals, stable product identifiers, URLs, technical identifiers, proper nouns or user-facing product UI strings when their semantics would change.

Every **Issue** title begins with the literal `[KAR-N]`, using its **actual GitHub Issue number N**, followed by a descriptive English title. Useful secondary markers such as `[Wave 01]`, `[UI]` or `[v1.24.0]` follow the mandatory prefix. After creating a new Issue (when the number may not be known in advance), read back the assigned number and immediately correct/read back the title. **Do not mistake Pull Requests for Issues**; PR numbers share the GitHub number sequence, but they are not subject to the Issue-title migration. The executable `scripts/kar-issue-title.cjs` validates a freshly fetched Issue JSON with a fail-closed exact-title check and deliberately skips Pull Request records from GitHub's Issues API. Its permanent negative regressions run in `tests/kar-issue-title.cjs`; `KAR Work PR` additionally requires a valid title on the owning Issue. Issue creation still requires readback and explicit agent correction after the number is assigned: validation does not silently rename records. Closed Issue title-only migration must preserve each original body and comment verbatim, verified before/after. Enforcement/legacy migration is tracked by [KAR-26](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/26) and [KAR-27](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/27); do not treat documentation of the rule as proof that existing Issues were already migrated.

All open Issue bodies are to be translated to English in their separately authorized Waves. Closed Issue titles may be translated with the correct prefix, but **closed Issue bodies remain unchanged**, including historical evidence and checklist states. Preserve established technical facts, links and historical comments unless separately authorized.

## Owner-directed, agent-operated GitHub workflow

The owner directs priorities, acceptance and explicit authorizations through Issues/chat. The agent handles routine GitHub creation, reading, editing, labeling, branch/PR/CI work, supported workflow dispatch, merge, cleanup and closure end-to-end **without instructing the owner to perform routine GitHub UI steps**. Use the connected GitHub tools first and confirm every consequential write by reading it back; if a required operation is not exposed, evaluate a narrowly scoped, auditable GitHub-native action with minimum permissions. Record actual technical blockers transparently; do not invent successful operations, broaden tokens/permissions, bypass branch/CI/safety checks or silently delegate work to the owner.

Issue-directed autonomy does **not** preauthorize a GitHub Release, account mutation, new product scope, unsupported unattended execution or a weakening of owner approval gates. A ChatGPT session cannot continue running GitHub work after the interactive run ends unless separately supported/authorized automation is configured.

## Branch naming

Issue-backed Work branch:

`work/KAR-<GitHub Issue number>`

Do not use the LBS or RHC prefixes.

A Work branch may only be created after the canonical Issue Rolling Comment exists and has been read back.

## Canonical Rolling Comment

Template:

`docs/templates/WORK_PATH_ROLLING_COMMENT.md`

Marker:

`<!-- KAR-ROLLING-COMMENT -->`

Exactly one marked comment belongs to an active Issue-backed development run. Update it in place.

The current workflow enforces a core subset mechanically; the full template is the normative recovery contract.

## Connector/write discipline

For GitHub connector/API work:

1. read the object/ref first;
2. pin the expected SHA/state;
3. perform one bounded mutation;
4. read the result back;
5. reconcile before retrying after any timeout/error.

Examples:

- branch movement: use expected SHA/lease where supported;
- merge: require expected PR head SHA;
- comment edit: re-fetch the comment after update;
- Issue close: re-fetch state and closure result;
- uncertain create/write: GET/search before retrying.

Never overwrite concurrent GitHub work by assumption.

## Recovery after stream/chat interruption

For Fast Path:

1. read current `main`;
2. inspect latest commits/diff;
3. read any owning Issue if one exists;
4. inspect relevant failed/running CI;
5. determine whether the intended atomic change already landed before retrying.

For Work/PR Path:

1. read current `main`;
2. read Issue;
3. locate the one `KAR-ROLLING-COMMENT`;
4. read Work branch exact head;
5. read PR exact head/base/state if present;
6. read referenced CI run/jobs/logs;
7. compare all SHAs to the Rolling Comment;
8. continue from the last verified safe checkpoint;
9. update/read back the same Rolling Comment before the next consequential write.

## Issue lifecycle

### New Feature / Minor / Major

- create Issue;
- write clear objective/scope/non-goals/acceptance;
- instantiate Rolling Comment;
- read it back;
- create Work branch;
- develop/PR;
- close only after acceptance/merge and any release/native requirement that belongs to that Issue is actually complete.

### Regression of completed Issue

If a defect is a direct regression or incomplete implementation of a closed Issue, prefer reopening that original Issue when it remains the correct owner. Record the new root cause and corrective evidence there instead of creating disconnected history.

### Independent new defect

A narrow Patch/Hotfix may be Issue-less. If an Issue is created, use the Rolling Comment contract.

## Pull Requests

Work/PR changes target `main`.

Before merge verify:

- PR belongs to the matching `work/KAR-N`;
- Issue is correct;
- Rolling Comment contains exact current PR HEAD;
- PR body links/closes the Issue;
- complete diff is expected;
- `KAR Work PR` is genuinely GREEN;
- no unresolved review/CI blocker remains;
- `main` has not changed in a way that invalidates the work.

Use expected-head merge protection where supported.

## Actions

KAR intentionally minimizes workflows.

- `KAR Work PR`: Issue/Rolling contract + runtime/safety/coverage + package smoke.
- `KAR CI`: autonomous read-only workflow on every push to `main` (and optional manual dispatch); full runtime/safety/100% public-function coverage and architecture gates, Chrome ZIP integrity and packaged browser E2E against local fixtures. No tag, GitHub Release, source ZIP publication or live-account mutation. The workflow is intentionally cancellable on a newer `main` push; only actually completed GREEN runs count as evidence.
- `KAR Release`: manually dispatched release verification/package/E2E/publication. Never automatically published from `KAR CI`.

**Autonomous correction loop:** On the Fast Path, an authorized GitHub-connected agent commits the smallest test-/source-corrective change to `main`; the resulting `push` event starts a fresh `KAR CI` run for the new SHA. Inspect that exact run and first failure, apply a bounded fix, commit and repeat until the complete hosted gate is GREEN. Do not rerun an old SHA-bound run after changing source. The agent cannot continue acting after the current interactive session ends unless separately scheduled/authorized. GitHub App push events must be confirmed by actual Actions evidence; do not equate a committed YAML trigger with a successfully launched run.

Publication is a distinct, owner-authorized step. A GREEN nonpublishing `KAR CI` run cannot implicitly authorize `KAR Release`.

Do not assume workflow success from YAML. Read the actual run, jobs and logs.

Do not create a second Candidate/Stage/Postrelease system unless an observed failure mode proves it is necessary.

## Permissions

Use the built-in `GITHUB_TOKEN` and explicit least-privilege workflow `permissions:`.

Do not introduce a long-lived PAT or broad secret merely to make the normal KAR release path work.

The current design does not require GitHub Actions to create/approve PRs.

## Source and releases

- Git is the source authority.
- Do not store new Source ZIPs in the repository.
- Do not attach Source ZIPs to KAR GitHub Releases.
- Published GitHub Release asset is the lean Chrome ZIP only.
- The same verified Chrome ZIP must also be committed under `main/release/kleinanzeigen-renewal-chrome-vX.Y.Z.zip`. A GitHub Release asset alone does **not** place a file into this directory. `scripts/archive-release-zip.sh` checks the published SHA-256/bytes, version, tag and single-asset identity and uses `git add -f` to override the global `*.zip` ignore for this path only.
- GitHub Actions pushes made with `GITHUB_TOKEN` may not trigger ordinary push CI. For automatic repository binary commits, dispatch `KAR CI` on the new main ref and require that actual run GREEN before marking acceptance.
- Keep its SHA-256 in release notes/evidence.

## Living-document rule

When engineering work establishes a new durable rule about:

- development path;
- safety boundary;
- architecture ownership;
- GitHub/recovery behaviour;
- release process;
- CI capability/limitation;
- performance Gold line;

update the appropriate file under `docs/` in the same workstream.

A fresh session that reads only GitHub must be able to recover the rule. Do not leave durable project knowledge only in chat memory.

## Branch cleanup after verified Work merge

A successful merge and a closed Issue do **not** prove the source Work branch was deleted. Before retiring a historical `work/KAR-N` ref, re-read the exact ref SHA, the matching Issue and merged PR, and search for any open PR using that head. Delete only the verified historical ref, with an exact-ref/expected-head safeguard where supported. Read back that the branch is absent; never rewrite/force-move it to `main` and claim deletion. If the connected tooling does not support safe ref deletion, record the cleanup as blocked and leave the ref untouched.

The current normative scaffold is `docs/templates/WORK_PATH_ROLLING_COMMENT.md`. The executable `scripts/kar-work-pr-contract.cjs` is used by `KAR Work PR`; its positive and fail-closed regression tests are `tests/kar-work-pr-contract.cjs`. The validator requires the scaffold's **exact** field labels/headings, saved comment ID, issued Work-Chat-ID, open Issue, one marker, matching branch and PR HEAD, and a real PR closing reference. Do not maintain a separate independent list of legacy headings in the workflow.
