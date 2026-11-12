# Windows updater and Native Messaging documentation

## For users

Start with the [German user guide](../user-manuals/windows-updater-einrichten.md). These files describe technical integration and historical development phases, **not** unattended in-app installation authorization.

## Technical documents

- [Phase 1 standalone updater](WINDOWS_UPDATER_PHASE1.md) — installation, verification, backup and rollback
- [Independent OneClick updater](WINDOWS_ONECLICK_UPDATER.md) — desktop shortcut / explicit confirmation
- [Native Messaging host, historical Wave 1](WINDOWS_NATIVE_HOST_WAVE1.md) — read-only IPC host checks
- [Native in-app status, historical Phase 2B](WINDOWS_NATIVE_INAPP_WAVE02B.md) — read-only availability/status, no automatic apply

The original `docs/WINDOWS_*.md` links remain as short backwards-compatible pointers. For live permission and update-flow decisions consult [Release Process](../RELEASE_PROCESS.md), [GitHub Issues](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues) and current tests.
