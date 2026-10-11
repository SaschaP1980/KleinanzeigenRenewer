#!/usr/bin/env bash
# Render release notes as literal Markdown, never execute Markdown backticks.
set -euo pipefail
: "${VERSION:?VERSION required}"
: "${MODE:?MODE required}"
: "${GITHUB_SHA:?GITHUB_SHA required}"
: "${ZIP_BYTES:?ZIP_BYTES required}"
: "${ZIP_SHA256:?ZIP_SHA256 required}"
[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]
[[ "$MODE" == fast || "$MODE" == work ]]
[[ "$GITHUB_SHA" =~ ^[0-9a-f]{40}$ ]]
[[ "$ZIP_BYTES" =~ ^[1-9][0-9]*$ ]]
[[ "$ZIP_SHA256" =~ ^[0-9a-f]{64}$ ]]
printf 'Kleinanzeigen Renewer v%s\n\n' "$VERSION"
printf -- '- Source authority: Git commit `%s`\n' "$GITHUB_SHA"
printf -- '- Development path: `%s`\n' "$MODE"
printf -- '- Chrome ZIP bytes: `%s`\n' "$ZIP_BYTES"
printf -- '- Chrome ZIP SHA-256: `%s`\n' "$ZIP_SHA256"
printf '%s\n' '- Dynamic Public Function Coverage: mandatory 100% gate passed' '- Native real-account smoke: not performed by hosted CI'
