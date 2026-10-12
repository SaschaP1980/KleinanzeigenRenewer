# KAR Development Guidelines

## 1. Design baseline

Use Clean Code and SOLID pragmatically.

Refactor by:

- ownership;
- lifecycle;
- policy;
- reason to change;
- failure semantics;
- state authority.

Do **not** refactor by file size alone.

Prefer narrow explicit dependencies and small public interfaces. Apply DRY to duplicated rules/knowledge/responsibility, not merely similar syntax. Limited duplication is preferable to a false abstraction that couples unrelated lifecycles or safety domains.

## 2. Two development paths only

### Fast Path — Patch / Hotfix

Default for small bounded corrective work.

- Issue optional.
- Branchless from freshly verified `main`.
- No PR required by project process.
- Keep the diff atomic and minimal.
- Confirmed bug/regression: focused permanent test RED on the unfixed exact basis, then smallest fix, then same test GREEN.
- Run relevant syntax/runtime checks and mandatory release gates.
- If an Issue already exists or is intentionally created, use the Issue and canonical Rolling Comment; do not ignore it merely because the change is small.

Escalate a Patch/Hotfix to Work/PR only when the user explicitly chooses that path or the scope is no longer small/bounded.

### Work / PR Path — Feature / Minor / Major

Mandatory for:

- new product functionality;
- Minor version work;
- Major version work;
- architecture Epics/steps explicitly defined as Issue-backed Work;
- substantial or interruption-prone change when the owner selects Work/PR.

Sequence:

1. verify current `main`;
2. create/read the GitHub Issue;
3. create the canonical Rolling Comment from `docs/templates/WORK_PATH_ROLLING_COMMENT.md`;
4. read that same saved comment back;
5. confirm `main` is still the pinned SHA;
6. only then create `work/KAR-<issue-number>`;
7. update the same Rolling Comment after branch creation and throughout development;
8. develop in coherent recoverable checkpoints;
9. open PR to `main`;
10. require `KAR Work PR` GREEN;
11. merge only against the expected exact Work HEAD;
12. update the same Rolling Comment with merge/main state;
13. release separately when authorized;
14. close the Issue only when its acceptance is actually satisfied.

There is no Candidate branch/layer.

### Timebox and Wave planning

Before beginning any Issue, estimate the **entire active work and required validation**. Aim to complete each bounded implementation Issue in **under 20 minutes of active work** (an observed stream-continuity target, **not a guaranteed limit**). Allocate **at most 15 minutes of planned work** and reserve approximately 5 minutes for validation, latency, recovery and unforeseen delays. The authoritative rule and safe-split procedure are in `docs/GITHUB_HOWTO.md`.

When an Issue is expected to exceed the budget, divide it **before implementation** into independently acceptable Wave Issues: each has an assigned `[KAR-N]`, scope, dependencies, estimate, acceptance criteria and recovery checkpoint. Keep any parent Epic/Issue open as the coordination index until all dependent Waves are verified. If a Wave unexpectedly grows, checkpoint/read back safe GitHub state and split the remainder rather than skipping tests, safety gates, CI, verification or owner approvals. Do not assert an elapsed-time SLA or an unobserved success. Hosted CI may take longer than the time target.


## 3. Canonical Rolling Comment

Every Issue-backed development run has exactly one canonical comment containing:

`<!-- KAR-ROLLING-COMMENT -->`

The full template under `docs/templates/WORK_PATH_ROLLING_COMMENT.md` is normative.

The Rolling Comment exists for recovery, not ceremony. It must answer:

- what was authorized;
- exact base `main`;
- exact Work branch/head;
- current version/target class;
- what has already changed;
- latest safe checkpoint;
- RED/GREEN and broader validation status;
- failures/unknowns;
- active PR/CI state;
- the exact next action.

Update the **same** comment. Do not create a stream of replacement status comments.

### Heartbeat and immediate evidence updates

While an authorized development session is **actively executing**, update and read back a heartbeat in the **same** canonical Rolling Comment **at least once every three minutes**, including when no meaningful progress has occurred. Carry forward the verified UTC timestamp, agent-state/phase, exact known GitHub refs/IDs, last safe checkpoint, uncertainties/blockers and the next action. During known CI waits use `WAITING_FOR_GITHUB`, never invent results. The heartbeat cadence does not imply an agent can run unattended when the session has ended; an unattended scheduler requires separate supported configuration and authorization.

In addition to timed heartbeats, **immediately** update and read back that same comment after **every successful meaningful intermediate step that advances the Issue or changes recoverable state**: e.g. Issue/branch/commit/PR/CI/merge/release/cleanup completion, confirmed RED or GREEN, recovered failure, authoritative decision, and new next action. Store the exact result SHA/ID, URL, failure evidence, scope changes and follow-up needed. A heartbeat alone does not replace a milestone checkpoint, and a milestone does not abolish later timed heartbeats. Preserve all real failures and only mark PASS on independently verified evidence. Never create timer-only Git commits.


