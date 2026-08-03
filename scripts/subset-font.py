#!/usr/bin/env python3
"""
Cut the two DM Sans faces the site serves out of the vendored statics.

    python scripts/subset-font.py            # write fonts/dmsans-*.woff2
    python scripts/subset-font.py --check    # fail if they're stale, write nothing

Run through uv so nothing lands in the repo:

    uv run --with 'fonttools[woff]' python scripts/subset-font.py

The design uses two weights
──────────────────────────
Medium (500) and Bold (700), and nothing else. That is a deliberate narrowing:
the site previously ran five weights — 400 inherited, 460 body, 500, 600, 700 —
which only a variable font can hit. Consolidating to two means the static faces
from Google's own release can be used directly.

Anything the CSS still asks for that isn't 500 or 700 is resolved by the
browser's own font matching, which picks the nearest declared weight: 400 and
460 both land on 500, 600 lands on 700. The tokens in main.css were moved to
match, so nothing is relying on that behaviour by accident.

Why the unnumbered statics
──────────────────────────
Google ships DM Sans statics in four optical-size groups. Their advance widths
were matched against the variable font instanced across the opsz axis, and the
unnumbered `DMSans-*` files are exactly opsz 14 — zero units of error across
ten probe glyphs. The site's type scale tops out at 14pt, so that is the right
group.

The trade this makes, stated plainly: static faces have no opsz axis, so small
text now renders on the 14pt design rather than the ~9–12pt one it used to
interpolate to. That is the cost of leaving variable fonts behind, and it was
an explicit choice rather than an accident.

Size, for the record
────────────────────
Two subset statics come to almost exactly what the single variable face did —
about 29 KB either way, within a hundred bytes. Statics were not chosen to save
bytes and do not; they were chosen because the design only needs two weights.

The unicode-range split
───────────────────────
Each weight is cut in two, exactly as before:

  dmsans-<w>-core.woff2   ASCII, Latin-1 and the punctuation the site sets.
                          Fetched on every visit.
  dmsans-<w>-ext.woff2    Everything else the face covered. Fetched only if a
                          glyph on the page needs it — so a CMS edit or a store
                          title containing "Łódź" still renders in DM Sans and
                          costs a visitor who never sees one nothing.

Layout features are kept whole (`*`). ss03 — the single-story g applied
site-wide in main.css — is present in these statics, and so are ss01–ss08,
`case`, `ordn` and `sups`, which the variable font did not carry.
"""

import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
STATIC = ROOT / "fonts" / "DM_Sans" / "static"
CSS = ROOT / "styles" / "main.css"

# weight -> source file. Both are opsz 14, the top of the site's type scale.
FACES = {
    500: STATIC / "DMSans-Medium.ttf",
    700: STATIC / "DMSans-Bold.ttf",
}

# The core face: English, and nothing that isn't.
#
# Everything a QWERTY keyboard can type — A–Z, a–z, 0–9 and every symbol on
# it — plus three groups that a keyboard can't reach but the site genuinely
# needs. Accented Latin, which used to live here, has moved to the extended
# face: an English portfolio does not pay for é and ñ on every visit.
CORE_RANGES = [
    # Everything on the keyboard. $ is in here, so it is also the first of the
    # currency symbols below.
    (0x0020, 0x007E),

    # Currency. The site sells things and quotes prices, and store titles come
    # from an API in whatever currency the visitor resolves to — /api/geo hands
    # back AUD here, but it won't for everyone. These are every currency glyph
    # the face has, and they cost a few hundred bytes together.
    (0x00A2, 0x00A5),  # ¢ £ ¤ ¥
    (0x20A8, 0x20A8),  # ₨
    (0x20AC, 0x20AC),  # €
    (0x20B9, 0x20BA),  # ₹ ₺
    (0x20BD, 0x20BD),  # ₽

    # Legal marks. The footer carries a copyright line, and ® and ™ turn up in
    # client names.
    (0x00A9, 0x00A9),  # ©
    (0x00AE, 0x00AE),  # ®
    (0x2122, 0x2122),  # ™

    # Typography a keyboard can't type but the copy is already full of. Leaving
    # these out is the one way this subset could visibly break: an apostrophe
    # is U+2019, not U+0027, so "I'm Tyler Pixel" in the About panel would drop
    # to a fallback font mid-word. Each one below was found in the actual
    # content, or is the mirror of one that was.
    (0x00B7, 0x00B7),  # ·   the separator in the footer
    (0x00D7, 0x00D7),  # ×
    (0x2013, 0x2014),  # – —
    (0x2018, 0x201A),  # ' ' ‚
    (0x201C, 0x201E),  # " " „
    (0x2022, 0x2022),  # •
    (0x2026, 0x2026),  # …
    (0x2030, 0x2030),  # ‰
    (0x2039, 0x203A),  # ‹ ›
    (0x2044, 0x2044),  # ⁄
    (0x2190, 0x2190),  # ←   the Next/Previous row
    (0x2192, 0x2192),  # →
    (0x2212, 0x2212),  # −   true minus, not a hyphen
]

START = "/* font-faces:start */"
END = "/* font-faces:end */"


def expand(ranges):
    return {cp for lo, hi in ranges for cp in range(lo, hi + 1)}


def as_css_range(codepoints):
    """Collapse a set of codepoints into the shortest legal unicode-range list."""
    out = []
    for cp in sorted(codepoints):
        if out and cp == out[-1][1] + 1:
            out[-1][1] = cp
        else:
            out.append([cp, cp])
    return ", ".join(f"U+{lo:04X}" if lo == hi else f"U+{lo:04X}-{hi:04X}" for lo, hi in out)


