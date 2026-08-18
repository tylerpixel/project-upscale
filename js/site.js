// Project Upscale — renders site content and drives the bottom nav + panel reveals.
//
// Loaded as a classic script (not a module) so its top-level declarations stay
// global: store.js builds on the helpers below, and the local CMS overlay
// (admin/cms-edit.js) calls openWorkDetail/openPost by name.

const SOCIAL_ICONS = {
  Twitter: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="currentColor"/></svg>`,
  Instagram: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" fill="currentColor"/></svg>`,
  LinkedIn: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" fill="currentColor"/></svg>`,
  GitHub: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" fill="currentColor"/></svg>`,
  Mail: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
};

// Phosphor Icons (regular weight), sourced from phosphor-icons/core.
const NAV_ICONS = {
  intro: `<svg viewBox="0 0 256 256" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M219.31,108.68l-80-80a16,16,0,0,0-22.62,0l-80,80A15.87,15.87,0,0,0,32,120v96a8,8,0,0,0,8,8H216a8,8,0,0,0,8-8V120A15.87,15.87,0,0,0,219.31,108.68ZM208,208H48V120l80-80,80,80Z"/></svg>`,
  work: `<svg viewBox="0 0 256 256" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M225.86,102.82c-3.77-3.94-7.67-8-9.14-11.57-1.36-3.27-1.44-8.69-1.52-13.94-.15-9.76-.31-20.82-8-28.51s-18.75-7.85-28.51-8c-5.25-.08-10.67-.16-13.94-1.52-3.56-1.47-7.63-5.37-11.57-9.14C146.28,23.51,138.44,16,128,16s-18.27,7.51-25.18,14.14c-3.94,3.77-8,7.67-11.57,9.14C88,40.64,82.56,40.72,77.31,40.8c-9.76.15-20.82.31-28.51,8S41,67.55,40.8,77.31c-.08,5.25-.16,10.67-1.52,13.94-1.47,3.56-5.37,7.63-9.14,11.57C23.51,109.72,16,117.56,16,128s7.51,18.27,14.14,25.18c3.77,3.94,7.67,8,9.14,11.57,1.36,3.27,1.44,8.69,1.52,13.94.15,9.76.31,20.82,8,28.51s18.75,7.85,28.51,8c5.25.08,10.67.16,13.94,1.52,3.56,1.47,7.63,5.37,11.57,9.14C109.72,232.49,117.56,240,128,240s18.27-7.51,25.18-14.14c3.94-3.77,8-7.67,11.57-9.14,3.27-1.36,8.69-1.44,13.94-1.52,9.76-.15,20.82-.31,28.51-8s7.85-18.75,8-28.51c.08-5.25.16-10.67,1.52-13.94,1.47-3.56,5.37-7.63,9.14-11.57C232.49,146.28,240,138.44,240,128S232.49,109.73,225.86,102.82Zm-11.55,39.29c-4.79,5-9.75,10.17-12.38,16.52-2.52,6.1-2.63,13.07-2.73,19.82-.1,7-.21,14.33-3.32,17.43s-10.39,3.22-17.43,3.32c-6.75.1-13.72.21-19.82,2.73-6.35,2.63-11.52,7.59-16.52,12.38S132,224,128,224s-9.15-4.92-14.11-9.69-10.17-9.75-16.52-12.38c-6.1-2.52-13.07-2.63-19.82-2.73-7-.1-14.33-.21-17.43-3.32s-3.22-10.39-3.32-17.43c-.1-6.75-.21-13.72-2.73-19.82-2.63-6.35-7.59-11.52-12.38-16.52S32,132,32,128s4.92-9.15,9.69-14.11,9.75-10.17,12.38-16.52c2.52-6.1,2.63-13.07,2.73-19.82.1-7,.21-14.33,3.32-17.43S70.51,56.9,77.55,56.8c6.75-.1,13.72-.21,19.82-2.73,6.35-2.63,11.52-7.59,16.52-12.38S124,32,128,32s9.15,4.92,14.11,9.69,10.17,9.75,16.52,12.38c6.1,2.52,13.07,2.63,19.82,2.73,7,.1,14.33.21,17.43,3.32s3.22,10.39,3.32,17.43c.1,6.75.21,13.72,2.73,19.82,2.63,6.35,7.59,11.52,12.38,16.52S224,124,224,128,219.08,137.15,214.31,142.11ZM173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34Z"/></svg>`,
  contact: `<svg viewBox="0 0 256 256" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z"/></svg>`,
  writing: `<svg viewBox="0 0 256 256" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Zm-32-80a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h64A8,8,0,0,1,168,136Zm0,32a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h64A8,8,0,0,1,168,168Z"/></svg>`,
  store: `<svg viewBox="0 0 256 256" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M232,96a7.89,7.89,0,0,0-.3-2.2L217.35,43.6A16.07,16.07,0,0,0,202,32H54A16.07,16.07,0,0,0,38.65,43.6L24.31,93.8A7.89,7.89,0,0,0,24,96h0v16a40,40,0,0,0,16,32v72a8,8,0,0,0,8,8H208a8,8,0,0,0,8-8V144a40,40,0,0,0,16-32V96ZM54,48H202l11.42,40H42.61Zm50,56h48v8a24,24,0,0,1-48,0Zm-16,0v8a24,24,0,0,1-35.12,21.26,7.88,7.88,0,0,0-1.82-1.06A24,24,0,0,1,40,112v-8ZM200,208H56V151.2a40.57,40.57,0,0,0,8,.8,40,40,0,0,0,32-16,40,40,0,0,0,64,0,40,40,0,0,0,32,16,40.57,40.57,0,0,0,8-.8Zm4.93-75.8a8.08,8.08,0,0,0-1.8,1.05A24,24,0,0,1,168,112v-8h48v8A24,24,0,0,1,204.93,132.2Z"/></svg>`,
};

// Neutral stand-in for any spot whose image is missing or fails to load —
// an icon tile reads as "no image yet" instead of the browser's broken-image
// glyph. Phosphor "image" (regular).
const IMAGE_EMPTY_ICON = `<svg viewBox="0 0 256 256" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,16V158.75l-26.07-26.06a16,16,0,0,0-22.63,0l-20,20-44-44a16,16,0,0,0-22.62,0L40,149.37V56ZM40,172l52-52,80,80H40Zm176,28H194.63l-36-36,20-20L216,181.38V200ZM144,100a12,12,0,1,1,12,12A12,12,0,0,1,144,100Z"/></svg>`;

// The same five, in Phosphor's Fill weight — what a tab wears once it's the
// one you're on. Both weights ship and CSS swaps them on aria-selected, so
// selecting a tab doesn't touch the DOM and the icon can't fall out of step
// with the state the indicator and the toast are already reading.
const NAV_ICONS_FILL = {
  intro: `<svg viewBox="0 0 256 256" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M224,120v96a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V120a15.87,15.87,0,0,1,4.69-11.32l80-80a16,16,0,0,1,22.62,0l80,80A15.87,15.87,0,0,1,224,120Z"/></svg>`,
  work: `<svg viewBox="0 0 256 256" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M225.86,102.82c-3.77-3.94-7.67-8-9.14-11.57-1.36-3.27-1.44-8.69-1.52-13.94-.15-9.76-.31-20.82-8-28.51s-18.75-7.85-28.51-8c-5.25-.08-10.67-.16-13.94-1.52-3.56-1.47-7.63-5.37-11.57-9.14C146.28,23.51,138.44,16,128,16s-18.27,7.51-25.18,14.14c-3.94,3.77-8,7.67-11.57,9.14C88,40.64,82.56,40.72,77.31,40.8c-9.76.15-20.82.31-28.51,8S41,67.55,40.8,77.31c-.08,5.25-.16,10.67-1.52,13.94-1.47,3.56-5.37,7.63-9.14,11.57C23.51,109.72,16,117.56,16,128s7.51,18.27,14.14,25.18c3.77,3.94,7.67,8,9.14,11.57,1.36,3.27,1.44,8.69,1.52,13.94.15,9.76.31,20.82,8,28.51s18.75,7.85,28.51,8c5.25.08,10.67.16,13.94,1.52,3.56,1.47,7.63,5.37,11.57,9.14C109.72,232.49,117.56,240,128,240s18.27-7.51,25.18-14.14c3.94-3.77,8-7.67,11.57-9.14,3.27-1.36,8.69-1.44,13.94-1.52,9.76-.15,20.82-.31,28.51-8s7.85-18.75,8-28.51c.08-5.25.16-10.67,1.52-13.94,1.47-3.56,5.37-7.63,9.14-11.57C232.49,146.28,240,138.44,240,128S232.49,109.73,225.86,102.82Zm-52.2,6.84-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32Z"/></svg>`,
  store: `<svg viewBox="0 0 256 256" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M231.69,93.81,217.35,43.6A16.07,16.07,0,0,0,202,32H54A16.07,16.07,0,0,0,38.65,43.6L24.31,93.81A7.94,7.94,0,0,0,24,96v16a40,40,0,0,0,16,32v72a8,8,0,0,0,8,8H208a8,8,0,0,0,8-8V144a40,40,0,0,0,16-32V96A7.94,7.94,0,0,0,231.69,93.81ZM88,112a24,24,0,0,1-35.12,21.26,7.88,7.88,0,0,0-1.82-1.06A24,24,0,0,1,40,112v-8H88Zm64,0a24,24,0,0,1-48,0v-8h48Zm64,0a24,24,0,0,1-11.07,20.2,8.08,8.08,0,0,0-1.8,1.05A24,24,0,0,1,168,112v-8h48Z"/></svg>`,
  writing: `<svg viewBox="0 0 256 256" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,176H96a8,8,0,0,1,0-16h64a8,8,0,0,1,0,16Zm0-32H96a8,8,0,0,1,0-16h64a8,8,0,0,1,0,16Zm-8-56V44l44,44Z"/></svg>`,
  contact: `<svg viewBox="0 0 256 256" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M230.93,220a8,8,0,0,1-6.93,4H32a8,8,0,0,1-6.92-12c15.23-26.33,38.7-45.21,66.09-54.16a72,72,0,1,1,73.66,0c27.39,8.95,50.86,27.83,66.09,54.16A8,8,0,0,1,230.93,220Z"/></svg>`,
};

// The message row in the jump palette wears the FAB's own icon, and its line
// weight is cloned from the FAB rather than repeated here. Only the Fill
// weight has nowhere to be cloned from, so it lives here alone.
const MESSAGE_ICON_FILL = `<svg viewBox="0 0 256 256" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M232,128A104,104,0,0,1,79.12,219.82L45.07,231.17a16,16,0,0,1-20.24-20.24l11.35-34.05A104,104,0,1,1,232,128Z"/></svg>`;

// The same stroked chevron the work-nav buttons and the 404's home link carry
// inline in index.html, for the one place that builds its button in JS.
const CHEVRON_RIGHT_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>`;

// Shown in the Writing panel's empty state.
// Trailing chevron for a .cta-button — the mirror of the leading one the 404's
// back-link and the Previous-project control use.
const CTA_ARROW_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>`;

const WRITING_EMPTY_ICON = `<svg viewBox="0 0 256 256" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M227.32,73.37,182.63,28.69a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H216a8,8,0,0,0,0-16H115.32l112-112A16,16,0,0,0,227.32,73.37ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.69,147.32,64l24-24L216,84.69Z"/></svg>`;

// sort.cash mark, inverted for use on its own brand-orange tile: the outer
// shape is hardcoded white (the "logo"), the inner S is currentColor so a
// wrapping element can set it to var(--sortcash) and read as a cutout.
const SORT_CASH_MARK = `<svg viewBox="0 0 362 391" xmlns="http://www.w3.org/2000/svg"><path d="M333.135 28.3222C316.657 11.958 292.975 6.01729 267.285 8.26478L125.586 20.6619C99.8779 22.911 74.8207 33.1327 55.2823 52.7673C35.7648 72.381 25.6099 97.5114 23.3493 123.35L8.26478 295.767C6.01753 321.453 11.9583 345.092 28.1992 361.561C44.4841 378.074 68.0715 384.278 93.9717 382.012L235.671 369.615C261.552 367.351 286.636 356.906 306.164 337.378C325.692 317.85 336.139 292.765 338.403 266.884L353.487 94.4668C355.765 68.4333 349.642 44.7146 333.135 28.3222Z" fill="#ffffff"/><path d="M317.687 129.024C317.302 133.425 313.422 137.305 309.02 137.69L204.564 146.829C200.163 147.214 196.907 143.958 197.292 139.557L200.091 107.559C200.568 102.109 197.533 97.4579 191.588 97.9781L186.633 98.4115C180.688 98.9317 176.786 104.19 176.31 109.64L173.463 142.175C172.683 151.093 177.786 154.58 186.079 155.33L202.664 156.829L269.458 163.276C296.77 165.804 313.089 181.584 310.401 212.302L305.373 269.775C302.079 307.43 276.216 333.292 238.562 336.586L96.8619 348.983C59.2074 352.278 38.0017 330.533 41.2961 292.879L44.8901 251.798C45.2752 247.397 49.1555 243.517 53.5569 243.132L157.518 234.036C161.919 233.651 165.175 236.907 164.79 241.308L161.138 283.048C160.661 288.498 163.739 292.654 169.685 292.134L174.639 291.7C180.585 291.18 184.443 286.418 184.92 280.968L188.619 238.69C189.226 231.754 187.269 226.025 178.48 225.319L165.772 224.464L92.1288 217.632C65.3123 215.062 49.7487 196.265 52.046 170.006L56.3807 120.461C59.7184 82.3107 85.042 56.9871 122.696 53.6928L264.396 41.2956C302.051 38.0013 323.795 59.2069 320.458 97.3569L317.687 129.024Z" fill="currentColor"/></svg>`;

// Work item project-type chip colors. Each type gets its own hue — keep new
// entries clear of the ones already spoken for.
const TYPE_COLORS = {
  Brand: "#2f6fed", // blue
  "Brand Identity": "#2f6fed",
  Concept: "#8b5cf6", // violet
  "UX/UI": "#ff5500", // orange
  Corporate: "#06b6d4", // cyan
  Freelance: "#ef4444", // red
  Ecomm: "#10b981", // emerald
  Uni: "#e0218a", // magenta
};

const supportsHover = window.matchMedia("(hover: hover)").matches;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ── Escaping and sanitising ──
//
// Everything the page renders comes from outside this file: site-content.json
// (written by the local CMS, which stores rich fields as raw HTML) and the
// Fourthwall catalogue (third-party HTML authored in their store admin).
// Neither is a place to trust markup from, so text goes through esc() and
// markup goes through setHtml()'s allowlist.

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

function esc(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

// Resolves against the document and checks the scheme that actually results,
// so encoded or whitespace-padded "javascript:" can't slip past a prefix test.
function safeUrl(url) {
  const raw = String(url == null ? "" : url).trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw, document.baseURI);
    return /^(https?|mailto):$/.test(parsed.protocol) ? parsed.href : "";
  } catch (err) {
    return "";
  }
}

const SVG_NS = "http://www.w3.org/2000/svg";

// Tags rich content is allowed to use, by lowercase local name. Anything else
// is unwrapped (element dropped, its text kept) so a stray wrapper never
// silently swallows a paragraph of copy. The SVG shapes are here because the
// content itself uses them — the sort.cash mention sets that brand mark inline
// ahead of the link text.
const ALLOWED_TAGS = new Set([
  "a", "b", "strong", "i", "em", "u", "br", "p", "span", "small", "code", "ul", "ol", "li",
  "svg", "g", "path", "circle", "ellipse", "rect", "line", "polyline", "polygon",
]);

// HTML attributes each tag may keep. SVG is governed by the rule below
// instead: its geometry attributes are many, and none of them can execute.
const ALLOWED_ATTRS = {
  a: ["href", "target", "rel", "class", "data-work", "data-legal"],
  span: ["class"],
  p: ["class"],
  li: ["class"],
  code: ["class"],
};

// Inside an <svg> everything is presentational except event handlers, links
// and style. <script>, <use>, <foreignObject> and the <animate> family never
// get past the tag allowlist, so those exclusions are the whole risk surface.
// xmlns is dropped because createElementNS has already set the namespace.
function svgAttrAllowed(name) {
  const n = name.toLowerCase();
  return !n.startsWith("on") && !n.includes("href") && n !== "style" && n !== "xmlns";
}

function sanitizeInto(source, target, doc) {
  for (const node of Array.from(source.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      target.appendChild(doc.createTextNode(node.nodeValue));
      continue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue; // comments, CDATA, …
    const tag = node.localName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      sanitizeInto(node, target, doc); // unwrap: keep the contents, drop the tag
      continue;
    }
    // An <svg> built with createElement instead of createElementNS is an
    // unknown HTML element that renders nothing, so the namespace has to
    // carry over from the parsed source.
    const isSvg = node.namespaceURI === SVG_NS;
    const el = isSvg ? doc.createElementNS(SVG_NS, node.localName) : doc.createElement(tag);

    for (const name of node.getAttributeNames()) {
      const allowed = isSvg ? svgAttrAllowed(name) : (ALLOWED_ATTRS[tag] || []).includes(name);
      if (!allowed) continue;
      const value = name === "href" ? safeUrl(node.getAttribute(name)) : node.getAttribute(name);
      if (value) el.setAttribute(name, value);
    }
    // A link that opens a new tab hands that tab a window.opener back into
    // this page unless it's told not to — so always say so, whatever the
    // content claimed.
    if (!isSvg && tag === "a" && el.getAttribute("target") === "_blank") {
      el.setAttribute("rel", "noopener noreferrer");
    }
    sanitizeInto(node, el, doc);
    target.appendChild(el);
  }
}

// Replaces an element's contents with a sanitised copy of `html`. DOMParser is
// used rather than innerHTML because it neither runs scripts nor fetches
// resources for the markup it parses, so nothing in the input executes even
// while it's being inspected.
function setHtml(el, html) {
  const dirty = new DOMParser().parseFromString(`<body>${html == null ? "" : html}</body>`, "text/html");
  const frag = document.createDocumentFragment();
  sanitizeInto(dirty.body, frag, document);
  el.replaceChildren(frag);
  return el;
}

// ── Small shared builders ──

function emptyImageTile(extraClass) {
  const div = document.createElement("div");
  div.className = `image-empty ${extraClass}`;
  div.innerHTML = IMAGE_EMPTY_ICON; // constant markup, defined above
  return div;
}

// A broken src (deleted file, typo'd path) degrades to the same empty tile
// the missing-image case uses, keeping the card layout intact.
function attachImageFallback(img, extraClass) {
  img.addEventListener("error", () => {
    // A display variant that didn't load falls back to the full-size original
    // before the empty tile does. That retry is what makes setDisplaySrc safe
    // to apply without checking first whether each -1080w file exists: an image
    // added through the CMS before scripts/resize-images.js has run costs a
    // wasted request and renders at full size, instead of vanishing.
    const full = img.dataset.fullSrc;
    if (full) {
      delete img.dataset.fullSrc;
      img.src = full;
      return;
    }
    img.replaceWith(emptyImageTile(extraClass));
  });
}