### Update points

Update/read back the Rolling Comment at least:

- BOOTSTRAP before Work branch creation;
- immediately after branch creation;
- after each coherent checkpoint commit;
- after focused RED and after GREEN;
- before a long GitHub/CI wait;
- after any failed gate or unexpected result;
- before opening the PR;
- after PR head changes;
- after merge;
- before Issue closure.

Do not make timer-only Git commits. If active uncommitted work would be painful to reconstruct after a stream loss, checkpoint the code and update the comment before continuing.

## 4. Work-Chat-ID

For Issue #N use:

`KAR<N>CHAT<12 uppercase hexadecimal characters>`

A new working chat creates a new marker after the Issue number is known. The marker should be shown visibly in the chat before being written into the Rolling Comment. Do not invent an internal ChatGPT conversation ID.

Additional chats append their Work-Chat-ID to the same Rolling Comment.

## 5. Test-first defect contract

For every confirmed bug/regression:

1. freeze the unfixed exact basis SHA;
2. add the smallest permanent regression test that expresses corrected behaviour;
3. run it against the unfixed basis and require RED for the expected reason;
4. record RED evidence in the active Issue/Rolling Comment when Issue-backed;
5. implement the smallest fix;
6. rerun the same test and require GREEN;
7. run directly affected consumer/runtime checks;
8. run broader mandatory gates before release.

If the defect cannot be reproduced, say so. Do not fabricate RED evidence and do not weaken an exact/fail-closed assertion merely to make the test pass.

## 6. Public API / coverage rule

Tests should call public module contracts wherever practical.

- Private helpers are implementation details.
- Before adding a public method, identify its real consumer.
- Before retaining an existing export, verify it is actually a contract.
- Dynamic Public Function Coverage must remain **100%**.
- Line/branch and architecture gates may not regress.
- Safety-critical negative/fail-closed behaviour requires explicit evidence.

## 7. Refactor rules

For architecture work:

- first characterize current observable behaviour;
- introduce the new ownership boundary without product functionality;
- preserve the same runtime/IPC topology unless separately justified;
- shrink broad facades only when consumers actually use narrower interfaces;
- keep one authoritative owner for state;
- remove obsolete bridges only after consumer search proves they are unused;
- do not silently implement unrelated backlog items while touching nearby code.

EPIC-REF-003 explicitly forbids pulling future Epic steps forward opportunistically.

## 8. Git/write safety

Before consequential writes:

- read current `main`;
- read current Work head if applicable;
- inspect exact diff/scope;
- use exact expected SHA/lease when the connector/API supports it.

After a write:

- read the result back;
- do not infer success from an ambiguous timeout;
- never retry a possibly successful Issue/comment/branch/merge write without reconciliation.

## 9. Documentation-only changes

Pure Markdown/process documentation that does not change executable source, tests, workflows, validators or machine-consumed build/release inputs may be committed atomically to freshly verified `main` without opening a product Issue/Work branch.

If the documentation change also changes executable workflow/tooling behaviour, it is no longer docs-only and must use the appropriate development path.

## 10. English and Issue-identity requirements

All **new or changed GitHub-facing writing** is in English, including Issues, PRs, Rolling Comments, commit messages, workflow titles, release notes and process documentation. Preserve code/UI literals, URLs, fixed identifiers, proper names and technical semantics where translation would distort evidence.

Every GitHub **Issue** title begins with the exact prefix `[KAR-N]` for its real GitHub Issue number. After Issue creation, read back the assigned number, apply the correct prefix, and verify it; other useful tags follow the prefix. PRs are not Issues and must not be renamed as part of an Issue migration. Historical closed Issue **bodies remain unmodified**; open Issue translation and legacy title changes are separate owner-authorized Waves, not implied by this documentation-only step.

## 11. Agent ownership and approval boundaries

The owner governs development through Issues and explicit chat authorizations. The agent performs routine GitHub Issue, comment, branch, PR, check, label and cleanup operations autonomously using verified available permissions and readback, without assigning manual GitHub UI work to the owner. An unavailable connector operation must be explicitly investigated for a least-privilege, scoped GitHub-native alternative; a real permission/tool blocker must be documented, never hidden behind an unexecuted claim.

Preserve all existing release, product-safety, external mutation and owner-approval gates. Autonomous routine GitHub management neither authorizes release publication nor guarantees work after the interactive session stops. See `docs/GITHUB_HOWTO.md` for the normative timebox, Wave and operating policy. The comprehensive setup/capability runbook `docs/DEV_OPS.md` is reserved for the separate KAR-24 documentation Waves; do not represent it as completed by KAR-25.
