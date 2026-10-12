# KAR Development Operations — Configuration Record

> **Scope/status (2026-10-12):** This is an initial, narrowly scoped repository-configuration record. The full first-time setup and operational runbook are still pending in [KAR-35](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/35) and [KAR-36](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/36). Do not interpret this first entry as completion of those Waves. The authoritative development and safety contracts remain in [DEVELOPMENT_GUIDELINES.md](DEVELOPMENT_GUIDELINES.md), [GITHUB_HOWTO.md](GITHUB_HOWTO.md), and the current workflows.

## GitHub main-branch ruleset — owner-selected baseline

**Repository:** [SaschaP1980/KleinanzeigenRenewer](https://github.com/SaschaP1980/KleinanzeigenRenewer)

**Evidence and verification boundary:** On **2026-10-12**, the owner showed the **New branch ruleset** configuration form and selected branch-rule checkboxes in the GitHub UI. The screenshots establish the **selected values before submission**, not that GitHub successfully saved, activated or enforces the resulting ruleset. Independent post-save ruleset readback is **PENDING**; **do not report branch protection as confirmed active** on the basis of those screenshots alone.

| Ruleset setting | Owner-selected configuration | Verification |
| --- | --- | --- |
| Ruleset name | `main protection` | Selected in creation form; saved state unverified |
| Enforcement status | `Active` | Selected in creation form; effective enforcement unverified |
| Target branches | `Default` (currently `main`) | Selected in creation form; saved target unverified |
| Bypass list | Empty | Visible in creation form; saved state unverified |
| `Restrict deletions` | **Enabled** | Checkbox selected; enforcement unverified |
| `Block force pushes` | **Enabled** | Checkbox selected; enforcement unverified |
| `Restrict creations` / `Restrict updates` | Disabled | Checkbox not selected |
| `Require a pull request before merging` | **Disabled for now** | Checkbox not selected |
| `Require status checks to pass` | **Disabled for now** | Checkbox not selected |
| Other rules displayed in the screenshots | Not enabled | Includes linear history, deployments, signed commits, code scanning, code quality, code coverage and Copilot review |

### Operational meaning and limitations

When saved and actually enforced for the default branch, this **baseline** is intended to prevent branch deletion and forced history rewrites. It **does not require PRs or passing CI checks** before a normal push to `main`; it does **not** by itself prohibit ordinary direct updates to `main`.

This limited initial policy deliberately preserves the existing development/release workflow:

- The normative [Fast Path](DEVELOPMENT_GUIDELINES.md) supports small, bounded, branchless changes directly on a freshly verified `main`, with its existing validation requirements.
- [`kar-release.yml`](../.github/workflows/kar-release.yml) calls [`scripts/archive-release-zip.sh`](../scripts/archive-release-zip.sh), which validates the released Chrome ZIP and then performs a normal `git push origin HEAD:refs/heads/main` to archive the identical binary under `release/`.
- Enabling mandatory PRs or branch-update status checks **without first adapting and validating these paths** could break release archiving or the agreed Fast Path. Such a change requires a separately scoped, authorized implementation, actual hosted tests and an explicit decision about the future direct-push contract.
- **Never** bypass or weaken release verification, main CI evidence, product safety checks or owner publication authorization merely to satisfy a ruleset.

### Remaining validation and future hardening

1. **PENDING:** Independently confirm that the `main protection` ruleset was actually created and is `Active`, matches the `Default`/`main` target, has no bypass actors, and enforces exactly the two selected protections. Read back saved configuration or effective rules via an actually supported GitHub settings/API interface. Do not infer success from the unsaved form or connector permissions.
2. **PENDING, separate authorization:** Evaluate full protection (mandatory PRs and/or status checks) together with a compatible release-archive and Fast-Path migration; change no settings until a tested approach is agreed.
3. **NOT NEEDED for the limited baseline:** New personal access tokens, broad administration bypasses or third-party integrations.

**Owner-side setup boundary:** This specific ruleset configuration was performed via the owner's GitHub UI because the available GitHub connector does not expose a verified ruleset-settings mutation/readback action. All routine code, Issue, PR, CI and supported GitHub operations remain agent-managed. The owner should not be asked to perform routine repository work merely because a connector operation is missing; evaluate narrowly scoped, auditable least-privilege alternatives first.

**Tracking:** [KAR-35 — DEV_OPS bootstrap](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/35) and [KAR-36 — autonomous runbook](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/36). This record captures the settings decision now; it does not mark either Wave complete.