// ── Display-size images ──
//
// Every inline image on the site renders inside the 360px content column —
// .gallery-img, .detail-img and .work-thumb all measure exactly
// --content-width in the browser. The files behind them are up to 2000px wide,
// which is more than 3x what even a 3x phone can resolve at that size.
//
// scripts/resize-images.js writes a 1080px copy of each under a -1080w suffix
// (360 × 3, so the densest screens are still covered) and this points the
// inline <img> at it. Across the gallery that is about two thirds of the
// bytes, for pixels no display was ever going to show.
//
// The lightbox deliberately does not go through here. It opens at up to 900
// CSS px, which is the one place the full file earns its size.
const DISPLAY_WIDTH = 1080;
const RESIZABLE = /\.(webp|png|jpe?g)$/i;

function displaySrc(src) {
  if (typeof src !== "string") return src;
  // Only the two trees resize-images.js covers. Company logos are SVG, and the
  // portrait and avatar are already smaller than the variant would be.
  if (!/(^|\/)images\/(work|figs)\//.test(src)) return src;
  if (!RESIZABLE.test(src) || src.includes(`-${DISPLAY_WIDTH}w.`)) return src;
  return src.replace(RESIZABLE, (ext) => `-${DISPLAY_WIDTH}w${ext}`);
}

// Point an <img> at the display-size copy, recording the original so the error
// handler above can fall back to it. Pairs with attachImageFallback.
function setDisplaySrc(img, src) {
  const display = displaySrc(src);
  if (display !== src) img.dataset.fullSrc = src;
  img.src = display;
}

// Hang a tooltip off an element. Four places were building the same span with
// the same class and appending it, which is four places to forget the class
// name and one to change if the markup ever does.
//
// The label is optional: the version chip creates its tooltip empty and fills
// it on a timer, because what it says ("Updated 3 hrs ago") goes stale while
// the tab is open.
//
// Returns the span, so a caller that needs to keep writing to it can.
function addToast(parent, label) {
  const tip = document.createElement("span");
  tip.className = "nav-toast";
  if (label) tip.textContent = label;
  parent.appendChild(tip);
  return tip;
}

// The bare hostname a tooltip names a destination by. Shared by the inline-link
// tooltips and the figure-link ones so an outbound link reads the same wherever
// it appears. Falls back to a generic label for anything unparseable.
function hostLabel(url) {
  try {
    return new URL(url, document.baseURI).hostname.replace(/^www\./, "");
  } catch (err) {
    return "link";
  }
}

// A brand-orange tile carrying the sort.cash mark at a fixed pixel size — used
// wherever sort.cash needs a thumbnail but has no product screenshot to show.
function sortCashTile(extraClass, size) {
  const div = document.createElement("div");
  div.className = `work-thumb sort-cash-tile ${extraClass}`.trim();
  div.style.setProperty("--tile-icon-size", `${size}px`);
  div.innerHTML = SORT_CASH_MARK; // constant markup, defined above
  return div;
}

function typeChip(type) {
  const color = TYPE_COLORS[type] || "#666666";
  return `<span class="work-chip work-chip--type" style="color:${color};background:${color}1a;">${esc(type)}</span>`;
}

// The year + type chips shared by work cards and their case-study pages.
function chipsMarkup(project) {
  const year = project.year ? `<span class="work-chip work-chip--year">${esc(project.year)}</span>` : "";
  return `${year}${(project.types || []).map(typeChip).join("")}`;
}

// Cards, writing rows and gallery images are all divs/images acting as
// buttons — same role, same tabindex, same Enter/Space contract.
function makeActivatable(el, label, onActivate) {
  el.setAttribute("role", "button");
  el.setAttribute("tabindex", "0");
  if (label) el.setAttribute("aria-label", label);
  el.addEventListener("click", onActivate);
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onActivate();
    }
  });
}

// `force` shows it even where hover works, for callers with no pointer behind
// them — keyboard activation, which otherwise lands on a bare icon with nothing
// naming it. The .show-toast rules sit outside the (hover: hover) block, so they
// apply on desktop too.
function flashToast(el, force) {
  if (supportsHover && !force) return;
  el.classList.add("show-toast");
  clearTimeout(el._toastTimer);
  el._toastTimer = setTimeout(() => el.classList.remove("show-toast"), 1200);
}

// Transitions.dev stagger reveal — marks an element as a `.t-stagger-line`
// and gives it a positional entrance delay, so lists of any length (work
// cards, resume rows) cascade in order without needing numbered CSS classes.
function markStagger(el, index) {
  el.classList.add("t-stagger-line");
  el.style.transitionDelay = `calc(var(--stagger-stagger) * ${index})`;
}

// ── Motion ──
//
// Every intro and outro on the site runs at one duration, and that duration is
// declared once — as --motion-dur in the control panel at the top of
// styles/main.css. The moves themselves are pure CSS, but the sequencing isn't:
// a panel swap has to wait for the outgoing panel's fade before it can raise
// the next one, and an overlay has to stay in the DOM until its own fade is
// over. Those waits used to be hand-written constants sitting beside the CSS
// values they were supposed to match, which is a standing invitation to change
// one and forget the other.
//
// So they're read back out of the stylesheet instead. One dial moves the CSS
// and the JS together, and neither can drift.
//
// The fallback matters: this runs at parse time, and a stylesheet that hasn't
// applied yet (or a token someone renamed) would otherwise hand every timer NaN
// and strand panels mid-transition.
function cssMs(token, fallback) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  const ms = raw.endsWith("ms") ? parseFloat(raw) : parseFloat(raw) * 1000;
  return Number.isFinite(ms) && ms > 0 ? ms : fallback;
}

const MOTION_DUR_MS = cssMs("--motion-dur", 320);

// How long to leave the outgoing panel on screen before raising the next one —
// exactly its own fade, so the two hand over without a gap or an overlap.
const STAGGER_EXIT_MS = MOTION_DUR_MS;

function revealPanel(panel) {
  // A real panel is going up, so the static placeholder has done its job. Done
  // here rather than when the content resolves, so there's no frame where the
  // skeleton is gone and the panel hasn't arrived yet.
  const skeleton = document.getElementById("contentSkeleton");
  if (skeleton) skeleton.remove();

  document.body.classList.toggle("is-404", panel.id === "panel-404");
  // The intro is the one panel that ends on the wordmark it opens with, so the
  // footer's full-width repeat of it is suppressed there and shown everywhere
  // else (see body.is-intro in main.css).
  const isIntro = panel.id === "panel-intro";
  document.body.classList.toggle("is-intro", isIntro);

  // Replay the footer's entrance alongside the panel's. Reset first so it
  // animates on every change rather than only the first — same remove/reflow/add
  // shape showAfterReflow() uses, which is why it's reused here.
  const footer = document.querySelector(".site-footer");
  if (footer) {
    footer.classList.remove("is-shown");
    // Cleared here rather than on the exit timer, so the fade-out is still on
    // screen right up to the moment the entrance replaces it. Dropping it puts
    // the lines back on the base .t-stagger-line state — which is also opacity
    // 0, so this hands over without a flash.
    footer.classList.remove("is-hiding");
    if (!isIntro) {
      // Dropping .is-shown starts a 1 -> 0 transition on the footer's lines, it
      // does not put them at 0. showAfterReflow() then re-adds the class on the
      // next frame, so without this the entrance runs from 1 back to 1 and
      // nothing appears to move. A reflow alone can't fix that: it commits the
      // style change but leaves the transition to animate smoothly from wherever
      // it is.
      //
      // Panels never hit this because they pass through `hidden` between states
      // and display:none cancels a transition outright. The footer stays in the
      // layout on every route except the intro, where body.is-intro hides it —
      // which is why the intro was the one case that looked right.
      //
      // Finishing the transitions snaps the lines to the 0 they were heading
      // for, so the replay has somewhere to travel from.
      footer.getAnimations({ subtree: true }).forEach((animation) => animation.finish());
      void footer.offsetWidth;
      showAfterReflow(footer);
    }
  }
  // Two transitions can overlap — an async deep link landing while a tab
  // switch is still inside its exit timeout — which used to leave both panels
  // stacked. Whatever else is on screen goes now, so exactly one panel is ever
  // visible regardless of how the callers raced.
  document.querySelectorAll(".panel:not([hidden])").forEach((other) => {
    if (other === panel) return;
    other.hidden = true;
    other.classList.remove("is-shown", "is-hiding", "is-hiding-slide");
  });
  panel.hidden = false;
  panel.classList.remove("is-hiding");
  panel.classList.remove("is-shown");
  void panel.offsetWidth; // force reflow so the "hidden" state is registered before flipping it on
  showAfterReflow(panel);
}

// Replays the entrance on a panel that's already on screen. Rebuilding a
// visible panel's contents in place (the Store does this on a currency change)
// inserts the new nodes at their resting state, so they simply appear — CSS
// transitions don't run for freshly inserted elements. Toggling .is-shown off
// and on around a reflow gives them a state to animate from.
function replayReveal(panel) {
  if (!panel || panel.hidden) return;
  panel.classList.remove("is-shown");
  void panel.offsetWidth;
  showAfterReflow(panel);
}

// Adds .is-shown on the next frame so the transition has a state to animate
// from. requestAnimationFrame is paused in a backgrounded tab, though — and
// this class controls *visibility*, not just motion, so relying on it alone
// can strand a panel at opacity 0 for anyone who opens the site in a
// background tab or switches away mid-rebuild. The timer is the guarantee;
// the frame callback is just what makes it look right. Adding the class twice
// is harmless.
function showAfterReflow(panel) {
  const show = () => panel.classList.add("is-shown");
  requestAnimationFrame(show);
  setTimeout(show, 120);
}

function transitionPanels(current, next) {
  // Panels share the document's scroll position (they're shown/hidden, not
  // navigated to), so without this a switch — especially Next/Previous
  // project — can land mid-page with no visible sign anything changed.
  window.scrollTo(0, 0);
  if (!current) {
    revealPanel(next);
    return;
  }
  current.classList.remove("is-shown");
  current.classList.add("is-hiding");
  // The footer leaves with the panel it was sitting under. Without this it had
  // an entrance and no exit: it held still through the outgoing panel's fade
  // and then re-entered, which read as the one part of the page that hadn't
  // changed. .is-hiding is the same quiet fade the panel's own lines take, and
  // STAGGER_EXIT_MS is that long, so the two finish together.
  const footer = document.querySelector(".site-footer");
  if (footer) {
    footer.classList.remove("is-shown");
    footer.classList.add("is-hiding");
  }
  setTimeout(() => {
    current.hidden = true;
    current.classList.remove("is-hiding");
    revealPanel(next);
  }, STAGGER_EXIT_MS);
}

// ── Overlays — the tray and the lightbox ──
//
// Both are fixed full-screen layers that fade in, lock the page behind them,
// and close on Escape or a backdrop click. This holds that shared half; each
// only supplies its own contents.

// Ordered, so Escape closes the topmost layer rather than everything at once.
const openOverlays = new Set();

// The overlay's own fade plus a small guard, so the element is only pulled from
// the DOM once that fade has definitely landed — equal-to-the-frame timing would
// occasionally cut the last frame off. Also the reason the close doesn't rely on
// transitionend alone: under prefers-reduced-motion the transition is removed
// entirely and that event never fires, which would leave the tray invisible but
// still swallowing clicks.
const OVERLAY_FADE_MS = MOTION_DUR_MS + 80;

function showOverlay(el) {
  el.hidden = false;
  // Force a reflow so the layer animates up from its offset start state
  // instead of snapping straight to its open position.
  void el.offsetWidth;
  el.classList.add("open");
  openOverlays.add(el);
  document.body.style.overflow = "hidden";
}

function hideOverlay(el) {
  if (!el || el.hidden) return;
  el.classList.remove("open");
  openOverlays.delete(el);
  // Only hand the page its scroll back once nothing is layered over it.
  if (!openOverlays.size) document.body.style.overflow = "";
  clearTimeout(el._fadeTimer);
  el._fadeTimer = setTimeout(() => {
    el.hidden = true;
  }, prefersReducedMotion ? 0 : OVERLAY_FADE_MS);
}

function closeOnBackdrop(el) {
  el.addEventListener("click", (e) => {
    if (e.target === el) hideOverlay(el);
  });
}

// One handler for both layers. Closing only the topmost is what stops Escape
// in the lightbox from also dismissing the tray underneath it.
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape" || !openOverlays.size) return;
  hideOverlay(Array.from(openOverlays).pop());
});

// ── Tray — shared bottom sheet. The cart (store.js) and the message form
// (below) are views inside the same sheet; openTray swaps between them. ──

function openTray(view, title) {
  const overlay = document.getElementById("trayOverlay");
  if (!overlay) return;
  document.getElementById("trayTitle").textContent = title;
  const sheet = document.getElementById("traySheet");
  sheet.setAttribute("aria-label", title);
  // Which view is up, published for CSS. The cart and the message form both fit
  // the column the rest of the site is measured to; a month of a calendar does
  // not, so the booking view sizes the sheet off this rather than every view
  // being pinned to the widest one's needs.
  sheet.dataset.view = view;
  document.querySelectorAll(".tray-view").forEach((v) => {
    v.hidden = v.dataset.view !== view;
  });
  showOverlay(overlay);
}

function closeTray() {
  hideOverlay(document.getElementById("trayOverlay"));
}

function initTray() {
  const overlay = document.getElementById("trayOverlay");
  if (overlay) closeOnBackdrop(overlay);

  const close = document.getElementById("trayClose");
  if (close) close.addEventListener("click", closeTray);

  const form = document.getElementById("msgForm");
  if (form) form.addEventListener("submit", handleMsgSubmit);
  const back = document.getElementById("msgBack");
  if (back) back.addEventListener("click", () => showMsgStep(Math.max(0, msgStepIndex - 1)));
}

// ── Lightbox — full-size viewer for a work item's gallery images, opened by
// clicking any gallery image. Cycles within that same project's images via
// the on-screen arrows, arrow keys, or (on touch) a swipe. ──

let lightboxImages = [];
let lightboxIndex = 0;

function renderLightboxImage() {
  const image = lightboxImages[lightboxIndex];
  if (!image) return;
  const img = document.getElementById("lightboxImage");
  img.src = safeUrl(image.src) || "";
  img.alt = image.caption || "";
  document.getElementById("lightboxCaption").textContent = image.caption || "";

  const multi = lightboxImages.length > 1;
  document.getElementById("lightboxPrev").hidden = !multi;
  document.getElementById("lightboxNext").hidden = !multi;
  document.getElementById("lightboxCounter").textContent = multi
    ? `${lightboxIndex + 1} / ${lightboxImages.length}`
    : "";
}

function openLightbox(images, startIndex) {
  const overlay = document.getElementById("lightboxOverlay");
  if (!overlay || !images || !images.length) return;
  lightboxImages = images;
  lightboxIndex = startIndex || 0;
  renderLightboxImage();
  showOverlay(overlay);
}

function closeLightbox() {
  hideOverlay(document.getElementById("lightboxOverlay"));
}

function stepLightbox(delta) {
  if (!lightboxImages.length) return;
  lightboxIndex = (lightboxIndex + delta + lightboxImages.length) % lightboxImages.length;
  renderLightboxImage();
}

function initLightbox() {
  const overlay = document.getElementById("lightboxOverlay");
  if (!overlay) return;

  closeOnBackdrop(overlay);
  document.getElementById("lightboxClose").addEventListener("click", closeLightbox);
  document.getElementById("lightboxPrev").addEventListener("click", () => stepLightbox(-1));
  document.getElementById("lightboxNext").addEventListener("click", () => stepLightbox(1));

  document.addEventListener("keydown", (e) => {
    if (overlay.hidden) return;
    if (e.key === "ArrowLeft") stepLightbox(-1);
    else if (e.key === "ArrowRight") stepLightbox(1);
  });

  // Touch swipe — left/right past a small threshold steps the gallery,
  // anything smaller is treated as a tap and left alone.
  let touchStartX = null;
  overlay.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.touches[0].clientX;
    },
    { passive: true }
  );
  overlay.addEventListener(
    "touchend",
    (e) => {
      if (touchStartX === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      touchStartX = null;
      if (Math.abs(dx) > 40) stepLightbox(dx > 0 ? -1 : 1);
    },
    { passive: true }
  );
}

// ── Message form — the multi-step (name → email → message) flow behind the FAB ──

// Handled by the Cloudflare Worker (worker/index.js), which emails the
// message from message@tylerpixel.com. Run locally with `npx wrangler dev` —
// a plain static server has no /api and sending will fail there.
const MSG_ENDPOINT = "/api/message";

const MSG_STEPS = ["name", "email", "message"];
const MSG_INPUT_IDS = { name: "msgName", email: "msgEmail", message: "msgBody" };
const MSG_PROMPTS = {
  name: "Please tell me your name.",
  email: "Please enter your email.",
  message: "Please write a message.",
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let msgStepIndex = 0;
let msgSent = false;

function setMsgError(text) {
  const el = document.getElementById("msgError");
  if (el) el.textContent = text;
}

function msgInputFor(step) {
  return document.getElementById(MSG_INPUT_IDS[step]);
}

function showMsgStep(index) {
  msgStepIndex = index;
  const step = MSG_STEPS[index];
  document.querySelectorAll("#msgForm .msg-step").forEach((s) => {
    s.hidden = s.dataset.step !== step;
  });
  const shown = document.querySelector(`#msgForm .msg-step[data-step="${step}"]`);
  // Restart the entrance animation even when revisiting a step.
  shown.classList.remove("msg-step-in");
  void shown.offsetWidth;
  shown.classList.add("msg-step-in");

  document.getElementById("msgBack").hidden = index === 0;
  document.getElementById("msgProgress").textContent = `${index + 1} of ${MSG_STEPS.length}`;
  const next = document.getElementById("msgNext");
  next.disabled = false;
  next.textContent = index === MSG_STEPS.length - 1 ? "Send" : "Next";
  setMsgError("");
  msgInputFor(step).focus();
}

function showMsgDone(title, note) {
  document.querySelectorAll("#msgForm .msg-step").forEach((s) => {
    s.hidden = s.dataset.step !== "done";
  });
  document.getElementById("msgDoneTitle").textContent = title;
  document.getElementById("msgDoneNote").textContent = note;
  document.getElementById("msgFoot").hidden = true;
  setMsgError("");
  msgSent = true;
}

// ── Booking tray — the cal.com inline embed behind "Work with me" ──
//
// Bootstrapped on first open rather than at load. cal's loader appends
// embed.js on the first Cal() call, so deferring the whole thing means a
// visitor who never asks to book never fetches a byte of it — which is the
// only reason a third-party script is acceptable on a site with no
// dependencies. Everything after the loader is cal's own snippet, kept in
// their shape so it can be diffed against their docs.
let calBooted = false;

function bootCal() {
  if (calBooted) return;
  calBooted = true;

  /* eslint-disable */
  // prettier-ignore
  (function (C, A, L) { let p = function (a, ar) { a.q.push(ar); }; let d = C.document; C.Cal = C.Cal || function () { let cal = C.Cal; let ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement("script")).src = A; cal.loaded = true; } if (ar[0] === L) { const api = function () { p(api, arguments); }; const namespace = ar[1]; api.q = api.q || []; if (typeof namespace === "string") { cal.ns[namespace] = cal.ns[namespace] || api; p(cal.ns[namespace], ar); p(cal, ["initNamespace", namespace]); } else p(cal, ar); return; } p(cal, ar); }; })(window, "https://app.cal.com/embed/embed.js", "init");
  /* eslint-enable */

  Cal("init", "30min", { origin: "https://app.cal.com" });
  Cal.config = Cal.config || {};
  Cal.config.forwardQueryParams = true;

  Cal.ns["30min"]("inline", {
    elementOrSelector: "#my-cal-inline-30min",
    // theme belongs here, not in the ui call below: this config is what cal
    // builds the iframe's query string from, and the theme has to be in the
    // URL to be true from the first paint. Passed to ui() alone it never
    // reaches the frame at all.
    config: { layout: "month_view", useSlotsViewOnSmallScreen: "true", theme: "light" },
    calLink: "tylerpixel/30min",
  });

  Cal.ns["30min"]("ui", {
    // Both themes carry the wordmark's blue — the same #0060e5 as --brand in
    // main.css. Set in both so the accent is on-brand whichever one renders,
    // rather than depending on the pin below staying put.
    cssVarsPerTheme: { light: { "cal-brand": "#0060e5" }, dark: { "cal-brand": "#0060e5" } },
    hideEventTypeDetails: false,
    layout: "month_view",
    // Pinned in the inline config above, where cal would otherwise follow the
    // visitor's OS setting. This site has no dark styles at all, so a dark
    // calendar would only ever appear inside a white sheet on a white page.
    // One line to drop the day the site grows a dark mode.
    theme: "light",
  });
}

