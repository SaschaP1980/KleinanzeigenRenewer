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
