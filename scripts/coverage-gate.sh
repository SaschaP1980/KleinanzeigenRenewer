#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
raw="$project_dir/coverage/raw"
rm -rf "$raw"; mkdir -p "$raw"
cd "$project_dir"
# KAR-210: canonical product version, archive names and package identity.
python3 tests/kar210-product-version.py
python3 tests/kar210-version-identity.py
python3 tests/kar210-package-version.py
python3 tests/kar210-atomic-patch-version.py
python3 tests/kar210-ci-version.py
python3 tests/kar210-release-version.py
python3 tests/kar210-archive-version.py
python3 tests/kar210-work-pr-version.py
python3 tests/kar210-hotfix.py
python3 tests/kar210-hotfix-workflow.py
# KAR-210: validate explicit inactive suite scope before any product tests.
node tests/kar210-test-disposition.cjs
# GitHub's clean checkout does not include locally generated coverage manifests.
# Generate the authoritative public API inventory before running execution-closure tests.
node scripts/runtime-api-inventory.cjs --json > "$project_dir/coverage/public-api-manifest.json"
NODE_V8_COVERAGE="$raw" npm test
# S02: retained trash and diagnostic behavior is measured in npm test; later QoL tests are inventoried separately.
# KAR-167: independent path/link/immutable architecture-evidence closure after the normal suite.
node tests/kar167-file-layout.cjs
node tests/kar167-script-closure.cjs
node tests/kar167-icons-closure.cjs
node tests/kar167-test-coverage-closure.cjs
node tests/kar167-final-repository-closure.cjs
node tests/kar174-ui-asset-relocation.cjs
node tests/kar170-documentation-contract.cjs
node scripts/v12319-coverage-report.cjs "$raw" coverage
node scripts/v12319-architecture-audit.cjs >/dev/null
node scripts/coverage-no-regression.cjs

rm -rf "$raw"
python3 tests/kar58-fast-patch-policy.py
echo "PASS v1.23.19 coverage gate"
