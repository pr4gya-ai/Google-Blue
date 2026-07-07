# 📅 Day 2 — Content Scripts, DOM Scraping & MutationObserver

## 🎯 Goal
Build a content scraper that extracts the main webpage content, removes
common UI noise, and detects dynamically loaded content using
`MutationObserver`.

---

## 🚀 What Was Built

- **`scraper.js`**
  - `findContentRoot()` finds the main content element using `<article>`,
    `<main>`, or falls back to `document.body`. Semantic tags are
    preferred over guessing at class names — they're far more stable
    across site redesigns.
- **`cleaner.js`**
  - `removeNoise()` clones the DOM element (never mutates the live page).
  - Removes `<nav>`, `<header>`, `<footer>`, `<aside>`, and common
    ad/cookie/banner elements.
  - Returns the cleaned `.innerText` — **only after** cleaning is done.
- **`content-script.js`**
  - Runs the scrape + clean pipeline once on page load.
  - Sets up a debounced `MutationObserver` on `document.body` to re-run
    the pipeline whenever the DOM changes (e.g. new posts loading into
    LinkedIn's feed).

---

## 🏗️ Pipeline

```
Page
  ↓
findContentRoot()   → returns a DOM element
  ↓
removeNoise()        → clones it, strips noise tags/selectors
  ↓
.innerText           → read LAST, after cleaning
  ↓
Cleaned Text
```

---

## ⚠️ Key Learnings

**1. Manifest V3 content scripts do not support ES Modules.**
Files loaded via `manifest.json`'s `content_scripts` array are always
classic scripts — `"type": "module"` only applies to the background
service worker. Using `import`/`export` in a content script throws:
```
Uncaught SyntaxError: Cannot use import statement outside a module
```
**Fix:** plain top-level `function` declarations, loaded in dependency
order via the manifest:
```json
"js": [
  "src/content/scraper.js",
  "src/content/cleaner.js",
  "src/content/content-script.js"
]
```

**2. Clean the DOM before converting it to text, not after.**
An early version returned `.innerText` (a string) from `scraper.js`
directly, then passed that string into `removeNoise()`, which expected a
DOM element to call `.cloneNode()` on. Once content is flattened to
plain text, there's no structural information left to selectively strip
`<nav>`/ads from. Cleaning must happen while it's still a DOM tree.

**3. Debounce the `MutationObserver`.**
Dynamic pages like LinkedIn mutate the DOM constantly (dozens of times
per second while scrolling). Without debouncing, the scrape pipeline
would re-run on every mutation — wasteful now, and would translate into
hammering the backend/LLM API with redundant requests later.
```js
let debounceTimer = null;
const observer = new MutationObserver(() => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => scrapePage(), 1000);
});
```

---

## 🧪 Test Results

| Page | Status | Notes |
|------|--------|-------|
| Wikipedia article | ✅ | Clean extraction with minimal noise |
| Indeed job posting | ⚠️ | Some "related jobs" recommendation sections leaked through |
| LinkedIn feed | ✅ | `MutationObserver` correctly detected new posts while scrolling |

---

## 🚧 Next Steps

- Improve content detection heuristics beyond simple tag fallback
- Refine ad/noise selectors — current ones (`[class*="ad"]`) are blunt
  and can accidentally match legitimate classes containing similar
  substrings (e.g. "header", "load")
- Add site-specific tuning for dynamic sites like LinkedIn, which don't
  use clean semantic HTML and leak UI chrome ("Like Comment Share")
  into scraped text
