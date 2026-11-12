# Kleinanzeigen Renewer — Documentation map

Use [INITIAL_PROMPT.md](INITIAL_PROMPT.md) as the authoritative new-chat entry point. This index is navigational; it does not replace normative policies, the GitHub Issue backlog or historical evidence.

## Canonical architecture, workflow and safety

- [Initial Prompt](INITIAL_PROMPT.md) — project bootstrap, authority order and current-state reconstruction
- [Project context](PROJECT_CONTEXT.md) — architecture, product identity and safety invariants
- [Development guidelines](DEVELOPMENT_GUIDELINES.md) — engineering and test-first rules
- [GitHub How-To](GITHUB_HOWTO.md) — Work branches, single Rolling Comment and recovery
- [Release process](RELEASE_PROCESS.md) — packaging, CI, native acceptance and authorization
- [Rolling Comment template](templates/WORK_PATH_ROLLING_COMMENT.md) — mandatory exact field/headings scaffold
- [DEV_OPS configuration record](DEV_OPS.md) — historical ruleset configuration evidence, **not** a substitute for live ruleset readback

## Windows update documentation

- [User guide (German)](user-manuals/windows-updater-einrichten.md) — first-time setup and day-to-day use
- [Standalone updater Phase 1](WINDOWS_UPDATER_PHASE1.md) — manual update/install/backup/rollback
- [Native Messaging host Wave 1](WINDOWS_NATIVE_HOST_WAVE1.md) — historical host/IPC integration evidence
- [Read-only native status Phase 2B](WINDOWS_NATIVE_INAPP_WAVE02B.md) — availability check; **not** authorized in-app apply
- [Independent OneClick updater](WINDOWS_ONECLICK_UPDATER.md) — user-triggered Windows shortcut/update workflow

## Historical QA and security evidence (preserved URLs)

- [KAR-85 updater modal QA](KAR85_WINDOWS_UPDATER_MODAL_QA.md)
- [KAR-86 approved-channel QA](KAR86_APPROVED_CHANNEL_QA.md)
- [KAR-90 updater modal UX QA](KAR90_UPDATER_MODAL_UX_QA.md)
- [KAR-91 English Windows console QA](KAR91_WINDOWS_CONSOLE_QA.md)
- [KAR-97 fail-closed candidate-idle policy](KAR97_UPDATE_IDLE_POLICY.md) — isolated non-authorizing policy, not a positive updater lease

These version/Issue-specific records intentionally retain their old paths to avoid breaking existing Issue and deep links; this is a deliberate compatibility decision, not an unreviewed dumping ground.

## Evidence and maintenance

- [Historical v1.23.x architecture evidence](history/architecture/README.md) — immutable versioned progress/baseline JSON records formerly in the repository root
- [File-hygiene audit and decisions](maintenance/FILE_HYGIENE_AUDIT.md) — root/docs decisions, historical tooling and safety rationale
- [Complete baseline file inventory](maintenance/FILE_INVENTORY_MAIN_A1F7878.json) — all tracked source-tree files and conservative per-file dispositions

## Authority / current state

The actual current version, Work branch, Issue state, PR results and GitHub Releases are read **live** through GitHub. Do not infer current state from an old QA Wave, README release note or versioned architecture snapshot. GitHub Issues preserve implementation decisions and complete history.
