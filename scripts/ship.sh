#!/usr/bin/env bash
#
# Ship Project Upscale.
#
# Bumps the version in data/site-content.json (which is what the site footer's
# chip renders), commits it, tags the commit, deploys to Cloudflare, and
# pushes. One command so the shipped build and the version on the page can
# never drift apart.
#
#   ./scripts/ship.sh                      # 1.0.1 -> 1.0.2
#   ./scripts/ship.sh minor                # 1.0.1 -> 1.1.0
#   ./scripts/ship.sh major                # 1.0.1 -> 2.0.0
#   ./scripts/ship.sh -m "New case study"  # custom commit subject
#   ./scripts/ship.sh --dry-run            # show what would happen, change nothing
#
# Whatever is outstanding in the working tree is swept into the release commit,
# so the tree is always clean afterwards and the tag always points at exactly
# what was deployed.
#
set -euo pipefail

cd "$(dirname "$0")/.."

CONTENT="data/site-content.json"
PART="patch"
DRY_RUN=0
MESSAGE=""

while [ $# -gt 0 ]; do
  case "$1" in
    patch|minor|major) PART="$1" ;;
    --dry-run|-n) DRY_RUN=1 ;;
    -m|--message)
      shift
      [ $# -gt 0 ] || { echo "-m needs a message" >&2; exit 2; }
      MESSAGE="$1"
      ;;
    *) echo "usage: $0 [patch|minor|major] [-m message] [--dry-run]" >&2; exit 2 ;;
  esac
  shift
done

# A rebase or merge left half-finished would otherwise get committed as if it
# were finished work.
if [ -d "$(git rev-parse --git-path rebase-merge 2>/dev/null)" ] ||
   [ -d "$(git rev-parse --git-path rebase-apply 2>/dev/null)" ] ||
   [ -f "$(git rev-parse --git-path MERGE_HEAD 2>/dev/null)" ]; then
  echo "A merge or rebase is in progress — finish it before shipping." >&2
  exit 1
fi

CURRENT=$(node -p "require('./$CONTENT').version || '0.0.0'")
NEXT=$(node -e "
  const [major, minor, patch] = '$CURRENT'.split('.').map(Number);
  const bumped = { major: [major + 1, 0, 0], minor: [major, minor + 1, 0], patch: [major, minor, patch + 1] }['$PART'];
  process.stdout.write(bumped.join('.'));
")

echo "Shipping $CURRENT -> $NEXT ($PART)"

PENDING=$(git status --porcelain)
if [ -n "$PENDING" ]; then
  echo "Including these working-tree changes in the release commit:"
  echo "$PENDING" | sed 's/^/  /'
else
  echo "Working tree clean — the version bump is the only change."
fi

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

# index.html seeds the role line with profile.role so it paints in the first
# frame instead of waiting on site-content.json — it's the LCP element. JS
# overwrites it either way, so a stale value is invisible in the browser and
# would only ever show up in the HTML source and to crawlers. Re-stamp it here
# so editing the role in the CMS can't leave the two out of step.
node -e "
  const fs = require('fs');
  const role = JSON.parse(fs.readFileSync('$CONTENT', 'utf8')).profile?.role || '';
  const html = fs.readFileSync('index.html', 'utf8');
  const escaped = role.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const next = html.replace(
    /(<h2 id=\"profileRole\">)[^<]*(<\/h2>)/,
    (match, open, close) => open + escaped + close
  );
  if (next !== html) {
    fs.writeFileSync('index.html', next);
    console.log('Re-stamped the seeded role in index.html: ' + role);
  }
"

# index.html loads the .min files, so they have to be rebuilt from the current
# sources *before* the commit — otherwise the tag names a tree whose minified
# assets are a revision behind the CSS and JS they were built from.
./scripts/build.sh

# Everything outstanding ships together, so the tag names exactly the tree
# that gets deployed a few lines below.
git add -A
git commit -m "${MESSAGE:-v$NEXT}${MESSAGE:+ (v$NEXT)}"
git tag -a "v$NEXT" -m "v$NEXT"

# Fold the content file into index.html for the upload only. This runs *after*
# the commit on purpose: the blob would otherwise be committed, and every copy
# edit would show up twice in the diff — once in data/site-content.json and
# again inside index.html. The trap puts index.html back even if the deploy
# fails, so a broken ship can't leave a 40 KiB blob in the working tree.
trap 'node scripts/inline-content.js --revert' EXIT
node scripts/inline-content.js

npx wrangler deploy

node scripts/inline-content.js --revert
trap - EXIT

git push --follow-tags

echo "Shipped v$NEXT — the About page chip now reads v$NEXT."
