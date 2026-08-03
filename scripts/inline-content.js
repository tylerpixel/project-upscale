#!/usr/bin/env node
//
// Fold data/site-content.json into index.html for a deploy, so the browser gets
// the site's copy in the same response as the document instead of asking for a
// second file before it can render anything.
//
//   node scripts/inline-content.js            # deploy state
//   node scripts/inline-content.js --revert   # repo state
//   node scripts/inline-content.js --check    # report which state the tree is in
//
// ship.sh runs this *after* the release commit and reverts it after the deploy,
// so neither change below ever lands in git.
//
// Three things move together:
//
//   index.html   the marked-off region in <head> holds either the preload
//                (repo) or <script id="siteContent" type="application/json">
//                carrying the whole content file (deploy). The deploy copy is
//                then minified — see below.
//
//   the backup   index.html.parked, a byte-exact copy of the repo file taken
//                before either transform. --revert restores from it rather
//                than trying to reconstruct what was there, because comments
//                and indentation cannot be regenerated once minified away.
//
//   the files    each renamed to <name>.parked for the deploy. *.parked is in
//                .assetsignore, so wrangler skips them:
//                  data/site-content.json  its contents are in the document now
//                  dev/devtools.js         local-only toolbar, never uploaded
//
// They're parked rather than permanently .assetsignore'd because `wrangler dev`
// applies .assetsignore too: listing a real path there would also stop the local
// server serving it, and that's exactly where both files are needed — the CMS
// edits the content file in place, and the toolbar only ever loads on localhost.
// Parking exists only between the inline and the revert.
//
// js/site.js reads the script tag when it's present and fetches the file when
// it isn't, so both states are fully working sites.
//
// ── Why the document is minified here and not in build.sh ──
//
// index.html is ~15 KB of explanatory comments and indentation, and those are
// worth keeping — they are where the reasoning behind the head lives. They are
// also worth nothing to a browser. Stripping them at deploy time is the only
// way to have both: the repo keeps every comment, the edge gets none of them.
//
// It happens here rather than in build.sh because build.sh runs *before* the
// release commit, and a minified index.html committed once would destroy the
// source. Everything in this file is applied after the commit and undone after
// the upload, so it never reaches git.

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const HTML = path.join(ROOT, "index.html");
const CONTENT = path.join(ROOT, "data", "site-content.json");

// Pinned and fetched on demand, the same way build.sh gets terser and
// lightningcss — nothing is added to the repo.
const HTML_MINIFIER = "html-minifier-terser@7.2.0";

// Kept out of the upload for the duration of a deploy. Renamed to <name>.parked
// on the way in and back again on the way out; a missing one is skipped, since
// dev/devtools.js is gitignored and won't exist on a fresh clone.
const PARK = [CONTENT, path.join(ROOT, "dev", "devtools.js")];
const parkedName = (p) => `${p}.parked`;

// The document's backup uses the same suffix, so it is covered by the existing
// *.parked rules in .assetsignore and .gitignore. It is a copy rather than a
// rename: index.html has to stay in place throughout, since it is the site.
const HTML_BACKUP = parkedName(HTML);

// Comments and whitespace out; nothing that changes what the document means.
// Attributes and class names are sorted purely to help brotli — repeated
// orderings compress better than arbitrary ones.
//
// processScripts is left off, so <script id="siteContent"> is passed through
// untouched. That matters: it holds the site's entire copy as JSON, and the
// blob is verified byte-identical across the minify below rather than assumed.
const MINIFY_FLAGS = [
  "--collapse-whitespace",
  "--remove-comments",
  "--remove-redundant-attributes",
  "--collapse-boolean-attributes",
  "--sort-attributes",
  "--sort-class-name",
];

const SITE_CONTENT_RE = /<script id="siteContent" type="application\/json">([\s\S]*?)<\/script>/;

