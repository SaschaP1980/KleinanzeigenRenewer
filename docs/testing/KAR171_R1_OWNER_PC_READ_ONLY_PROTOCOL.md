# KAR-171 / R1 — Owner-controlled read-only My Ads acceptance protocol

**Status:** Protocol only, **NOT EXECUTED**. R1 is **NOT ACCEPTED**. No owner-PC installation, real-account verification, updater reserve, NativeHost apply, Chrome reload or Kleinanzeigen mutation is authorized by this document.

## Purpose and evidence boundary

Confirm that the existing R1 implementation independently verifies a **previously and legitimately completed** Phase-4 source deletion and replacement/publication under the actual authenticated Kleinanzeigen account, using the *original immutable P8 attempt*, not merely a historical journal resolution or a simulated success. The verified origin includes the original account/profile, source and target numeric Ad IDs, P8 admission token, attempt ID and Worker generation. The source must be absent after an exhausted My Ads pagination; the target must be present by its exact Ad ID. The fresh source and target observations must each preserve the authenticated account across every scanned page, with an independent final origin-locked account/source recheck before committing a resolution.

The hosted regression suites prove only deterministic code and fixture behavior. Their **GREEN does not establish the owner-PC authenticated remote evidence required to accept R1**.

## Preconditions (all mandatory)

1. The owner must separately authorize a controlled, read-only Chrome test with the precise `work/KAR-171` source revision and an isolated test browser profile. **Never replace the stable production extension or reuse its persistent profile/database without explicit owner authorization and a validated backup/restore plan.**
2. An original immutable, valid P8 attempt for a legitimate completed operation must already exist in that tested runtime, with matching worker-generation source. Do not publish, delete, renew, alter listings, or fabricate P8 records merely to create the test prerequisite. If no such original attempt exists, **record R1 BLOCKED**.
3. Work branch provenance is checked against the live GitHub ref and recorded with full SHA; re-run the exact committed R1 test and mandatory regression/coverage checks first. Source and diagnostics must contain no unauthorized update-apply, reload or listing-mutation test switches.
4. The real-account login must be visible as `Angemeldet als`, and the selected local profile must match the expected account before each probe. If not, stop without a positive receipt. Do not export cookies or login credentials.

## Controlled evidence matrix

| Test | Read-only observation | Expected result |
| --- | --- | --- |
| Original source and target | Independent fresh My Ads PROJECTS tabs; full pagination for **original** source absence and exact target presence; no skipped or repeated pages | Positive source/target results are valid only with exact account, original P8 attempt/worker/token, page counts and target page bounds |
| Publication | Fresh target presence for the original publication/fill/workflow attempt | Exact target Ad ID, account and immutable P8 lineage; never infer from a local fill or old receipt |
| Interrupted scan | Interrupt a read-only tab or browser worker during pagination without submitting any listing action | Outcome remains UNKNOWN/unverified; no positive resolution, retry of remote mutation, lease or apply |
| Worker restart | Restart MV3 worker between a previously valid durable attempt and a **new** read-only scan | Original worker/token must still match durable P8 source; a new worker cannot impersonate the original |
| Account/profile switch | Change account or selected profile only in a deliberate, owner-supervised non-mutating read-only session; also inspect pagination-bound account changes | Any account drift before, during or after a scan rejects positive source absence and target presence |
| Missing/contradictory origin | Read-only characterization with missing original P8 START, malformed FINISH or changed attempt, without editing real account data | No positive R1 outcome or lease; fixture-only adversarial cases must be reported separately |
| Replay | Re-open an already resolved intent and perform an independent fresh probe | No duplicate deletion/publish; prior history alone cannot establish new current authority |

**Do not make real-account destructive mutations to stage any case.** If negative tests require changing storage/P8 records, run those **only in a disposable offline fixture**, never in the owner's live extension. An account switch on the genuine session is optional; if not safe or feasible, mark that native scenario PENDING instead of manufacturing a PASS.

## Evidence to record in the canonical Issue #171 Rolling Comment

- Exact Work HEAD, current main SHA, browser/Windows versions and the installation/test profile isolation method, or **NOT RUN** and why.
- Per test: observed PASS / FAIL / BLOCKED, whether the source was a live authenticated page or an offline fixture, and date/time of observation.
- Redacted P8 source signature and redacted account/source/target/attempt correlation **consistent across the record**; source and target page counts, found page, source-absence evidence, account checks before/after every page and final locked witness.
- Worker restart/interruption events and explicitly unresolved outcomes. Record *absence of remote mutations* separately from remote source-absence, because these are different claims.
- Relevant sanitized diagnostic identifiers, CI run IDs, any limits of the observation, and explicit owner native sign-off when eventually given.

Do **not** upload raw session cookies, credentials, authentication headers, full personal account names, phone numbers or unredacted internal tokens. Never present a screenshot of a logged-in page as sufficient proof of the original P8-bound result.

## R1 exit decision

R1 remains **BLOCKED / NOT ACCEPTED** until the authentic, source-safe owner-controlled results exist, all required negative/positive and interruption cases are linked to an exact tested source revision, and the full applicable regressions are GREEN. Acceptance must be explicitly recorded as `R1 ACCEPTED` in #171 before **R2** can become active. No subsequent R2–R6 work, positive updater lease, Windows apply, Chrome reload, merge or release is authorized by creation of this protocol.
