#!/usr/bin/env node
//
// Weigh a cold first visit, in the bytes that actually cross the wire.
//
//   node scripts/weigh.js                  # weigh the tree as it stands
//   node scripts/weigh.js --save base.json # weigh it and record the result
//   node scripts/weigh.js --against base.json   # weigh it and show the delta
//
// Why this exists: `ls -la` measures the wrong thing. Cloudflare compresses
// text assets on the way out, so a 45 KB stylesheet is a 10 KB download, and a
// change that removes 10 KB of repetitive CSS might remove 200 bytes from the
// response. Optimising against raw file size is optimising against a number no
// visitor ever experiences.
//
// This file used to assume brotli at quality 11 and reported totals about 8 KB
// under what the site actually served. Cloudflare negotiates **zstd**, and at
// its default level. That was not guessed: the deployed assets were fetched
// from tylerpixel.com with `Accept-Encoding: zstd`, their encoded sizes
// recorded, and every plausible level compared against them.
//
//     level    css     js  store  cuelume  theme   legal   mean error
//         3  10455  19704   5870     2107    426   17194       0.58%
//         6   9204  18111   5561     2007    420   16177       6.34%
//        11   8849  17848   5515     2016    418   15791       7.64%
//        19   8588  17313   5420     1979    415   15288       9.67%
//    actual  10491  19476   5938     2110    425   17272           —
//
// Level 3 tracks production to well under a percent; anything higher flatters
// the result. A CDN compressing on the fly is optimising for latency, not
// ratio, so this is the number to hold the site to.
//
// The asset list is read out of index.html rather than hard-coded, so adding a
// script or dropping a stylesheet is reflected here without anyone remembering
// to update this file.
//
// index.html is measured in its *deploy* shape — with data/site-content.json
// folded in and the document minified, the way scripts/inline-content.js
// leaves it for wrangler. That composition happens in a temp file here; the
// tree on disk is never touched.

const fs = require("fs");
const os = require("os");
const path = require("path");
const zlib = require("zlib");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const HTML = path.join(ROOT, "index.html");
const CONTENT = path.join(ROOT, "data", "site-content.json");

// Calibrated against production — see the table above.
const ZSTD_LEVEL = 3;

if (typeof zlib.zstdCompressSync !== "function") {
  console.error(
    `weigh: this Node (${process.version}) has no zstd support, so it cannot\n` +
      "measure what Cloudflare actually sends. Node 22.15+ or 23.8+ is needed."
  );
  process.exit(1);
}

const wire = (buf) =>
  zlib.zstdCompressSync(buf, {
    params: { [zlib.constants.ZSTD_c_compressionLevel]: ZSTD_LEVEL },
  }).length;

// Every response also carries headers, which no compression figure captures but
// a visitor's connection certainly does. Measured on the live document over
// HTTP/2: transferSize 21250 against encodedBodySize 20950.
//
// Do not "correct" this upward from a curl run. curl speaks HTTP/1.1 and shows
// roughly 1500 bytes of headers per response; browsers speak HTTP/2, where
// HPACK compresses them against a shared table and repeated headers across the
// eight requests cost almost nothing after the first. 300 is the HTTP/2 figure
// and it is the one a visitor actually pays.
const HEADER_BYTES_PER_REQUEST = 300;

// woff2 is a compressed container already, as are the image formats. Running
// zstd over one is not just pointless, it is counterproductive — the output is
// larger, and any sensible server sends the file untouched. Confirmed on
// production: dmsans-500-core.woff2 comes back with no content-encoding at all.
const PRECOMPRESSED = /\.(woff2?|avif|webp|png|jpe?g|gif|mp4|webm|zip|gz|br|zst)$/i;
const cost = (file, buf) => (PRECOMPRESSED.test(file) ? buf.length : wire(buf));

// ── What a cold visit to "/" actually fetches ────────────────────────────────

// The deploy-shaped document: the content file folded into <head> and the
// whole thing minified, exactly as inline-content.js writes it, so the
// measurement covers the bytes wrangler uploads rather than the bytes the repo
// keeps. Measuring the repo copy would overstate the document by ~4 KB and
// make every later saving look smaller than it is.
//
// These two must not drift. If the flags here and in inline-content.js ever
// disagree, this reports a page weight nothing ever served.
const MINIFY_FLAGS = [
  "--collapse-whitespace",
  "--remove-comments",
  "--remove-redundant-attributes",
  "--collapse-boolean-attributes",
  "--sort-attributes",
  "--sort-class-name",
];

