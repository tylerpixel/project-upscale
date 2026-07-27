// Cloudflare Worker — serves the static site, delivers the message form, and
// handles the vanity-subdomain redirects (absorbed from the old standalone
// "redirect" and "subdomainstracker" workers). POST /api/message sends the
// email through the Email Service binding (EMAIL in wrangler.jsonc, sender
// locked to message@); mapped subdomains 301 to their targets with a click
// count kept in KV; everything else falls through to the static assets.

const ROOT_DOMAIN = "tylerpixel.com";

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
      env.SUBDOMAIN_CLICKS.get(subdomain).then((count) =>
        env.SUBDOMAIN_CLICKS.put(subdomain, String((parseInt(count, 10) || 0) + 1))
      )
    );
  }

  return new Response(null, {
    // qr stays temporary so the printed code can be repointed later.
    status: subdomain === "qr" ? 307 : 301,
    headers: {
      Location: `https://${target}`,
      "Cache-Control": "no-store, max-age=0",
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

const MSG_FROM = "message@tylerpixel.com";
const MSG_TO = "gm@tylerpixel.com";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Caps well above anything a real message needs — they only exist so the
// endpoint can't be used to relay arbitrarily large payloads.
const MAX_NAME = 120;
const MAX_EMAIL = 254;
const MAX_MESSAGE = 5000;

function esc(value) {
  return String(value).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function handleMessage(request, env) {
  let data;
  try {
    data = await request.json();
  } catch (err) {
    return json(400, { error: "Expected a JSON body." });
  }

  const name = String(data.name || "").trim();
  const email = String(data.email || "").trim();
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

    const redirect = redirectFor(request, url, env, ctx);
    if (redirect) return redirect;
    // A subdomain that's proxied through the zone but not in the map (or the
    // apex/workers.dev, which don't end in ".tylerpixel.com" from slicing's
    // point of view) — pass unmapped subdomains through to their DNS origin
    // rather than swallowing them.
    if (url.hostname !== ROOT_DOMAIN && url.hostname.endsWith(`.${ROOT_DOMAIN}`)) {
      return fetch(request);
    }

    if (url.pathname === "/api/message") {
      if (request.method !== "POST") return json(405, { error: "POST only." });
      return handleMessage(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};