function minifyHtml(html) {
  const tmp = path.join(ROOT, ".index.minify.tmp.html");
  fs.writeFileSync(tmp, html);
  try {
    const out = execFileSync("npx", ["--yes", HTML_MINIFIER, ...MINIFY_FLAGS, tmp], {
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    });

    // The whole point of the deploy document is the content blob. If the
    // minifier ever touches it — a future flag, a version bump — the site
    // ships with unparseable copy and nothing else catches it. So compare.
    const before = (html.match(SITE_CONTENT_RE) || [])[1];
    const after = (out.match(SITE_CONTENT_RE) || [])[1];
    if (before !== after) {
      throw new Error(
        "the minifier altered the inlined content blob — refusing to deploy a " +
          "document whose copy may not parse."
      );
    }
    return out;
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

function park() {
  return PARK.filter((p) => fs.existsSync(p)).map((p) => {
    fs.renameSync(p, parkedName(p));
    return p;
  });
}

// Runs even when index.html is already reverted: a deploy interrupted between
// the two steps leaves files parked, and that's the half that breaks the local
// server.
function unpark() {
  return PARK.filter((p) => fs.existsSync(parkedName(p))).map((p) => {
    fs.renameSync(parkedName(p), p);
    return p;
  });
}

const START = "<!-- content:start -->";
const END = "<!-- content:end -->";

// The repo state, written back verbatim by --revert.
const PRELOAD = `    <link rel="preload" href="/data/site-content.json" as="fetch" crossorigin />`;

const rel = (p) => path.relative(ROOT, p);
const mode = process.argv[2] || "--inline";

// Deploy state is recognised by the backup existing, and handled before
// anything tries to read the markers. A minified index.html has had its
// comments stripped, so the START/END markers are gone with them — the check
// further down would abort on exactly the file that most needs reverting.
// While the backup is on disk it, not index.html, is the source of truth.
if (fs.existsSync(HTML_BACKUP)) {
  if (mode === "--revert") {
    fs.renameSync(HTML_BACKUP, HTML);
    console.log(`inline-content: restored index.html from ${rel(HTML_BACKUP)}.`);
    for (const p of unpark()) console.log(`inline-content: ${rel(parkedName(p))} -> ${rel(p)}`);
    process.exit(0);
  }

  if (mode === "--check") {
    console.log("index.html: INLINED + MINIFIED (deploy state)");
    console.log(`${rel(HTML_BACKUP)}: PRESENT — the original, restored by --revert`);
    for (const p of PARK) {
      const state = fs.existsSync(p) ? "in place" : fs.existsSync(parkedName(p)) ? "PARKED" : "absent";
      console.log(`${rel(p)}: ${state}`);
    }
    process.exit(0);
  }

  console.error(
    `inline-content: ${rel(HTML_BACKUP)} already exists, so index.html is mid-deploy. ` +
      `Run --revert first — overwriting it would lose the original document.`
  );
  process.exit(1);
}

const html = fs.readFileSync(HTML, "utf8");
const startAt = html.indexOf(START);
const endAt = html.indexOf(END);

if (startAt === -1 || endAt === -1) {
  console.error(
    `inline-content: index.html is missing the ${START} / ${END} markers — ` +
      `nothing can be swapped in or out without them.` +
      (fs.existsSync(HTML_BACKUP) ? "" : ` No ${rel(HTML_BACKUP)} to restore from either.`)
  );
  process.exit(1);
}

const head = html.slice(0, startAt + START.length);
const middle = html.slice(startAt + START.length, endAt);
const tail = html.slice(endAt);
const isInlined = middle.includes('id="siteContent"');

if (mode === "--check") {
  console.log(`index.html: ${isInlined ? "INLINED (deploy state)" : "fetching (repo state)"}`);
  console.log(
    `${rel(HTML_BACKUP)}: ${fs.existsSync(HTML_BACKUP) ? "PRESENT — a deploy was interrupted, run --revert" : "absent"}`
  );
  for (const p of PARK) {
    const state = fs.existsSync(p) ? "in place" : fs.existsSync(parkedName(p)) ? "PARKED" : "absent";
    console.log(`${rel(p)}: ${state}`);
  }
  process.exit(0);
}

if (mode === "--revert") {
  let did = false;

  if (isInlined) {
    fs.writeFileSync(HTML, `${head}\n${PRELOAD}\n    ${tail}`);
    console.log("inline-content: index.html back to the preload + fetch.");
    did = true;
  }

  for (const p of unpark()) {
    console.log(`inline-content: ${rel(parkedName(p))} -> ${rel(p)}`);
    did = true;
  }

  if (!did) console.log("inline-content: already in repo state, nothing to revert.");
  process.exit(0);
}

// ── Deploy state ──

if (isInlined) {
  console.error(
    "inline-content: index.html is already inlined. Run --revert first, so a " +
      "stale blob can't be deployed as if it were current."
  );
  process.exit(1);
}

if (!fs.existsSync(CONTENT)) {
  console.error(
    `inline-content: ${rel(CONTENT)} is missing.` +
      (fs.existsSync(parkedName(CONTENT)) ? ` It looks parked — run --revert.` : "")
  );
  process.exit(1);
}

const raw = fs.readFileSync(CONTENT, "utf8");

// Parse before touching anything: a malformed content file has to fail the
// deploy here rather than ship a document whose only copy of the site's text is
// a blob the browser can't parse.
let parsed;
try {
  parsed = JSON.parse(raw);
} catch (err) {
  console.error(`inline-content: ${rel(CONTENT)} is not valid JSON — ${err.message}`);
  process.exit(1);
}

// Drop the 2-space indentation the file keeps for its diffs, then escape every
// `<`. The content carries real markup (<a>, <em>, <svg>), so an unescaped
// `</script` inside it would close the tag early and hand the rest of the
// site's copy to the HTML parser. < is valid JSON and parses back to `<`,
// so the escaping is invisible to the page.
const blob = JSON.stringify(parsed).replace(/</g, "\\u003c");

if (blob.includes("</script") || blob.includes("<!--")) {
  console.error("inline-content: escaping failed — refusing to write an unsafe blob.");
  process.exit(1);
}

const script = `    <script id="siteContent" type="application/json">${blob}</script>`;
const inlined = `${head}\n${script}\n    ${tail}`;

// Byte-exact copy of the repo file, taken before anything is written. Every
// path out of here — success, a failed minify, an interrupted deploy — gets
// back to the original by renaming this over index.html.
fs.copyFileSync(HTML, HTML_BACKUP);

const kib = (n) => `${(n / 1024).toFixed(1)} KiB`;
let deployHtml;
try {
  deployHtml = minifyHtml(inlined);
} catch (err) {
  fs.rmSync(HTML_BACKUP, { force: true });
  console.error(`inline-content: minifying index.html failed — ${err.message}`);
  process.exit(1);
}

fs.writeFileSync(HTML, deployHtml);

console.log(
  `inline-content: inlined ${rel(CONTENT)} (${kib(raw.length)} -> ${kib(blob.length)} minified) into index.html.`
);
console.log(
  `inline-content: minified index.html ${kib(inlined.length)} -> ${kib(deployHtml.length)} ` +
    `(-${100 - Math.round((100 * deployHtml.length) / inlined.length)}%); ` +
    `original held at ${rel(HTML_BACKUP)}.`
);
for (const p of park()) console.log(`inline-content: parked ${rel(p)} — not uploaded.`);
