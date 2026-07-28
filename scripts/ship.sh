#!/usr/bin/env bash
#
# Ship Project Upscale.
#
# Bumps the version in data/site-content.json (which is what the About page's
# chip renders), commits it, tags the commit, deploys to Cloudflare, and
# pushes. One command so the shipped build and the version on the page can
# never drift apart.
#
#   ./scripts/ship.sh              # 1.0.1 -> 1.0.2
#   ./scripts/ship.sh minor        # 1.0.1 -> 1.1.0
#   ./scripts/ship.sh major        # 1.0.1 -> 2.0.0
#   ./scripts/ship.sh --dry-run    # show what would happen, change nothing
#
set -euo pipefail

cd "$(dirname "$0")/.."

CONTENT="data/site-content.json"
PART="patch"
DRY_RUN=0

for arg in "$@"; do
  case "$arg" in
    patch|minor|major) PART="$arg" ;;
    --dry-run|-n) DRY_RUN=1 ;;
    *) echo "usage: $0 [patch|minor|major] [--dry-run]" >&2; exit 2 ;;
  esac
done

# A dirty tree means the release commit would sweep up unrelated work, and the
# tag would then point at something nobody reviewed.
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "Working tree has uncommitted changes — commit or stash them first." >&2
  git status --short --untracked-files=no >&2
  exit 1
fi

CURRENT=$(node -p "require('./$CONTENT').version || '0.0.0'")
NEXT=$(node -e "
  const [major, minor, patch] = '$CURRENT'.split('.').map(Number);
  const bumped = { major: [major + 1, 0, 0], minor: [major, minor + 1, 0], patch: [major, minor, patch + 1] }['$PART'];
  process.stdout.write(bumped.join('.'));
")

echo "Shipping $CURRENT -> $NEXT ($PART)"

if [ "$DRY_RUN" -eq 1 ]; then
  echo "Dry run — nothing written, nothing deployed."
  exit 0
fi

if git rev-parse -q --verify "refs/tags/v$NEXT" >/dev/null; then
  echo "Tag v$NEXT already exists." >&2
  exit 1
fi

# Rewrite only the version field, preserving key order and formatting so the
# diff is one line and the local CMS keeps round-tripping the file cleanly.
node -e "
  const fs = require('fs');
  const path = '$CONTENT';
  const content = JSON.parse(fs.readFileSync(path, 'utf8'));
  content.version = '$NEXT';
  fs.writeFileSync(path, JSON.stringify(content, null, 2) + '\n');
"

git add "$CONTENT"
git commit -m "v$NEXT"
git tag -a "v$NEXT" -m "v$NEXT"

npx wrangler deploy

git push --follow-tags

echo "Shipped v$NEXT — the About page chip now reads v$NEXT."