function deployHtml() {
  const html = fs.readFileSync(HTML, "utf8");
  const START = "<!-- content:start -->";
  const END = "<!-- content:end -->";
  const startAt = html.indexOf(START);
  const endAt = html.indexOf(END);

  let composed = html;
  if (startAt !== -1 && endAt !== -1 && fs.existsSync(CONTENT) && !html.slice(startAt, endAt).includes('id="siteContent"')) {
    const blob = JSON.stringify(JSON.parse(fs.readFileSync(CONTENT, "utf8"))).replace(/</g, "\\u003c");
    composed =
      html.slice(0, startAt + START.length) +
      `\n    <script id="siteContent" type="application/json">${blob}</script>\n    ` +
      html.slice(endAt);
  }

  const tmp = path.join(os.tmpdir(), `weigh-${process.pid}.html`);
  fs.writeFileSync(tmp, composed);
  try {
    return execFileSync("npx", ["--yes", "html-minifier-terser@7.2.0", ...MINIFY_FLAGS, tmp], {
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch {
    // No network, or npx unavailable. Report the unminified document rather
    // than nothing, and say so — a number that is honest about being pessimistic
    // beats a number that silently isn't.
    console.error("  (note: html-minifier unavailable — index.html measured unminified)");
    return composed;
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

// Pull the render-path assets straight out of the document. A stylesheet, a
// script or a preloaded font added to index.html shows up here on the next run
// with no edit to this file.
function criticalAssets(html) {
  const found = [];
  const add = (href) => {
    if (!href || /^(https?:)?\/\//.test(href) || href.startsWith("data:")) return;
    const file = href.replace(/^\//, "").split(/[?#]/)[0];
    if (fs.existsSync(path.join(ROOT, file)) && !found.includes(file)) found.push(file);
  };

  for (const tag of html.match(/<link\b[^>]*>/gi) || []) {
    const rel = (tag.match(/\brel="([^"]*)"/i) || [])[1] || "";
    const as = (tag.match(/\bas="([^"]*)"/i) || [])[1] || "";
    if (/\bstylesheet\b/i.test(rel) || (/\bpreload\b/i.test(rel) && as === "font")) {
      add((tag.match(/\bhref="([^"]*)"/i) || [])[1]);
    }
  }
  for (const tag of html.match(/<script\b[^>]*\bsrc="[^"]*"[^>]*>/gi) || []) {
    add((tag.match(/\bsrc="([^"]*)"/i) || [])[1]);
  }
  return found;
}

// Everything a first paint does NOT wait on, reported separately so it can't
// quietly pad — or quietly flatter — the headline number.
function deferredAssets() {
  const out = [];
  const legal = path.join(ROOT, "data", "legal.json");
  if (fs.existsSync(legal)) out.push("data/legal.json");

  const images = [];
  (function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (!entry.name.startsWith(".")) images.push(path.relative(ROOT, full));
    }
  })(path.join(ROOT, "images"));

  return { out, images };
}

// ── Report ───────────────────────────────────────────────────────────────────

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const pad = (s, n) => String(s).padEnd(n);
const num = (n, w) => String(n).padStart(w);

function measure() {
  const html = deployHtml();
  const rows = [];

  const htmlBuf = Buffer.from(html, "utf8");
  rows.push({ file: "index.html (deploy shape)", raw: htmlBuf.length, wire: wire(htmlBuf) });

  for (const file of criticalAssets(html)) {
    const buf = fs.readFileSync(path.join(ROOT, file));
    rows.push({ file, raw: buf.length, wire: cost(file, buf) });
  }

  const { out: deferred, images } = deferredAssets();
  const deferredRows = deferred.map((file) => {
    const buf = fs.readFileSync(path.join(ROOT, file));
    return { file, raw: buf.length, wire: cost(file, buf) };
  });

  // Source art (a .png kept beside the .webp the site links to) is in the repo
  // but excluded from the upload by .assetsignore. Counting it as page weight
  // would be measuring bytes no visitor is ever sent.
  const ignored = fs.existsSync(path.join(ROOT, ".assetsignore"))
    ? fs
        .readFileSync(path.join(ROOT, ".assetsignore"), "utf8")
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#"))
    : [];
  const served = images.filter((f) => !ignored.includes(f));
  const imageBytes = served.reduce((sum, f) => sum + fs.statSync(path.join(ROOT, f)).size, 0);

  // The display variants make the folder *bigger* while making every page
  // lighter, so a single "images" total would now be actively misleading.
  // What a visitor pays is the variant where one exists and the original where
  // one doesn't; the full-size files are lightbox-only, opened deliberately
  // and one at a time.
  const isVariant = (f) => /-\d+w\.(webp|png|jpe?g)$/i.test(f);
  const variantFor = (f) => f.replace(/\.(webp|png|jpe?g)$/i, (ext) => `-1080w${ext}`);
  const displayed = served.filter((f) => !isVariant(f) && !served.includes(variantFor(f)))
    .concat(served.filter(isVariant));
  const displayedBytes = displayed.reduce((sum, f) => sum + fs.statSync(path.join(ROOT, f)).size, 0);
  const lightboxOnly = served.filter((f) => !isVariant(f) && served.includes(variantFor(f)));
  const lightboxBytes = lightboxOnly.reduce((sum, f) => sum + fs.statSync(path.join(ROOT, f)).size, 0);

  return {
    rows,
    deferredRows,
    imageCount: served.length,
    imageBytes,
    displayedCount: displayed.length,
    displayedBytes,
    lightboxCount: lightboxOnly.length,
    lightboxBytes,
    headerBytes: rows.length * HEADER_BYTES_PER_REQUEST,
    firstPaint: rows.reduce((sum, r) => sum + r.wire, 0) + rows.length * HEADER_BYTES_PER_REQUEST,
  };
}

function print(result, baseline) {
  const width = Math.max(28, ...result.rows.concat(result.deferredRows).map((r) => r.file.length));
  const delta = (file, now) => {
    if (!baseline) return "";
    const was = (baseline.rows || []).concat(baseline.deferredRows || []).find((r) => r.file === file);
    if (!was) return "  (new)";
    const diff = now - was.wire;
    if (diff === 0) return "  —";
    const pct = was.wire ? Math.round((-diff / was.wire) * 100) : 0;
    return `  ${diff > 0 ? "+" : ""}${diff} B${pct ? ` (${pct > 0 ? "-" : "+"}${Math.abs(pct)}%)` : ""}`;
  };

  console.log(`\n  ${pad("FIRST PAINT — blocks rendering", width)} ${num("raw", 9)} ${num("on the wire", 12)}`);
  console.log(`  ${"─".repeat(width + 23)}`);
  for (const r of result.rows) {
    console.log(`  ${pad(r.file, width)} ${num(kb(r.raw), 9)} ${num(kb(r.wire), 12)}${delta(r.file, r.wire)}`);
  }
  console.log(`  ${"─".repeat(width + 23)}`);
  if (result.headerBytes) {
    console.log(
      `  ${pad(`response headers (${result.rows.length} requests)`, width)} ${num("", 9)} ${num(kb(result.headerBytes), 12)}`
    );
  }
  console.log(`  ${pad("TOTAL", width)} ${num("", 9)} ${num(kb(result.firstPaint), 12)}`);
  if (baseline) {
    const diff = result.firstPaint - baseline.firstPaint;
    const pct = ((-diff / baseline.firstPaint) * 100).toFixed(1);
    console.log(
      `  ${pad("was", width)} ${num("", 9)} ${num(kb(baseline.firstPaint), 12)}` +
        `   ${diff < 0 ? "−" : "+"}${kb(Math.abs(diff))} (${diff < 0 ? "−" : "+"}${Math.abs(pct)}%)`
    );
  }

  console.log(`\n  ${pad("ON DEMAND — not on the render path", width)} ${num("raw", 9)} ${num("on the wire", 12)}`);
  console.log(`  ${"─".repeat(width + 23)}`);
  for (const r of result.deferredRows) {
    console.log(`  ${pad(r.file, width)} ${num(kb(r.raw), 9)} ${num(kb(r.wire), 12)}${delta(r.file, r.wire)}`);
  }
  const shown = `images at display size (${result.displayedCount})`;
  const baseShown = baseline?.displayedBytes ?? baseline?.imageBytes;
  const shownDelta = baseShown
    ? `  ${result.displayedBytes > baseShown ? "+" : "−"}${kb(Math.abs(result.displayedBytes - baseShown))}` +
      ` (${result.displayedBytes > baseShown ? "+" : "−"}${Math.abs(Math.round((1 - result.displayedBytes / baseShown) * 100))}%)`
    : "";
  console.log(`  ${pad(shown, width)} ${num(kb(result.displayedBytes), 9)} ${num(kb(result.displayedBytes), 12)}${shownDelta}`);

  if (result.lightboxCount) {
    const lb = `full-size originals (${result.lightboxCount}, lightbox only)`;
    console.log(`  ${pad(lb, width)} ${num(kb(result.lightboxBytes), 9)} ${num("on click", 12)}`);
  }
  console.log("");
}

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1];
};

const result = measure();
const againstPath = flag("--against");
const baseline = againstPath && fs.existsSync(againstPath) ? JSON.parse(fs.readFileSync(againstPath, "utf8")) : null;

if (againstPath && !baseline) {
  console.error(`weigh: no baseline at ${againstPath} — run with --save first.`);
  process.exit(1);
}

print(result, baseline);

const savePath = flag("--save");
if (savePath) {
  fs.writeFileSync(savePath, JSON.stringify(result, null, 2) + "\n");
  console.log(`  Baseline written to ${savePath}\n`);
}
