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

- [Windows technical documentation index](windows/README.md) — grouped manuals, status/IPC boundaries and historic phases

- [User guide (German)](user-manuals/windows-updater-einrichten.md) — first-time setup and day-to-day use
- [Standalone updater Phase 1](windows/WINDOWS_UPDATER_PHASE1.md) — manual update/install/backup/rollback
- [Native Messaging host Wave 1](windows/WINDOWS_NATIVE_HOST_WAVE1.md) — historical host/IPC integration evidence
- [Read-only native status Phase 2B](windows/WINDOWS_NATIVE_INAPP_WAVE02B.md) — availability check; **not** authorized in-app apply
- [Independent OneClick updater](windows/WINDOWS_ONECLICK_UPDATER.md) — user-triggered Windows shortcut/update workflow

## Historical QA and security evidence (original URLs preserved as compatibility pointers)

- [Historical QA index](history/qa/README.md) — Wave-specific, non-current acceptance evidence

- [KAR-85 updater modal QA](history/qa/KAR85_WINDOWS_UPDATER_MODAL_QA.md)
- [KAR-86 approved-channel QA](history/qa/KAR86_APPROVED_CHANNEL_QA.md)
- [KAR-90 updater modal UX QA](history/qa/KAR90_UPDATER_MODAL_UX_QA.md)
- [KAR-91 English Windows console QA](history/qa/KAR91_WINDOWS_CONSOLE_QA.md)
- [KAR-97 fail-closed candidate-idle policy](history/qa/KAR97_UPDATE_IDLE_POLICY.md) — isolated non-authorizing policy, not a positive updater lease

Historical QA and Windows documents now have **one canonical location** in `docs/history/qa/` or `docs/windows/`. Their original paths remain as **short, non-authoritative compatibility pointers** to preserve existing Issue/PR links without duplicating instructions. See the [old→new relocation map](maintenance/DOCS_RELOCATION_MATRIX.md).

## Evidence and maintenance

- [Historical v1.23.x architecture evidence](history/architecture/README.md) — immutable versioned progress/baseline JSON records formerly in the repository root
- [Documentation relocation evidence](maintenance/DOCS_RELOCATION_MATRIX.md) — full-text canonical paths, compatibility stubs and link decisions
- [Scripts and workflows S1 audit](maintenance/SCRIPTS_WORKFLOWS_AUDIT.md) — individual owner/usage decisions and safe legacy retirement
- [Scripts/workflows machine inventory](maintenance/SCRIPT_WORKFLOW_INVENTORY.json) — verified 24 retained scripts and 5 workflows
- [File-hygiene audit and decisions](maintenance/FILE_HYGIENE_AUDIT.md) — root/docs decisions, historical tooling and safety rationale
- [Complete baseline file inventory](maintenance/FILE_INVENTORY_MAIN_A1F7878.json) — all tracked source-tree files and conservative per-file dispositions

## Authority / current state

The actual current version, Work branch, Issue state, PR results and GitHub Releases are read **live** through GitHub. Do not infer current state from an old QA Wave, README release note or versioned architecture snapshot. GitHub Issues preserve implementation decisions and complete history.
