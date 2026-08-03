#!/usr/bin/env node
//
// Generate the display-size copy of every oversized image.
//
//   node scripts/resize-images.js           # write the missing @1080 variants
//   node scripts/resize-images.js --force   # rebuild them all
//   node scripts/resize-images.js --check   # list what's missing, write nothing
//
// The problem this solves
// ───────────────────────
// Every case-study image on the site renders in a 360 CSS-pixel column. That
// was measured in the browser, not assumed: .work-gallery-image and
// .work-detail-image both come back exactly 360px wide, because the layout is
// one fixed --content-width column. The files behind them are 1920–2000px.
//
// Even on a 3× phone — the densest screen that exists — 360px needs 1080px.
// So the site was shipping about 3.4× more pixels than a 2× display can show,
// on every image, on every case study.
//
// What it does NOT do
// ───────────────────
// It does not touch the originals. The lightbox opens at up to 900 CSS px, so
// at 2× it genuinely wants ~1800px, and those files are also the only archival
// copy of this work. They stay exactly as they are; js/site.js points the
// inline <img> at the variant and the lightbox at the original.
//
// Recompression was tried first and rejected on measurement. Re-encoding the
// existing WebPs at native resolution buys ~14% for a visible drop in SSIM, and
// at quality high enough to be lossless it makes them *bigger* — Webflow's
// encoder had already done the job. Resolution was the waste, not quality.
//
// Encoder settings
// ────────────────
// q82 after a 1.8× downscale is deliberately unfussy: the resample has already
// removed the high-frequency detail a higher quality would be protecting, and
// the result is displayed at a further 3× reduction. Artifacts that survive
// both are not artifacts anyone can see.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");

// Pinned and fetched on demand, like every other tool the build uses.
const SHARP = "sharp-cli@5.1.0";

// 360 CSS px × 3 for the densest phone screens. Going wider buys nothing any
// display can resolve; going narrower would show on a 3× device.
const DISPLAY_WIDTH = 1080;
const QUALITY = 82;

// Below this the image is already at or under display size, so there is
// nothing to resize. It still gets a variant — as a byte-for-byte copy.
//
// That copy is not redundancy for its own sake. js/site.js rewrites every
// inline image URL to the @1080 name without checking whether the file exists,
// because checking would mean shipping a manifest of which images have
// variants. If a name doesn't resolve, the browser 404s and then re-requests
// the original: correct, but two round trips instead of one, on exactly the
// small logos that appear on the Selected Works list. Guaranteeing the name
// always resolves is cheaper than describing when it doesn't.
//
// Copied rather than re-encoded on purpose: these are logos and flat artwork
// at 720px or less, and putting them through another lossy pass to save a
// couple of kilobytes would be trading visible quality for nothing.
const MIN_SOURCE_WIDTH = DISPLAY_WIDTH * 1.15;

const DIRS = ["images/work", "images/figs"];
const ENCODABLE = /\.(webp|png|jpe?g)$/i;

// The 404 page's animation, converted rather than resized. At 668 KB it was
// the single heaviest file the site served, and GIF is the reason: 33 frames
// of 256-colour palette with no interframe compression worth the name.
// Animated WebP is the same 33 frames at 453x255 for about a third of the
// bytes, and has been supported everywhere since Safari 14.
//
// It is NOT downscaled. The frame is 453px shown in a 360px column, which is
// already under 2x — there is nothing spare to give back.
const ANIMATED = [{ from: "images/404.gif", to: "images/404.webp", quality: 70 }];

// Kept in the repo as source art and excluded from the upload — generating
// display copies of files that are never served would be pure noise.
const ignored = fs
  .readFileSync(path.join(ROOT, ".assetsignore"), "utf8")
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"));

const variantOf = (rel) => rel.replace(ENCODABLE, (ext) => `@${DISPLAY_WIDTH}${ext}`);
const isVariant = (rel) => rel.includes(`@${DISPLAY_WIDTH}.`);

