// Cloudflare Worker — serves the static site, delivers the message form, and
// handles the vanity-subdomain redirects (absorbed from the old standalone
// "redirect" and "subdomainstracker" workers). POST /api/message sends the
// email through the Email Service binding (EMAIL in wrangler.jsonc, sender
// locked to message@); mapped subdomains 301 to their targets with a click
// count kept in KV; everything else falls through to the static assets.

const ROOT_DOMAIN = "tylerpixel.com";
const WWW_DOMAIN = `www.${ROOT_DOMAIN}`;

// ── Security headers ──
// Applied to every response this worker returns, including static assets.
//
// The CSP is deliberately tight on script: the site itself has no inline
// <script> and no eval, so the only script origin beyond 'self' is the
// Cloudflare Web Analytics beacon, which the edge injects into the HTML on the
// way out. Leaving it out doesn't disable analytics — it just gets blocked and
// logs a CSP violation on every page load. 'unsafe-inline' is needed for style
// only — markStagger()/typeChip() and the panel transitions set style
// attributes on elements, which style-src governs.
//
// The external origins are the storefront's: the Fourthwall catalogue API is
// read over fetch, and its product photos are served from its image proxy and
// (for older uploads) Firebase storage. The beacon reports back to
// cloudflareinsights.com, a different host from the one it's served off.
const CSP = [
  "default-src 'self'",
  "script-src 'self' https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://imgproxy.fourthwall.dev https://firebasestorage.googleapis.com",
  "font-src 'self'",
  "connect-src 'self' https://storefront-api.fourthwall.com https://cloudflareinsights.com",
  "form-action 'self'",
  "frame-ancestors 'none'",
  // 'self', not 'none': the document sets <base href="/"> so that nested
  // routes like /work/<slug> resolve assets from the root. 'none' would
  // silently render that tag inert and break every deep link.
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = {
  "Content-Security-Policy": CSP,
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  // frame-ancestors above is the modern control; this covers older browsers.
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "X-Robots-Tag": "index, follow",
};

// Response headers are immutable on a fetched Response, so rebuild it. Uses
// the original as the init so status/statusText/existing headers survive.
function secure(response, extra) {
  const out = new Response(response.body, response);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) out.headers.set(key, value);
  if (extra) for (const [key, value] of Object.entries(extra)) out.headers.set(key, value);
  return out;
}

// ── Loading skeleton ──
//
// index.html carries one hidden skeleton per panel shape; this picks the one
// matching the route and unhides it on the way out, so the placeholder the
// browser paints is the silhouette of the page being opened rather than always
// the intro's.
//
// It happens here rather than in the page because the CSP above is
// `script-src 'self'` with no 'unsafe-inline': an inline picker would be
// blocked, and an external blocking script would cost a round trip before the
// first paint, which is the exact gap the skeleton exists to cover. Doing it at
// the edge costs the client nothing and works with JS off entirely.
//
// Keep the keys in step with the data-skeleton attributes in index.html.
function skeletonFor(pathname) {
  if (pathname === "/") return "intro";
  if (/^\/work\/[^/]+\/?$/.test(pathname)) return "work-detail";
  if (/^\/work\/?$/.test(pathname)) return "work";
  // A product deep link paints the store *list* first — applyRoute() calls
  // selectTab("store") immediately and store.js only swaps the product in once
  // the catalogue lands — so the list's shape is the honest placeholder here.
  if (/^\/store(\/[^/]+)?\/?$/.test(pathname)) return "store";
  if (/^\/about\/?$/.test(pathname)) return "about";
  // Writing's empty state, the legal documents, and anything the router will
  // resolve to the 404 all read as a title over prose.
  return "prose";
}