function openBookingTray() {
  bootCal();
  openTray("book", "Work with me");
}

function openMessageTray() {
  const form = document.getElementById("msgForm");
  if (!form) return;
  // A draft in progress survives closing the tray; a sent message doesn't.
  if (msgSent) {
    form.reset();
    msgSent = false;
    msgStepIndex = 0;
  }
  document.getElementById("msgFoot").hidden = false;
  openTray("message", "Message");
  showMsgStep(msgStepIndex);
}

function handleMsgSubmit(e) {
  e.preventDefault();
  const step = MSG_STEPS[msgStepIndex];
  const value = msgInputFor(step).value.trim();

  if (!value) {
    setMsgError(MSG_PROMPTS[step]);
    msgInputFor(step).focus();
    return;
  }
  if (step === "email" && !EMAIL_RE.test(value)) {
    setMsgError("That doesn't look like an email address.");
    msgInputFor(step).focus();
    return;
  }

  setMsgError("");
  if (msgStepIndex < MSG_STEPS.length - 1) {
    showMsgStep(msgStepIndex + 1);
    return;
  }
  sendMessage();
}

async function sendMessage() {
  const next = document.getElementById("msgNext");
  next.disabled = true;
  next.textContent = "Sending…";
  try {
    const res = await fetch(MSG_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      // The endpoint is same-origin and takes no credentials; say so rather
      // than leaving it to the default.
      credentials: "omit",
      body: JSON.stringify({
        name: document.getElementById("msgName").value.trim(),
        email: document.getElementById("msgEmail").value.trim(),
        message: document.getElementById("msgBody").value.trim(),
        // Honeypot — hidden from humans, so anything in it flags a bot.
        company: document.getElementById("msgCompany").value,
      }),
    });
    if (!res.ok) {
      // The worker explains the refusal (rate limit, oversized) — pass that on
      // rather than the generic failure, when it has something to say.
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Endpoint responded ${res.status}`);
    }
    showMsgDone("Message sent", "Thanks — I'll get back to you soon.");
  } catch (err) {
    console.error("Could not send message:", err);
    setMsgError(err.message || "Couldn't send right now. Please try again.");
    next.disabled = false;
    next.textContent = "Send";
  }
}

// ── Routing ──
//
// Panels are shown and hidden rather than navigated to, so the address bar
// has to be kept in step by hand. Every tab and detail page gets a real path;
// the worker's single-page-application fallback serves index.html for all of
// them, so those URLs survive a reload or being pasted to someone.

const SITE_TITLE = "Tyler Pixel | Design Engineer";

const TAB_PATHS = {
  intro: "/",
  work: "/work",
  store: "/store",
  writing: "/writing",
  contact: "/about", // the tab's id is historical; "about" is what it's called
};
const PATH_TABS = Object.fromEntries(Object.entries(TAB_PATHS).map(([id, path]) => [path, id]));

// Filled in by initNav so page titles can use the same labels as the nav.
let tabLabels = {};

// Assigned inside initNav — lets the router drive tab selection.
let selectTab = () => {};

// Writes the URL and title for whatever was just opened. Pushing only when
// the path actually changes keeps popstate and first load from stacking
// duplicate entries, so Back always moves.
function setRoute(path, title, replace) {
  document.title = title ? `${title} | Tyler Pixel` : SITE_TITLE;
  if (location.pathname === path) return;
  if (replace) history.replaceState({}, "", path);
  else history.pushState({}, "", path);
}

// Opens whatever `pathname` names. Falls back to the intro for anything
// unrecognised — including a slug that no longer exists — rewriting the URL
// rather than leaving a dead one in the bar.
function applyRoute(pathname) {
  const segments = pathname.split("/").filter(Boolean);
  const [head, slug] = segments;

  if (!segments.length) {
    selectTab("intro");
    return;
  }

  if (slug) {
    if (head === "work") {
      const project = findProject(slug);
      if (project) {
        openWorkDetail(project);
        syncNavSelection("work");
        return;
      }
      // A slug that names nothing is a dead URL, not a reason to quietly
      // show the section list under a rewritten address.
      showNotFound();
      return;
    } else if (head === "writing") {
      const post = findPost(slug);
      if (post) {
        openPost(post);
        syncNavSelection("writing");
        return;
      }
      showNotFound();
      return;
    } else if (head === "store") {
      // Show the list straight away; store.js swaps in the product once its
      // catalogue arrives, since only it knows the slugs.
      selectTab("store", true);
      if (window.__openStoreSlug) window.__openStoreSlug(slug);
      return;
    }
  }

  const legalSlug = LEGAL_SLUGS[`/${head}`];
  if (legalSlug && !slug) {
    openLegal(legalSlug);
    return;
  }

  const tab = PATH_TABS[`/${head}`];
  if (tab) {
    selectTab(tab);
    return;
  }

  showNotFound();
}

// Any path that matches nothing. The URL is deliberately left alone — a 404
// should keep the address that produced it, so it can be read and corrected,
// and so a reload doesn't silently become the homepage.
function showNotFound() {
  const panel = document.getElementById("panel-404");
  if (!panel) {
    selectTab("intro", true);
    setRoute("/", null, true);
    return;
  }
  document.title = `404 | Tyler Pixel`;
  syncNavSelection(null); // no tab owns this page
  updateWorkNav(null);
  transitionPanels(document.querySelector(".panel:not([hidden])"), panel);
}

// ── Legal pages ──
//
// Terms, Privacy and Returns are long and almost never read, so they live in
// their own file and are fetched the first time one is opened rather than
// riding along in site-content.json on every page load.

const LEGAL_PATHS = { terms: "/terms", privacy: "/privacy", returns: "/returns" };
const LEGAL_SLUGS = Object.fromEntries(
  Object.entries(LEGAL_PATHS).map(([slug, path]) => [path, slug])
);

// Used for the tooltip on cross-links between the documents.
const LEGAL_TITLES = {
  terms: "Terms of Service",
  privacy: "Privacy Policy",
  returns: "Returns & FAQ",
};

let legalReady = null;

function loadLegal() {
  if (!legalReady) {
    // Same guard as the content file: this one is deployed rather than inlined,
    // so a missing or misrouted file comes back as the SPA fallback's HTML and
    // res.ok alone would wave it through into res.json(). openLegal() treats
    // null as "not found", which is the right outcome either way.
    legalReady = fetchJson("/data/legal.json").catch(() => null);
  }
  return legalReady;
}

async function openLegal(slug) {
  const panel = document.getElementById("panel-legal");
  if (!panel) return;
  const docs = await loadLegal();
  const doc = docs && docs[slug];
  if (!doc) {
    showNotFound();
    return;
  }

  setRoute(LEGAL_PATHS[slug], doc.title);
  panel.replaceChildren();
  panel.dataset.slug = slug;

  const back = document.createElement("a");
  back.className = "inline-link detail-back";
  back.href = TAB_PATHS.store;
  back.textContent = "\u2190 Back to Store";
  back.addEventListener("click", (e) => {
    e.preventDefault();
    selectTab("store");
  });
  markStagger(back, 0);
  panel.appendChild(back);

  const title = document.createElement("h1");
  title.className = "page-title legal-title";
  title.textContent = doc.title;
  markStagger(title, 1);
  panel.appendChild(title);

  if (doc.updated) {
    const updated = document.createElement("p");
    updated.className = "legal-updated";
    updated.textContent = `Last updated: ${doc.updated}`;
    markStagger(updated, 2);
    panel.appendChild(updated);
  }

  // One sanitised block rather than one per paragraph: the privacy policy runs
  // to a hundred of them, and staggering each would take most of a minute to
  // finish revealing.
  const body = document.createElement("div");
  body.className = "legal-body";
  setHtml(body, (doc.body || []).join(""));
  // Cross-links between the documents are real hrefs in the content, so they
  // work without JS — intercept them for in-page navigation.
  body.querySelectorAll("a[data-legal]").forEach((a) => {
    // Name the destination before initInlineLinkTooltips falls back to a
    // "Visit <hostname>" label, which is meaningless for an internal link.
    const target = LEGAL_TITLES[a.dataset.legal];
    if (target && !a.querySelector(".nav-toast")) {
      addToast(a, `Read the ${target}`);
    }
    a.addEventListener("click", (e) => {
      e.preventDefault();
      openLegal(a.dataset.legal);
    });
  });
  markStagger(body, 3);
  panel.appendChild(body);

  syncNavSelection(null); // no tab owns these
  updateWorkNav(null);
  transitionPanels(document.querySelector(".panel:not([hidden])"), panel);
  initInlineLinkTooltips(panel);
}

window.addEventListener("popstate", () => applyRoute(location.pathname));

// ── Content load ──

// Two sources, one promise. Deployed builds carry the content file inside
// index.html (scripts/inline-content.js, run by ship.sh), so it's already here
// and there's nothing to wait for; locally the tag is absent and the file is
// fetched, which is what keeps the CMS editing data/site-content.json in place.
//
// Either way this settles at parse time rather than on DOMContentLoaded, so the
// request — when there is one — is in flight while the rest of the document is
// still being parsed. store.js awaits this same promise instead of going after
// the content a second time.
// Every JSON file this site fetches goes through here. The content-type check is
// the important part: wrangler.jsonc sets not_found_handling to
// "single-page-application", so a path with no asset behind it resolves to
// index.html with a 200 rather than a 404 — res.ok on its own tells you nothing
// about whether you got the file you asked for. Matched on the media type's own
// suffix rule so "application/json" and "application/ld+json" pass while
// "text/html" can't sneak through on a substring.
function fetchJson(path) {
  return fetch(path, { credentials: "omit" }).then((res) => {
    if (!res.ok) throw new Error(`${path} responded ${res.status}`);
    const type = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (type !== "application/json" && !type.endsWith("+json")) {
      throw new Error(`${path} responded ${type || "an unknown type"}, not JSON`);
    }
    return res.json();
  });
}

function loadContent() {
  const inline = document.getElementById("siteContent");
  if (inline) {
    try {
      return Promise.resolve(JSON.parse(inline.textContent));
    } catch (err) {
      // Fall through to the network. Only reachable if the inlined blob is
      // corrupt, and only recoverable while the file is still being uploaded —
      // but a broken build should still try to render rather than give up.
      console.error("Inlined site content is unparseable, falling back to fetch:", err);
    }
  }
  return fetchJson("/data/site-content.json");
}

const contentReady = loadContent();
window.__contentReady = contentReady;

document.addEventListener("DOMContentLoaded", async () => {
  initTray();
  initLightbox();

  let content;
  try {
    content = await contentReady;
  } catch (err) {
    console.error("Error loading site content:", err);
    return;
  }

  // Exposed so the local CMS overlay (admin/cms-edit.js, never loaded in
  // production) can bind directly to the same objects this file renders
  // from instead of keeping a second, driftable copy.
  window.__siteContent = content;

  const tabLabel = (id, fallback) =>
    ((content.tabs && content.tabs.find((t) => t.id === id)) || {}).label || fallback;

  renderIdentity(content.profile);
  renderIntro(content.intro);
  renderWork(content.work, tabLabel("work", "Selected Works"));
  renderWriting(content.writing, tabLabel("writing", "Writing"));
  renderContact(content.contact, tabLabel("contact", "About"));
  renderSiteFooter(content);
  initNav(content.tabs);
  initWordmarkHome(); // after initNav — selectTab is assigned in there
  initLogoCopyMenu();
  initFab(content.contact);

  // Honour a deep link on first paint rather than always opening the intro.
  applyRoute(location.pathname);
});

// Shared header for the Selected Works, Store, Writing and Resume panels — a
// page-title on the left, optional action on the right, both styled the same.
// The action is a download link when given an href, or a plain button when
// given an onClick (the Store's cart trigger) — returns it so callers can
// keep updating it, e.g. the live cart count.
//
// `sub` switches it to the smaller in-panel variant used for "Resume" and
// "Social", which is the same row with a <p> title instead of an <h1>.
function renderHeading(panel, label, { actionHref, actionText, onClick, index = 0, sub = false } = {}) {
  const row = document.createElement("div");
  row.className = sub ? "panel-subheading" : "panel-heading";

  const title = document.createElement(sub ? "p" : "h1");
  title.className = "page-title";
  title.textContent = label;
  if (!sub) markStagger(title, index);
  row.appendChild(title);

  let action = null;
  if (actionHref || onClick) {
    action = document.createElement(onClick ? "button" : "a");
    action.className = "resume-download";
    if (onClick) {
      action.type = "button";
      action.addEventListener("click", onClick);
    } else {
      action.href = safeUrl(actionHref) || "#";
      action.download = "";
    }
    action.textContent = actionText;
    action.setAttribute("aria-label", sub ? `${actionText} ${label.toLowerCase()}` : actionText);
    if (!sub) markStagger(action, index);
    row.appendChild(action);
  }

  // The sub variant staggers as one row; the main heading staggers its parts.
  if (sub) markStagger(row, index);
  panel.appendChild(row);
  return action;
}

// Kept as a named wrapper because store.js calls it.
function renderPanelHeading(panel, label, actionHref, actionText, onClick) {
  return renderHeading(panel, label, { actionHref, actionText, onClick });
}

// Gives inline text links the same hover/tap tooltip treatment as the bottom
// nav, instead of the old icon + thick-underline.
function initInlineLinkTooltips(root) {
  root.querySelectorAll(".inline-link").forEach((a) => {
    // A link carrying the destination's logo inline already says where it
    // goes, and it says so at rest rather than on hover — a tooltip naming the
    // same hostname would be the second answer to a question nobody asked.
    // (It's also the one case touch gains from: the mark is simply there,
    // where the tooltip needed a tap to reveal it.)
    if (a.querySelector(".inline-logo")) return;
    // Markup can still ship its own tooltip content — only fall back to a
    // generic text tooltip when none is present.
    if (!a.querySelector(".nav-toast")) {
      addToast(a, `Visit ${hostLabel(a.href)}`);
    }
    a.addEventListener("click", () => flashToast(a));
  });
}

// The header wordmark goes home to the intro. Its href is real, so this only
// takes over the plain left-click — modified clicks and middle-clicks keep the
// browser's own behaviour (new tab, new window), which "#" plus preventDefault
// would have thrown away.
function initWordmarkHome() {
  const link = document.querySelector(".wordmark-home");
  if (!link) return;
  link.addEventListener("click", (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    selectTab("intro");
  });
}

// ── Copying the wordmark ──
//
// Right-clicking the header mark hands over the artwork instead of the
// browser's stock menu of things to do with a link. The mark is the one file on
// this site somebody else has a real reason to want — a talk slide, a sponsor
// row, a directory listing — and the alternative is asking me for it.
//
// The three colours are the only three the identity is allowed to be: the blue
// it wears here, and the two mono versions for when a background won't take the
// blue. Anything else is a wrong answer, so the menu offers no way to reach one.
const WORDMARK_TONES = [
  { label: "Black", value: "#000000" },
  { label: "White", value: "#FFFFFF" },
  { label: "Blue", value: "#0060E5" },
];

// How long the copied row holds its confirmation before the menu goes. Long
// enough to read two syllables, short enough that it isn't in the way.
const COPY_HOLD_MS = 900;

// Serialised from the mark already in the DOM rather than from a second copy of
// that path kept here — the same reason renderSiteFooter() clones the header's
// svg instead of shipping the geometry twice. A 6 KB path stored in two places
// is 6 KB wasted and one silent way for the file people copy to stop being the
// file on the page.
function wordmarkSvg(fill) {
  const source = document.querySelector(".wordmark svg");
  const path = source && source.querySelector("path");
  if (!path) return "";
  const box = source.getAttribute("viewBox") || "";
  const [, , width, height] = box.split(/\s+/);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ` +
    `viewBox="${box}" fill="none" role="img" aria-label="Tyler Pixel">` +
    `<path fill="${fill}" d="${path.getAttribute("d")}"/>` +
    `</svg>`
  );
}