function walk(dir, out = []) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return out;
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(rel, out);
    else if (!entry.name.startsWith(".")) out.push(rel);
  }
  return out;
}

// Read the intrinsic width without decoding the whole file. Only the three
// container formats the site actually ships are handled; anything else is
// skipped rather than guessed at.
function intrinsicWidth(file) {
  const fd = fs.openSync(file, "r");
  const buf = Buffer.alloc(64);
  fs.readSync(fd, buf, 0, 64, 0);
  fs.closeSync(fd);

  if (buf.slice(0, 4).toString("ascii") === "RIFF" && buf.slice(8, 12).toString("ascii") === "WEBP") {
    const kind = buf.slice(12, 16).toString("ascii");
    if (kind === "VP8X") return (buf.readUIntLE(24, 3) & 0xffffff) + 1;
    if (kind === "VP8L") return (buf.readUInt32LE(21) & 0x3fff) + 1;
    if (kind === "VP8 ") return buf.readUInt16LE(26) & 0x3fff;
  }
  if (buf.readUInt32BE(0) === 0x89504e47) return buf.readUInt32BE(16); // PNG IHDR
  if (buf[0] === 0xff && buf[1] === 0xd8) return null; // JPEG needs a real parse
  return null;
}

const args = process.argv.slice(2);
const CHECK = args.includes("--check");
const FORCE = args.includes("--force");