// ── Per-route metadata ──
//
// index.html carries the site's own title, description and share card, which is
// the right answer for most of the site. A route with something more specific to
// say overrides them here, on the way out — for the same reason the skeleton is
// chosen here rather than in the page. Every route is served the identical
// document, and the crawlers and social scrapers that read these tags don't run
// the JavaScript that fills the route in, so a title set by setRoute() in
// site.js is invisible to all of them.
//
// An entry has to be kept in step by hand with the post it describes in
// data/site-content.json. The worker can't read that file back at runtime: at
// deploy time scripts/inline-content.js folds it into the document and parks it
// out of the upload, so there's nothing at /data/site-content.json to fetch.
const ROUTE_META = {
  "/writing/elon-musk-stole-my-meme": {
    title: "Elon Musk Stole My Meme | Tyler Pixel",
    description:
      "Between August 2023 and the middle of 2024 I went from around 600 followers to over 2,000, sold merch into Silicon Valley, Japan and Canada, and had one of my images reposted by Elon Musk to 45 million people.",
    canonical: "https://tylerpixel.com/writing/elon-musk-stole-my-meme",
    type: "article",
    image: "https://tylerpixel.com/images/figs/elon-starship-tweet.png",
    imageWidth: "720",
    imageHeight: "603",
    imageAlt:
      "Elon Musk's post of the meme, captioned Starship with a cigarette emoji, showing 45M views, 490K likes and 39K reposts",
  },
};

// A deep link is equally valid with or without the trailing slash, and both
// reach here — so they can't disagree about which card they carry.
function metaFor(pathname) {
  const key = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return ROUTE_META[key] || null;
}

// Only touches HTML: every other asset streams through untouched. The rewriter
// matches whole elements and sets attributes on them, so the inlined content
// blob in <script id="siteContent"> passes through as the raw text it is.
function withRouteHtml(response, pathname) {
  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/html")) return response;

  let rewriter = new HTMLRewriter().on(`[data-skeleton="${skeletonFor(pathname)}"]`, {
    element(el) {
      el.removeAttribute("hidden");
    },
  });

  const meta = metaFor(pathname);
  if (!meta) return rewriter.transform(response);

  // One handler per tag rather than a loop over a selector map: the tags differ
  // in which attribute carries the value (content, href) and in whether the
  // value is an attribute at all (<title>), and spelling that out is shorter
  // than the indirection that would hide it.
  const setContent = (value) => ({
    element(el) {
      if (value) el.setAttribute("content", value);
    },
  });

  rewriter = rewriter
    .on("title", {
      element(el) {
        el.setInnerContent(meta.title);
      },
    })
    .on('meta[property="og:title"]', setContent(meta.title))
    .on('meta[property="twitter:title"]', setContent(meta.title))
    .on('meta[name="description"]', setContent(meta.description))
    .on('meta[property="og:description"]', setContent(meta.description))
    .on('meta[property="og:type"]', setContent(meta.type))
    .on('meta[property="og:url"]', setContent(meta.canonical))
    .on('meta[property="og:image"]', setContent(meta.image))
    .on('meta[property="og:image:width"]', setContent(meta.imageWidth))
    .on('meta[property="og:image:height"]', setContent(meta.imageHeight))
    .on('meta[property="og:image:alt"]', setContent(meta.imageAlt))
    .on('link[rel="canonical"]', {
      element(el) {
        el.setAttribute("href", meta.canonical);
      },
    });

  return rewriter.transform(response);
}

// Vanity subdomains — <key>.tylerpixel.com redirects to its target. Each one
// needs a proxied DNS record on the zone; the wildcard route in wrangler.jsonc
// then brings the request here.
const REDIRECTS = {
  x: "x.com/tylerpixel",
  instagram: "instagram.com/tylerpixel",
  engulfstudio: "engulf.studio",
  github: "github.com/tylerpixel",
  warpcast: "warpcast.com/tylerpixel",
  youtube: "youtube.com/@tylerpixel",
  tiktok: "tiktok.com/@tylerpixel",
  kofi: "ko-fi.com/tylerpixel",
  aeec: "store.tylerpixel.com/products/anti-entropy-entropy-club-hoodie",
  book: "cal.com/tylerpixel",
  eacctee: "store.tylerpixel.com/products/e-acc-tee",
  dses: "store.tylerpixel.com/collections/dyson-sphere-enjoyer-society",
  pay: "strike.me/tylerpixel",
  fiat: "revolut.me/tylerpixel",
  orangepdf: "store.tylerpixel.com/products/orange-pdf",
  everydaypixels: "zora.co/collect/zora:0xd17f244340c5f5fca1ca36bf5953c4a15b671c01",
  qr: "tylerpixel.com",
};

