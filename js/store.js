// Store — Fourthwall-backed storefront. Renders a product list styled like
// Selected Works, a product detail page reachable only from a product card,
// and a localStorage cart that hands off to Fourthwall's hosted checkout.
//
// Relies on helpers declared in site.js (esc, setHtml, safeUrl, markStagger,
// renderPanelHeading, transitionPanels, makeActivatable, openTray) — both are
// classic scripts sharing global scope, and site.js is loaded first.

// Public read-only storefront token. Fourthwall issues these specifically to be
// embedded in client-side code; it can only read the catalogue and create carts.
const FW_TOKEN = "ptkn_be80840a-63bb-4229-a898-f8ed4a14dbc3";
const FW_API = "https://storefront-api.fourthwall.com/v1";
const FW_STORE = "https://store.tylerpixel.com";
const CART_KEY = "tp_shop_cart";
const CURRENCY_KEY = "tp_shop_currency";
// The location hint is cached per session, not per page load: store.js runs on
// every route, so without this every navigation that reloads the document would
// re-ask the edge. sessionStorage rather than localStorage keeps it a *session*
// default — a new visit re-evaluates, so travelling still works.
const GEO_KEY = "tp_shop_geo_currency";

// Fourthwall converts prices server-side when the catalogue is requested with
// a currency, and its hosted checkout takes the same code — so this is a real
// price switch, not a display-only conversion. The list is an allowlist:
// the stored value is user-writable and ends up in an API query and a
// checkout URL, so anything not on it falls back to USD.
const CURRENCIES = ["USD", "AUD", "NZD", "GBP", "EUR", "CAD", "JPY"];
const DEFAULT_CURRENCY = "USD";

// Per-line cap. Nothing here is bought in bulk, and it keeps a corrupted or
// hand-edited localStorage entry from rendering an absurd total.
const MAX_QTY = 99;

const store = {
  products: [],
  cart: [],
  product: null,
  color: null,
  size: null,
  cartAction: null, // the "Cart" button in the Store panel heading
  currency: DEFAULT_CURRENCY,
  // Variant ids Fourthwall refuses to sell. The catalogue can still advertise a
  // product as AVAILABLE with UNLIMITED stock while the cart endpoint rejects
  // it, so this is only discoverable by asking.
  unavailable: new Set(),
};

const CART_NOTE_DEFAULT = "Secure checkout is handled by Fourthwall.";

// Resolves once the first catalogue load has settled, either way. The router
// awaits this for /store/<slug> deep links. It's a deferred rather than the
// fetch promise itself because renderStore may not have been called yet when
// the router asks — and awaiting a null would report an empty catalogue and
// send a perfectly good deep link to the 404 page.
let markStoreReady;
const storeReady = new Promise((resolve) => {
  markStoreReady = resolve;
});

function cachedGeoCurrency() {
  try {
    const cached = sessionStorage.getItem(GEO_KEY);
    return CURRENCIES.includes(cached) ? cached : null;
  } catch (err) {
    return null;
  }
}

// The visitor's likely currency, from the edge's view of where the request came
// from. Started at parse time — on every page, not just the Store — so it's in
// flight during load and already settled by the time anything needs a price.
// Only consulted when they haven't chosen a currency for themselves.
const geoCurrency = (() => {
  const cached = cachedGeoCurrency();
  if (cached) return Promise.resolve(cached);
  return fetch("/api/geo", { credentials: "omit" })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      const code = data && CURRENCIES.includes(data.currency) ? data.currency : null;
      if (code) {
        try {
          sessionStorage.setItem(GEO_KEY, code);
        } catch (err) {
          // Session-only caching is an optimisation, not a requirement.
        }
      }
      return code;
    })
    .catch(() => null);
})();

// ── Helpers ──

// Fourthwall descriptions are HTML with entities (&#39;, &nbsp;). Stripping tags
// with a regex leaves those entities showing literally, so parse properly.
// DOMParser is used rather than innerHTML because it neither runs scripts nor
// fetches resources for the markup it parses.
function plainText(html) {
  const doc = new DOMParser().parseFromString(String(html || ""), "text/html");
  return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
}

