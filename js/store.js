// Store — Fourthwall-backed storefront. Renders a product list styled like
// Selected Works, a product detail page reachable only from a product card,
// and a localStorage cart that hands off to Fourthwall's hosted checkout.
//
// Relies on helpers declared in site.js (renderPanelHeading, markStagger,
// transitionPanels) — both are classic scripts sharing global scope, and
// site.js is loaded first.

// Public read-only storefront token. Fourthwall issues these specifically to be
// embedded in client-side code; it can only read the catalogue and create carts.
const FW_TOKEN = "ptkn_be80840a-63bb-4229-a898-f8ed4a14dbc3";
const FW_API = "https://storefront-api.fourthwall.com/v1";
const FW_STORE = "https://store.tylerpixel.com";
const CART_KEY = "tp_shop_cart";

const store = {
  products: [],
  cart: [],
  product: null,
  color: null,
  size: null,
  cartAction: null, // the "Cart" button in the Store panel heading
  // Variant ids Fourthwall refuses to sell. The catalogue can still advertise a
  // product as AVAILABLE with UNLIMITED stock while the cart endpoint rejects
  // it, so this is only discoverable by asking.
  unavailable: new Set(),
};

const CART_NOTE_DEFAULT = "Secure checkout is handled by Fourthwall.";

// ── Helpers ──