function initLogoCopyMenu() {
  const mark = document.querySelector(".wordmark-home");
  if (!mark) return;

  const menu = document.createElement("div");
  menu.className = "ctx-menu";
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", "Tyler Pixel logo");
  menu.hidden = true;

  const group = document.createElement("div");
  group.className = "ctx-group";

  const parent = document.createElement("button");
  parent.type = "button";
  parent.className = "ctx-item";
  parent.setAttribute("role", "menuitem");
  parent.setAttribute("aria-haspopup", "true");
  parent.setAttribute("aria-expanded", "false");
  const parentLabel = document.createElement("span");
  parentLabel.className = "ctx-label";
  parentLabel.textContent = "Copy logo as SVG";
  parent.appendChild(parentLabel);
  const caret = document.createElementNS(SVG_NS, "svg");
  caret.setAttribute("class", "ctx-caret");
  caret.setAttribute("viewBox", "0 0 24 24");
  caret.setAttribute("fill", "none");
  caret.setAttribute("aria-hidden", "true");
  const chevron = document.createElementNS(SVG_NS, "path");
  chevron.setAttribute("d", "M9 5l7 7-7 7");
  chevron.setAttribute("stroke", "currentColor");
  chevron.setAttribute("stroke-width", "2.5");
  chevron.setAttribute("stroke-linecap", "round");
  chevron.setAttribute("stroke-linejoin", "round");
  caret.appendChild(chevron);
  parent.appendChild(caret);

  const sub = document.createElement("div");
  sub.className = "ctx-sub";
  sub.setAttribute("role", "menu");
  sub.setAttribute("aria-label", "Colour");
  sub.hidden = true;

  const tones = WORDMARK_TONES.map(({ label, value }) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "ctx-item";
    row.setAttribute("role", "menuitem");
    const swatch = document.createElement("span");
    swatch.className = "ctx-swatch";
    swatch.style.setProperty("--swatch", value);
    const text = document.createElement("span");
    text.className = "ctx-label";
    text.textContent = label;
    row.append(swatch, text);
    row.addEventListener("click", () => copyTone(row, text, label, value));
    sub.appendChild(row);
    return row;
  });

  group.append(parent, sub);
  menu.appendChild(group);
  document.body.appendChild(menu);

  let closeTimer = 0;

  // Hover moves focus rather than lighting a row up on its own, so "the lit
  // row" and "the row Enter takes" are the same row by construction — the
  // jump palette's arrangement, for the same reason.
  menu.addEventListener("pointerover", (e) => {
    const row = e.target instanceof Element ? e.target.closest(".ctx-item") : null;
    if (!row) return;
    row.focus();
    // Arriving on the parent opens the submenu; arriving on anything else at
    // the top level would be where it closes again, except there is nothing
    // else at the top level yet. Left as an if rather than an if/else so
    // adding a second top-level row can't silently leave the submenu open.
    if (row === parent) openSub();
  });

  function openSub() {
    if (!sub.hidden) return;
    sub.hidden = false;
    parent.setAttribute("aria-expanded", "true");
    // Measured only once it's laid out: a hidden element has no box. If it
    // would run off the right edge, it opens to the left instead.
    sub.classList.remove("flip");
    const box = sub.getBoundingClientRect();
    if (box.right > window.innerWidth - 8) sub.classList.add("flip");
  }

  function closeSub(refocus) {
    if (sub.hidden) return;
    sub.hidden = true;
    parent.setAttribute("aria-expanded", "false");
    if (refocus) parent.focus();
  }

  function open(x, y) {
    clearTimeout(closeTimer);
    resetRows();
    closeSub(false);
    menu.hidden = false;
    // Placed before the class that fades it in, so the first painted frame is
    // already in the right corner of the screen — otherwise it animates in
    // from wherever the last one was.
    const box = menu.getBoundingClientRect();
    const pad = 8;
    const left = Math.max(pad, Math.min(x, window.innerWidth - box.width - pad));
    const top = Math.max(pad, Math.min(y, window.innerHeight - box.height - pad));
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    // A frame between `hidden` coming off and `open` going on, or the two land
    // in the same style recalculation and there is nothing to transition from.
    requestAnimationFrame(() => menu.classList.add("open"));
    parent.focus();
  }

  function close(refocus) {
    if (menu.hidden) return;
    clearTimeout(closeTimer);
    menu.classList.remove("open");
    closeSub(false);
    // Held open until the fade finishes, then actually hidden — the same shape
    // as hideOverlay, and the reason the row's confirmation doesn't vanish the
    // instant the menu starts leaving.
    closeTimer = setTimeout(() => {
      menu.hidden = true;
      resetRows();
    }, MOTION_DUR_MS);
    if (refocus) mark.focus();
  }

  function resetRows() {
    tones.forEach((row, i) => {
      row.classList.remove("is-copied", "is-failed");
      row.querySelector(".ctx-label").textContent = WORDMARK_TONES[i].label;
    });
  }

  async function copyTone(row, text, label, value) {
    const svg = wordmarkSvg(value);
    let ok = false;
    try {
      // Text, not an image blob: what people want from "copy as SVG" is the
      // markup, so it can go straight into a file, an editor, or a pasteboard
      // that will render it. A blob would paste as a picture and lose that.
      await navigator.clipboard.writeText(svg);
      ok = !!svg;
    } catch (err) {
      ok = false;
    }
    row.classList.add(ok ? "is-copied" : "is-failed");
    text.textContent = ok ? "Copied" : "Couldn't copy";
    if (window.cuelume) window.cuelume.play(ok ? "success" : "whisper");
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => close(true), COPY_HOLD_MS);
  }

  mark.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    // The context-menu key fires this with no useful coordinates — 0,0 in some
    // browsers, the focused element's corner in others. Anything at or above
    // the top-left corner is treated as "the keyboard asked", and the menu is
    // hung off the mark itself instead of off the pointer.
    const keyboard = e.clientX <= 0 && e.clientY <= 0;
    const box = mark.getBoundingClientRect();
    open(keyboard ? box.left : e.clientX, keyboard ? box.bottom + 6 : e.clientY);
  });

  menu.addEventListener("keydown", (e) => {
    const inSub = !sub.hidden && sub.contains(document.activeElement);
    const rows = inSub ? tones : [parent];

    if (e.key === "Escape") {
      e.preventDefault();
      // Escape unwinds one level at a time: out of the colours, then out of
      // the menu. Closing the lot from inside the submenu would throw away a
      // step the arrow keys make you take deliberately.
      if (inSub) closeSub(true);
      else close(true);
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      const at = rows.indexOf(document.activeElement);
      rows[(at + step + rows.length) % rows.length].focus();
      return;
    }
    if (e.key === "ArrowRight" && !inSub) {
      e.preventDefault();
      openSub();
      tones[0].focus();
      return;
    }
    if (e.key === "ArrowLeft" && inSub) {
      e.preventDefault();
      closeSub(true);
      return;
    }
    if ((e.key === "Enter" || e.key === " ") && document.activeElement === parent) {
      e.preventDefault();
      openSub();
      tones[0].focus();
    }
  });

  // Dismissal. pointerdown rather than click, so the menu is gone by the time
  // whatever was underneath it reacts, and capture so a handler that stops the
  // event on its way up can't leave the menu stranded on screen.
  document.addEventListener(
    "pointerdown",
    (e) => {
      if (menu.hidden) return;
      if (e.target instanceof Node && menu.contains(e.target)) return;
      close(false);
    },
    true
  );

  // Anything that moves the page out from under it: the menu is pinned to
  // viewport coordinates that stopped being true the moment any of these fired.
  ["scroll", "resize", "blur"].forEach((type) => {
    window.addEventListener(type, () => close(false), type === "scroll" ? { passive: true } : false);
  });
}

function initFab(contact) {
  const fab = document.getElementById("navFab");
  if (!fab || !contact) return;
  fab.href = "#";
  fab.addEventListener("click", (e) => {
    e.preventDefault();
    openMessageTray();
    flashToast(fab);
  });
}

// Byline shown on writing posts — filled from profile.name in site-content.json.
let authorName = "Tyler Patterson";

function renderIdentity(profile) {
  if (!profile) return;
  authorName = profile.name || authorName;
  document.getElementById("profileRole").textContent = profile.role || "";
}

function renderSocialRow(row, social) {
  if (!row || !social) return;
  social.forEach((s) => {
    const href = safeUrl(s.url);
    if (!href) return;
    const a = document.createElement("a");
    a.href = href;
    if (!href.startsWith("mailto:")) {
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    }
    a.setAttribute("aria-label", s.name);
    // Keyed lookup into a constant map — never the content's own markup.
    a.innerHTML = SOCIAL_ICONS[s.name] || "";
    row.appendChild(a);
  });
}

// How long ago the build on the page was shipped, in the coarsest unit that
// still says something: seconds are noise on a site that ships a few times a
// week, and "3 weeks" and "21 days" carry the same information. Every step
// floors rather than rounds, so the chip can never claim a build is newer than
// it is. Days run to 31 before months take over — a month is the first unit
// that isn't exact, and holding it back that far keeps the imprecise one off
// the chip for anything shipped this month.
const MINUTE = 60000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function relativeTime(iso) {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return "";
  // A clock behind the deploy's reads as a negative age; "just now" is the
  // honest answer there, and it's what the first minute says anyway.
  const ms = Math.max(0, Date.now() - then);

  if (ms < MINUTE) return "just now";

  const mins = Math.floor(ms / MINUTE);
  if (mins < 60) return `${mins} ${mins === 1 ? "min" : "mins"} ago`;

  const hrs = Math.floor(ms / HOUR);
  if (hrs < 24) return `${hrs} ${hrs === 1 ? "hr" : "hrs"} ago`;

  const days = Math.floor(ms / DAY);
  if (days <= 31) return `${days} ${days === 1 ? "day" : "days"} ago`;

  // 30.44 and 365.25 are the average month and year — using 30 and 365 would
  // let "12 months" appear a fortnight before the first birthday.
  const months = Math.floor(days / 30.44);
  if (months < 12) return `${months} ${months === 1 ? "month" : "months"} ago`;

  const years = Math.floor(days / 365.25);
  return `${years} ${years === 1 ? "year" : "years"} ago`;
}

// The shell's footer, shown under every panel: the wordmark at full column
// width, then the hairline + build chip, then the sign-off row. Rendered here
// rather than left static in index.html because the version and the social list
// both come out of site-content.json.
function renderSiteFooter(content) {
  // Clone the header's wordmark instead of shipping the path a second time in
  // index.html — the container is aria-hidden, so the copy stays decorative.
  const mark = document.getElementById("siteFooterMark");
  const wordmark = document.querySelector(".wordmark svg");
  if (mark && wordmark && !mark.firstChild) mark.appendChild(wordmark.cloneNode(true));

  const version = document.getElementById("siteFooterVersion");
  if (version && content.version) {
    version.replaceChildren(document.createTextNode(`v${content.version}`));
    version.setAttribute("aria-label", `Version ${content.version} — view the source on GitHub`);
    version.hidden = false;

    // How old that build is, on the same hover tooltip the nav and the inline
    // links use. Recomputed on every hover rather than written once here: a
    // tab left open overnight would otherwise still be insisting the build
    // shipped two minutes ago.
    if (content.versionDate) {
      const tip = addToast(version);
      const stamp = () => {
        const ago = relativeTime(content.versionDate);
        if (!ago) return;
        tip.textContent = `Updated ${ago}`;
        // The chip's own label carries it too — the tooltip is hover-only, and
        // hover is exactly what a screen reader doesn't have.
        version.setAttribute(
          "aria-label",
          `Version ${content.version}, updated ${ago} — view the source on GitHub`
        );
      };
      stamp();
      version.addEventListener("pointerenter", stamp);
      version.addEventListener("focus", stamp);
      // Touch has no hover, so the tooltip only ever appears via flashToast —
      // which fires on the tap that's also following the link away.
      version.addEventListener("click", () => flashToast(version));
    }
  }

  const copyright = document.getElementById("siteFooterCopyright");
  if (copyright) copyright.textContent = `${new Date().getFullYear()} © Tyler Pixel`;

  const social = document.getElementById("siteFooterSocial");
  if (social) {
    social.replaceChildren();
    renderSocialRow(social, content.social);
  }

  // Now that there's something in it, let it show. It ships hidden so it can't
  // paint as a lone hairline while the rest of this is still pending.
  const footer = document.querySelector(".site-footer");
  if (!footer) return;
  footer.hidden = false;

  // Its three rows cascade in on the same stagger the panels use, so the footer
  // arrives with the page rather than snapping in under it. revealPanel() is
  // what actually triggers the reveal, on every panel change.
  [mark, footer.querySelector(".footer-rules"), footer.querySelector(".footer-meta")]
    .filter(Boolean)
    .forEach((row, i) => markStagger(row, i));
}

function renderIntro(intro) {
  const panel = document.getElementById("panel-intro");
  if (!intro || !panel) return;
  const paragraphs = intro.paragraphs || [];
  panel.replaceChildren();
  let idx = 0;
  paragraphs.forEach((p, i) => {
    const el = document.createElement("p");
    if (i === 0) el.className = "section-introduction";
    setHtml(el, p);
    markStagger(el, idx++);
    panel.appendChild(el);
  });

  if (intro.companiesLabel && intro.companies && intro.companies.length) {
    const label = document.createElement("p");
    label.textContent = intro.companiesLabel;
    markStagger(label, idx++);
    panel.appendChild(label);

    const row = document.createElement("div");
    row.className = "company-logos";
    markStagger(row, idx++);
    const track = document.createElement("div");
    track.className = "logos-track";

    // Two identical sets create a continuous, seamless marquee loop.
    [false, true].forEach((isDuplicate) => {
      const set = document.createElement("div");
      set.className = "logos-set";
      if (isDuplicate) set.setAttribute("aria-hidden", "true");
      intro.companies.forEach((c) => {
        let el;
        if (c.logo) {
          el = document.createElement("img");
          el.className = "company-logo";
          el.src = c.logo;
          el.alt = isDuplicate ? "" : c.name || "";
          // Deliberately eager. The strip is above the fold, and the marquee
          // is wider than the viewport by design — so under loading="lazy"
          // the off-screen half only starts fetching when the animation drags
          // it into view, and each logo visibly pops in mid-scroll. It's five
          // SVGs and ~15 KB (both sets share the same URLs, so it's five
          // requests, not ten); there is nothing here worth deferring.
          el.loading = "eager";
          // The logos are all different shapes, and CSS can only pin the
          // height (the width has to stay auto), so the intrinsic size rides
          // along in the content file — that's what lets the browser reserve
          // the right box before the SVG arrives. Optional: a logo added
          // through the CMS without them just renders unsized, as before.
          if (c.width && c.height) {
            el.width = c.width;
            el.height = c.height;
          }
          attachImageFallback(el, "company-logo");
        } else {
          el = emptyImageTile("company-logo");
        }
        set.appendChild(el);
      });
      track.appendChild(set);
    });
    row.appendChild(track);
    panel.appendChild(row);
  }

  // The two ways out of the intro. Until now the panel ended on the logo strip
  // and left the bottom nav as the only way on, which asks a first-time visitor
  // to work out what the five unlabelled icons are before they can go anywhere.
  const cta = document.createElement("div");
  cta.className = "intro-cta";
  markStagger(cta, idx++);

  // A real href, so middle-click and cmd-click open a tab the way they should;
  // the handler takes only the plain left click. Same arrangement as the header
  // wordmark — see initWordmarkHome.
  const browse = document.createElement("a");
  browse.className = "cta-button cta-button--trailing";
  browse.href = TAB_PATHS.work;
  browse.textContent = "Browse Portfolio";
  // Appended rather than assigned: innerHTML would take the label back out.
  // A module constant, never content — see the note on setHtml.
  browse.insertAdjacentHTML("beforeend", CHEVRON_RIGHT_ICON);
  browse.addEventListener("click", (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    // Assigned by initNav, which has always run by the time this can be clicked.
    if (selectTab) selectTab("work");
  });

  // A button, not a link: it opens the tray rather than going anywhere, so
  // there's no URL for a modified click to honour. Same treatment as the
  // Store's Cart action, which is a button for the same reason.
  const hire = document.createElement("button");
  hire.type = "button";
  hire.className = "resume-download cta-link";
  hire.textContent = "Work with me";
  hire.addEventListener("click", openBookingTray);

  cta.append(browse, hire);
  panel.appendChild(cta);

  initInlineLinkTooltips(panel);
}

// Selected Works runs newest first, ordered by a `date` that never appears on
// the page. The year chip can't do the job: it's display copy — "2022-2023",
// "2015-2019", "2018" — so it can't be compared, and two projects inside one
// year have nothing to separate them. `date` holds the single moment a project
// should be ranked by, its end or its only date, as YYYY-MM, which sorts
// correctly as a plain string with no parsing.
//
// Sorted here rather than by hand in the content file so that adding a project
// is one entry with a date on it, not an entry plus a decision about where to
// put it. A missing date sorts last, not first — a half-filled entry shouldn't
// be able to take the top of the page.
//
// Ties keep content-file order: Array.prototype.sort is stable, which is what
// separates Pinetree and Northbound Gear, both of which end in March 2022.
//
// `pinned` overrides the date entirely and holds a project at the top. It
// exists because "most recent" and "what I most want read" are not the same
// question: sort.cash started in March 2026 and is still running, so by end
// date it sits under work that finished after it started, which is the wrong
// answer for the thing currently being built. Pinned projects sort among
// themselves by date like everything else.
function sortWorkByDate(work) {
  return work.slice().sort((a, b) => {
    if (!a.pinned !== !b.pinned) return a.pinned ? -1 : 1;
    return (b.date || "").localeCompare(a.date || "");
  });
}

function renderWork(work, label) {
  const panel = document.getElementById("panel-work");
  if (!panel) return;
  // Sorted once, here, because workProjects is also what Next/Previous steps
  // through — the bar at the foot of a case study has to agree with the list.
  work = sortWorkByDate(work || []);
  workProjects = work;
  panel.replaceChildren();
  renderHeading(panel, label || "Selected Works");

  if (!work || !work.length) {
    const empty = document.createElement("p");
    empty.textContent = "Nothing here yet.";
    markStagger(empty, 1);
    panel.appendChild(empty);
    return;
  }
  const list = document.createElement("div");
  list.className = "work-list";
  work.forEach((project, i) => {
    const card = document.createElement("div");
    card.className = "work-card";

    if (project.slug === "sort-cash") {
      card.appendChild(sortCashTile("", 32));
    } else if (project.image) {
      const img = document.createElement("img");
      img.className = "work-thumb";
      setDisplaySrc(img, project.image);
      img.alt = project.title || "";
      img.loading = "lazy";
      attachImageFallback(img, "work-thumb");
      card.appendChild(img);
    } else {
      card.appendChild(emptyImageTile("work-thumb"));
    }

    const head = document.createElement("div");
    head.className = "work-head";
    head.innerHTML = `
      <p class="work-title">${esc(project.title)}</p>
      <div class="work-chips">${chipsMarkup(project)}</div>
    `;
    card.appendChild(head);

    if (project.description) {
      const desc = document.createElement("p");
      desc.className = "work-description";
      setHtml(desc, project.description);
      card.appendChild(desc);
    }

    makeActivatable(card, `View ${project.title} case study`, () => openWorkDetail(project));
    markStagger(card, i + 1);
    list.appendChild(card);
  });
  panel.appendChild(list);
}

// ── Long-form case studies ──
//
// `caseStudy` is either a single HTML string — the short entries, rendered into
// one paragraph exactly as before — or an array of blocks. A block carries any
// combination of:
//
//   kind      "meta" (the five-line header), "lede" (the one-liner) or "note"
//             (a footnote). Absent on an ordinary prose section.
//   heading   Section heading. A block with only a heading is a divider, used
//             to title the run of decisions that follows it.
//   number    Present on a decision — renders the heading as a numbered one.
//   rows      [{ label, value }] for the header block.
//   body      Paragraphs. A string is prose; a { label, text } object is a
//             labelled beat (Tension / The call / Why / The cost), whose text
//             may itself be several paragraphs.
//   figures   [{ caption, src }] — evidence for that section, placed under it
//             rather than pooled at the end of the page like `images` is.
//
// Everything is built as DOM rather than markup so the sanitiser only ever sees
// the inline HTML inside a paragraph, which is the only part the content file
// is allowed to style.

function caseParagraph(text, className) {
  const p = document.createElement("p");
  p.className = className;
  setHtml(p, text);
  return p;
}