function redirectFor(request, url, env, ctx) {
  const { hostname } = url;
  if (!hostname.endsWith(`.${ROOT_DOMAIN}`)) return null;
  const subdomain = hostname.slice(0, -(ROOT_DOMAIN.length + 1)).toLowerCase();
  const target = REDIRECTS[subdomain];
  if (!target) return null;

  // Per-subdomain click counter (from the old subdomainstracker worker) —
  // done off the response path so the redirect never waits on KV.
  if (request.method === "GET") {
    ctx.waitUntil(
      env.SUBDOMAIN_CLICKS.get(subdomain)
        .then((count) => env.SUBDOMAIN_CLICKS.put(subdomain, String((parseInt(count, 10) || 0) + 1)))
        .catch(() => {})
    );
  }

  return secure(
    new Response(null, {
      // qr stays temporary so the printed code can be repointed later.
      status: subdomain === "qr" ? 307 : 301,
      headers: {
        Location: `https://${target}`,
        "Cache-Control": "no-store, max-age=0",
      },
    })
  );
}

// ── Storefront currency hint ──
//
// Cloudflare resolves the visitor's country at the edge, which beats guessing
// from browser locale (a traveller's locale says where they're from, not where
// they are). Only the currencies the storefront actually offers are mapped;
// everything else falls through to USD.
const COUNTRY_CURRENCY = {
  AU: "AUD",
  NZ: "NZD",
  GB: "GBP",
  CA: "CAD",
  JP: "JPY",
  // Eurozone
  AT: "EUR", BE: "EUR", CY: "EUR", DE: "EUR", EE: "EUR", ES: "EUR", FI: "EUR",
  FR: "EUR", GR: "EUR", HR: "EUR", IE: "EUR", IT: "EUR", LT: "EUR", LU: "EUR",
  LV: "EUR", MT: "EUR", NL: "EUR", PT: "EUR", SI: "EUR", SK: "EUR",
};

// Tells a caller only which country its own request came from, so there's
// nothing here worth withholding cross-origin — and requiring an Origin would
// break it, since browsers don't send one on same-origin GETs.
function handleGeo(request) {
  const country = (request.cf && request.cf.country) || "";
  return json(200, { country, currency: COUNTRY_CURRENCY[country] || "USD" });
}

// ── Message form ──

const MSG_FROM = "message@tylerpixel.com";
const MSG_TO = "dm@tylerpixel.com";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Caps well above anything a real message needs — they only exist so the
// endpoint can't be used to relay arbitrarily large payloads.
const MAX_NAME = 120;
const MAX_EMAIL = 254;
const MAX_MESSAGE = 5000;
// Rejected before the body is read at all, so an oversized POST costs nothing.
const MAX_BODY_BYTES = 16 * 1024;

// Per-IP cap on sends. The window is rolling (each accepted send re-arms the
// TTL), so a burst can't be topped up at the edge of a fixed window.
const RATE_MAX = 3;
const RATE_WINDOW_SEC = 900;

function esc(value) {
  return String(value).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

// Anything interpolated into an email header (the display name, the subject,
// the Reply-To) must not be able to carry a line break — a bare CR/LF there
// ends the header and starts one the sender chose. The rest of the C0 range
// (and DEL) goes with it; none of it belongs in a name or an address.
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;

function headerSafe(value) {
  return String(value).replace(CONTROL_CHARS, " ").trim();
}

function json(status, body, extraHeaders) {
  return secure(
    new Response(JSON.stringify(body), {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        ...extraHeaders,
      },
    })
  );
}

// Same-origin only. The browser always sends Origin on a cross-origin-capable
// POST, so a mismatch (or absence) means the request didn't come from a page
// on this site — which is the only client the endpoint exists to serve.
function sameOrigin(request, url) {
  const origin = request.headers.get("Origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === url.host;
  } catch (err) {
    return false;
  }
}

