# KAR Project Context, Architecture & Safety

This document captures durable project facts needed by a fresh engineering session. Dynamic state such as current `main`, open/closed Issues, active Work branches, PRs, Actions runs, tags and Releases must always be read live through `docs/INITIAL_PROMPT.md`.

## Product

- Product: **kleinanzeigen Manager / Kleinanzeigen Renewer**
- Repository: `SaschaP1980/KleinanzeigenRenewer`
- Prefix: `KAR`
- Platform: Chrome Manifest V3 extension
- Stable Extension ID: `hafahjhhgiipdegfkgacchmnacgblnah`
- Canonical sources: Git `main`
- Source ZIPs are not release authority and are no longer published as repository/release artifacts.

The initial Git source import was v1.23.22 RELEASE_GREEN. The exact live version must always be read from `manifest.json` and `package.json`.

## Current durable baselines

- Long-term Gold baseline: **v1.21.15**.
- v1.23.x architecture closure established:
  - 100 runtime modules reachable;
  - zero missing KRDeps providers;
  - zero dependency cycles;
  - 805 implemented Public Functions;
  - 805/805 dynamically executed = **100%**.
- The permanent quality policy is:
  - Dynamic Public Function Coverage remains **100%**;
  - aggregate and area line/branch coverage may not regress below the checked-in Gold contract used by `scripts/coverage-gate.sh`;
  - architecture/reachability/cycle gates may not regress.

The latest values must be read from the current checked-in architecture/coverage contracts and current CI output rather than copied from an old chat.

## Architectural model

KAR deliberately uses in-process modularization.

- `src/app/app.js` is an application/UI composition and lifecycle root.
- `src/background/background.js` is the MV3 service-worker router/lifecycle root.
- `src/content/content.js` is the content entry point.
- `src/shared/runtime-deps.js` / `KRDeps` provides in-process dependency registration/composition.
- Controllers orchestrate use cases and lifecycle.
- Services own coherent infrastructure/sub-use-case responsibilities.
- Repositories own persistence primitives.
- Views/renderers render.
- Policies should preferably be pure/stateless when practical.

A refactor must follow ownership/lifecycle/policy boundaries, not file length. Do not add a Chrome message, tab, worker or IPC boundary merely because code moved files.

## Renewal safety model

### Global mutation/identity safety

- The selected local profile and live Kleinanzeigen account must be bound/verified for account-sensitive operations.
- The insertion lock prevents competing insert/renewal workflows.
- Uncertain identity/evidence fails closed.
- Stale events/runs must not gain authority over newer state.
- Recovery must survive MV3 service-worker restarts and expected managed-tab lifecycle changes.

### Publish safety

- Do not introduce direct form `.submit()` or `requestSubmit()` bypasses.
- Publish actions use the existing guarded UI/action path.
- Template fields are verified before publication.
- Title verification is exact; v1.23.22 additionally stabilizes title readback against Controlled-Input/DOM resets and still fails closed on mismatch.
- Paid insertion/checkout paths remain guarded and may require user intervention/recovery.

### Safe Mode replacement safety

Safe Mode means the four-phase guarded replacement workflow:

1. create/publish the new ad and confirm its new Ad ID;
2. freshly inventory the new ad;
3. independently verify presence under the correct account and semantic match;
4. only then retire the old ad by authoritative source Ad ID/profile binding and prove absence through a fresh independent verification.

Local promotion occurs only after the source-delete boundary is verified. The old item remains in the local trash retention model for 30 days.

Never delete or replace based only on title, price, image or similarity.

### Emergency/reset safety

Emergency reset may terminate local workflow state/locks, but must not fabricate remote success. When a remote mutation boundary might have been crossed, uncertainty remains explicit and later reconciliation is read-only/fail-closed.

## Inventory and image safety

- Category/attribute capture is semantic and generic; do not hardcode one category layout.
- Image sources are validated and stored with integrity metadata.
- Trusted URL/CDN policy, MIME/dimension/size validation and hashing remain safety boundaries.
- Inventory commits involving metadata/images are atomic where defined by current repository contracts.

## Hosted CI boundary

GitHub-hosted CI must **never** perform real Kleinanzeigen account publication, deletion, replacement or other live mutation.

Hosted CI may use local fixtures and packaged-browser E2E. Real-account native acceptance remains separate evidence and must be recorded honestly as PASS/PENDING/NOT VERIFIED.

## Performance Gold lines

Two hardware-specific Fast-3 references must remain distinct:

| Hardware line | Version | Total | Average | Result |
| --- | --- | ---: | ---: | --- |
| Reference computer | v1.23.20_c1 | 61.277 s | 20.426 s | 3/3, 0 warnings, 0 errors |
| Old computer | v1.23.20_c1 | 110.340 s | 36.771 s | 3/3, 0 warnings, 0 errors |

Performance comparisons are primarily within one hardware line. Cross-machine differences alone are not regressions.

These Gold lines belong in relevant release/recovery evidence and future project handovers/Issue records.

## Current architecture program

The authoritative backlog is GitHub Issues.

EPIC-REF-003 – Lifecycle Boundaries & Interface Segregation is tracked in Issue #1 with implementation Issues #2–#13. The Epic must not be started merely because a fresh chat discovers it; each implementation requires user authorization.

A3a Renewal Mutation Boundary is independently tracked and is not automatically part of the Epic unless explicitly scheduled.

Native/product QA items are tracked as Issues as well. Always read the live Issue index; do not rely on numbers in this paragraph remaining the complete backlog forever.

## Historical authority

The current repository contains extensive version-specific characterization/regression tests and architecture progress files. Do not remove or rewrite historical contracts merely to make a new refactor easier. When a historical test is structure-coupled rather than behaviour-coupled, first prove that and replace/version the contract deliberately.

The README and CHANGELOG contain extensive historical detail, but normative process rules live under `docs/`.