// Trims to a word boundary so a card never ends mid-word.
function truncate(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.]+$/, "")}…`;
}

function fmt(value, currency) {
  if (!value) return "Free";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(value);
}

// localStorage is user-writable, so what comes back out is input, not state.
// Anything that doesn't look like a line this code wrote is dropped rather
// than rendered or sent to the checkout endpoint.
function validCartItem(item) {
  return (
    item &&
    typeof item === "object" &&
    typeof item.variantId === "string" &&
    item.variantId.length > 0 &&
    item.variantId.length <= 128 &&
    Number.isInteger(item.quantity) &&
    item.quantity > 0 &&
    item.quantity <= MAX_QTY &&
    Number.isFinite(item.price) &&
    item.price >= 0 &&
    typeof item.currency === "string"
  );
}

// Returns true when the visitor has picked a currency before. Only an
// explicit choice is ever stored, so a saved value always outranks the
// location hint — travelling shouldn't silently re-price a store someone
// deliberately set to their home currency.
function loadCurrency() {
  try {
    const saved = localStorage.getItem(CURRENCY_KEY);
    if (CURRENCIES.includes(saved)) {
      store.currency = saved;
      return true;
    }
  } catch (err) {
    // fall through to the default
  }
  store.currency = DEFAULT_CURRENCY;
  return false;
}

function saveCurrency(code) {
  store.currency = CURRENCIES.includes(code) ? code : DEFAULT_CURRENCY;
  try {
    localStorage.setItem(CURRENCY_KEY, store.currency);
  } catch (err) {
    // Session-only is fine; the in-memory choice still applies.
  }
}

function loadCart() {
  try {
    const raw = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    store.cart = Array.isArray(raw) ? raw.filter(validCartItem) : [];
  } catch (err) {
    store.cart = [];
  }
}

function saveCart() {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(store.cart));
  } catch (err) {
    // Private-mode / quota failures shouldn't break the page — the in-memory
    // cart still works for this session.
    console.warn("Could not persist cart:", err);
  }
  syncCartAction();
}

function cartCount() {
  return store.cart.reduce((n, item) => n + item.quantity, 0);
}

function cartTotal() {
  return store.cart.reduce((n, item) => n + item.price * item.quantity, 0);
}

function syncCartAction() {
  if (!store.cartAction) return;
  const n = cartCount();
  store.cartAction.textContent = n ? `Cart (${n})` : "Cart";
}

// ── Variants ──

// Colour and size are the same shape of lookup — a de-duplicated list of one
// attribute across a product's variants, in catalogue order.
function uniqueAttr(variants, key) {
  const seen = new Set();
  const out = [];
  (variants || []).forEach((v) => {
    const attr = v.attributes && v.attributes[key];
    if (!attr || !attr.name || seen.has(attr.name)) return;
    seen.add(attr.name);
    out.push(key === "color" ? { name: attr.name, swatch: attr.swatch || "#cccccc" } : attr.name);
  });
  return out;
}

const uniqueColors = (variants) => uniqueAttr(variants, "color");
const uniqueSizes = (variants) => uniqueAttr(variants, "size");

function findVariant(variants, color, size) {
  return (
    (variants || []).find((v) => {
      const a = v.attributes || {};
      const colorOk = !color || (a.color && a.color.name === color);
      const sizeOk = !size || (a.size && a.size.name === size);
      return colorOk && sizeOk;
    }) || null
  );
}

function sizesForColor(product, color) {
  if (!color) return uniqueSizes(product.variants);
  return (product.variants || [])
    .filter((v) => v.attributes && v.attributes.color && v.attributes.color.name === color)
    .map((v) => (v.attributes.size ? v.attributes.size.name : null))
    .filter(Boolean);
}

// Cart lines carry their own price so the tray can render without the
// catalogue. That copy goes stale when the currency changes — and a cart
// holding two currencies would total nonsense, since the sum is formatted with
// a single code. Re-pricing against every fresh catalogue keeps the whole cart
// in one currency by construction. Variant ids are stable across currencies,
// so this is a straight lookup.
function repriceCart(products) {
  const byVariant = new Map();
  (products || []).forEach((p) => (p.variants || []).forEach((v) => byVariant.set(v.id, v)));
  let changed = false;
  store.cart.forEach((item) => {
    const variant = byVariant.get(item.variantId);
    if (!variant) return;
    const price = (variant.unitPrice || {}).value || 0;
    const currency = (variant.unitPrice || {}).currency || store.currency;
    if (item.price !== price || item.currency !== currency) {
      item.price = price;
      item.currency = currency;
      changed = true;
    }
  });
  if (changed) saveCart();
}

// ── Product list ──

async function fetchProducts() {
  const url = new URL(`${FW_API}/collections/all/products`);
  url.searchParams.set("storefront_token", FW_TOKEN);
  url.searchParams.set("limit", "50");
  url.searchParams.set("currency", store.currency);
  const res = await fetch(url, { credentials: "omit" });
  if (!res.ok) throw new Error(`Storefront responded ${res.status}`);
  const data = await res.json();
  return data.results || [];
}

// Card blurbs live in site-content.json alongside the rest of the site's copy.
// site.js already has that file in flight — awaiting its promise reuses the
// one request instead of issuing a second.
async function fetchBlurbs() {
  try {
    const data = await window.__contentReady;
    return (data.store && data.store.descriptions) || {};
  } catch (err) {
    return {};
  }
}

function priceChips(product) {
  const v = (product.variants || [])[0] || {};
  const price = (v.unitPrice || {}).value || 0;
  const currency = (v.unitPrice || {}).currency;
  const compare = (v.compareAtPrice || {}).value || 0;
  const onSale = compare > price;
  return `
    <span class="work-chip work-chip--year">${esc(fmt(price, currency))}</span>
    ${onSale ? `<span class="work-chip work-chip--type" style="color:#ef4444;background:#ef44441a;">Sale</span>` : ""}
  `;
}

// Catalogue photos come from Fourthwall's CDN. safeUrl keeps anything with an
// unexpected scheme out of a src, and matches what the CSP will allow anyway.
function imageUrl(image) {
  return safeUrl((image || {}).url);
}

// An empty `src=""` resolves to the current page, so the browser re-requests
// the document as an image. Leaving the attribute off entirely is the correct
// no-image state.
function srcAttr(url) {
  return url ? ` src="${esc(url)}"` : "";
}

// Remembered so a currency change can rebuild the panel with the same title.
let storeLabel = "Store";

// Currency picker + Cart, grouped at the right of the Store heading.
function buildCurrencyPicker(panel) {
  const heading = panel.querySelector(".panel-heading");
  if (!heading || !store.cartAction) return;

  const actions = document.createElement("div");
  actions.className = "store-heading-actions";

  const wrap = document.createElement("span");
  wrap.className = "store-currency-wrap";

  const select = document.createElement("select");
  select.className = "store-currency";
  select.setAttribute("aria-label", "Currency");
  CURRENCIES.forEach((code) => {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = code;
    if (code === store.currency) option.selected = true;
    select.appendChild(option);
  });

  select.addEventListener("change", () => {
    if (select.value === store.currency) return;
    saveCurrency(select.value);
    // Fade the old prices out now; renderStore fades the new ones back in once
    // the re-priced catalogue lands, so the swap reads as a crossfade rather
    // than a snap.
    panel.classList.remove("is-shown");
    // Re-fetch at the new currency. Anything open at the time is restored
    // below once the fresh catalogue lands.
    const openSlug = document.getElementById("panel-store-detail").hidden
      ? null
      : (store.product || {}).slug || null;
    renderStore(storeLabel, openSlug);
  });

  wrap.appendChild(select);
  actions.appendChild(wrap);

  const dot = document.createElement("span");
  dot.className = "store-heading-sep";
  dot.setAttribute("aria-hidden", "true");
  dot.textContent = "·";
  actions.appendChild(dot);

  // renderHeading staggers the Cart button at index 0; these are appended
  // afterwards, so they need marking too or they'd sit outside the panel's
  // reveal and simply appear while Cart fades in beside them.
  markStagger(wrap, 0);
  markStagger(dot, 0);

  // Move the Cart button in beside it rather than leaving it a sibling, so
  // .panel-heading keeps its two-child space-between layout.
  actions.appendChild(store.cartAction);
  heading.appendChild(actions);
}

// `reopenSlug` re-opens a product after a currency change, so switching
// currency while reading a product doesn't bounce you back to the list.
function renderStore(label, reopenSlug) {
  const panel = document.getElementById("panel-store");
  if (!panel) return;
  storeLabel = label || storeLabel;
  panel.replaceChildren();

  store.cartAction = renderPanelHeading(panel, storeLabel, null, "Cart", openCart);
  syncCartAction();
  buildCurrencyPicker(panel);

  const list = document.createElement("div");
  list.className = "work-list";
  list.id = "storeList";
  // Deliberately not staggered: markStagger forces `display: block`, which would
  // kill this flex container's row gap. The cards inside are staggered instead,
  // matching how Selected Works reveals.
  panel.appendChild(list);

  // Appended before the catalogue resolves, so the policies stay reachable
  // even if the storefront is down.
  const footer = document.createElement("div");
  footer.className = "store-footer";
  [
    ["Terms of Service", "terms"],
    ["Privacy Policy", "privacy"],
    ["Returns & FAQ", "returns"],
  ].forEach(([label, slug], i) => {
    if (i) {
      const dot = document.createElement("span");
      dot.className = "store-footer-sep";
      dot.setAttribute("aria-hidden", "true");
      dot.textContent = "·";
      footer.appendChild(dot);
    }
    const link = document.createElement("a");
    link.className = "light-link";
    link.href = `/${slug}`;
    link.textContent = label;
    link.addEventListener("click", (e) => {
      e.preventDefault();
      openLegal(slug);
    });
    footer.appendChild(link);
  });
  panel.appendChild(footer);

  const status = document.createElement("p");
  status.className = "store-status";
  status.textContent = "Loading products…";
  markStagger(status, 2);
  panel.appendChild(status);

  Promise.all([fetchProducts(), fetchBlurbs()])
    .then(([products, blurbs]) => {
      store.products = products;
      // Keep the cart in step with the catalogue's currency before anything
      // renders a price.
      repriceCart(products);
      syncCartAction();
      status.remove();
      if (!products.length) {
        const empty = document.createElement("p");
        empty.className = "store-status";
        empty.textContent = "Nothing in stock right now.";
        panel.appendChild(empty);
        return;
      }
      if (reopenSlug) {
        const reopen = products.find((p) => p.slug === reopenSlug);
        if (reopen) openProductDetail(reopen);
      } else {
        replayReveal(panel);
      }
      // The tray may be open on the cart while prices changed underneath it.
      if (!document.getElementById("trayOverlay").hidden) renderCart();

      products.forEach((product, i) => {
        const card = document.createElement("div");
        card.className = "work-card";
        // Prefer the hand-written one-liner; fall back to the store's own copy
        // so a newly added product still reads sensibly.
        const desc = blurbs[product.name] || truncate(plainText(product.description), 90);
        card.innerHTML = `
          <img class="work-thumb store-thumb"${srcAttr(imageUrl((product.images || [])[0]))} alt="${esc(product.name)}" loading="lazy" />
          <div class="work-head">
            <p class="work-title">${esc(product.name)}</p>
            <div class="work-chips">${priceChips(product)}</div>
          </div>
          ${desc ? `<p class="work-description">${esc(desc)}</p>` : ""}
        `;
        makeActivatable(card, `View ${product.name}`, () => openProductDetail(product));
        markStagger(card, i + 1);
        list.appendChild(card);
      });
    })
    .catch((err) => {
      console.error("Could not load products:", err);
      status.textContent = "Couldn't load the store right now. Please try again later.";
      replayReveal(panel);
    })
    .finally(() => markStoreReady());
}

// ── Product detail ──

function openProductDetail(product) {
  const panel = document.getElementById("panel-store-detail");
  if (!panel) return;

  setRoute(`/store/${product.slug || ""}`, product.name);
  store.product = product;
  const colors = uniqueColors(product.variants);
  const sizes = uniqueSizes(product.variants);
  // Preselect anything that isn't actually a choice.
  store.color = colors.length === 1 ? colors[0].name : null;
  store.size = sizes.length === 1 ? sizes[0] : null;

  panel.replaceChildren();

  const back = document.createElement("a");
  back.className = "inline-link work-detail-back";
  back.href = "#";
  back.textContent = "← Back to Store";
  back.addEventListener("click", (e) => {
    e.preventDefault();
    transitionPanels(panel, document.getElementById("panel-store"));
    setRoute(TAB_PATHS.store, tabLabels.store);
  });
  markStagger(back, 0);
  panel.appendChild(back);

  const images = product.images || [];
  const gallery = document.createElement("div");
  gallery.className = "store-gallery";
  gallery.innerHTML = `
    <img class="store-gallery-main" id="storeMainImg"${srcAttr(imageUrl(images[0]))} alt="${esc(product.name)}" />
    ${
      images.length > 1
        ? `<div class="store-thumbs">${images
            .map(
              (img, i) =>
                `<button class="store-thumb-btn${i === 0 ? " active" : ""}" type="button" data-idx="${i}" aria-label="View image ${i + 1}"><img${srcAttr(imageUrl(img))} alt="" /></button>`
            )
            .join("")}</div>`
        : ""
    }
  `;
  markStagger(gallery, 1);
  panel.appendChild(gallery);

  gallery.querySelectorAll(".store-thumb-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.idx);
      const url = imageUrl(images[idx]);
      if (url) document.getElementById("storeMainImg").src = url;
      gallery.querySelectorAll(".store-thumb-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  const head = document.createElement("div");
  head.className = "work-head";
  head.innerHTML = `
    <p class="work-title work-detail-title">${esc(product.name)}</p>
    <div class="work-chips">${priceChips(product)}</div>
  `;
  markStagger(head, 2);
  panel.appendChild(head);

  if (product.description) {
    const desc = document.createElement("div");
    desc.className = "store-desc";
    // Fourthwall stores the description as rich text authored in the store
    // admin — third-party markup, so it goes through the same allowlist the
    // site's own rich content does rather than straight into innerHTML.
    setHtml(desc, product.description);
    markStagger(desc, 3);
    panel.appendChild(desc);
  }

  const options = document.createElement("div");
  options.className = "store-options";
  options.innerHTML = `
    ${
      colors.length
        ? `<p class="store-options-label">Colour</p>
           <div class="store-swatches" id="storeSwatches">
             ${colors
               .map(
                 (c) =>
                   `<button class="store-swatch" type="button" data-color="${esc(c.name)}" title="${esc(c.name)}" aria-label="${esc(c.name)}"><span></span></button>`
               )
               .join("")}
           </div>`
        : ""
    }
    ${
      sizes.length
        ? `<p class="store-options-label">Size</p>
           <div class="store-sizes" id="storeSizes">
             ${sizes
               .map((s) => `<button class="store-size" type="button" data-size="${esc(s)}">${esc(s)}</button>`)
               .join("")}
           </div>`
        : ""
    }
    <button class="store-add" id="storeAdd" type="button">Add to Cart</button>
  `;
  markStagger(options, 4);
  panel.appendChild(options);

  // Swatch colours come from the storefront API. esc() escapes HTML, not CSS,
  // so interpolating one into a style attribute let a value like
  // "red;background-image:url(...)" append declarations of its own. Assigning
  // through the style property instead hands it to the CSS parser, which
  // rejects anything that isn't a single valid colour.
  options.querySelectorAll(".store-swatch").forEach((btn) => {
    const match = colors.find((c) => c.name === btn.dataset.color);
    if (match) btn.querySelector("span").style.backgroundColor = match.swatch;
  });

  const swatches = options.querySelector("#storeSwatches");
  if (swatches) {
    swatches.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-color]");
      if (!btn) return;
      store.color = btn.dataset.color;
      // Dropping to a colour that doesn't carry the chosen size clears it,
      // otherwise Add stays enabled for a variant that doesn't exist.
      if (store.size && !sizesForColor(product, store.color).includes(store.size)) {
        store.size = null;
      }
      syncDetail(product);
    });
  }

  const sizeBox = options.querySelector("#storeSizes");
  if (sizeBox) {
    sizeBox.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-size]");
      if (!btn || btn.disabled) return;
      store.size = btn.dataset.size;
      syncDetail(product);
    });
  }

  options.querySelector("#storeAdd").addEventListener("click", () => addToCart(product));
  syncDetail(product);

  transitionPanels(document.querySelector(".panel:not([hidden])"), panel);
}

function syncDetail(product) {
  const colors = uniqueColors(product.variants);
  const sizes = uniqueSizes(product.variants);

  document.querySelectorAll(".store-swatch").forEach((el) => {
    el.classList.toggle("active", el.dataset.color === store.color);
  });

  const available = sizesForColor(product, store.color);
  document.querySelectorAll(".store-size").forEach((el) => {
    el.classList.toggle("active", el.dataset.size === store.size);
    el.disabled = !available.includes(el.dataset.size);
  });

  const add = document.getElementById("storeAdd");
  if (!add) return;

  const needsColor = colors.length > 1 && !store.color;
  const needsSize = sizes.length > 1 && !store.size;
  const variant = findVariant(product.variants, store.color, store.size);

  if (needsColor || needsSize) {
    add.textContent = "Select options";
    add.disabled = true;
  } else if (variant) {
    const price = (variant.unitPrice || {}).value || 0;
    const currency = (variant.unitPrice || {}).currency;
    add.textContent = price ? `Add to Cart — ${fmt(price, currency)}` : "Get for Free";
    add.disabled = false;
  } else {
    add.textContent = "Unavailable";
    add.disabled = true;
  }
}

// Asks Fourthwall whether a variant can actually be bought. The catalogue's
// `state`/`stock` fields aren't sufficient — a discontinued product still reports
// AVAILABLE/UNLIMITED there but is refused by the cart endpoint.
async function createCart(items) {
  const url = new URL(`${FW_API}/carts`);
  url.searchParams.set("storefront_token", FW_TOKEN);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "omit",
    body: JSON.stringify({
      items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
    }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function variantSellable(variantId) {
  try {
    const { ok } = await createCart([{ variantId, quantity: 1 }]);
    return ok;
  } catch (err) {
    // A network failure isn't proof the item is bad — don't block the add.
    return true;
  }
}

// True while a sellability check is in flight. The swatch and size handlers
// are delegated to their containers rather than the Add button, so they keep
// firing while it's disabled — without this a second click could be verifying
// one variant and adding another.
let addInFlight = false;

async function addToCart(product) {
  if (addInFlight) return;
  const variant = findVariant(product.variants, store.color, store.size);
  if (!variant) return;

  // Verify before adding, so an unsellable item can never poison the cart and
  // strand the user at checkout with a vague failure.
  const add = document.getElementById("storeAdd");
  addInFlight = true;
  if (add) {
    add.disabled = true;
    add.textContent = "Checking…";
  }

  let sellable;
  try {
    sellable = await variantSellable(variant.id);
  } finally {
    addInFlight = false;
  }

  // Those live controls mean the selection can move on mid-request. Re-resolve
  // it rather than trusting what was captured before the await: picking a
  // different colour while the check ran used to add the previous variant.
  if (findVariant(product.variants, store.color, store.size) !== variant) {
    syncDetail(product);
    return;
  }

  if (!sellable) {
    store.unavailable.add(variant.id);
    if (add) add.textContent = "Currently unavailable";
    return;
  }

  // Rebuild the button from current state instead of restoring a label
  // captured earlier, which could have gone stale the same way.
  syncDetail(product);

  const existing = store.cart.find((item) => item.variantId === variant.id);
  if (existing) {
    existing.quantity = Math.min(MAX_QTY, existing.quantity + 1);
  } else {
    store.cart.push({
      variantId: variant.id,
      quantity: 1,
      productName: product.name,
      variantName: (variant.attributes || {}).description || variant.name,
      price: (variant.unitPrice || {}).value || 0,
      currency: (variant.unitPrice || {}).currency || "USD",
      image: imageUrl((variant.images || [])[0] || (product.images || [])[0]),
    });
  }

  saveCart();
  openCart();
}

// ── Cart tray ──

// The sheet itself (open/close/backdrop/Escape) is the shared tray in site.js;
// the cart is just one of its views.
function openCart() {
  renderCart();
  openTray("cart", "Cart");
}

function renderCart() {
  const items = document.getElementById("cartItems");
  const foot = document.getElementById("cartFoot");
  if (!items || !foot) return;

  if (!store.cart.length) {
    // Centred icon over a title, same shape as the Writing panel's empty
    // state. The glyph is the Store tab's own icon from site.js's constant
    // map — never content — so innerHTML is safe here.
    items.innerHTML = `
      <div class="cart-empty">
        <span class="cart-empty-icon">${NAV_ICONS.store}</span>
        <p class="cart-empty-title">Your cart is empty</p>
      </div>`;
    foot.hidden = true;
    return;
  }
  foot.hidden = false;

  items.innerHTML = store.cart
    .map((item, i) => {
      const dead = store.unavailable.has(item.variantId);
      return `
      <div class="cart-item${dead ? " cart-item--dead" : ""}">
        <img class="cart-item-img"${srcAttr(safeUrl(item.image))} alt="${esc(item.productName)}" />
        <div class="cart-item-info">
          <p class="cart-item-name">${esc(item.productName)}</p>
          <p class="cart-item-variant">${esc(item.variantName)}</p>
          ${dead ? `<p class="cart-item-flag">No longer available</p>` : ""}
          <div class="cart-qty">
            <button class="cart-qty-btn" type="button" data-action="dec" data-i="${i}" aria-label="Remove one">−</button>
            <span class="cart-qty-num">${item.quantity}</span>
            <button class="cart-qty-btn" type="button" data-action="inc" data-i="${i}" aria-label="Add one">+</button>
          </div>
        </div>
        <span class="cart-item-price">${esc(fmt(item.price * item.quantity, item.currency))}</span>
      </div>`;
    })
    .join("");

  // repriceCart keeps every line in the catalogue's currency, so the total
  // can be formatted from the selected one rather than the first line's.
  document.getElementById("cartTotal").textContent = fmt(cartTotal(), store.currency);

  // Block checkout while the cart still holds something Fourthwall won't sell,
  // and offer the one-click way out.
  const blocked = store.cart.some((item) => store.unavailable.has(item.variantId));
  const pay = document.getElementById("cartCheckout");
  if (pay) {
    pay.disabled = blocked;
    pay.textContent = blocked ? "Remove unavailable to continue" : "Checkout";
  }
  const purge = document.getElementById("cartPurge");
  if (purge) purge.hidden = !blocked;

  items.querySelectorAll(".cart-qty-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = Number(btn.dataset.i);
      const item = store.cart[i];
      if (!item) return;
      if (btn.dataset.action === "inc") {
        item.quantity = Math.min(MAX_QTY, item.quantity + 1);
      } else if (--item.quantity <= 0) {
        store.cart.splice(i, 1);
      }
      saveCart();
      renderCart();
    });
  });
}

// ── Checkout ──

function setCartNote(text, isError) {
  const note = document.querySelector(".cart-note");
  if (!note) return;
  note.textContent = text;
  note.classList.toggle("cart-note--error", !!isError);
}

// Fourthwall rejects the whole cart without saying which line is at fault, so
// re-ask one item at a time to find the culprits.
async function findUnsellable(items) {
  const bad = [];
  for (const item of items) {
    if (!(await variantSellable(item.variantId))) bad.push(item);
  }
  return bad;
}

function removeUnavailable() {
  store.cart = store.cart.filter((item) => !store.unavailable.has(item.variantId));
  saveCart();
  setCartNote(CART_NOTE_DEFAULT);
  renderCart();
}

async function checkout() {
  const btn = document.getElementById("cartCheckout");
  if (!btn || !store.cart.length) return;
  btn.disabled = true;
  btn.textContent = "Creating order…";
  setCartNote(CART_NOTE_DEFAULT);

  try {
    const { ok, data } = await createCart(store.cart);
    if (ok && data.id) {
      // Built through URL rather than string concatenation so the cart id and
      // currency are encoded, whatever the API hands back.
      const checkoutUrl = new URL("/checkout/", FW_STORE);
      checkoutUrl.searchParams.set("cartCurrency", store.currency);
      checkoutUrl.searchParams.set("cartId", data.id);
      window.location.href = checkoutUrl.href;
      return;
    }

    btn.textContent = "Checking items…";
    const bad = await findUnsellable(store.cart);
    if (bad.length) {
      bad.forEach((item) => store.unavailable.add(item.variantId));
      setCartNote(
        bad.length === 1
          ? `“${bad[0].productName}” is no longer available.`
          : `${bad.length} items are no longer available.`,
        true
      );
    } else {
      setCartNote(data.message || "Couldn't reach checkout. Please try again.", true);
    }
  } catch (err) {
    console.error("Checkout failed:", err);
    setCartNote("Couldn't reach checkout. Please try again.", true);
  } finally {
    btn.disabled = false;
    btn.textContent = "Checkout";
    renderCart();
  }
}

// ── Init ──

// Answers the router's /store/<slug> lookups. The catalogue is fetched async,
// so this waits for it rather than reporting failure and leaving a second
// code path to retry later — two openers racing is what used to leave the
// store list and a product page on screen at the same time.
window.__openStoreSlug = async (slug) => {
  await storeReady;
  // Only act if the URL still points here; the visitor may have navigated on
  // while the catalogue was in flight.
  const [head, current] = location.pathname.split("/").filter(Boolean);
  if (head !== "store" || current !== slug) return;
  const product = store.products.find((p) => p.slug === slug);
  if (!product) {
    // Matches how an unknown /work/ or /writing/ slug behaves.
    showNotFound();
    return;
  }
  openProductDetail(product);
  syncNavSelection("store");
};

document.addEventListener("DOMContentLoaded", async () => {
  const chosen = loadCurrency();
  loadCart();

  // Without a saved choice, take the edge's hint — but never block the store
  // on it. The guess is a default only: it isn't written to storage, so it
  // re-evaluates each visit and an explicit pick still wins permanently.
  if (!chosen) {
    const cached = cachedGeoCurrency();
    const guess =
      cached ||
      (await Promise.race([
        geoCurrency,
        new Promise((resolve) => setTimeout(() => resolve(null), 1200)),
      ]));
    if (guess) store.currency = guess;
  }

  renderStore("Store");

  const pay = document.getElementById("cartCheckout");
  if (pay) pay.addEventListener("click", checkout);
  const purge = document.getElementById("cartPurge");
  if (purge) purge.addEventListener("click", removeUnavailable);
});
