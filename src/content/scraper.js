// scraper.js
// Responsible ONLY for finding and extracting raw text from the page.
// Does NOT clean/filter — that's cleaner.js's job (separation of concerns).
//
// NOTE: Content scripts loaded via manifest.json's "content_scripts" array
// are ALWAYS classic scripts, never ES modules — Chrome does not support
// "type": "module" for this entry point (that only applies to the
// background service worker). So no import/export here. Plain top-level
// function declarations are automatically visible to any script loaded
// AFTER this one in the same content script bundle.

/**
 * Finds the most likely "main content" element on the page and returns
 * a reference to it (not text yet — cleaner.js needs the actual element
 * to strip out nav/ads before we call .innerText on it).
 *
 * Fallback chain: <article> -> <main> -> document.body
 * Semantic tags are preferred because they are far more stable across
 * site redesigns than guessing at class names.
 */
function findContentRoot() {
  const article = document.querySelector("article");
  if (article) return article;

  const main = document.querySelector("main");
  if (main) return main;

  return document.body;
}