function caseBeat(beat) {
  const wrap = document.createElement("div");
  wrap.className = "case-beat";

  if (beat.label) {
    const label = document.createElement("p");
    label.className = "beat-label";
    label.textContent = beat.label;
    wrap.appendChild(label);
  }
  [].concat(beat.text || []).forEach((text) => {
    wrap.appendChild(caseParagraph(text, "case-paragraph"));
  });
  return wrap;
}

function caseMeta(rows) {
  const dl = document.createElement("dl");
  dl.className = "case-meta";
  (rows || []).forEach((row) => {
    const dt = document.createElement("dt");
    dt.className = "meta-label";
    dt.textContent = row.label || "";
    const dd = document.createElement("dd");
    dd.className = "meta-value";
    dd.textContent = row.value || "";
    dl.append(dt, dd);
  });
  return dl;
}

// sort.cash has no product screenshots in the repository yet, so a figure with
// no `src` renders as the same empty tile a broken image falls back to, keeping
// its caption. The caption states what the image has to prove rather than
// labelling it, so it is worth writing before the export exists — it's the
// brief for the export.
//
// `alt` is kept separate from `caption` because a figure can need one without
// the other: a case-study figure captions itself and the caption is the honest
// alt, while a post's screenshots carry written alt text and no visible caption
// at all. `width`/`height` are the file's own pixel dimensions — no rule in the
// stylesheet forces an aspect ratio on these, so handing the browser the
// intrinsic one is what lets a 3:1 banner and a near-square screenshot each
// render at their own shape, reserved before the file lands. `href` points the
// figure at its source, for screenshots of something that lives elsewhere.
function caseFigure(figure) {
  const fig = document.createElement("figure");
  fig.className = "gallery-item case-figure";

  if (figure.src) {
    const img = document.createElement("img");
    img.className = "gallery-img";
    setDisplaySrc(img, figure.src);
    img.alt = figure.alt || figure.caption || "";
    img.loading = "lazy";
    img.decoding = "async";
    if (figure.width) img.width = figure.width;
    if (figure.height) img.height = figure.height;
    attachImageFallback(img, "gallery-img");

    const href = figure.href && safeUrl(figure.href);
    if (href) {
      // The image is the whole link, so its alt is the accessible name and the
      // anchor needs nothing of its own. rel is the same pair every other
      // outbound link on the site carries, whatever the content asked for.
      const link = document.createElement("a");
      link.className = "fig-link";
      link.href = href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.appendChild(img);

      // Same tooltip vocabulary as the nav and the inline links, but seated in
      // the image's own bottom corner rather than floating above it: an image
      // is a large target, and a chip centred over its top edge reads as
      // belonging to the paragraph above rather than to the picture. Without
      // it a linked image is indistinguishable from an unlinked one until the
      // cursor changes.
      //
      // aria-hidden because the alt text is already a full description and the
      // anchor's accessible name is built from its contents — appending "View
      // on X" to a thirty-word alt makes that name unwieldy for no gain.
      const tip = addToast(link, figure.linkLabel || `Visit ${hostLabel(href)}`);
      tip.classList.add("nav-toast--corner");
      tip.setAttribute("aria-hidden", "true");

      fig.appendChild(link);
    } else {
      fig.appendChild(img);
    }
  } else {
    fig.appendChild(emptyImageTile("gallery-img"));
  }

  if (figure.caption) {
    const caption = document.createElement("figcaption");
    caption.className = "gallery-caption";
    caption.textContent = figure.caption;
    fig.appendChild(caption);
  }
  return fig;
}

function caseSection(block) {
  const kind = block.kind || "";
  const section = document.createElement("section");
  section.className = `case-block${kind ? ` case-block--${kind}` : ""}${block.number ? " case-block--decision" : ""}`;

  if (kind === "meta") {
    section.appendChild(caseMeta(block.rows));
    return section;
  }

  if (block.heading) {
    // Decisions sit under the "Decisions" divider, so they are a level down.
    const heading = document.createElement(block.number ? "h3" : "h2");
    heading.className = block.number ? "decision-title" : "case-heading";
    if (block.number) {
      const n = document.createElement("span");
      n.className = "case-number";
      n.textContent = block.number;
      heading.appendChild(n);
    }
    heading.appendChild(document.createTextNode(block.heading));
    section.appendChild(heading);
  }

  const paragraphClass =
    kind === "lede" ? "case-lede" : kind === "note" ? "case-note" : "case-paragraph";

  (block.body || []).forEach((entry) => {
    section.appendChild(
      typeof entry === "string" ? caseParagraph(entry, paragraphClass) : caseBeat(entry)
    );
  });

  (block.figures || []).forEach((figure) => section.appendChild(caseFigure(figure)));

  return section;
}

// Past this many blocks the entrance would take longer to finish than the
// reader takes to start reading, so the tail all arrives together.
const CASE_STAGGER_CAP = 12;

// Returns the next stagger index, so the visit/cross-link rows after the case
// study keep animating in sequence with it.
function buildCaseStudy(panel, blocks, startIndex) {
  blocks.forEach((block, i) => {
    const section = caseSection(block);
    markStagger(section, Math.min(startIndex + i, CASE_STAGGER_CAP));
    panel.appendChild(section);
  });
  return Math.min(startIndex + blocks.length, CASE_STAGGER_CAP + 1);
}

// Builds the case-study markup for a project into an already-emptied panel.
// Split out from openWorkDetail so the Next/Previous transition can rebuild
// the panel's content mid-animation, after the old content has slid out.
function buildWorkDetailContent(panel, project) {
  panel.replaceChildren();
  panel.dataset.slug = project.slug || ""; // read by the local CMS overlay only

  const back = document.createElement("a");
  back.className = "inline-link detail-back";
  back.href = "#";
  back.textContent = "← Back to Selected Works";
  back.addEventListener("click", (e) => {
    e.preventDefault();
    transitionPanels(panel, document.getElementById("panel-work"));
    updateWorkNav(null);
    setRoute(TAB_PATHS.work, tabLabels.work);
  });
  markStagger(back, 0);
  panel.appendChild(back);

  let hero;
  if (project.slug === "sort-cash") {
    // Same tile as the work-list thumb, not a scaled-up variant.
    hero = sortCashTile("detail-img", 32);
  } else if (project.image) {
    hero = document.createElement("img");
    hero.className = "detail-img";
    setDisplaySrc(hero, project.image);
    hero.alt = project.title || "";
    attachImageFallback(hero, "detail-img");
  } else {
    hero = emptyImageTile("detail-img");
  }
  markStagger(hero, 1);
  panel.appendChild(hero);

  const head = document.createElement("div");
  head.className = "work-head";
  head.innerHTML = `
    <p class="work-title detail-title">${esc(project.title)}</p>
    <div class="work-chips">${chipsMarkup(project)}</div>
  `;
  markStagger(head, 2);
  panel.appendChild(head);

  let idx = 3;

  // A cites block is held back and appended at the very foot of the page,
  // below the gallery and below the CTAs — the sources close the page out, so
  // nothing actionable sits underneath them.
  let citeBlocks = [];

  if (Array.isArray(project.caseStudy)) {
    // Long form. No `.work-detail-body`, so the CMS's rich-text overlay stays
    // off these — a structured case study is edited in the content file.
    citeBlocks = project.caseStudy.filter((block) => block.kind === "cites");
    idx = buildCaseStudy(
      panel,
      project.caseStudy.filter((block) => block.kind !== "cites"),
      idx
    );
  } else {
    const body = document.createElement("p");
    body.className = "work-detail-body"; // hook for the local CMS overlay
    setHtml(body, project.caseStudy || project.description || "");
    markStagger(body, idx++);
    panel.appendChild(body);
  }

  if (project.images && project.images.length) {
    const gallery = document.createElement("div");
    gallery.className = "work-gallery";
    project.images.forEach((image, i) => {
      const figure = document.createElement("figure");
      figure.className = "gallery-item";

      const img = document.createElement("img");
      img.className = "gallery-img";
      setDisplaySrc(img, image.src);
      img.alt = image.caption || project.title || "";
      img.loading = "lazy";
      attachImageFallback(img, "gallery-img");
      makeActivatable(img, `Enlarge image${image.caption ? `: ${image.caption}` : ""}`, () =>
        openLightbox(project.images, i)
      );
      figure.appendChild(img);

      if (image.caption) {
        const caption = document.createElement("figcaption");
        caption.className = "gallery-caption";
        caption.textContent = image.caption;
        figure.appendChild(caption);
      }

      markStagger(figure, idx++);
      gallery.appendChild(figure);
    });
    panel.appendChild(gallery);
  }

  const visitHref = project.link && safeUrl(project.link.url);
  if (visitHref) {
    const visit = document.createElement("p");
    visit.className = "link-row";
    // A filled CTA rather than a text link — this is the one outbound action on
    // a case study, so it gets the same button the 404's back-link uses, with
    // the chevron trailing the label instead of leading it. No .inline-link,
    // which means no hover tooltip: a button states its own destination.
    const a = document.createElement("a");
    a.className = "cta-button cta-button--trailing";
    a.href = visitHref;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = project.link.label || "Visit site";
    a.insertAdjacentHTML("beforeend", CTA_ARROW_ICON); // constant markup
    visit.appendChild(a);
    markStagger(visit, idx++);
    panel.appendChild(visit);
  }

  // Cross-link into the matching post on Writing, when there is one.
  const post = project.writingSlug && findPost(project.writingSlug);
  if (post) {
    const row = document.createElement("p");
    row.className = "link-row";
    const a = document.createElement("a");
    a.className = "inline-link";
    a.href = "#";
    a.textContent = `Read “${post.title}” →`;
    a.addEventListener("click", (e) => {
      e.preventDefault();
      openPost(post);
    });
    row.appendChild(a);
    markStagger(row, idx++);
    panel.appendChild(row);
  }

  // Sources last — below every CTA above them.
  if (citeBlocks.length) buildCaseStudy(panel, citeBlocks, idx);
}

// How far (px) the Next/Previous project transition slides content horizontally.
const WORK_NAV_SLIDE_PX = 28;

// Paging between case studies moves at the same speed as everything else — what
// it changes is the *spacing* of the cascade, not the pace of any line in it.
// A gallery-heavy project can be dozens of staggered lines deep, and at the
// standard 40ms gap the last of them wouldn't have started moving by the time
// the panel is rebuilt one --motion-dur later; they'd vanish where they stood.
// `.t-stagger--tight` closes the gap (see --stagger-gap-tight in the control
// panel) so the whole cascade fits inside that one window, every line still
// travelling at the site's own speed.
const WORK_NAV_EXIT_MS = MOTION_DUR_MS;

// Bumped on every openWorkDetail call so a pending directional rebuild (see
// below) can tell it's been superseded — by a second quick Next/Previous
// click, or by navigating away entirely — and skip instead of landing late.
let workDetailToken = 0;

// Work-item case-study page — not a nav tab, only reachable by clicking a
// work card (or the Next/Previous project buttons, which pass `direction`).
function openWorkDetail(project, direction) {
  const panel = document.getElementById("panel-work-detail");
  if (!panel) return;

  const isCurrent = panel === document.querySelector(".panel:not([hidden])");

  if (direction && isCurrent) {
    // Already reading a case study and paging to a neighbor: slide the
    // current content out toward the side opposite the clicked button, then
    // rebuild the panel for the new project and slide it in from the side
    // the button points to — both moves share one direction, like a
    // filmstrip sliding past rather than two separate fades. `t-stagger--h-only`
    // strips the normal vertical rise + blur for this one transition so it
    // reads as pure left/right motion, not a diagonal entrance, and
    // `t-stagger--tight` closes up the per-line gap so the whole cascade fits
    // inside the one --motion-dur before the rebuild.
    window.scrollTo(0, 0);
    const exitX = direction === "prev" ? WORK_NAV_SLIDE_PX : -WORK_NAV_SLIDE_PX;
    const enterX = -exitX;
    const exitMs = prefersReducedMotion ? 0 : WORK_NAV_EXIT_MS;
    const token = ++workDetailToken;
    const navRow = document.getElementById("workNavRow");

    panel.style.setProperty("--stagger-slide-x", `${exitX}px`);
    panel.classList.add("t-stagger--h-only", "t-stagger--tight");
    panel.classList.remove("is-shown");
    panel.classList.add("is-hiding-slide");
    setRoute(`/work/${project.slug || ""}`, project.title);
    // The Next/Previous labels are about to change to the next pair of
    // neighbors — cross-fade them instead of letting the text snap.
    if (navRow) navRow.classList.add("work-nav--fading");

    setTimeout(() => {
      // Superseded by another Next/Previous click, or the panel was
      // navigated away from (e.g. "Back to Selected Works") mid-exit.
      if (token !== workDetailToken || panel.hidden) return;
      panel.classList.remove("is-hiding-slide");
      buildWorkDetailContent(panel, project);
      panel.style.setProperty("--stagger-slide-x", `${enterX}px`);
      void panel.offsetWidth; // force reflow so the enter offset registers before animating to 0
      requestAnimationFrame(() => {
        panel.classList.add("is-shown");
      });
      initInlineLinkTooltips(panel);
      updateWorkNav(project);
      if (navRow) requestAnimationFrame(() => navRow.classList.remove("work-nav--fading"));
    }, exitMs);
    return;
  }

  workDetailToken++; // invalidate any directional rebuild still pending
  setRoute(`/work/${project.slug || ""}`, project.title);
  buildWorkDetailContent(panel, project);
  // Clear any leftover state from a previous Next/Previous transition so a
  // plain (card-click) open always reveals straight up, on the standard cascade.
  panel.style.removeProperty("--stagger-slide-x");
  panel.classList.remove("t-stagger--h-only", "t-stagger--tight");
  // Captured before the swap: transitionPanels only spends an exit on an
  // outgoing panel if there is one, and the row's entrance has to wait exactly
  // that long so it rises with the case study rather than over the list behind
  // it. A deep link straight into /work/<slug> has nothing to fade, so it's 0.
  const outgoing = document.querySelector(".panel:not([hidden])");
  transitionPanels(outgoing, panel);
  initInlineLinkTooltips(panel);
  updateWorkNav(project, outgoing && outgoing !== panel ? STAGGER_EXIT_MS : 0);
}

// Next/Previous project row, shown above the bottom nav only on a work-item
// case study — lets you page straight to the neighboring project without
// backing out to the Selected Works list first.
// Raising and lowering the Next/Previous row. `hidden` is what actually keeps
// the buttons out of the tab order on every route that isn't a case study, but
// display:none is not a state a transition can travel across — so showing is
// two steps (into the layout, then flip .is-up on the next frame, giving the
// entrance somewhere to come from) and hiding is the reverse, holding the
// element in the layout until its own fade is over. Same shape as
// showAfterReflow() and the overlays above.
// One timer for both directions — the row is either arriving or leaving, never
// both, and sharing it means a reversal cancels whatever was pending instead of
// landing on top of it.
let workNavTimer;

// `delay` covers the case that prompted all this: opening a case study from the
// work list fades the *outgoing* panel first, so the case study itself isn't on
// screen for another --motion-dur. Raising the row immediately would have it
// arrive over the list it's leaving. Paging Next/Previous passes no delay — the
// panel is already up.
function showWorkNav(row, delay) {
  clearTimeout(workNavTimer);
  // Already up: this is a Next/Previous page, not an arrival. Replaying the
  // entrance would fight the label cross-fade that transition runs.
  if (!row.hidden && row.classList.contains("is-up")) return;
  const raise = () => {
    row.hidden = false;
    void row.offsetWidth; // so the entrance has an offset state to travel from
    // The timer is the guarantee, the frame callback is what makes it look
    // right — rAF is paused in a backgrounded tab, and this class carries
    // visibility, not just motion.
    const up = () => row.classList.add("is-up");
    requestAnimationFrame(up);
    setTimeout(up, 120);
  };
  // Not gated on prefers-reduced-motion: this is sequencing, not motion. The
  // panel swap takes --motion-dur either way, so skipping the wait would just
  // put the row on screen before the case study it belongs to.
  if (delay > 0) workNavTimer = setTimeout(raise, delay);
  else raise();
}

function hideWorkNav(row) {
  // Before the early return, so a raise that hasn't fired yet is cancelled
  // rather than landing on a route the row doesn't belong to.
  clearTimeout(workNavTimer);
  if (row.hidden) return;
  row.classList.remove("is-up");
  workNavTimer = setTimeout(
    () => {
      row.hidden = true;
    },
    prefersReducedMotion ? 0 : MOTION_DUR_MS
  );
}

function updateWorkNav(project, showDelay) {
  const row = document.getElementById("workNavRow");
  const prevBtn = document.getElementById("workPrevBtn");
  const nextBtn = document.getElementById("workNextBtn");
  if (!row || !prevBtn || !nextBtn) return;

  const i = project ? workProjects.indexOf(project) : -1;
  if (i === -1 || workProjects.length < 2) {
    hideWorkNav(row);
    return;
  }

  const prevProject = workProjects[(i - 1 + workProjects.length) % workProjects.length];
  const nextProject = workProjects[(i + 1) % workProjects.length];

  // Labels before the fade-in, so the new pair is what animates in.
  prevBtn.querySelector(".work-nav-label").textContent = prevProject.title;
  nextBtn.querySelector(".work-nav-label").textContent = nextProject.title;
  prevBtn.setAttribute("aria-label", `Previous project: ${prevProject.title}`);
  nextBtn.setAttribute("aria-label", `Next project: ${nextProject.title}`);
  prevBtn.onclick = () => openWorkDetail(prevProject, "prev");
  nextBtn.onclick = () => openWorkDetail(nextProject, "next");

  showWorkNav(row, showDelay);
}

// Writing posts are looked up by slug from both the Writing list and any work
// case study that cross-links to one.
let writingPosts = [];

function findPost(slug) {
  return writingPosts.find((p) => p.slug === slug) || null;
}

// Work projects are looked up by slug from About-page mentions that deep-link
// into their case studies.
let workProjects = [];

function findProject(slug) {
  return workProjects.find((w) => w.slug === slug) || null;
}

// Assigned inside initNav — lets links outside the nav (e.g. About-page work
// mentions) move the tab highlight to the panel they opened.
let syncNavSelection = () => {};

