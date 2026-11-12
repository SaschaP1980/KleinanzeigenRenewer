#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
raw="$project_dir/coverage/raw"
rm -rf "$raw"; mkdir -p "$raw"
cd "$project_dir"
# GitHub's clean checkout does not include locally generated coverage manifests.
# Generate the authoritative public API inventory before running execution-closure tests.
node scripts/runtime-api-inventory.cjs --json > "$project_dir/coverage/public-api-manifest.json"
NODE_V8_COVERAGE="$raw" npm test
# KAR-167: independent path/link/immutable architecture-evidence closure after the normal suite.
node tests/kar167-file-layout.cjs
node tests/kar167-script-closure.cjs
node scripts/v12319-coverage-report.cjs "$raw" coverage
node scripts/v12319-architecture-audit.cjs >/dev/null
node scripts/coverage-no-regression.cjs

rm -rf "$raw"
python3 tests/kar58-fast-patch-policy.py
echo "PASS v1.23.19 coverage gate"
