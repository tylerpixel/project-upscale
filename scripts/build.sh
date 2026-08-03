#!/usr/bin/env bash
#
# Build the minified CSS and JS that index.html actually loads.
#
#   ./scripts/build.sh            # write styles/*.min.css and js/*.min.js
#   ./scripts/build.sh --check    # fail if the outputs are stale, write nothing
#
# The hand-edited sources stay the sources: styles/main.css, js/site.js and
# js/store.js are what you change, and this regenerates the .min files beside
# them. ship.sh runs this before every deploy, so what goes to production is
# never stale — but that also means editing a source and reloading the local
# dev server shows you the OLD output until you re-run this.
#
# The unminified sources are deployed too, deliberately. A returning visitor
# holding a cached index.html from before this change will still ask for
# /js/site.js, and that has to keep resolving.
#
# No package.json on purpose — these are pinned one-shot tools fetched through
# npx, the same way ship.sh already gets wrangler, so the repo keeps its "no
# dependencies to install" property.
set -euo pipefail

cd "$(dirname "$0")/.."

TERSER="terser@5.44.0"
LIGHTNINGCSS="lightningcss-cli@1.30.1"

CHECK=0
[ "${1:-}" = "--check" ] && CHECK=1

# The font is cut before the CSS is minified, because subset-font.py rewrites
# the two @font-face rules in styles/main.css from the ranges it just built.
# Minifying first would produce a main.min.css whose unicode-range disagrees
# with the .woff2 files beside it — the kind of mismatch that shows up as one
# stray character in the wrong typeface and nowhere else.
#
# fonttools is fetched through uv exactly the way terser and lightningcss are
# fetched through npx: pinned, one-shot, nothing stored in the repo.
if command -v uv >/dev/null 2>&1; then
  if [ "$CHECK" -eq 1 ]; then
    uv run --quiet --with 'fonttools[woff]' python scripts/subset-font.py --check || FONT_STALE=1
  else
    uv run --quiet --with 'fonttools[woff]' python scripts/subset-font.py
  fi
elif [ "$CHECK" -eq 0 ]; then
  # Not fatal: the checked-in subsets are still valid, and the font source only
  # changes when the typeface itself does.
  echo "  note: uv not found — skipping the font subset, reusing fonts/dmsans-*.woff2" >&2
fi

# main.css -> main.min.css, and each js/*.js -> js/*.min.js
SOURCES=("styles/main.css" "js/theme.js" "js/cuelume.js" "js/site.js" "js/store.js")

build_one() {
  local src="$1" out="$2"
  case "$src" in
    *.css) npx --yes "$LIGHTNINGCSS" --minify "$src" -o "$out" >/dev/null ;;
    *.js) npx --yes "$TERSER" "$src" --compress --mangle --output "$out" ;;
  esac
}

# Mangling top-level names would break the site: site.js and store.js are two
# plain scripts sharing globals (store.js calls site.js's helpers), not modules.
# terser leaves top-level names alone by default, which is exactly what's needed
# — don't add --mangle-props or toplevel mangling here.

STALE="${FONT_STALE:-0}"
for src in "${SOURCES[@]}"; do
  out="${src%.*}.min.${src##*.}"
  if [ "$CHECK" -eq 1 ]; then
    if [ ! -f "$out" ] || [ "$src" -nt "$out" ]; then
      echo "stale: $out is missing or older than $src" >&2
      STALE=1
    fi
    continue
  fi
  build_one "$src" "$out"
  printf "  %-20s %7d -> %7d bytes (-%d%%)\n" \
    "$(basename "$out")" \
    "$(stat -f%z "$src")" "$(stat -f%z "$out")" \
    "$(( 100 - (100 * $(stat -f%z "$out") / $(stat -f%z "$src")) ))"
done

if [ "$CHECK" -eq 1 ]; then
  [ "$STALE" -eq 0 ] && echo "Minified output is up to date."
  exit "$STALE"
fi

echo "Built. index.html loads the .min files; the sources stay deployed for cached clients."
echo "index.html itself is minified at deploy time by inline-content.js, not here —"
echo "committing a minified index.html would destroy the source it was built from."
echo
echo "Weigh the result:  node scripts/weigh.js"