function renderWriting(writing, label) {
  const panel = document.getElementById("panel-writing");
  if (!panel) return;
  panel.replaceChildren();
  renderHeading(panel, label || "Writing");

  writingPosts = (writing && writing.posts) || [];

  if (!writingPosts.length) {
    const empty = document.createElement("div");
    empty.className = "writing-empty";
    empty.innerHTML = `
      <span class="blank-icon">${WRITING_EMPTY_ICON}</span>
      <p class="blank-title">${esc((writing && writing.disclaimer) || "Coming soon")}</p>
      <p class="blank-sub">${esc((writing && writing.subtitle) || "")}</p>
    `;
    markStagger(empty, 1);
    panel.appendChild(empty);
    return;
  }

  const list = document.createElement("div");
  list.className = "writing-list";
  writingPosts.forEach((post, i) => {
    const item = document.createElement("div");
    item.className = "writing-item";

    // Optional banner above the title, the same shape and treatment a work
    // card's thumbnail gets. A post without one still reads correctly — the row
    // just starts at the title.
    if (post.thumb) {
      const thumb = document.createElement("img");
      thumb.className = "writing-thumb";
      setDisplaySrc(thumb, post.thumb);
      // Decorative by default: the row is already labelled "Read <title>" by
      // makeActivatable, so a described thumbnail would announce twice.
      thumb.alt = post.thumbAlt || "";
      thumb.loading = "lazy";
      thumb.decoding = "async";
      attachImageFallback(thumb, "writing-thumb");
      item.appendChild(thumb);
    }

    const head = document.createElement("div");
    head.className = "item-head";
    head.innerHTML = `
      <p class="post-title">${esc(post.title)}</p>
      ${post.date ? `<span class="work-chip work-chip--year">${esc(post.date)}</span>` : ""}
    `;
    item.appendChild(head);

    if (post.summary) {
      const summary = document.createElement("p");
      summary.className = "post-summary";
      setHtml(summary, post.summary);
      item.appendChild(summary);
    }

    makeActivatable(item, `Read ${post.title}`, () => openPost(post));
    markStagger(item, i + 1);
    list.appendChild(item);
  });
  panel.appendChild(list);
}

// Post page — not a nav tab, reachable from the Writing list or a work case study.
function openPost(post) {
  const panel = document.getElementById("panel-writing-detail");
  if (!panel) return;
  setRoute(`/writing/${post.slug || ""}`, post.title);
  panel.replaceChildren();
  panel.dataset.slug = post.slug || ""; // read by the local CMS overlay only

  const back = document.createElement("a");
  back.className = "inline-link detail-back";
  back.href = "#";
  back.textContent = "← Back to Writing";
  back.addEventListener("click", (e) => {
    e.preventDefault();
    transitionPanels(panel, document.getElementById("panel-writing"));
    setRoute(TAB_PATHS.writing, tabLabels.writing);
  });
  markStagger(back, 0);
  panel.appendChild(back);

  let idx = 1;

  // Same image the Writing list uses as the row's banner, carried through as
  // the post's hero so the two views open on the same picture. Shares
  // .detail-img with a case study's hero rather than restating its
  // sizing — a post's hero is the same element in a different panel.
  if (post.thumb) {
    const hero = document.createElement("img");
    hero.className = "detail-img post-hero";
    setDisplaySrc(hero, post.thumb);
    // The title sits directly beneath it, so a described hero would say the
    // same thing twice. thumbAlt overrides when the image carries meaning the
    // title does not.
    hero.alt = post.thumbAlt || "";
    hero.decoding = "async";
    attachImageFallback(hero, "detail-img");
    markStagger(hero, idx++);
    panel.appendChild(hero);
  }

  const head = document.createElement("div");
  head.className = "post-head";
  head.innerHTML = `
    <p class="work-title detail-title">${esc(post.title)}</p>
    <p class="post-meta">By ${esc(authorName)}${post.date ? ` · ${esc(post.date)}` : ""}</p>
  `;
  markStagger(head, idx++);
  panel.appendChild(head);

  // A post is either a plain run of paragraphs or the same block structure a
  // long-form case study uses — an object anywhere in the body means the
  // latter, since a plain post's entries are all strings.
  const body = post.body || [];
  if (body.some((entry) => entry && typeof entry === "object")) {
    buildCaseStudy(panel, body, idx);
  } else {
    body.forEach((text, i) => {
      const p = document.createElement("p");
      p.className = "post-paragraph";
      setHtml(p, text);
      markStagger(p, idx + i);
      panel.appendChild(p);
    });
  }

  transitionPanels(document.querySelector(".panel:not([hidden])"), panel);
  initInlineLinkTooltips(panel);
  updateWorkNav(null);
}

function renderContact(contact, label) {
  const panel = document.getElementById("panel-contact");
  if (!contact || !panel) return;
  panel.replaceChildren();

  renderHeading(panel, label || "About");
  let idx = 1;

  if (contact.portrait) {
    // The avatar is what's on show; the photograph is what hovering reveals.
    // Both live in one fixed 96px box, so the swap moves nothing around it.
    const frame = document.createElement("div");
    frame.className = "about-portrait";

    const portrait = document.createElement("img");
    portrait.className = "portrait-img";
    portrait.src = contact.portrait;
    portrait.alt = contact.portraitAlt || "";
    // Square source, rendered in a 96px square box — the attributes just
    // reserve it so the copy below doesn't jump when the file lands.
    portrait.width = 96;
    portrait.height = 96;
    // The photo is optional — if it hasn't been added yet, drop it rather than
    // leaving a broken-image box in the middle of the story.
    portrait.addEventListener("error", () => frame.remove());
    frame.appendChild(portrait);

    // The reveal: the drawing gives way to the face behind it.
    if (contact.portraitHover) {
      const alt = document.createElement("img");
      alt.className = "portrait-img portrait-img--alt";
      // Decorative: it's the same person the image above it already names, and
      // announcing a second portrait would just be a duplicate.
      alt.alt = "";
      alt.setAttribute("aria-hidden", "true");
      alt.src = contact.portraitHover;
      alt.width = 96;
      alt.height = 96;
      frame.appendChild(alt);

      // Hover does this on its own in CSS. Touch has no hover, so there it's a
      // tap to turn the picture over and a second tap to turn it back — the
      // class is the same state the :hover rule sets, so both routes land on
      // one appearance. Bound only where hover is missing: on a pointer device
      // a click would fight the hover it's already under.
      if (!supportsHover) {
        frame.addEventListener("click", () => frame.classList.toggle("is-flipped"));
      }
    }

    markStagger(frame, idx++);
    panel.appendChild(frame);
  }

  (contact.about || []).forEach((text) => {
    const p = document.createElement("p");
    p.className = "about-paragraph";
    setHtml(p, text);
    // Mentions of Selected Works are marked with data-work="<slug>" in the
    // content JSON — wire them straight into the matching case study. The
    // toast is added here so initInlineLinkTooltips doesn't fall back to a
    // generic "Visit <host>" label for these internal links.
    p.querySelectorAll("a[data-work]").forEach((a) => {
      const project = findProject(a.dataset.work);
      if (!project) {
        a.replaceWith(...a.childNodes);
        return;
      }
      a.href = "#";
      addToast(a, `View ${project.title}`);
      a.addEventListener("click", (e) => {
        e.preventDefault();
        openWorkDetail(project);
        syncNavSelection("work");
      });
    });
    markStagger(p, idx++);
    panel.appendChild(p);
  });

  if (contact.resume && contact.resume.length) {
    renderHeading(panel, "Resume", {
      actionHref: contact.resumeFile,
      actionText: "Download",
      index: idx++,
      sub: true,
    });

    const list = document.createElement("div");
    list.className = "resume-list";
    contact.resume.forEach((r, i) => {
      const item = document.createElement("div");
      item.className = "resume-item";
      item.innerHTML = `
        <p class="resume-title">${esc(r.title)}</p>
        <p class="resume-meta"><span class="resume-place">${esc(r.place)}</span> · <span class="resume-date">${esc(r.date)}</span></p>
      `;
      markStagger(item, idx + i);
      list.appendChild(item);
    });
    idx += contact.resume.length;
    panel.appendChild(list);
  }

  // The panel ends on the resume. Its Social section and its sign-off row (the
  // copyright plus the build chip) both moved to the site footer, which renders
  // under this panel like every other one — see renderSiteFooter.

  initInlineLinkTooltips(panel);
}

function initNav(tabs) {
  const nav = document.getElementById("navTabs");
  const indicator = document.getElementById("navInd");
  if (!nav || !tabs || !tabs.length) return;

  // Past the guard on purpose: with no tabs to build, the placeholders should
  // stay rather than leave an empty pill behind. Removed before the indicator
  // is positioned below, which measures the nav's children.
  nav.querySelectorAll(".nav-skeleton").forEach((el) => el.remove());

  // Now that there are tabs to name, the corner panel has something true to
  // say. CSS still decides whether the viewport has room for it.
  const settings = document.getElementById("settings");
  if (settings) settings.hidden = false;

  // Depresses every cap bound to the key just pressed — the arrows in the
  // corner panel, the digits in the jump tray — so whichever of the two is on
  // screen answers the press and reads as the reason the page moved.
  function flashShortcutKey(key) {
    document.querySelectorAll(`.shortcuts-key[data-key="${key}"]`).forEach((cap) => {
      cap.classList.add("is-pressed");
      clearTimeout(cap._pressTimer);
      cap._pressTimer = setTimeout(() => cap.classList.remove("is-pressed"), 180);
    });
  }

  // ── The jump tray: what ⌘K opens ──
  // One row per tab, then one for the message form — the bar's own contents in
  // the bar's own order, so the digits are just "how far along the bar it is".
  // Built here rather than written into index.html for the same reason the tabs
  // are: the labels are content, and a hardcoded copy would drift from them.
  const jumpList = document.getElementById("jumpList");
  if (jumpList) {
    // Only the rows — the thumb is markup and has to outlive a rebuild, which
    // replaceChildren() would take with it.
    jumpList.querySelectorAll(".jump-row").forEach((r) => r.remove());
    const rows = tabs.map((tab, i) => ({ digit: String(i + 1), label: tab.label, tab: tab.id }));
    rows.push({ digit: String(tabs.length + 1), label: "Message", tab: null });
    rows.forEach(({ digit, label, tab }, i) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "jump-row";
      row.dataset.jump = digit;

      // Both weights, stacked, exactly as the bar's own tabs carry them — so a
      // row lights up the same way a tab does when it's the one you're on.
      const icon = document.createElement("span");
      icon.className = "jump-icon";
      const line = document.createElement("span");
      line.className = "nav-icon nav-icon--line";
      const solid = document.createElement("span");
      solid.className = "nav-icon nav-icon--solid";
      if (tab) {
        // Keyed lookups into constant maps — never the content's own markup.
        line.innerHTML = NAV_ICONS[tab] || "";
        solid.innerHTML = NAV_ICONS_FILL[tab] || "";
      } else {
        // Clone the FAB's glyph rather than ship that path a second time; only
        // the fill weight has no original to clone.
        const fabIcon = document.querySelector(".fab svg");
        if (fabIcon) line.appendChild(fabIcon.cloneNode(true));
        solid.innerHTML = MESSAGE_ICON_FILL;
      }
      icon.append(line, solid);

      const name = document.createElement("span");
      name.className = "jump-label";
      // textContent, not innerHTML — the label is content-file copy.
      name.textContent = label;

      const cap = document.createElement("span");
      cap.className = "shortcuts-key";
      cap.dataset.key = digit;
      cap.textContent = digit;

      row.append(icon, name, cap);
      row.addEventListener("click", () => runJump(Number(digit)));
      // Hovering moves focus rather than lighting the row on its own. One
      // notion of "the active row" for both input methods, so the thumb, the
      // solid glyph and what Enter would take can never point at three
      // different rows.
      row.addEventListener("mouseenter", () => {
        row.focus();
        setActiveRow(row);
      });
      // Catches the ways in that don't go through the two calls above — Tab,
      // and a click landing on a row.
      row.addEventListener("focus", () => setActiveRow(row));
      // Rows join the site's stagger like any other list of content.
      markStagger(row, i);
      jumpList.appendChild(row);
    });
  }

  // Puts the block behind a row and marks the row so its contents invert. The
  // block doesn't travel, so this is only ever a placement.
  const jumpFocus = document.getElementById("jumpFocus");
  function setActiveRow(row) {
    if (!jumpList) return;
    jumpList.querySelectorAll(".jump-row.is-active").forEach((r) => {
      if (r !== row) r.classList.remove("is-active");
    });
    if (!row) {
      if (jumpFocus) jumpFocus.classList.remove("is-on");
      return;
    }
    row.classList.add("is-active");
    if (!jumpFocus) return;
    // Inset 2px inside the row on every side.
    jumpFocus.style.width = `${row.offsetWidth - 4}px`;
    jumpFocus.style.height = `${row.offsetHeight - 4}px`;
    jumpFocus.style.transform = `translate(${row.offsetLeft + 2}px, ${row.offsetTop + 2}px)`;
    jumpFocus.classList.add("is-on");
  }

  // Walking the palette. Bound to the list rather than the document because
  // the keys only mean this while focus is inside it, and a row is a <button>,
  // so the event reaches here by bubbling from whichever one holds focus.
  //
  // Enter and Space are left alone — a button already answers both, and
  // claiming them here would fire the row twice.
  if (jumpList) {
    jumpList.addEventListener("keydown", (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      const rows = Array.from(jumpList.querySelectorAll(".jump-row"));
      if (!rows.length) return;
      const at = rows.indexOf(document.activeElement);

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        // Otherwise the arrows scroll the list out from under the selection.
        e.preventDefault();
        const step = e.key === "ArrowDown" ? 1 : -1;
        // Wraps, like the arrow keys do along the bar itself.
        const next = rows[((at === -1 ? 0 : at) + step + rows.length) % rows.length];
        if (next) {
          next.focus();
          // Said outright rather than left to next's focus handler: this knows
          // which row it moved to, and the thumb shouldn't depend on a focus
          // event to find out. setActiveRow is idempotent, so the handler
          // firing too is harmless.
          setActiveRow(next);
        }
        return;
      }

      // Right goes *into* the row — the same direction the row's own chevron
      // would point, and the counterpart to stepping down the list.
      if (e.key === "ArrowRight" && at > -1) {
        e.preventDefault();
        rows[at].click();
      }
    });
  }

  const trayOverlay = document.getElementById("trayOverlay");
  const jumpView = document.querySelector('.tray-view[data-view="jump"]');

  // The sheet is shared with the cart and the message form, so "is the tray
  // up?" isn't the question — "is the tray up showing *this* view?" is.
  //
  // Asks openOverlays rather than the hidden attribute: hideOverlay clears the
  // attribute only once the fade has run, so for 400ms after a close the tray
  // still reads as open. Long enough that ⌘K twice in a row would close it and
  // then refuse to reopen it.
  function jumpTrayOpen() {
    return !!trayOverlay && openOverlays.has(trayOverlay) && !!jumpView && !jumpView.hidden;
  }

  function openJumpTray() {
    openTray("jump", "Jump to");
    // The rows cascade in on the site's own stagger, the same entrance every
    // other list of content gets. Replayed on each open: the rows are built
    // once and stay in the DOM, so without resetting the state they'd simply
    // be sitting there already revealed the second time.
    if (jumpList) replayReveal(jumpList);
    // Land on the first row so the palette is immediately walkable by Tab, and
    // so a screen reader announces something other than the dialog's own name.
    const first = jumpList && jumpList.querySelector(".jump-row");
    if (first) {
      setActiveRow(first);
      first.focus();
    }
  }

  // What a row does, whether it was clicked or reached by its digit — one path,
  // so the palette and the bare shortcut can't drift apart.
  function runJump(digit) {
    const tabButtons = Array.from(nav.querySelectorAll(".nav-tab"));
    // Past the last tab is the FAB. The message form is another view of the
    // same sheet, so this swaps what's inside the tray rather than closing it
    // and opening it again.
    if (digit === tabButtons.length + 1) {
      openMessageTray();
      return;
    }
    const target = tabButtons[digit - 1];
    if (!target) return;
    if (jumpTrayOpen()) {
      // The row holding focus is about to be hidden. Hand it to the tab the
      // palette just took you to rather than letting it drop to the body,
      // which would send the next Tab back to the top of the page.
      closeTray();
      jumpToTab(target, target);
      return;
    }
    jumpToTab(target, document.activeElement);
  }

  // ⌘K — its own listener because every other shortcut here requires *no*
  // modifier, and this one is nothing but. Toggles, so the key that opened the
  // palette also dismisses it.
  document.addEventListener("keydown", (e) => {
    if (e.defaultPrevented) return;
    if (e.key !== "k" && e.key !== "K") return;
    if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
    if (jumpTrayOpen()) {
      e.preventDefault();
      closeTray();
      return;
    }
    // The cart, the message form and the lightbox each own the screen while
    // they're up; swapping the sheet out from under one would lose whatever is
    // in it, a half-typed message included.
    if (openOverlays.size) return;
    // Only claim the key once there's somewhere to go.
    if (!nav.querySelector(".nav-tab")) return;
    e.preventDefault();
    flashShortcutKey("k");
    openJumpTray();
  });

  tabLabels = Object.fromEntries(tabs.map((t) => [t.id, t.label]));


  tabs.forEach((tab, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "nav-tab";
    btn.dataset.tab = tab.id;
    btn.id = `tab-${tab.id}`;
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-label", tab.label);
    btn.setAttribute("aria-selected", i === 0 ? "true" : "false");
    // role="tablist"/"tab" is only valid ARIA if the tabs actually point at
    // tabpanels — without this pairing a screen reader announces a tab widget
    // whose panels it can't find.
    btn.setAttribute("aria-controls", `panel-${tab.id}`);
    const panel = document.getElementById(`panel-${tab.id}`);
    if (panel) {
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", `tab-${tab.id}`);
    }
    // Icons come from the constant maps; only the label is content. Both
    // weights are rendered and CSS shows one — see .nav-icon.
    btn.innerHTML =
      `<span class="nav-icon nav-icon--line">${NAV_ICONS[tab.id] || ""}</span>` +
      `<span class="nav-icon nav-icon--solid">${NAV_ICONS_FILL[tab.id] || ""}</span>` +
      `<span class="nav-toast">${esc(tab.label)}</span>`;
    btn.addEventListener("click", () => {
      selectPanel(tab.id);
      flashToast(btn);
    });
    nav.appendChild(btn);
  });

  // `replace` swaps the URL instead of pushing a new entry — used by hover
  // navigation, so passing over the nav doesn't fill the back button.
  function selectPanel(id, keepUrl, replace) {
    const active = nav.querySelector(`.nav-tab[data-tab="${id}"]`);
    if (!active) return;

    // Guard on the visible panel, not on aria-selected: a detail panel keeps its
    // parent tab selected, so checking aria first would swallow the tap that's
    // meant to take you back out of it.
    const current = document.querySelector(".panel:not([hidden])");
    const next = document.getElementById(`panel-${id}`);
    if (!next) return;
    // Bail only when the panel is genuinely already on screen. Testing
    // `next === current` alone would swallow the very first reveal of a panel
    // that starts un-hidden, leaving its .t-stagger-line children stuck at
    // opacity 0 — content in the DOM, nothing visible on the page.
    if (next === current && next.classList.contains("is-shown")) return;

    syncNavSelection(id);
    transitionPanels(current, next);
    updateWorkNav(null);
    if (!keepUrl) setRoute(TAB_PATHS[id] || "/", id === "intro" ? null : tabLabels[id], replace);
  }

  selectTab = selectPanel;

  function positionIndicator() {
    const active = nav.querySelector('.nav-tab[aria-selected="true"]');
    if (!active) return;
    const x = active.offsetLeft + (active.offsetWidth - indicator.offsetWidth) / 2;
    indicator.style.transform = `translateX(${x}px)`;
  }

  // The block is sized off a tab, so a resize has to re-place it.
  function repositionNavFocus() {
    if (!navFocus || !navFocus.classList.contains("is-on")) return;
    const focused = nav.querySelector(".nav-tab:focus");
    if (focused) placeNavFocus(focused);
  }

  // ── Keyboard-focus block ──
  // Sits behind whichever tab has focus. 12px in from the pill on both sides —
  // the vertical inset is in the stylesheet, since every tab is the pill's
  // full height.
  const navFocus = document.getElementById("navFocus");
  function placeNavFocus(tab) {
    if (!navFocus || !tab) return;
    navFocus.style.width = `${tab.offsetWidth - 24}px`;
    navFocus.style.transform = `translateX(${tab.offsetLeft + 12}px)`;
  }

  // focusin/out rather than per-tab handlers: they bubble, so this keeps
  // working for tabs built after this runs.
  nav.addEventListener("focusin", (e) => {
    const tab = e.target.closest && e.target.closest(".nav-tab");
    if (!tab || !navFocus) return;
    // Only for focus the browser considers worth showing — a click on a tab
    // focuses it too, and a ring appearing under the cursor is noise.
    if (!tab.matches(":focus-visible")) return;
    placeNavFocus(tab);
    navFocus.classList.add("is-on");
  });

  nav.addEventListener("focusout", (e) => {
    if (!navFocus) return;
    // Ignore a hop between two tabs — relatedTarget is where focus is going,
    // and focusout fires before the matching focusin.
    if (e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest(".nav-tab")) return;
    navFocus.classList.remove("is-on");
  });

  syncNavSelection = (id) => {
    nav.querySelectorAll(".nav-tab").forEach((t) => {
      t.setAttribute("aria-selected", t.dataset.tab === id ? "true" : "false");
    });
    indicator.hidden = !id;
    if (id) positionIndicator();
    // A stowed bar is still the thing that says where you are, so the orb wears
    // the same icon the selected tab would have. Routed through here rather than
    // watched separately, because this is already the one place that knows.
    syncOrbIcon(id);
  };

  // The shared name chip above the bar. One element and one timer for the whole
  // nav, so stepping quickly replaces the name in place instead of lighting up
  // a per-tab toast that then has to time out on its own — which is what left a
  // trail of them when you moved faster than 1.2s a tab.
  const navFlash = document.getElementById("navFlash");
  const navFlashLabel = document.getElementById("navFlashLabel");
  let navFlashTimer;

  function flashNavName(label, dir) {
    if (!navFlash || !navFlashLabel) return;

    // Width has to be a number at both ends for the chip to grow between two
    // names rather than snap. Measure what this name wants, then animate the
    // chip from whatever it currently is to that.
    const wasUp = navFlash.classList.contains("is-up");
    const from = wasUp ? navFlash.offsetWidth : 0;
    navFlashLabel.textContent = label;
    navFlash.style.width = "auto";
    const to = navFlash.offsetWidth;
    if (wasUp) {
      navFlash.style.width = `${from}px`;
      void navFlash.offsetWidth; // commit the start width before changing it
    }
    navFlash.style.width = `${to}px`;
    navFlash.classList.add("is-up");

    // Enter from the side you're travelling away from. There's no exit
    // animation on purpose: on a fast run of presses the outgoing name would
    // still be leaving as the next one arrived, and the chip would show two
    // half-faded words at once.
    navFlashLabel.style.setProperty("--nav-flash-from", dir < 0 ? "-10px" : "10px");
    navFlashLabel.classList.remove("is-in");
    void navFlashLabel.offsetWidth; // restart the entrance from the new side
    navFlashLabel.classList.add("is-in");

    // One clock for the chip, restarted here, so a run of presses dismisses
    // once after the last one rather than once per tab you passed through.
    clearTimeout(navFlashTimer);
    navFlashTimer = setTimeout(() => navFlash.classList.remove("is-up"), 1100);
  }

  // Moves to a tab and does the two things every route change through the bar
  // does: name where you landed, and hand focus back only if the nav already
  // had it — so this stays a page-wide shortcut elsewhere instead of yanking
  // focus down to the bar.
  //
  // `dir` is the direction the chip's name should travel against. The arrow
  // keys pass their own step, because wrapping from the last tab to the first
  // is still a rightward move and comparing indexes would call it a long jump
  // left. Everything else can be derived from where you were.
  function jumpToTab(target, focused, dir) {
    const tabButtons = Array.from(nav.querySelectorAll(".nav-tab"));
    if (!dir) {
      const at = tabButtons.findIndex((b) => b.getAttribute("aria-selected") === "true");
      dir = tabButtons.indexOf(target) < at ? -1 : 1;
    }
    selectPanel(target.dataset.tab);
    flashNavName(tabLabels[target.dataset.tab] || target.dataset.tab, dir);
    if (nav.contains(focused)) target.focus();
  }

  // The keyboard half of the bar, listed in the settings panel:
  //
  //   ← / →   step through the tabs, the expected behaviour for a
  //           role="tablist", and unlike hovering a key press is
  //           unambiguously deliberate. Left/right only, on purpose: up/down
  //           are the page's vertical scroll, and taking those would cost more
  //           than this adds.
  //   1…n     jump straight to a tab, in bar order.
  //   n+1     open the message tray — the FAB is the last thing on the bar, so
  //           it gets the digit after the last tab rather than a key of its
  //           own to remember.
  document.addEventListener("keydown", (e) => {
    // Something nearer the target already claimed this — the palette's own
    // Right, which activates a row. That click closes the tray synchronously,
    // so by the time the event bubbles up here the overlay guard below has
    // nothing left to catch it on, and the same press would step one tab
    // further than the row you picked.
    if (e.defaultPrevented) return;
    const isArrow = e.key === "ArrowLeft" || e.key === "ArrowRight";
    // Not parseInt: it would take "1abc", and e.key for a digit is exactly one
    // character anyway.
    const digit = /^[1-9]$/.test(e.key) ? Number(e.key) : 0;
    if (!isArrow && !digit) return;
    // Cmd/Ctrl/Alt + Left is browser back on one platform or another, and the
    // modified digits are the browser's own tab switching.
    if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
    // The tray and the lightbox own the keyboard while they're up — the
    // lightbox steps its gallery with the arrows. The one exception is the jump
    // tray, where the digits are the whole point of what's on screen.
    const inJump = jumpTrayOpen();
    if (openOverlays.size && !(digit && inJump)) return;
    // Never take them from a caret. Matters more for the digits than the
    // arrows: typing a number into the message form has to type a number.
    const focused = document.activeElement;
    if (focused && (focused.isContentEditable || /^(input|textarea|select)$/i.test(focused.tagName))) {
      return;
    }

    const tabButtons = Array.from(nav.querySelectorAll(".nav-tab"));
    if (!tabButtons.length) return;

    if (digit) {
      // Anything past the message row isn't a shortcut, and falls through
      // unclaimed rather than being swallowed.
      if (digit > tabButtons.length + 1) return;
      e.preventDefault();
      flashShortcutKey(e.key);
      runJump(digit);
      return;
    }

    // Read the position off aria-selected rather than tracking it separately, so
    // this agrees with the nav whatever put it in its current state — including
    // a detail panel, which keeps its parent tab selected.
    const at = tabButtons.findIndex((b) => b.getAttribute("aria-selected") === "true");
    const step = e.key === "ArrowRight" ? 1 : -1;
    const target = tabButtons[((at === -1 ? 0 : at) + step + tabButtons.length) % tabButtons.length];
    if (!target) return;

    e.preventDefault();
    flashShortcutKey(e.key);
    // The key's own direction, not the index delta — see jumpToTab.
    jumpToTab(target, focused, step);
  });

  window.addEventListener("resize", () => {
    positionIndicator();
    repositionNavFocus();
  });

  // Last, because it seeds the orb's glyph off whichever tab is already
  // selected — which is only true once the tabs above exist.
  initNavStow();

  requestAnimationFrame(positionIndicator);
}

