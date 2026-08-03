// cuelume v0.2.1 — https://cuelume.dev — MIT © Daniel Belyi
//
// Vendored, not installed: the site has no bundler and its CSP is
// `script-src 'self'`, so there is no CDN to load this from and no module
// graph to import it into. This is the package's own dist/ output —
// sounds/recipes.js and audio/engine.js, verbatim apart from the ESM
// import/export lines — wrapped in an IIFE that hangs the public surface off
// window.cuelume for the classic scripts beside it. dist/interactions/bind.js
// is deliberately left out: it wires per-element data-cuelume-* attributes,
// and js/site.js delegates off the document instead.
//
// To update: npm pack cuelume, and redo the same two edits.

(function () {
  "use strict";

  /**
   * The sound palette — layer/recipe types plus the fourteen built-in recipes.
   * Each sound has its own distinct shape — a chime, an arpeggio, a pitch
   * glide, a warm pad, a breath — rather than being a volume/EQ tweak on
   * the same click. Add a new one here without touching any audio graph code.
   */
  const RECIPES = {
      /** A soft two-note ascending bell, like an iOS/macOS confirmation tink. */
      chime: {
          masterGain: 0.5,
          layers: [
              { kind: "tone", waveform: "sine", frequency: 1046.5, attack: 0.006, decay: 0.22, peak: 0.09 },
              { kind: "tone", waveform: "sine", frequency: 1568, offset: 0.09, attack: 0.006, decay: 0.26, peak: 0.08 },
          ],
          shimmer: { delay: 0.12, feedback: 0.25, wet: 0.18, lowpass: 4000 },
      },
      /** A quick ascending twinkle of four notes — bright and playful. */
      sparkle: {
          masterGain: 0.5,
          layers: [
              { kind: "tone", waveform: "sine", frequency: 1760, offset: 0, attack: 0.003, decay: 0.09, peak: 0.045 },
              { kind: "tone", waveform: "sine", frequency: 2217, offset: 0.045, attack: 0.003, decay: 0.09, peak: 0.04 },
              { kind: "tone", waveform: "sine", frequency: 2637, offset: 0.09, attack: 0.003, decay: 0.1, peak: 0.038 },
              { kind: "tone", waveform: "sine", frequency: 3520, offset: 0.135, attack: 0.003, decay: 0.12, peak: 0.032 },
          ],
          shimmer: { delay: 0.07, feedback: 0.35, wet: 0.22, lowpass: 6000 },
      },
      /** A single note gliding smoothly downward, like a drop of water. */
      droplet: {
          masterGain: 0.55,
          layers: [
              { kind: "tone", waveform: "sine", frequency: 1200, glideTo: 550, glideTime: 0.14, attack: 0.004, decay: 0.2, peak: 0.075 },
          ],
          shimmer: { delay: 0.09, feedback: 0.2, wet: 0.15, lowpass: 3000 },
      },
      /** A warm, slow-swelling pad from two gently detuned sines. */
      bloom: {
          masterGain: 0.5,
          layers: [
              { kind: "tone", waveform: "sine", frequency: 528, attack: 0.06, decay: 0.32, peak: 0.06 },
              { kind: "tone", waveform: "sine", frequency: 528, detune: 12, attack: 0.06, decay: 0.34, peak: 0.05 },
          ],
          shimmer: { delay: 0.15, feedback: 0.2, wet: 0.12, lowpass: 2500 },
      },
      /** The quietest option — a breathy, textureless swell for dense lists. */
      whisper: {
          masterGain: 0.5,
          layers: [
              { kind: "noise", filterType: "lowpass", filterFrequency: 1200, filterQ: 0.7, attack: 0.04, decay: 0.16, peak: 0.05 },
          ],
      },
      /** A focused, bandpass-filtered tick with a bright sine ping on top — crisp and instant. */
      tick: {
          masterGain: 0.4,
          layers: [
              { kind: "noise", filterType: "bandpass", filterFrequency: 5400, filterQ: 1.8, attack: 0.001, decay: 0.018, peak: 0.14 },
              { kind: "tone", waveform: "sine", frequency: 2600, attack: 0.001, decay: 0.012, peak: 0.018 },
          ],
      },
      /** A dull, muted knock — the "down" half of a press/release pair, like a key bottoming out. */
      press: {
          masterGain: 0.4,
          layers: [
              { kind: "noise", filterType: "bandpass", filterFrequency: 1700, filterQ: 1.4, attack: 0.001, decay: 0.02, peak: 0.13 },
          ],
      },
      /** A brighter, springier tick — the "up" half of a press/release pair, like a key returning. */
      release: {
          masterGain: 0.4,
          layers: [
              { kind: "noise", filterType: "bandpass", filterFrequency: 4600, filterQ: 1.8, attack: 0.001, decay: 0.016, peak: 0.12 },
              { kind: "tone", waveform: "sine", frequency: 3200, offset: 0.006, attack: 0.001, decay: 0.05, peak: 0.02 },
          ],
      },
      /** A two-part click-clack, like a mechanical switch flipping between states. */
      toggle: {
          masterGain: 0.4,
          layers: [
              { kind: "noise", filterType: "bandpass", filterFrequency: 2200, filterQ: 1.6, attack: 0.001, decay: 0.016, peak: 0.12 },
              { kind: "noise", filterType: "bandpass", filterFrequency: 3800, filterQ: 1.6, offset: 0.024, attack: 0.001, decay: 0.02, peak: 0.1 },
          ],
      },
      /** A short, warm three-note ascending confirmation — "done", not a fanfare. */
      success: {
          masterGain: 0.5,
          layers: [
              { kind: "tone", waveform: "sine", frequency: 880, attack: 0.004, decay: 0.09, peak: 0.06 },
              { kind: "tone", waveform: "sine", frequency: 1108.73, offset: 0.06, attack: 0.004, decay: 0.1, peak: 0.06 },
              { kind: "tone", waveform: "sine", frequency: 1318.51, offset: 0.12, attack: 0.004, decay: 0.18, peak: 0.07 },
          ],
          shimmer: { delay: 0.1, feedback: 0.22, wet: 0.16, lowpass: 4500 },
      },
      /** A muted knock followed by two descending tones — a calm, recoverable refusal. */
      error: {
          masterGain: 0.42,
          layers: [
              { kind: "noise", filterType: "bandpass", filterFrequency: 850, filterQ: 1.1, attack: 0.001, decay: 0.035, peak: 0.13 },
              { kind: "tone", waveform: "triangle", frequency: 440, offset: 0.025, attack: 0.004, decay: 0.09, peak: 0.045 },
              { kind: "tone", waveform: "triangle", frequency: 349.23, offset: 0.1, attack: 0.004, decay: 0.14, peak: 0.04 },
          ],
      },
      /** A papery filtered flick with a tiny glass tick — for pages, galleries, and carousels. */
      page: {
          masterGain: 0.38,
          layers: [
              { kind: "noise", filterType: "lowpass", filterFrequency: 1800, filterQ: 0.7, attack: 0.006, decay: 0.08, peak: 0.11 },
              { kind: "noise", filterType: "bandpass", filterFrequency: 4200, filterQ: 1.2, offset: 0.04, attack: 0.004, decay: 0.065, peak: 0.08 },
              { kind: "tone", waveform: "sine", frequency: 2400, offset: 0.075, attack: 0.002, decay: 0.045, peak: 0.02 },
          ],
      },
      /** A brief unresolved lift — signals that user-initiated work has started. */
      loading: {
          masterGain: 0.42,
          layers: [
              { kind: "noise", filterType: "lowpass", filterFrequency: 1400, filterQ: 0.6, attack: 0.035, decay: 0.14, peak: 0.035 },
              { kind: "tone", waveform: "sine", frequency: 420, glideTo: 630, glideTime: 0.18, attack: 0.025, decay: 0.18, peak: 0.05 },
          ],
          shimmer: { delay: 0.11, feedback: 0.18, wet: 0.12, lowpass: 2800 },
      },
      /** A precise focus tick opening into a soft harmonic bloom — content is ready. */
      ready: {
          masterGain: 0.45,
          layers: [
              { kind: "noise", filterType: "bandpass", filterFrequency: 3200, filterQ: 1.7, attack: 0.001, decay: 0.018, peak: 0.1 },
              { kind: "tone", waveform: "sine", frequency: 659.25, offset: 0.025, attack: 0.012, decay: 0.2, peak: 0.05 },
              { kind: "tone", waveform: "sine", frequency: 987.77, offset: 0.025, attack: 0.012, decay: 0.22, peak: 0.035 },
          ],
          shimmer: { delay: 0.13, feedback: 0.2, wet: 0.13, lowpass: 3600 },
      },
  };
  function isSoundName(value) {
      return typeof value === "string" && Object.prototype.hasOwnProperty.call(RECIPES, value);
  }
  /** All available sound names, derived from the recipe palette. */
  const sounds = Object.keys(RECIPES);

  /**
   * The audio engine — synthesizes each sound live via the Web Audio API
   * on one shared, lazily created `AudioContext`. No audio files, no
   * dependencies. Every sound carries a gentle envelope (and often a soft
   * shimmer tail) instead of a hard transient, so nothing feels harsh.
   */

  const SOURCE_STOP_PADDING = 0.05;
  const CLEANUP_MARGIN = 0.05;
  const INAUDIBLE_GAIN = 0.001;
  const OUTPUT_GAIN = 4;
  function renderTone(context, destination, layer, startTime) {
      const oscillator = context.createOscillator();
      oscillator.type = layer.waveform;
      oscillator.frequency.setValueAtTime(layer.frequency, startTime);
      if (layer.detune)
          oscillator.detune.value = layer.detune;
      if (layer.glideTo !== undefined) {
          const glideTime = layer.glideTime ?? layer.attack + layer.decay;
          oscillator.frequency.exponentialRampToValueAtTime(layer.glideTo, startTime + glideTime);
      }
      const gain = context.createGain();
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(layer.peak, startTime + layer.attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + layer.attack + layer.decay);
      oscillator.connect(gain).connect(destination);
      oscillator.start(startTime);
      oscillator.stop(startTime + layer.attack + layer.decay + SOURCE_STOP_PADDING);
  }
  function renderNoise(context, destination, layer, startTime) {
      const duration = layer.attack + layer.decay + SOURCE_STOP_PADDING;
      const length = Math.max(1, Math.floor(duration * context.sampleRate));
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++)
          data[i] = 2 * Math.random() - 1;
      const source = context.createBufferSource();
      source.buffer = buffer;
      const filter = context.createBiquadFilter();
      filter.type = layer.filterType;
      filter.frequency.value = layer.filterFrequency;
      if (layer.filterQ !== undefined)
          filter.Q.value = layer.filterQ;
      const gain = context.createGain();
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(layer.peak, startTime + layer.attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + layer.attack + layer.decay);
      source.connect(filter).connect(gain).connect(destination);
      source.start(startTime);
      source.stop(startTime + duration);
  }
  /** Wires a soft echo/shimmer send off `source`, feeding back into `destination`. */
  function attachShimmer(context, source, destination, shimmer) {
      const delay = context.createDelay(1);
      delay.delayTime.value = shimmer.delay;
      const feedbackFilter = context.createBiquadFilter();
      feedbackFilter.type = "lowpass";
      feedbackFilter.frequency.value = shimmer.lowpass;
      const feedbackGain = context.createGain();
      feedbackGain.gain.value = shimmer.feedback;
      const wetGain = context.createGain();
      wetGain.gain.value = shimmer.wet;
      source.connect(delay);
      delay.connect(feedbackFilter);
      feedbackFilter.connect(feedbackGain);
      feedbackGain.connect(delay);
      feedbackFilter.connect(wetGain);
      wetGain.connect(destination);
      return [delay, feedbackFilter, feedbackGain, wetGain];
  }
  function sourceEnd(recipe) {
      return Math.max(...recipe.layers.map((layer) => (layer.offset ?? 0) + layer.attack + layer.decay + SOURCE_STOP_PADDING));
  }
  function shimmerTail(shimmer) {
      if (!shimmer || shimmer.feedback <= 0)
          return 0;
      if (shimmer.feedback >= 1)
          return shimmer.delay;
      return shimmer.delay * (1 + Math.ceil(Math.log(INAUDIBLE_GAIN) / Math.log(shimmer.feedback)));
  }
  let sharedOutput = null;
  function getOutput(context) {
      if (sharedOutput)
          return sharedOutput;
      const output = context.createGain();
      output.gain.value = OUTPUT_GAIN;
      const limiter = context.createDynamicsCompressor();
      limiter.threshold.value = -8;
      limiter.knee.value = 6;
      limiter.ratio.value = 12;
      limiter.attack.value = 0.002;
      limiter.release.value = 0.08;
      output.connect(limiter).connect(context.destination);
      sharedOutput = output;
      return output;
  }
  function renderRecipe(context, recipe, volume) {
      const now = context.currentTime;
      const output = getOutput(context);
      const master = context.createGain();
      master.gain.value = recipe.masterGain * volume;
      master.connect(output);
      const shimmerNodes = recipe.shimmer
          ? attachShimmer(context, master, output, recipe.shimmer)
          : [];
      for (const layer of recipe.layers) {
          const startTime = now + (layer.offset ?? 0);
          if (layer.kind === "tone")
              renderTone(context, master, layer, startTime);
          else
              renderNoise(context, master, layer, startTime);
      }
      const cleanupAfterMs = (sourceEnd(recipe) + shimmerTail(recipe.shimmer) + CLEANUP_MARGIN) * 1000;
      setTimeout(() => {
          master.disconnect();
          for (const node of shimmerNodes)
              node.disconnect();
      }, cleanupAfterMs);
  }
  let sharedContext = null;
  let enabled = true;
  let globalVolume = 1;
  function normalizeVolume(value, fallback) {
      return typeof value === "number" && Number.isFinite(value)
          ? Math.min(1, Math.max(0, value))
          : fallback;
  }
  /** Enables or disables future playback. Preference storage stays with the app. */
  function setEnabled(value) {
      if (typeof value === "boolean")
          enabled = value;
  }
  /** Sets the volume multiplier for future playback. Preference storage stays with the app. */
  function setVolume(value) {
      globalVolume = normalizeVolume(value, globalVolume);
  }
  function getAudioContext() {
      if (sharedContext)
          return sharedContext;
      if (typeof window === "undefined")
          return null;
      const Ctor = window.AudioContext ??
          window.webkitAudioContext;
      if (!Ctor)
          return null;
      try {
          sharedContext = new Ctor();
      }
      catch {
          return null;
      }
      return sharedContext;
  }
  /**
   * Plays a sound immediately. Safe to call from anywhere — lazily creates
   * the shared `AudioContext` on first use, resumes it if the browser
   * started it suspended (e.g. before any user gesture), and is a no-op
   * when Web Audio is unavailable (SSR, old browsers).
   */
  function play(sound = "chime", options) {
      if (!enabled || !isSoundName(sound))
          return;
      if (typeof navigator !== "undefined" && navigator.userActivation?.hasBeenActive === false)
          return;
      const playVolume = globalVolume * normalizeVolume(options?.volume, 1);
      if (playVolume === 0)
          return;
      const context = getAudioContext();
      if (!context)
          return;
      const recipe = RECIPES[sound];
      if (context.state === "running") {
          renderRecipe(context, recipe, playVolume);
      }
      else {
          try {
              void context.resume().then(() => {
                  if (enabled && context.state === "running")
                      renderRecipe(context, recipe, playVolume);
              }, () => { });
          }
          catch {
              // Some browsers throw synchronously when audio is blocked.
          }
      }
  }

  window.cuelume = { play, setEnabled, setVolume, sounds };
})();
