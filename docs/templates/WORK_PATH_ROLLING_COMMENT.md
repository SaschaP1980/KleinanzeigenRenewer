# KAR Work/PR Path — Canonical Rolling Comment

Use this template for every Issue-backed KAR development path, including Feature, Minor, Major and any Patch/Hotfix for which an Issue is used.

It exists to make a new chat/stream recoverable from GitHub without previous conversation context.

## Mandatory BOOTSTRAP order

Before creating `work/KAR-<N>`:

1. read the Issue and current exact `main` SHA;
2. determine authorized scope, non-goals, target version/class and validation plan;
3. generate a Work-Chat-ID in the form `KAR<N>CHAT<12 uppercase hex>`;
4. show that marker visibly in the working chat;
5. create **one** Issue comment from the full scaffold below with:
   - `Current phase: BOOTSTRAP`;
   - Work branch `NOT CREATED`;
   - exact Base main and Last safe checkpoint;
6. read the saved comment back and record its GitHub comment ID;
7. verify `main` is still the pinned SHA;
8. only then create the Work branch;
9. re-fetch the branch SHA and update/read back the **same** comment before the first executable source change.

Late creation after Work has already started is a process deviation and must be recorded; do not pretend BOOTSTRAP happened earlier.

## Update policy

Keep one cumulative comment. Do not create replacement status comments.

Update/read back after safe checkpoints, RED/GREEN, failed gates, PR head changes, before long CI waits, after merge and before closure.

No timer-only Git commits are required. The goal is recoverability: before entering a sequence whose loss would make the next session repeat substantial work, persist a coherent code checkpoint and refresh this comment.

Use `WAITING_FOR_GITHUB` only when an exact queued/running GitHub run is known. Use `BLOCKED` for a real blocker, `STOPPED` when interactive work intentionally pauses, and `COMPLETED` only after the Issue's actual acceptance is satisfied.

Never invent timestamps, results, SHAs, test counts or native evidence.

### Active heartbeat and checkpoint policy (KAR-25)

- While an authorized agent session is actively working, **write and read back a heartbeat in this same canonical comment at least once every three minutes**, even without a meaningful change. Refresh the verified `Last heartbeat (UTC)`, agent state, phase, exact known refs/IDs, last safe checkpoint, blockers and precise next action.
- **Immediately after each meaningful successful step** (including branch/ref creation, commit, test RED/GREEN, PR, CI result, merge, issue-state transition or authorized release), update the cumulative evidence ledger and read back the same comment with actual SHA/URL/run status. Milestone updates are mandatory in addition to timed heartbeats. Preserve failed/unfinished checks as such.
- If actively waiting for known GitHub runs, record `WAITING_FOR_GITHUB`, the exact run ID and current status. Do not claim success before completed GREEN evidence. No background cadence is guaranteed after the interactive session ends unless separately supported and authorized scheduling is configured.
- Each independently accepted **Wave** has its own issue and one canonical comment; the parent Issue links child dependencies and verified outcomes. Target **less than 20 minutes active work per Issue**, with at most **15 minutes planned** and approximately five minutes reserved for verification/recovery. Split any larger anticipated scope before work; checkpoint and read back when further splitting becomes necessary.
- GitHub-facing comment text is written in **English**. The Issue title begins with its actual `[KAR-N]` prefix. The owner determines scope/authorization, while the agent handles routine GitHub operations with least-privilege supported tools and readback; do not offload routine UI work to the owner or override existing safety/release gates.

These procedural requirements supplement the scaffold below without changing its exact fields/headings enforced by `scripts/kar-work-pr-contract.cjs`. Consult `docs/GITHUB_HOWTO.md` for the normative timing and Wave policy and `docs/DEVELOPMENT_GUIDELINES.md` for the active comment lifecycle.

## Work-Chat-ID

First chat:

`KAR<N>CHAT<12 uppercase hexadecimal characters>`

Additional working chats append their own visible marker under **Chat origin**. Do not invent ChatGPT internal IDs or URLs.

### Executable contract parity (KAR-22)

The complete fenced scaffold below is the **normative** PR recovery document. Its field labels (including `**Work branch / exact head:**`), `- Originating Work-Chat-ID:` and full `###` headings are checked by `scripts/kar-work-pr-contract.cjs` in `KAR Work PR`; `tests/kar-work-pr-contract.cjs` must accept an instantiated scaffold and reject missing or altered fields. Do not add shorter legacy aliases merely to satisfy an old grep contract.

Immediately before opening or updating a PR, store and read back the **exact current** Work HEAD SHA in the one canonical comment, ensure `**Canonical comment ID:**` contains the saved numeric comment ID, and keep the link to the real Issue. An earlier BOOTSTRAP `NOT CREATED` value must not persist into PR validation.

## Canonical scaffold

~~~markdown
<!-- KAR-ROLLING-COMMENT -->
## KAR-<GitHub Issue number> — Rolling Development State

