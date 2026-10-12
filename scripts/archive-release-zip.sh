#!/usr/bin/env bash
# Archive precisely the published Chrome ZIP; no tag/asset mutation here.
set -Eeuo pipefail
if [ "$#" -ne 5 ]; then echo 'Usage: archive-release-zip.sh ZIP VERSION SHA256 BYTES TAG_SHA' >&2; exit 2; fi
ZIP="$1"; VERSION="$2"; EXPECTED_DIGEST="$3"; EXPECTED_BYTES="$4"; TAG_SOURCE_SHA="$5"
: "$GITHUB_REPOSITORY"; : "$GITHUB_SHA"; : "$GH_TOKEN"
[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]
[[ "$EXPECTED_DIGEST" =~ ^[a-f0-9]{64}$ ]]
[[ "$EXPECTED_BYTES" =~ ^[1-9][0-9]*$ ]]
[[ "$TAG_SOURCE_SHA" =~ ^[a-f0-9]{40}$ ]]
[[ "$GITHUB_SHA" =~ ^[a-f0-9]{40}$ ]]
test -f "$ZIP"
NAME="kleinanzeigen-renewal-chrome-v$VERSION.zip"
test "$(basename "$ZIP")" = "$NAME"
test "$(stat -c '%s' "$ZIP")" = "$EXPECTED_BYTES"
test "$(sha256sum "$ZIP" | awk '{print $1}')" = "$EXPECTED_DIGEST"
unzip -t "$ZIP" >/dev/null
test "$(unzip -p "$ZIP" manifest.json | python3 -c 'import json,sys; print(json.load(sys.stdin)["version"])')" = "$VERSION"
test "$(git rev-parse HEAD)" = "$GITHUB_SHA"
test -z "$(git status --porcelain)"
test "$(git ls-remote origin refs/heads/main | cut -f1)" = "$GITHUB_SHA"
RELEASE="$(gh api "repos/$GITHUB_REPOSITORY/releases/tags/v$VERSION")"
jq -e --arg tag "v$VERSION" --arg sha "$TAG_SOURCE_SHA" \
  --arg name "$NAME" --arg dig "sha256:$EXPECTED_DIGEST" --argjson bytes "$EXPECTED_BYTES" '
  .tag_name == $tag and .target_commitish == $sha and
  .draft == false and .prerelease == false and
  (.assets | length == 1) and .assets[0].name == $name and
  .assets[0].state == "uploaded" and .assets[0].size == $bytes and
  .assets[0].digest == $dig' <<< "$RELEASE" >/dev/null
test "$(gh api "repos/$GITHUB_REPOSITORY/git/ref/tags/v$VERSION" --jq .object.sha)" = "$TAG_SOURCE_SHA"
TARGET="release/$NAME"
if [ -e "$TARGET" ]; then
  test -f "$TARGET"
  test "$(sha256sum "$TARGET" | awk '{print $1}')" = "$EXPECTED_DIGEST"
  test "$(stat -c '%s' "$TARGET")" = "$EXPECTED_BYTES"
  echo "KAR_REPO_ZIP_ALREADY_IDENTICAL $TARGET"
  exit 0
fi
install -m 0644 "$ZIP" "$TARGET"
test "$(sha256sum "$TARGET" | awk '{print $1}')" = "$EXPECTED_DIGEST"
git add -f -- "$TARGET"
test "$(git diff --cached --name-only)" = "$TARGET"
git -c user.name='github-actions[bot]' \
    -c user.email='41898282+github-actions[bot]@users.noreply.github.com' \
    commit -m "chore(release): archive Chrome ZIP v$VERSION in release/"
NEW_SHA="$(git rev-parse HEAD)"
test "$(git show --format= --name-only HEAD)" = "$TARGET"
test "$(git rev-parse HEAD^)" = "$GITHUB_SHA"
test "$(git ls-remote origin refs/heads/main | cut -f1)" = "$GITHUB_SHA"
git push origin HEAD:refs/heads/main
test "$(git ls-remote origin refs/heads/main | cut -f1)" = "$NEW_SHA"
echo "KAR_RELEASE_REPO_ARCHIVE_OK path=$TARGET sha256=$EXPECTED_DIGEST bytes=$EXPECTED_BYTES commit=$NEW_SHA"