def build(src, out_path, codepoints):
    font = TTFont(src)

    opts = subset.Options()
    opts.layout_features = ["*"]
    # Keep only the names a browser reads. The full table carries the designer,
    # foundry, licence URL and sample text in several languages — about 1 KB of
    # strings nothing on the page can reach. (The licence itself travels with
    # the sources in fonts/DM_Sans/OFL.txt, which is what OFL actually requires.)
    opts.name_IDs = [1, 2, 3, 4, 5, 6]
    opts.notdef_outline = False
    opts.drop_tables += ["DSIG"]

    subsetter = subset.Subsetter(options=opts)
    subsetter.populate(unicodes=sorted(codepoints))
    subsetter.subset(font)

    assert_alternate_g(font, out_path)

    font.flavor = "woff2"
    font.save(out_path)
    return out_path.stat().st_size


def assert_alternate_g(font, out_path):
    """
    Fail the build if the single-story g didn't survive.

    ss03 substitutes `g` for `g.ss03`, and `g.ss03` has no character of its own
    — it is reachable only through that lookup. A subset driven by a list of
    Unicode codepoints therefore has no direct reason to keep it, and if the
    layout-closure step ever stopped pulling it in, the font would still build,
    still contain a `g`, and quietly render the wrong one everywhere. That is
    the kind of regression nobody notices for a month, so it is asserted rather
    than assumed.
    """
    if "GSUB" not in font:
        sys.exit(f"subset-font: {out_path.name} has no GSUB table — ss03 is gone.")

    gsub = font["GSUB"].table
    targets = set()
    for rec in gsub.FeatureList.FeatureRecord:
        if rec.FeatureTag != "ss03":
            continue
        for index in rec.Feature.LookupListIndex:
            for sub in gsub.LookupList.Lookup[index].SubTable:
                targets.update(getattr(sub, "mapping", {}).values())

    if not targets:
        sys.exit(f"subset-font: {out_path.name} kept no ss03 substitutions — the g would render default.")

    missing = targets - set(font.getGlyphOrder())
    if missing:
        sys.exit(
            f"subset-font: {out_path.name} maps ss03 onto glyphs it no longer contains: "
            f"{', '.join(sorted(missing))}"
        )


def face(comment, weight, filename, ranges):
    return f"""/* {comment} */
@font-face {{
  font-family: "DM Sans";
  font-style: normal;
  font-weight: {weight};
  font-display: swap;
  src: url("../fonts/{filename}") format("woff2");
  unicode-range: {ranges};
}}"""


def write_css(blocks):
    """
    Rewrite the @font-face rules in main.css from the ranges just built.

    Generated rather than hand-kept on purpose: a unicode-range in the CSS that
    disagrees with what is actually inside the .woff2 is invisible until some
    specific character renders in the wrong typeface. Deriving both from one
    definition makes that class of bug unrepresentable.
    """
    css = CSS.read_text(encoding="utf-8")
    start, end = css.find(START), css.find(END)
    if start == -1 or end == -1:
        sys.exit(f"subset-font: {CSS.name} is missing the {START} / {END} markers.")

    body = "\n".join(
        [
            START,
            "/* Generated by scripts/subset-font.py — edit that, not this.",
            "   Two weights (500, 700), each split by unicode-range: the core face is",
            "   fetched on every visit, the extended one only when a glyph on the page",
            "   actually needs it. Anything the CSS asks for that is neither 500 nor 700",
            "   is matched to the nearer of the two by the browser. */",
            *blocks,
            END,
        ]
    )
    CSS.write_text(css[:start] + body + css[end + len(END):], encoding="utf-8")


def main():
    missing = [str(p) for p in FACES.values() if not p.exists()]
    if missing:
        sys.exit("subset-font: missing source face(s):\n  " + "\n  ".join(missing))

    outputs = {
        (w, tier): ROOT / "fonts" / f"dmsans-{w}-{tier}.woff2"
        for w in FACES
        for tier in ("core", "ext")
    }

    if "--check" in sys.argv:
        newest_src = max(p.stat().st_mtime for p in FACES.values())
        stale = [o.name for o in outputs.values() if not o.exists() or o.stat().st_mtime < newest_src]
        if stale:
            print(f"stale: {', '.join(stale)} missing or older than the source faces", file=sys.stderr)
            return 1
        print("Font subsets are up to date.")
        return 0

    blocks = []
    total_core = 0
    for weight, src in sorted(FACES.items()):
        covered = set(TTFont(src).getBestCmap())
        core = expand(CORE_RANGES) & covered
        ext = covered - core

        core_size = build(src, outputs[(weight, "core")], core)
        ext_size = build(src, outputs[(weight, "ext")], ext)
        total_core += core_size

        blocks.append(face(f"{weight} — core, every visit", weight, outputs[(weight, 'core')].name, as_css_range(core)))
        blocks.append("")
        blocks.append(face(f"{weight} — extended, on demand", weight, outputs[(weight, 'ext')].name, as_css_range(ext)))
        if weight != max(FACES):
            blocks.append("")

        print(f"  {outputs[(weight,'core')].name:<24} {len(core):>4} glyphs  {core_size:>7} bytes  (every visit)")
        print(f"  {outputs[(weight,'ext')].name:<24} {len(ext):>4} glyphs  {ext_size:>7} bytes  (on demand)")

    write_css(blocks)
    print(f"  {'on the render path':<24} {'':>4}         {total_core:>7} bytes  (both cores)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
