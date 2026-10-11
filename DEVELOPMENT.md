# KAR Development & Release Contract

## Paths

### Fast Path — Patch / Hotfix
Use for small corrective changes without new product functionality.

- Issue optional.
- No Work branch or PR required.
- Change is made from the current `main` authority.
- Release is manual through **KAR Release** with mode `fast`.
- Mandatory runtime/safety/coverage/packaging/E2E gates still apply.
- If an Issue is used, the Rolling Comment contract becomes mandatory.

### Work / PR Path — Feature / Minor / Major
Use for new functionality and Minor/Major releases.

1. Create an Issue.
2. Create exactly one canonical Rolling Comment and read it back.
3. Only then create `work/KAR-<issue-number>` from the frozen `main` SHA.
4. Keep the same Rolling Comment current during development.
5. Open a PR from that branch to `main`.
6. **KAR Work PR** must pass.
7. Merge.
8. Release manually through **KAR Release** with mode `work`.

There is no Candidate layer.

## Canonical Rolling Comment

Marker:

`<!-- KAR-ROLLING-COMMENT -->`

Required minimum structure:

```markdown
<!-- KAR-ROLLING-COMMENT -->
## KAR-<N> — Rolling Development State

**Last heartbeat:** <UTC>
**Work-Chat-ID:** <stable chat marker>
**Issue:** #<N>
**Base main:** <40-char SHA>
**Work branch / head:** work/KAR-<N> / <40-char SHA or NOT_CREATED>
**Target version / class:** <version> / <patch|hotfix|minor|major>
**Current phase:** <BOOTSTRAP|DEVELOPING|RED|GREEN|PR|MERGED|COMPLETED|BLOCKED>
**Last safe checkpoint:** <exact SHA / gate>
**Next action:** <one concrete next step>

### Scope
- Authorized:
- Explicitly out of scope:

### Completed
- ...

### Validation
- ...

### Failures / risks
- ...
```

Rules:
- Create and read back the comment before creating a Work branch.
- Update this same comment; do not create a stream of replacement status comments.
- Before PR, it must contain the exact current Work HEAD SHA.
- On interruption, Issue + Rolling Comment + Git SHA are the recovery authority.

## Release artifacts

Git is the source authority. Do not publish Source ZIPs.

Each GitHub release contains exactly the installable Chrome ZIP:
`kleinanzeigen-renewal-chrome-vX.Y.Z.zip`

The SHA-256 is written into the GitHub Release notes.

## Native acceptance

Hosted CI must not perform real Kleinanzeigen publication/deletion. Real-account native smoke and performance measurements remain separate evidence.