// ── Stowing the bar ──
//
// Press and hold anywhere on the bar and it drops into a single orb that
// follows your finger. Let go and the orb magnetises to whichever side of the
// screen it ended up nearest; pick it up again and put it somewhere else; tap
// it and the bar comes back.
//
// The bar floats over the content, which is what a floating nav is for and also
// what's wrong with it: on a short window, or over a wide image you are
// actually trying to look at, "over the content" and "in the way" are the same
// sentence. Every other answer to that costs something — hiding it on scroll
// makes it unreliable, docking it to the page makes it stop floating. Letting
// you pick it up and move it costs nothing and leaves the decision with whoever
// can see the screen.
//
// Held rather than tapped, and there is deliberately no switch for it in the
// settings panel. A hold is a gesture you can only perform on purpose, so it
// can live on the bar itself without stealing a single tab press; a switch in a
// panel would be a preference to find and understand before you could move
// something you are already touching.

const NAV_STOW_KEY = "tp-nav-orb";

// How long a press has to sit still on the bar before it lifts. Read out of the
// stylesheet, because the bar dips under the finger for exactly this long — see
// --nav-hold and the .is-holding rule — and a timer that disagreed with the
// animation would either lift a bar that hadn't finished dipping or leave one
// sitting at the bottom of its dip waiting.
const NAV_HOLD_MS = cssMs("--nav-hold", 420);

// How far a press may drift and still count as a hold. Generous, because a
// finger resting on glass for the best part of half a second is never actually
// still — and because the cost of being wrong in this direction is a hold that
// doesn't fire, which you notice and simply do again.
const NAV_HOLD_SLOP = 10;

// And how far the orb has to move before a press on it is a drag rather than a
// tap. Tighter than the hold's slop: this one only has to survive the wobble in
// a quick tap, not the tremor in a deliberate hold.
const ORB_TAP_SLOP = 5;

// The gap the orb keeps from the edges of the screen.
const ORB_INSET = 12;

// Where a first-time orb lands: the right-hand side, low enough to be near a
// thumb and well clear of anything at the top of the page.
const ORB_DEFAULT = { stowed: false, side: "right", y: 0.68 };

// Phosphor "dots-three" (fill), for the pages no tab owns — the 404 and the
// legal pages, where the orb has no section to wear. Three dots is what a
// collapsed row of things looks like everywhere else, which is exactly what it
// is here.
const NAV_ORB_ICON = `<svg viewBox="0 0 256 256" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><circle cx="128" cy="128" r="16"/><circle cx="60" cy="128" r="16"/><circle cx="196" cy="128" r="16"/></svg>`;

// Assigned by initNavStow, so syncNavSelection can keep a stowed orb wearing
// the section you are actually in. Same shape as syncNavSelection itself: a
// no-op until the thing that implements it has run.
let syncOrbIcon = () => {};

/** Where the bar was left last visit — which side, how far down, and whether it
 *  was stowed at all. Everything is re-validated on the way out of storage:
 *  this is the one preference on the site a visitor can put arbitrary JSON in
 *  front of, and a NaN fraction would place the orb nowhere at all. */
function readOrbPref() {
  try {
    const stored = JSON.parse(localStorage.getItem(NAV_STOW_KEY) || "null");
    if (!stored || typeof stored !== "object") return ORB_DEFAULT;
    return {
      stowed: stored.stowed === true,
      side: stored.side === "left" ? "left" : "right",
      y: Number.isFinite(stored.y) ? Math.min(Math.max(stored.y, 0), 1) : ORB_DEFAULT.y,
    };
  } catch (e) {
    return ORB_DEFAULT;
  }
}

function storeOrbPref(pref) {
  try {
    localStorage.setItem(NAV_STOW_KEY, JSON.stringify(pref));
  } catch (e) {
    // Private-mode storage can throw. The bar still stays where you put it for
    // as long as the page is open.
  }
}

function initNavStow() {
  const wrap = document.querySelector(".navwrap");
  const orb = document.getElementById("navOrb");
  const orbIcon = document.getElementById("navOrbIcon");
  const row = wrap && wrap.querySelector(".navwrap-row");
  if (!wrap || !orb || !row) return;

  const pref = readOrbPref();
  let side = pref.side;
  let y = pref.y; // how far down the band the orb can occupy, 0 to 1
  let stowed = false;
  let hideTimer;

  function clamp(n, lo, hi) {
    return Math.min(Math.max(n, lo), Math.max(lo, hi));
  }

  // ── Placing it ──
  //
  // Stored as a side plus a fraction rather than as a pair of pixels, so
  // rotating a phone or dragging a window narrower puts the orb back where it
  // looked like it was rather than where it literally was — and, more to the
  // point, never off the screen entirely.
  function band() {
    return Math.max(1, window.innerHeight - orb.offsetHeight - ORB_INSET * 2);
  }

  function moveTo(left, top) {
    orb.style.left = `${left}px`;
    orb.style.top = `${top}px`;
  }

  // Where the stored side and height put it in today's viewport.
  function settle() {
    const left = side === "left" ? ORB_INSET : window.innerWidth - orb.offsetWidth - ORB_INSET;
    moveTo(left, ORB_INSET + y * band());
  }

  // Keyed lookup into the constant map — never the content's own markup.
  syncOrbIcon = (id) => {
    if (orbIcon) orbIcon.innerHTML = (id && NAV_ICONS_FILL[id]) || NAV_ORB_ICON;
  };

  const selected = document.querySelector('.nav-tab[aria-selected="true"]');
  syncOrbIcon(selected ? selected.dataset.tab : null);

  // Sound is desktop-only everywhere on the site, because the switch that turns
  // it off is — see the note above DESKTOP_QUERY. The gate has to be repeated
  // here rather than assumed: initSounds() holds its own copy for the delegated
  // listeners, and these two cues are played directly.
  function playCue(cue) {
    if (window.cuelume && window.matchMedia(DESKTOP_QUERY).matches) window.cuelume.play(cue);
  }

  // ── Stowing and coming back ──

  function stow() {
    if (stowed) return;
    stowed = true;
    clearTimeout(hideTimer);
    wrap.classList.remove("is-holding");
    wrap.classList.add("is-stowed");
    orb.hidden = false;
    settle();
    // The orb has just come off display:none, so its start state has to be
    // committed before the class that leaves it — otherwise there is nothing
    // for the entrance to interpolate from and it simply appears.
    orb.classList.remove("is-in");
    void orb.offsetWidth;
    orb.classList.add("is-in");
    // Focus can't be left on a bar that isn't there any more. Moved only if it
    // was in the bar to begin with: stowing shouldn't yank focus away from
    // whatever you were reading.
    if (wrap.contains(document.activeElement)) orb.focus();
    storeOrbPref({ stowed: true, side, y });
    playCue("droplet");
  }

  function restore() {
    if (!stowed) return;
    stowed = false;
    const hadFocus = orb.contains(document.activeElement);
    wrap.classList.remove("is-stowed");
    orb.classList.remove("is-in", "is-lifted");
    // Hidden only once the fade has landed, so it leaves the tab order and the
    // screen reader rather than sitting there invisible. On a timer and not on
    // transitionend for the reason hideOverlay is: under prefers-reduced-motion
    // there is no transition and that event never arrives.
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (!stowed) orb.hidden = true;
    }, prefersReducedMotion ? 0 : MOTION_DUR_MS);
    if (hadFocus) {
      const tab = wrap.querySelector('.nav-tab[aria-selected="true"]') || wrap.querySelector(".nav-tab");
      if (tab) tab.focus();
    }
    storeOrbPref({ stowed: false, side, y });
    playCue("bloom");
  }

  // ── The drag ──
  //
  // One routine for both ways in: the hold that lifts the bar off the bottom of
  // the screen, and a later press that moves the orb somewhere else. Both end
  // the same way — let go and it goes to the nearer side.
  let drag = null;

  // Blocks the page scroll a touch-drag would otherwise turn into. Bound only
  // while a drag is live, and non-passive because preventDefault is the whole
  // job. The orb has touch-action: none in CSS and needs none of this; a hold
  // that started on the bar does, because the bar can't be touch-action: none
  // without costing every flick-scroll that happens to begin on it.
  function blockScroll(e) {
    e.preventDefault();
  }

  // Where the orb ends up is remembered on the way past rather than measured
  // again when the drag ends. Two reasons, and both of them bite: a held orb is
  // scaled up, so its box is a couple of pixels bigger than its position on
  // every axis and would drift a little further from where you put it with each
  // drag — and the inline left and top written here aren't resolved until the
  // browser next paints, so reading the box back is a question about what has
  // been rendered rather than about what was asked for.
  function dragTo(x, y2) {
    if (!drag) return;
    drag.left = clamp(x - drag.grabX, ORB_INSET, window.innerWidth - orb.offsetWidth - ORB_INSET);
    drag.top = clamp(y2 - drag.grabY, ORB_INSET, window.innerHeight - orb.offsetHeight - ORB_INSET);
    moveTo(drag.left, drag.top);
  }

  function onDragMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    dragTo(e.clientX, e.clientY);
  }

  function beginDrag(id, grabX, grabY, x, y2, fromBar) {
    drag = { id, grabX, grabY, fromBar };
    // Adding this before the first placement is what stops the orb easing
    // across from wherever settle() just put it: .is-lifted drops left and top
    // out of the transition entirely, so it tracks the pointer frame for frame.
    orb.classList.add("is-lifted");
    dragTo(x, y2);
    window.addEventListener("pointermove", onDragMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    document.addEventListener("touchmove", blockScroll, { passive: false });
  }

  function endDrag(e) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    const at = drag;
    drag = null;
    window.removeEventListener("pointermove", onDragMove);
    window.removeEventListener("pointerup", endDrag);
    window.removeEventListener("pointercancel", endDrag);
    document.removeEventListener("touchmove", blockScroll);
    // Armed here rather than back when the hold fired, because the click this
    // has to catch is the one the press ends in — and the press ends whenever
    // you let go, which is as long after the hold as you cared to spend
    // dragging. A window opened at the start of that would have closed again
    // long before the thing it was waiting for arrived.
    if (at.fromBar) swallowNextClick();
    // Hands left and top their transition back, which is what animates the
    // settle below rather than snapping to it.
    orb.classList.remove("is-lifted");
    // Which side it goes to is decided by where its middle ended up, not by
    // which way it was travelling: you put it down somewhere, and the nearer
    // edge is the one you meant.
    side = at.left + orb.offsetWidth / 2 < window.innerWidth / 2 ? "left" : "right";
    y = clamp((at.top - ORB_INSET) / band(), 0, 1);
    settle();
    storeOrbPref({ stowed: true, side, y });
  }

  // ── The hold ──

  let hold = null;

  function endHold() {
    if (!hold) return;
    clearTimeout(hold.timer);
    hold = null;
    wrap.classList.remove("is-holding");
    window.removeEventListener("pointermove", onHoldMove);
    window.removeEventListener("pointerup", endHold);
    window.removeEventListener("pointercancel", endHold);
  }

  function onHoldMove(e) {
    if (!hold || e.pointerId !== hold.id) return;
    // Kept even when the hold survives, so the orb can be handed the pointer's
    // real position when it lifts rather than where the press first landed.
    hold.x = e.clientX;
    hold.y = e.clientY;
    if (Math.abs(e.clientX - hold.fromX) > NAV_HOLD_SLOP || Math.abs(e.clientY - hold.fromY) > NAV_HOLD_SLOP) {
      endHold();
    }
  }

  // A press that turned into a hold has already done something — it picked the
  // bar up — so whatever it was otherwise going to do, select the tab under it
  // or open the message tray, has to be called off before the click carrying it
  // is dispatched. Capture phase, so this lands before the tab's own listener
  // rather than after it, and one shot on a short fuse: a drag that ends
  // somewhere unclickable, or a touch that moved far enough for the browser to
  // withhold the click entirely, produces nothing to swallow at all, and a
  // listener left armed for that case would eat the next real click instead.
  //
  // The fuse is why the orb is excluded below. The click being waited for
  // arrives a frame or two after the press ends, so anything longer is pure
  // margin — but dropping the orb and immediately tapping it to bring the bar
  // back is an ordinary thing to do, and lands well inside even a generous
  // margin. Left to itself this listener would eat exactly that tap and the bar
  // would refuse to come back for no reason the person tapping could see.
  function swallowNextClick() {
    const done = () => {
      clearTimeout(timer);
      document.removeEventListener("click", kill, true);
    };
    const kill = (e) => {
      // Still armed afterwards, not spent: the orb's tap isn't the click this
      // is waiting for, so it shouldn't count as having caught it either.
      if (orb.contains(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      done();
    };
    const timer = setTimeout(done, 400);
    document.addEventListener("click", kill, true);
  }

  row.addEventListener("pointerdown", (e) => {
    // e.button is 0 for touch and pen as well as for the left mouse button; a
    // right-click on the bar has no business picking it up.
    if (stowed || drag || hold || e.button > 0) return;
    hold = { id: e.pointerId, fromX: e.clientX, fromY: e.clientY, x: e.clientX, y: e.clientY, timer: 0 };
    hold.timer = setTimeout(() => {
      const at = hold;
      endHold();
      stow();
      // Centred on the pointer, so the thing you are holding is under your
      // finger rather than beside it. Measured rather than assumed — stow() has
      // already made the orb visible, so it has a real size by now.
      const half = orb.offsetWidth / 2;
      beginDrag(at.id, half, half, at.x, at.y, true);
    }, NAV_HOLD_MS);
    wrap.classList.add("is-holding");
    window.addEventListener("pointermove", onHoldMove);
    window.addEventListener("pointerup", endHold);
    window.addEventListener("pointercancel", endHold);
  });

  // ── Picking the orb up again ──

  // Cleared at the start of every press, so it can only ever survive from a drag
  // to the click immediately behind it — a touch-drag that ends without
  // producing a click can't leave it set and eat the next genuine tap.
  let orbDragged = false;

  orb.addEventListener("pointerdown", (e) => {
    if (drag || e.button > 0) return;
    orbDragged = false;
    const rect = orb.getBoundingClientRect();
    const from = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      grabX: e.clientX - rect.left,
      grabY: e.clientY - rect.top,
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
    // Grabbed where you actually took hold of it, not by its middle: an orb
    // that jumps under the finger the moment it starts moving is an orb you are
    // chasing rather than carrying.
    const move = (ev) => {
      if (ev.pointerId !== from.id) return;
      if (Math.abs(ev.clientX - from.x) <= ORB_TAP_SLOP && Math.abs(ev.clientY - from.y) <= ORB_TAP_SLOP) return;
      stop();
      orbDragged = true;
      beginDrag(from.id, from.grabX, from.grabY, ev.clientX, ev.clientY);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  });

  // click, not pointerup, so Enter and Space on a focused orb come through the
  // same door as a tap does. A press that turned into a drag still ends in a
  // click on some platforms; the flag is what tells the two apart.
  orb.addEventListener("click", () => {
    if (orbDragged) {
      orbDragged = false;
      return;
    }
    restore();
  });

  // Escape brings the bar back — the keyboard's way out of a state a gesture
  // put you in. Only when nothing is layered over the page, though: the tray and
  // the lightbox own that key while they're up, and closing the bar's stow from
  // underneath one of them would be answering a press meant for something else.
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !stowed || openOverlays.size) return;
    restore();
  });

  // A pointer can simply go missing: the window loses focus mid-drag, the OS
  // takes the gesture over, a second finger's pointerup arrives in place of the
  // one being tracked. Both guards above test state that nothing would then be
  // left to clear — which strands the orb on the cursor and, worse, leaves
  // `drag` set forever so the bar can never be picked up again. This is the same
  // net initSounds() puts under a key held while focus leaves the window.
  window.addEventListener("blur", () => {
    endHold();
    endDrag();
  });

  window.addEventListener("resize", () => {
    if (stowed && !drag) settle();
  });

  // Stowed on a previous visit. No entrance and no cue, because nothing just
  // happened — this is simply where the bar is. The transition is suppressed
  // around the class rather than after it, so the bar doesn't visibly fade out
  // of a position it was never really in.
  if (pref.stowed) {
    stowed = true;
    wrap.style.transition = "none";
    wrap.classList.add("is-stowed");
    void wrap.offsetWidth;
    wrap.style.transition = "";
    orb.hidden = false;
    settle();
    orb.classList.add("is-in");
  }
}

