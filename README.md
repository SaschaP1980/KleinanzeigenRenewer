# Kleinanzeigen Renewer

Source repository for the Chrome extension **kleinanzeigen Manager / Kleinanzeigen Renewal**.

## Development model

This repository intentionally uses a small two-path lifecycle.

### Fast Path — Patch / Hotfix

For small corrective Patch/Hotfix releases that do not introduce a new feature:
- work directly from the current `main` authority,
- keep the change narrowly scoped and test-first where applicable,
- pass the mandatory runtime, safety, coverage and packaging gates,
- publish only the installable Chrome ZIP.

An Issue is optional for this path. If an Issue is used, the Rolling Comment contract below applies.

### Work / Pull Request Path — Feature / Minor / Major

Features and Minor/Major releases require:
1. a GitHub Issue,
2. one canonical Rolling Comment created and read back **before** the Work branch,
3. branch `work/KAR-<issue-number>`,
4. development and exact-SHA validation on that branch,
5. Pull Request into `main`,
6. merge only after the required checks are green.

There is **no Candidate branch/layer**.

## Mandatory Rolling Comment

Every Issue-backed development run has exactly one canonical Rolling Comment. The same comment is updated throughout the work and is the recovery authority if the ChatGPT stream, chat or tooling session is interrupted.

It must always contain at least:
- last heartbeat,
- Issue and Work-Chat-ID,
- frozen base `main` SHA,
- Work branch and current exact head SHA,
- target version / release class,
- current phase,
- authorized scope and explicit non-goals,
- completed work,
- current validation/gate state,
- known failures or risks,
- last safe checkpoint,
- exact next action.

Do not replace it with a chain of new status comments.

## Release artifacts

Git is the source authority. Source ZIPs are not release artifacts.

A release publishes only:
- the installable `kleinanzeigen-renewal-chrome-vX.Y.Z.zip`,
- its SHA-256 and release metadata.

Native real-account / real-listing acceptance remains separate from hosted CI where platform mutation would be unsafe.

## Current imported baseline

The source authority to import is **v1.23.22 RELEASE_GREEN**. Product architecture work under **EPIC-REF-003** begins only through the Issue/Work/PR path.
