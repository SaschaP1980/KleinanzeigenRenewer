#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
raw="$project_dir/coverage/raw"
rm -rf "$raw"; mkdir -p "$raw"
cd "$project_dir"
NODE_V8_COVERAGE="$raw" npm test
node scripts/v12319-coverage-report.cjs "$raw" coverage
node scripts/v12319-architecture-audit.cjs >/dev/null
node scripts/coverage-no-regression.cjs

rm -rf "$raw"
echo "PASS v1.23.19 coverage gate"
