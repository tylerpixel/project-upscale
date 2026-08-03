// Project Upscale — the stored light/dark choice, applied before first paint.
//
// This is the whole reason the file exists separately from site.js: it is the
// one script on the site loaded *without* defer, so it runs while <head> is
// still being parsed and before the browser has painted anything. site.js is
// deferred, and by the time a deferred script runs the page may already be on
// screen — which for a visitor who has pinned dark on a light system would mean
// a white flash on every single load.
//
// It stays this small on purpose. All the colours are CSS's job; the only
// thing that has to happen this early is putting the stored choice on <html>.
// Everything else about settings — the panel, the switch, writing the
// preference — is in site.js, which calls the applyTheme() defined here rather
// than repeating it.
//
// An inline <script> would be the usual way to do this. The CSP is
// `script-src 'self'` with no 'unsafe-inline', so it can't be one.

(function () {
  "use strict";

  var KEY = "tp-theme";

  // The three the settings panel offers, in the order its segment shows them —
  // published because site.js steps through this list with the arrow keys, and
  // two copies of it would be two things to keep in the same order.
  window.THEME_CHOICES = ["light", "dark", "system"];

  // --bg's two halves, for the browser-chrome colour. Duplicated from the
  // control panel in styles/main.css because a <meta> can't read a custom
  // property; if --bg changes, change these.
  var CHROME = { light: "#ffffff", dark: "#0f0f11" };

  var systemDark = window.matchMedia("(prefers-color-scheme: dark)");

  /** Writes <html data-theme> and the browser-chrome colour to match a choice.
   *  All three choices are real attribute values — light is the default, so it
   *  is what no attribute means, but saying it explicitly costs nothing and
   *  keeps "which of the three is on" answerable by looking. */
  window.applyTheme = function (choice) {
    document.documentElement.dataset.theme = choice;

    // The page itself needs no help here — CSS resolves "system" through
    // color-scheme. A <meta> can't, so this is the one place the system
    // preference has to be read in script.
    var resolved = choice === "system" ? (systemDark.matches ? "dark" : "light") : choice;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", CHROME[resolved] || CHROME.light);
  };

  /** The stored choice, or "light" when there is none — or when there's no
   *  storage to read, which Safari's private mode can do by throwing. Light is
   *  the site's default, not a fallback: dark is opted into. */
  window.readTheme = function () {
    try {
      var stored = localStorage.getItem(KEY);
      return window.THEME_CHOICES.indexOf(stored) > -1 ? stored : "light";
    } catch (e) {
      return "light";
    }
  };

  window.storeTheme = function (choice) {
    try {
      localStorage.setItem(KEY, choice);
    } catch (e) {
      // Nothing to do — the choice still applies for this page.
    }
  };

  window.applyTheme(window.readTheme());

  // On "match system" only, the chrome colour has to follow the system
  // flipping while the page is open — the page's own colours already do,
  // through color-scheme.
  systemDark.addEventListener("change", function () {
    if (window.readTheme() === "system") window.applyTheme("system");
  });
})();
