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
// Two things move together:
//
//   index.html   the marked-off region in <head> holds either the preload
//                (repo) or <script id="siteContent" type="application/json">
//                carrying the whole content file (deploy).
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

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const HTML = path.join(ROOT, "index.html");
const CONTENT = path.join(ROOT, "data", "site-content.json");

// Kept out of the upload for the duration of a deploy. Renamed to <name>.parked
// on the way in and back again on the way out; a missing one is skipped, since
// dev/devtools.js is gitignored and won't exist on a fresh clone.
const PARK = [CONTENT, path.join(ROOT, "dev", "devtools.js")];
const parkedName = (p) => `${p}.parked`;

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

const html = fs.readFileSync(HTML, "utf8");
const startAt = html.indexOf(START);
const endAt = html.indexOf(END);

if (startAt === -1 || endAt === -1) {
  console.error(
    `inline-content: index.html is missing the ${START} / ${END} markers — ` +
      `nothing can be swapped in or out without them.`
  );
  process.exit(1);
}

const head = html.slice(0, startAt + START.length);
const middle = html.slice(startAt + START.length, endAt);
const tail = html.slice(endAt);
const isInlined = middle.includes('id="siteContent"');

if (mode === "--check") {
  console.log(`index.html: ${isInlined ? "INLINED (deploy state)" : "fetching (repo state)"}`);
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
fs.writeFileSync(HTML, `${head}\n${script}\n    ${tail}`);

const kib = (n) => `${(n / 1024).toFixed(1)} KiB`;
console.log(
  `inline-content: inlined ${rel(CONTENT)} (${kib(raw.length)} -> ${kib(blob.length)} minified) into index.html.`
);
for (const p of park()) console.log(`inline-content: parked ${rel(p)} — not uploaded.`);