function esc(value) {
  return String(value == null ? "" : value).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

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

function loadCart() {
  try {
    const raw = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    store.cart = Array.isArray(raw) ? raw : [];
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

function uniqueColors(variants) {
  const seen = new Set();
  const out = [];
  variants.forEach((v) => {
    const c = v.attributes && v.attributes.color;
    if (!c || seen.has(c.name)) return;
    seen.add(c.name);
    out.push({ name: c.name, swatch: c.swatch || "#cccccc" });
  });
  return out;
}

function uniqueSizes(variants) {
  const seen = new Set();
  const out = [];
  variants.forEach((v) => {
    const s = v.attributes && v.attributes.size;
    if (!s || seen.has(s.name)) return;
    seen.add(s.name);
    out.push(s.name);
  });
  return out;
}

function findVariant(variants, color, size) {
  return (
    variants.find((v) => {
      const a = v.attributes || {};
      const colorOk = !color || (a.color && a.color.name === color);
      const sizeOk = !size || (a.size && a.size.name === size);
      return colorOk && sizeOk;
    }) || null
  );
}

function sizesForColor(product, color) {
  if (!color) return uniqueSizes(product.variants);
  return product.variants
    .filter((v) => v.attributes && v.attributes.color && v.attributes.color.name === color)
    .map((v) => (v.attributes.size ? v.attributes.size.name : null))
    .filter(Boolean);
}

// ── Product list ──

async function fetchProducts() {
  const res = await fetch(`${FW_API}/collections/all/products?storefront_token=${FW_TOKEN}&limit=50`);
  if (!res.ok) throw new Error(`Storefront responded ${res.status}`);
  const data = await res.json();
  return data.results || [];
}

// Card blurbs live in site-content.json alongside the rest of the site's copy.
// site.js has already requested this file, so it comes from cache.
async function fetchBlurbs() {
  try {
    const res = await fetch("data/site-content.json");
    const data = await res.json();
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

function renderStore(label) {
  const panel = document.getElementById("panel-store");
  if (!panel) return;
  panel.innerHTML = "";

  store.cartAction = renderPanelHeading(panel, label || "Store", null, "Cart", openCart);
  syncCartAction();

  const list = document.createElement("div");
  list.className = "work-list";
  list.id = "storeList";
  // Deliberately not staggered: markStagger forces `display: block`, which would
  // kill this flex container's row gap. The cards inside are staggered instead,
  // matching how Selected Works reveals.
  panel.appendChild(list);

  const status = document.createElement("p");
  status.className = "store-status";
  status.textContent = "Loading products…";
  markStagger(status, 2);
  panel.appendChild(status);

  Promise.all([fetchProducts(), fetchBlurbs()])
    .then(([products, blurbs]) => {
      store.products = products;
      status.remove();
      if (!products.length) {
        const empty = document.createElement("p");
        empty.className = "store-status";
        empty.textContent = "Nothing in stock right now.";
        panel.appendChild(empty);
        return;
      }
      products.forEach((product, i) => {
        const card = document.createElement("div");
        card.className = "work-card";
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");
        card.setAttribute("aria-label", `View ${product.name}`);
        const img = (product.images || [])[0] || {};
        // Prefer the hand-written one-liner; fall back to the store's own copy
        // so a newly added product still reads sensibly.
        const desc = blurbs[product.name] || truncate(plainText(product.description), 90);
        card.innerHTML = `
          <img class="work-thumb store-thumb" src="${esc(img.url)}" alt="${esc(product.name)}" loading="lazy" />
          <div class="work-head">
            <p class="work-title">${esc(product.name)}</p>
            <div class="work-chips">${priceChips(product)}</div>
          </div>
          ${desc ? `<p class="work-description">${esc(desc)}</p>` : ""}
        `;
        card.addEventListener("click", () => openProductDetail(product));
        card.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openProductDetail(product);
          }
        });
        markStagger(card, i + 1);
        list.appendChild(card);
      });
    })
    .catch((err) => {
      console.error("Could not load products:", err);
      status.textContent = "Couldn't load the store right now. Please try again later.";
    });
}

// ── Product detail ──

function openProductDetail(product) {
  const panel = document.getElementById("panel-store-detail");
  if (!panel) return;

  store.product = product;
  const colors = uniqueColors(product.variants);
  const sizes = uniqueSizes(product.variants);
  // Preselect anything that isn't actually a choice.
  store.color = colors.length === 1 ? colors[0].name : null;
  store.size = sizes.length === 1 ? sizes[0] : null;

  panel.innerHTML = "";

  const back = document.createElement("a");
  back.className = "inline-link work-detail-back";
  back.href = "#";
  back.textContent = "← Back to Store";
  back.addEventListener("click", (e) => {
    e.preventDefault();
    transitionPanels(panel, document.getElementById("panel-store"));
  });
  markStagger(back, 0);
  panel.appendChild(back);

  const images = product.images || [];
  const gallery = document.createElement("div");
  gallery.className = "store-gallery";
  gallery.innerHTML = `
    <img class="store-gallery-main" id="storeMainImg" src="${esc((images[0] || {}).url)}" alt="${esc(product.name)}" />
    ${
      images.length > 1
        ? `<div class="store-thumbs">${images
            .map(
              (img, i) =>
                `<button class="store-thumb-btn${i === 0 ? " active" : ""}" type="button" data-idx="${i}" aria-label="View image ${i + 1}"><img src="${esc(img.url)}" alt="" /></button>`
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
      document.getElementById("storeMainImg").src = images[idx].url;
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
    // Fourthwall stores the description as rich text authored in the store admin.
    desc.innerHTML = product.description;
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
                   `<button class="store-swatch" type="button" data-color="${esc(c.name)}" title="${esc(c.name)}" aria-label="${esc(c.name)}"><span style="background:${esc(c.swatch)}"></span></button>`
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
  const res = await fetch(`${FW_API}/carts?storefront_token=${FW_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

async function addToCart(product) {
  const variant = findVariant(product.variants, store.color, store.size);
  if (!variant) return;

  // Verify before adding, so an unsellable item can never poison the cart and
  // strand the user at checkout with a vague failure.
  const add = document.getElementById("storeAdd");
  const label = add ? add.textContent : "";
  if (add) {
    add.disabled = true;
    add.textContent = "Checking…";
  }
  const sellable = await variantSellable(variant.id);
  if (!sellable) {
    store.unavailable.add(variant.id);
    if (add) add.textContent = "Currently unavailable";
    return;
  }
  if (add) {
    add.disabled = false;
    add.textContent = label;
  }

  const existing = store.cart.find((item) => item.variantId === variant.id);
  if (existing) {
    existing.quantity++;
  } else {
    store.cart.push({
      variantId: variant.id,
      quantity: 1,
      productName: product.name,
      variantName: (variant.attributes || {}).description || variant.name,
      price: (variant.unitPrice || {}).value || 0,
      currency: (variant.unitPrice || {}).currency || "USD",
      image: ((variant.images || [])[0] || (product.images || [])[0] || {}).url || "",
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
    items.innerHTML = `<p class="store-status">Your cart is empty.</p>`;
    foot.hidden = true;
    return;
  }
  foot.hidden = false;

  items.innerHTML = store.cart
    .map((item, i) => {
      const dead = store.unavailable.has(item.variantId);
      return `
      <div class="cart-item${dead ? " cart-item--dead" : ""}">
        <img class="cart-item-img" src="${esc(item.image)}" alt="${esc(item.productName)}" />
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

  document.getElementById("cartTotal").textContent = fmt(cartTotal(), store.cart[0].currency);

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
        item.quantity++;
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
      const currency = store.cart[0].currency || "USD";
      window.location.href = `${FW_STORE}/checkout/?cartCurrency=${currency}&cartId=${data.id}`;
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

document.addEventListener("DOMContentLoaded", () => {
  loadCart();

  // site.js renders its panels on the same event; defer so `renderPanelHeading`
  // and the nav tabs exist before the Store panel is built.
  setTimeout(() => renderStore("Store"), 0);

  const pay = document.getElementById("cartCheckout");
  if (pay) pay.addEventListener("click", checkout);
  const purge = document.getElementById("cartPurge");
  if (purge) purge.addEventListener("click", removeUnavailable);
});