async function underRateLimit(env, ip) {
  if (!ip || !env.SUBDOMAIN_CLICKS) return true;
  const key = `rl:msg:${ip}`;
  try {
    const count = parseInt(await env.SUBDOMAIN_CLICKS.get(key), 10) || 0;
    if (count >= RATE_MAX) return false;
    await env.SUBDOMAIN_CLICKS.put(key, String(count + 1), { expirationTtl: RATE_WINDOW_SEC });
    return true;
  } catch (err) {
    // KV trouble shouldn't take the contact form down with it.
    console.error("Rate-limit check failed:", err);
    return true;
  }
}

async function handleMessage(request, env, url) {
  if (!sameOrigin(request, url)) {
    return json(403, { error: "Forbidden." });
  }
  if (!(request.headers.get("Content-Type") || "").includes("application/json")) {
    return json(415, { error: "Expected application/json." });
  }
  const declaredLength = parseInt(request.headers.get("Content-Length"), 10);
  if (declaredLength > MAX_BODY_BYTES) {
    return json(413, { error: "That message is too long." });
  }

  let data;
  try {
    data = await request.json();
  } catch (err) {
    return json(400, { error: "Expected a JSON body." });
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return json(400, { error: "Expected a JSON body." });
  }

  const name = headerSafe(data.name || "");
  const email = headerSafe(data.email || "");
  const message = String(data.message || "").trim();

  // Honeypot — a hidden field humans never see. Report success so bots that
  // filled it don't learn they were caught.
  if (String(data.company || "").trim()) {
    return json(200, { ok: true });
  }

  if (!name || !email || !message) {
    return json(400, { error: "Name, email and message are all required." });
  }
  if (!EMAIL_RE.test(email) || email.length > MAX_EMAIL) {
    return json(400, { error: "That doesn't look like an email address." });
  }
  if (name.length > MAX_NAME || message.length > MAX_MESSAGE) {
    return json(400, { error: "That message is too long." });
  }

  if (!(await underRateLimit(env, request.headers.get("CF-Connecting-IP")))) {
    return json(429, { error: "Too many messages just now — please try again later." }, {
      "Retry-After": String(RATE_WINDOW_SEC),
    });
  }

  try {
    await env.EMAIL.send({
      to: MSG_TO,
      from: { email: MSG_FROM, name: `${name} via tylerpixel.com` },
      // Replying in the inbox goes straight to the visitor, not to message@.
      replyTo: email,
      subject: `Message from ${name}`,
      text: `${message}\n\n— ${name} <${email}>`,
      html: `<p>${esc(message).replace(/\n/g, "<br />")}</p><p>— ${esc(name)} &lt;${esc(email)}&gt;</p>`,
    });
  } catch (err) {
    console.error(`Email send failed: ${err.code} ${err.message}`);
    return json(502, { error: "Couldn't send the message." });
  }

  return json(200, { ok: true });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // www used to be a DNS-only CNAME straight to Webflow, from before this
    // site moved to Workers — anyone who typed/bookmarked/autocompleted the
    // www. form got Webflow's edge instead of this site. Now that it's a
    // Custom Domain (wrangler.jsonc) the request reaches the worker; send it
    // on to the canonical apex, path and query intact.
    if (url.hostname === WWW_DOMAIN) {
      return secure(
        Response.redirect(`https://${ROOT_DOMAIN}${url.pathname}${url.search}`, 301)
      );
    }

    const redirect = redirectFor(request, url, env, ctx);
    if (redirect) return redirect;
    // A subdomain that's proxied through the zone but not in the map (or the
    // apex/workers.dev, which don't end in ".tylerpixel.com" from slicing's
    // point of view) — pass unmapped subdomains through to their DNS origin
    // rather than swallowing them.
    if (url.hostname !== ROOT_DOMAIN && url.hostname.endsWith(`.${ROOT_DOMAIN}`)) {
      return fetch(request);
    }

    if (url.pathname === "/api/geo") {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return json(405, { error: "GET only." }, { Allow: "GET" });
      }
      return handleGeo(request);
    }

    if (url.pathname === "/api/message") {
      if (request.method !== "POST") {
        return json(405, { error: "POST only." }, { Allow: "POST" });
      }
      return handleMessage(request, env, url);
    }
    return secure(withRouteHtml(await env.ASSETS.fetch(request), url.pathname));
  },
};