**Last heartbeat (UTC):** <YYYY-MM-DDTHH:mm:ss.sssZ | unknown — time not verified>
**Local reference (Europe/Berlin):** <DD.MM.YYYY HH:mm:ss CET/CEST | unknown — time not verified>
**Bootstrap creation ISO:** <initial ISO timestamp; freeze after BOOTSTRAP>
**Agent-State:** ACTIVE | WAITING_FOR_GITHUB | BLOCKED | STOPPED | COMPLETED
**Issue:** [KAR-<number>](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/<number>)
**Base main:** `<40-char SHA>`
**Work branch / exact head:** `work/KAR-<number>` / `<NOT CREATED | 40-char SHA | deleted after verified merge>`
**Target version / class:** `<version or TBD>` / <patch | hotfix | minor | major | architecture>
**Current phase:** BOOTSTRAP | CHARACTERIZATION | RED | IMPLEMENTING | GREEN | VALIDATION | PR | MERGED | RELEASE | NATIVE_QA | COMPLETED | BLOCKED
**Last safe checkpoint:** `<exact SHA / verified gate>`
**Canonical comment ID:** <GitHub comment ID after first readback>
**Next action:** <one exact evidence-based next action>

### Chat origin

- Originating Work-Chat-ID: `KAR<number>CHAT<12HEX>`
- Marker visibly issued in chat: yes | no | unverified
- Additional Work-Chat-IDs: none | <chronological list>

### Authorization and scope

- User authorization: <what was explicitly authorized>
- Parent Epic/Issue: <none | #N>
- Authorized behaviour/files/domains: <explicit scope>
- Explicitly out of scope: <non-goals>
- Safety boundaries to preserve: <specific relevant contracts>
- Development-path reason: <why Work/PR is used>

### Current implementation state

- Completed since BOOTSTRAP:
  - <checkpoint/change>
- Current uncommitted work: <none | precise description>
- State/ownership decisions:
  - <durable design decision>
- Consumer/API impact:
  - <public contracts added/removed/unchanged>

### Validation and test-first evidence

- Characterization basis: <SHA/tests/result>
- Focused RED: <test + unfixed SHA + exact failure reason | NOT APPLICABLE with reason>
- Focused GREEN: <same test + fixed SHA/result | pending>
- Relevant runtime/consumer tests: <commands/results>
- Dynamic Public Function Coverage: <covered/total/percent | pending>
- Line/branch no-regression: <result | pending>
- Architecture/reachability/cycles: <result | pending>
- Package/build smoke: <result | pending>
- Browser E2E: <result | pending>
- Native real-account evidence: <PASS | PENDING | NOT APPLICABLE | NOT VERIFIED, with reason>

### Failures, corrections and risks

- <chronological real failure/correction; keep prior REDs and unexpected gate failures>
- Current blockers: <none | exact blocker>
- Unknown/not verified: <explicit unknowns>

### Evidence ledger

| Event | UTC | Ref / SHA / run / evidence |
| --- | --- | --- |
| Scope authorized | <known/unknown> | <reference> |
| Issue read | <UTC/unknown> | #<N> |
| BOOTSTRAP Rolling Comment created/read back | <UTC/unknown> | comment <id>, base main <SHA> |
| Work branch created/read back | <UTC/unknown> | work/KAR-<N> @ <SHA> |
| Characterization / focused RED | <UTC/unknown> | <test/ref> |
| Fix GREEN | <UTC/unknown> | <test/ref> |
| Last code checkpoint | <UTC/unknown> | <SHA> |
| Full validation GREEN | <UTC/unknown> | <commands/run> |
| PR opened / final HEAD | <UTC/unknown> | PR # / <SHA> |
| KAR Work PR GREEN | <UTC/unknown> | run id |
| Merge to main | <UTC/unknown> | merge/main SHA |
| Release, if in scope | <UTC/unknown> | tag/release/run |
| Native acceptance, if in scope | <UTC/unknown> | diagnostic/evidence |
| Issue closed | <UTC/unknown> | final state |

### PR / merge / release state

- PR: <none | URL/#>
- PR exact head: <SHA | N/A>
- `KAR Work PR`: <NOT STARTED | RUNNING run-id | PASS run-id | FAIL run-id>
- Merge/main SHA: <not merged | SHA>
- Work branch cleanup: <present | deleted and verified | pending>
- GitHub Release: <not in scope | pending | tag/version + asset hash>
- Native acceptance: <state/evidence>

### Recovery checkpoint

A fresh chat should do exactly:

1. read current `main`;
2. read Issue #<N>;
3. re-read this comment by ID;
4. read `work/KAR-<N>` exact head (or verified deleted state);
5. read PR and CI state if present;
6. compare SHAs/statuses with this comment;
7. continue with: **<exact next action>**.

### Plan-conformance assessment

**ACTIVE | PASS | PASS WITH CORRECTION | BLOCKED | FAIL**

- Expected path vs actual: <details>
- Process deviations retained: <none | details>
- Safety/quality status: <details>
- Remaining acceptance: <details>
~~~

## Closure rule

Before closing an Issue:

- update the same comment to the exact final main/PR/release/native state;
- verify the Work branch disposition;
- retain actual failures/corrections;
- set `COMPLETED` only if the Issue acceptance is truly complete;
- read the saved final comment back.

A green PR alone does not prove native acceptance when the Issue explicitly requires real-account/native QA.