// ── Settings ──
//
// The corner panel: a light/dark/system choice and a sound switch, over the
// keyboard shortcuts the panel used to hold on its own.
//
// The theme half is mostly not here. CSS resolves all three choices off one
// color-scheme declaration and js/theme.js puts the stored one on <html> before
// first paint; what's left for this file is the three buttons, and writing the
// choice down. The sound half is entirely here, because nothing about it has to
// happen before paint.

const SOUND_KEY = "tp-sound";

/** The stored sound preference. On by default — this is a portfolio, the cues
 *  are the point, and the switch is one click away in the corner. */
function readSoundPref() {
  try {
    return localStorage.getItem(SOUND_KEY) !== "off";
  } catch (e) {
    return true;
  }
}

function storeSoundPref(on) {
  try {
    localStorage.setItem(SOUND_KEY, on ? "on" : "off");
  } catch (e) {
    // Private-mode storage can throw. The choice still holds for this page.
  }
}

/** Routes the preference to cuelume, which is where every cue is gated — so
 *  nothing else in initSounds() has to know the switch exists. */
function applySoundPref(on) {
  if (window.cuelume) window.cuelume.setEnabled(on);
}

function initSettings() {
  const root = document.getElementById("settings");
  const nub = document.getElementById("settingsNub");
  if (!root || !nub) return;

  // ── Open/close ──
  //
  // Deliberately not part of the openOverlays set the tray and the lightbox
  // join. That set is what makes Escape close the topmost layer, but it also
  // makes the digit and arrow shortcuts stand down while a layer is up — and
  // standing them down here would break the one thing the panel is for. The
  // key caps inside it flash as you press the real keys with it open (see
  // flashShortcutKey), which only works if the keys still do anything.
  function setOpen(open) {
    root.classList.toggle("is-open", open);
    nub.setAttribute("aria-expanded", open ? "true" : "false");
  }

  const isOpen = () => nub.getAttribute("aria-expanded") === "true";

  function close(refocus) {
    if (!isOpen()) return;
    // Focus moves first, then the panel hides. The other order looks right and
    // isn't: hiding the panel takes visibility off whatever inside it holds
    // focus, and the browser's own "focused element just became invisible"
    // handling drops focus to the body *after* this function returns, undoing
    // the focus() call. Moving first also means the focusout below sees the nub
    // as the new target, which is inside .settings, so it stays out of the way.
    if (refocus) nub.focus();
    setOpen(false);
  }

  nub.addEventListener("click", () => setOpen(!isOpen()));

  // Anywhere outside the whole widget — the panel included, so clicking a
  // control doesn't dismiss the panel it's in. Pointerdown rather than click,
  // so the panel is gone by the time whatever is underneath reacts.
  document.addEventListener("pointerdown", (e) => {
    if (!isOpen() || root.contains(e.target)) return;
    close(false);
  }, { passive: true });

  // Escape returns focus to the dot, since that's where it came from. Not
  // routed through the shared Escape handler for the reason above.
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen()) close(true);
  });

  // Tabbing out the far end of the panel is a dismissal too — the panel is
  // done, and leaving it open behind the focus ring would be a floating box
  // with nothing in it selected.
  root.addEventListener("focusout", (e) => {
    if (!isOpen()) return;
    if (e.relatedTarget && root.contains(e.relatedTarget)) return;
    close(false);
  });

  // ── Theme ──
  const themeOptions = Array.from(root.querySelectorAll("[data-theme-choice]"));
  // Held here rather than re-read from storage on every keystroke: storage can
  // be unwritable (private mode), and a control that can't remember what it is
  // set to would be stuck on whatever the failed write left behind.
  let themeChoice = window.readTheme();

  function paintTheme(choice) {
    themeChoice = choice;
    themeOptions.forEach((btn) => {
      const on = btn.dataset.themeChoice === choice;
      btn.setAttribute("aria-checked", on ? "true" : "false");
      // Roving tabindex: a radiogroup is one tab stop, and the arrows below
      // move within it.
      btn.tabIndex = on ? 0 : -1;
    });
  }

  function chooseTheme(choice) {
    window.applyTheme(choice);
    window.storeTheme(choice);
    paintTheme(choice);
  }

  themeOptions.forEach((btn) => {
    btn.addEventListener("click", () => chooseTheme(btn.dataset.themeChoice));
  });

  const segment = root.querySelector(".settings-segment");
  if (segment) {
    segment.addEventListener("keydown", (e) => {
      const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1
        : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1
        : 0;
      if (!step) return;
      // preventDefault and stopPropagation both matter, and for different
      // handlers: inside a radiogroup the arrows belong to the radiogroup, and
      // the nav's own arrow handler is listening on the document for them.
      e.preventDefault();
      e.stopPropagation();
      const choices = window.THEME_CHOICES;
      const at = choices.indexOf(themeChoice);
      const next = choices[(at + step + choices.length) % choices.length];
      chooseTheme(next);
      const btn = root.querySelector(`[data-theme-choice="${next}"]`);
      if (btn) btn.focus();
    });
  }

  paintTheme(themeChoice);

  // ── Sound ──
  const soundToggle = document.getElementById("soundToggle");
  if (soundToggle) {
    const paintSound = (on) => soundToggle.setAttribute("aria-checked", on ? "true" : "false");

    soundToggle.addEventListener("click", () => {
      const on = soundToggle.getAttribute("aria-checked") !== "true";
      applySoundPref(on);
      storeSoundPref(on);
      paintSound(on);
      // The switch answers itself: turning sound on plays the cue that proves
      // it, which is the only feedback a sound switch can honestly give. Turning
      // it off is silent, which is also the proof.
      if (on && window.cuelume) window.cuelume.play("toggle");
    });

    paintSound(readSoundPref());
  }
}

// ── Interaction sounds ──
//
// cuelume (js/cuelume.js) synthesizes every cue live, so this costs no audio
// files and no network. Four of its fourteen are used: a `tick` as the pointer
// arrives on anything clickable, a `press`/`release` pair either side of a
// click so a button sounds like a key going down and coming back up rather than
// one flat blip, and `bloom` for the one thing that reveals rather than
// activates. Leaving is silent — the cue marks arriving somewhere.
//
// Delegated off the document rather than bound per element — the page builds
// almost all of its links and cards from site-content.json after this runs, and
// the lightbox and trays add more later. Nothing has to be re-scanned or carry
// a data attribute; a new card is audible the moment it exists.
//
// Desktop only, on the same query the settings panel uses: sound is something
// you can turn off, the switch that turns it off lives in that panel, and a
// phone that could hear the sounds but never see the switch would be the one
// arrangement with no way out. A phone is also the device most likely to be
// somewhere sound isn't welcome.

const SOUND_VOLUME = 0.6;

// What counts as clickable. role="button" is the third one that matters here:
// makeActivatable() stamps it on every work card, writing row and gallery
// image, which are divs doing a button's job.
const SOUND_TARGETS = 'a[href], button, [role="button"]';

// Things that aren't clickable but answer the pointer anyway, and so are worth
// a cue of their own. The About portrait turns the drawing over to reveal the
// photograph behind it: `bloom` is the palette's slow warm swell, the one cue
// that sounds like something opening rather than something being clicked.
//
// Hover only. These have no click behaviour on a pointer device — the
// portrait's tap-to-flip is bound only where hover is missing, which is
// exactly where sound is off — so they stay out of the press/release pair.
// The FAB is the one action on the bar rather than a place you can go, and it
// gets the palette's fullest cue to match: `chime` where every tab is a `tick`.
// It also has to be named here to be heard at all — SOUND_TARGETS matches
// `a[href]`, and the FAB is an anchor without one.
const SOUND_HOVER_CUES = { ".about-portrait": "bloom", ".fab": "chime" };
const SOUND_HOVER_TARGETS = [SOUND_TARGETS].concat(Object.keys(SOUND_HOVER_CUES)).join(", ");

// Which cue an element hovers with. One matches() against a short list beats a
// second closest() pass — the union selector above has already found the
// element, this only has to name what it is.
function hoverCue(el) {
  for (const selector in SOUND_HOVER_CUES) {
    if (el.matches(selector)) return SOUND_HOVER_CUES[selector];
  }
  return "tick";
}

// A pointer dragged across a dense row — the nav, a stack of work cards — can
// arrive on several elements inside a few milliseconds, which machine-guns.
// One tick per this window, so a fast sweep is a handful of ticks rather than
// one per element crossed.
const SOUND_GAP_MS = 80;

// Kept in step with the @media block above .settings in styles/main.css by
// hand — there is no way to read a media query back out of a stylesheet the way
// MOTION_DUR_MS reads --motion-dur, so this is the one place in the site where
// a breakpoint is written twice. Change one, change the other.
const DESKTOP_QUERY = "(min-width: 900px) and (min-height: 560px) and (hover: hover) and (pointer: fine)";

function soundTarget(el, selector) {
  if (!el || !el.closest) return null;
  const found = el.closest(selector || SOUND_TARGETS);
  if (!found) return null;
  if (found.getAttribute("aria-disabled") === "true" || found.disabled) return null;
  return found;
}

function initSounds() {
  const cuelume = window.cuelume;
  if (!cuelume) return;
  cuelume.setVolume(SOUND_VOLUME);
  // Before any listener is wired, so a visitor who turned sound off last time
  // can't hear a cue from the first hover of this visit.
  applySoundPref(readSoundPref());

  // Read once and kept current by its own change event, rather than asked on
  // every pointer event. pointerover is the highest-frequency listener on the
  // site — it fires on every boundary the pointer crosses, including between an
  // element and its own children — and .matches re-evaluates the query each
  // time it's read.
  const desktopQuery = window.matchMedia(DESKTOP_QUERY);
  let isDesktop = desktopQuery.matches;
  desktopQuery.addEventListener("change", (e) => {
    isDesktop = e.matches;
  });

  // Every listener here is a pure observer — none of them calls preventDefault,
  // so none of them should make the browser wait to find out.
  const PASSIVE = { passive: true };

  let lastTick = -Infinity;

  document.addEventListener("pointerover", (e) => {
    if (!isDesktop) return;
    // The throttle is checked before the DOM is walked, not after. Both orders
    // tick identically — lastTick only moves when a cue actually plays — but
    // this one skips a closest() on the great majority of these events, which
    // arrive in bursts far tighter than the gap.
    const now = performance.now();
    if (now - lastTick < SOUND_GAP_MS) return;
    const el = soundTarget(e.target, SOUND_HOVER_TARGETS);
    if (!el) return;
    // pointerover also fires on every move between an element's own children.
    // Only crossing the outer boundary is arriving.
    const from = e.relatedTarget;
    if (from instanceof Node && el.contains(from)) return;
    lastTick = now;
    cuelume.play(hoverCue(el));
  }, PASSIVE);

  // Leaving the About portrait plays "ready" — the drawing has finished turning
  // back from the photograph behind it, and the cue lands on the settle rather
  // than the reveal.
  //
  // Delegated like everything else here rather than bound when the portrait is
  // built: renderContact() replaces the panel's children on every visit to
  // About, so a listener attached to the frame would be thrown away with it.
  //
  // pointerout needs the same boundary check as pointerover above, for the
  // mirror-image reason: the frame holds two stacked images, and crossing
  // between them fires pointerout without the pointer having left the frame.
  //
  // It keeps its own throttle instead of sharing lastTick. Sharing would mean
  // the hover cue that fires on the way in suppresses this one on the way out,
  // which is exactly the pair you want to hear.
  let lastReady = -Infinity;

  document.addEventListener("pointerout", (e) => {
    if (!isDesktop) return;
    const frame = e.target instanceof Element ? e.target.closest(".about-portrait") : null;
    if (!frame) return;
    const to = e.relatedTarget;
    if (to instanceof Node && frame.contains(to)) return;
    const now = performance.now();
    if (now - lastReady < SOUND_GAP_MS) return;
    lastReady = now;
    cuelume.play("ready");
  }, PASSIVE);

  // The release is owed to the press, not to wherever the pointer ended up: if
  // you press a card and slide off before letting go, the click is cancelled but
  // the button still comes back up. So the pointerup listener sits on the
  // document and answers any press that's outstanding, which also means a press
  // can never be left hanging without its other half. The keyboard half below
  // shares the flag for the same reason — a key held down while focus moves
  // still gets its release.
  let pressed = false;

  const press = () => {
    pressed = true;
    cuelume.play("press");
  };

  const release = () => {
    if (!pressed) return;
    pressed = false;
    cuelume.play("release");
  };

  document.addEventListener("pointerdown", (e) => {
    if (!isDesktop) return;
    if (!soundTarget(e.target)) return;
    press();
  }, PASSIVE);

  document.addEventListener("pointerup", release, PASSIVE);
  document.addEventListener("pointercancel", release, PASSIVE);

  // The keyboard half. Focus is the keyboard's pointer, so the gate is what
  // holds focus rather than what the key happens to be: land on a work card or
  // a nav tab and every key sounds; land in the message form's name field and
  // none of them do, because a text input is not one of SOUND_TARGETS. That
  // keeps typing silent without having to keep a list of which keys are typing.
  document.addEventListener("keydown", (e) => {
    if (!isDesktop) return;
    // Holding a key fires keydown over and over against a single keyup. Only
    // the first is a press.
    if (e.repeat || pressed) return;
    if (!soundTarget(document.activeElement)) return;
    press();
  }, PASSIVE);

  document.addEventListener("keyup", release, PASSIVE);
  // Focus leaving the window kills the keyup that was owed — a ⌘-Tab away
  // mid-press would otherwise leave the flag set and swallow the next press.
  window.addEventListener("blur", release);
}

initSounds();
initSettings();

// ── Dev toolbar loader ──
// Local-only affordance: dev/devtools.js is in .gitignore and .assetsignore, so
// it is neither committed nor uploaded. The hostname check means production
// never even requests it — this block is the only trace of it that ships, and
// off localhost it does nothing. onerror swallows the 404 on a fresh clone,
// where the ignored file won't exist.
if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
  const devtools = document.createElement("script");
  devtools.src = "/dev/devtools.js";
  devtools.addEventListener("error", () => devtools.remove());
  document.addEventListener("DOMContentLoaded", () => document.body.appendChild(devtools));
}