// Only images the site actually renders get a variant. Every inline <img> src
// on the site comes from data/site-content.json or is written into index.html,
// so anything in images/ that appears in neither is an orphan — old artwork,
// or a share image referenced only by a meta tag — and giving it a display
// copy would add a file to the repo that nothing will ever request.
const referenced = new Set();
for (const file of ["data/site-content.json", "index.html"]) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) continue;
  const text = fs.readFileSync(full, "utf8");
  for (const m of text.matchAll(/[\w./+@-]*images\/[\w./+@-]+/g)) {
    referenced.add(m[0].replace(/^\//, ""));
  }
}

const sources = DIRS.flatMap((d) => walk(d))
  .filter((rel) => ENCODABLE.test(rel))
  .filter((rel) => !isVariant(rel))
  .filter((rel) => !ignored.includes(rel))
  .filter((rel) => referenced.has(rel));

const jobs = [];
for (const rel of sources) {
  const src = path.join(ROOT, rel);
  const width = intrinsicWidth(src);
  const copyOnly = width !== null && width < MIN_SOURCE_WIDTH;

  const outRel = variantOf(rel);
  const out = path.join(ROOT, outRel);
  const fresh = fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(src).mtimeMs;
  if (fresh && !FORCE) continue;

  // Belt and braces. An output path that collides with any source is a bug in
  // the naming, and the consequence — overwriting an original that is the only
  // archival copy of the work — is bad enough to refuse the whole run over.
  if (out === src) {
    console.error(`resize-images: refusing to run — ${outRel} would overwrite its own source.`);
    process.exit(1);
  }

  jobs.push({ rel, outRel, src, out, width, copyOnly });
}

// Animated conversions are queued alongside the resizes rather than after
// them, so an "everything is current" exit can't skip past this list.
const animatedJobs = ANIMATED.filter((job) => {
  const src = path.join(ROOT, job.from);
  const out = path.join(ROOT, job.to);
  if (!fs.existsSync(src)) return false;
  return FORCE || !fs.existsSync(out) || fs.statSync(out).mtimeMs < fs.statSync(src).mtimeMs;
});

if (CHECK) {
  if (!jobs.length && !animatedJobs.length) {
    console.log(`All ${sources.length} images have a current @${DISPLAY_WIDTH} variant, and ${ANIMATED.length} animation(s) are converted.`);
    process.exit(0);
  }
  if (jobs.length) {
    console.error(`${jobs.length} image(s) missing a current @${DISPLAY_WIDTH} variant:`);
    for (const j of jobs) console.error(`  ${j.rel}`);
  }
  for (const j of animatedJobs) console.error(`  ${j.from} -> ${j.to} missing or stale`);
  process.exit(1);
}

if (!jobs.length && !animatedJobs.length) {
  console.log(`Nothing to do — all ${sources.length} images and ${ANIMATED.length} animation(s) are current.`);
  process.exit(0);
}

let before = 0;
let after = 0;
let failed = 0;

// sharp-cli takes an output *directory* and names the file after the input.
// Pointing it at the image's own folder therefore overwrites the original in
// place — silently, and before anything downstream can object. So every encode
// lands in a scratch directory outside the repo and is moved into position
// afterwards. Nothing here ever writes to a path an original occupies.
const stage = fs.mkdtempSync(path.join(os.tmpdir(), "resize-images-"));

for (const job of jobs) {
  const ext = path.extname(job.rel).slice(1).toLowerCase();
  try {
    if (job.copyOnly) {
      fs.copyFileSync(job.src, job.out);
      const a = fs.statSync(job.src).size;
      before += a;
      after += a;
      console.log(`  ${path.basename(job.outRel).padEnd(52)} ${String(a).padStart(7)} B  (copied — already ${job.width}px)`);
      continue;
    }

    execFileSync(
      "npx",
      [
        "--yes", SHARP,
        "-i", job.src,
        "-o", stage,
        "-f", ext === "jpg" ? "jpeg" : ext,
        "-q", String(QUALITY),
        "resize", String(DISPLAY_WIDTH),
        "--withoutEnlargement",
        "--fit", "inside",
      ],
      { stdio: ["ignore", "pipe", "pipe"] }
    );

    const landed = path.join(stage, path.basename(job.src));
    if (!fs.existsSync(landed)) throw new Error(`sharp wrote nothing to ${stage}`);

    const a = fs.statSync(job.src).size;
    // Copy rather than rename: the staging directory is very likely on a
    // different filesystem to the repo, where rename() fails with EXDEV.
    fs.copyFileSync(landed, job.out);
    fs.rmSync(landed, { force: true });
    const b = fs.statSync(job.out).size;
    before += a;
    after += b;
    console.log(
      `  ${path.basename(job.outRel).padEnd(52)} ${String(a).padStart(7)} -> ${String(b).padStart(7)} B  (-${Math.round((1 - b / a) * 100)}%)`
    );
  } catch (err) {
    failed++;
    console.error(`  FAILED ${job.rel}: ${String(err.stderr || err.message).trim().split("\n")[0]}`);
  }
}

for (const job of animatedJobs) {
  const src = path.join(ROOT, job.from);
  const out = path.join(ROOT, job.to);

  try {
    execFileSync(
      "npx",
      ["--yes", SHARP, "-i", src, "-o", stage, "-f", "webp", "-q", String(job.quality),
       "--animated", "--effort", "6"],
      { stdio: ["ignore", "pipe", "pipe"] }
    );
    const landed = path.join(stage, path.basename(job.to));
    if (!fs.existsSync(landed)) throw new Error(`sharp wrote nothing to ${stage}`);
    const a = fs.statSync(src).size;
    fs.copyFileSync(landed, out);
    fs.rmSync(landed, { force: true });
    const b = fs.statSync(out).size;
    before += a;
    after += b;
    console.log(
      `  ${path.basename(job.to).padEnd(52)} ${String(a).padStart(7)} -> ${String(b).padStart(7)} B  (-${Math.round((1 - b / a) * 100)}%)`
    );
  } catch (err) {
    failed++;
    console.error(`  FAILED ${job.from}: ${String(err.stderr || err.message).trim().split("\n")[0]}`);
  }
}

fs.rmSync(stage, { recursive: true, force: true });

if (before) {
  console.log(
    `\n  ${jobs.length + animatedJobs.length - failed} file(s) written: ` +
      `${(before / 1024).toFixed(0)} KB of originals -> ${(after / 1024).toFixed(0)} KB served ` +
      `(-${Math.round((1 - after / before) * 100)}%).`
  );
  console.log("  Every original is untouched — the lightbox still opens the full file.");
}
process.exit(failed ? 1 : 0);
