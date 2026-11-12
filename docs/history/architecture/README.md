# Historical architecture evidence — v1.23.x

These **28** immutable architecture baselines/progress snapshots were relocated from the repository root as a path-only maintenance change under [KAR-167](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/167). JSON bytes and individual Git blob SHAs are preserved; historical regression/characterization tests use the new relative path.

The canonical current architecture rules remain in [PROJECT_CONTEXT.md](../../PROJECT_CONTEXT.md), the actual runtime source and GitHub Issues. Do not treat old snapshots as authoritative current product state.

## Archived records

- [architecture-baseline-v1.23.0.json](architecture-baseline-v1.23.0.json)
- [architecture-progress-v1.23.1.json](architecture-progress-v1.23.1.json)
- [architecture-progress-v1.23.10.json](architecture-progress-v1.23.10.json)
- [architecture-progress-v1.23.11.json](architecture-progress-v1.23.11.json)
- [architecture-progress-v1.23.12.json](architecture-progress-v1.23.12.json)
- [architecture-progress-v1.23.13.json](architecture-progress-v1.23.13.json)
- [architecture-progress-v1.23.14.json](architecture-progress-v1.23.14.json)
- [architecture-progress-v1.23.15.json](architecture-progress-v1.23.15.json)
- [architecture-progress-v1.23.16.json](architecture-progress-v1.23.16.json)
- [architecture-progress-v1.23.16_c1.json](architecture-progress-v1.23.16_c1.json)
- [architecture-progress-v1.23.16_c2.json](architecture-progress-v1.23.16_c2.json)
- [architecture-progress-v1.23.17.json](architecture-progress-v1.23.17.json)
- [architecture-progress-v1.23.17_c1.json](architecture-progress-v1.23.17_c1.json)
- [architecture-progress-v1.23.17_c2.json](architecture-progress-v1.23.17_c2.json)
- [architecture-progress-v1.23.17_c3.json](architecture-progress-v1.23.17_c3.json)
- [architecture-progress-v1.23.18.json](architecture-progress-v1.23.18.json)
- [architecture-progress-v1.23.19.json](architecture-progress-v1.23.19.json)
- [architecture-progress-v1.23.2.json](architecture-progress-v1.23.2.json)
- [architecture-progress-v1.23.20.json](architecture-progress-v1.23.20.json)
- [architecture-progress-v1.23.20_c1.json](architecture-progress-v1.23.20_c1.json)
- [architecture-progress-v1.23.22.json](architecture-progress-v1.23.22.json)
- [architecture-progress-v1.23.3.json](architecture-progress-v1.23.3.json)
- [architecture-progress-v1.23.4.json](architecture-progress-v1.23.4.json)
- [architecture-progress-v1.23.5.json](architecture-progress-v1.23.5.json)
- [architecture-progress-v1.23.6.json](architecture-progress-v1.23.6.json)
- [architecture-progress-v1.23.7.json](architecture-progress-v1.23.7.json)
- [architecture-progress-v1.23.8.json](architecture-progress-v1.23.8.json)
- [architecture-progress-v1.23.9.json](architecture-progress-v1.23.9.json)

**Compatibility:** the old root paths must not be silently recreated; tests and scripts which read the evidence are changed to this directory. Do not purge these files merely because their version is old.
