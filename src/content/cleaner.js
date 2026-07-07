// cleaner.js
// Responsible ONLY for removing noise (nav, ads, footers, cookie banners)
// from a content root element. Does NOT decide WHERE the content root is
// (that's scraper.js's job) — separation of concerns.
//
// No import/export — see note in scraper.js about why content scripts
// can't use ES modules through the manifest's content_scripts entry.

const NOISE_TAGS = ["nav", "header", "footer", "aside", "style", "script", "noscript", "template"];
const NOISE_SELECTORS = [
  '[class*="ad"]',
  '[id*="ad"]',
  '[class*="cookie"]',
  '[class*="banner"]',
];

/**
 * Takes a DOM element, clones it (so we NEVER mutate the live page the
 * user is looking at), strips out noise tags/selectors from the clone,
 * and returns the cleaned innerText.
 */
function removeNoise(rootElement) {
  const clone = rootElement.cloneNode(true);

  NOISE_TAGS.forEach((tag) => {
    clone.querySelectorAll(tag).forEach((el) => el.remove());
  });

  NOISE_SELECTORS.forEach((selector) => {
    clone.querySelectorAll(selector).forEach((el) => el.remove());
  });

  return clone.innerText;
}
