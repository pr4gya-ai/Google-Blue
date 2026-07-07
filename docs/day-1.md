# Day 1 — MV3 Skeleton & Architecture

## Goal
Get a Manifest V3 Chrome extension loading with zero errors, and verify
all three execution contexts (background service worker, content script,
popup) boot independently before adding any real logic.

## What was built
- `manifest.json` — MV3 config wiring up `action` (popup), `background`
  (service worker), and `content_scripts`.
- `src/background/service-worker.js` — logs on `chrome.runtime.onInstalled`.
- `src/content/content-script.js` — logs the injected page URL.
- `src/popup/` — minimal static HTML/CSS/JS popup.

## Key architectural facts learned
- A Chrome extension is **3-4 isolated JS execution contexts**
  (background service worker, content script, popup, optionally an
  options page) that cannot see each other's variables directly and
  communicate only via message passing.
- The background service worker is **event-driven, not persistent** —
  Chrome kills it after ~30s idle and respawns it on the next event
  (install, message, alarm, icon click). No in-memory global state
  survives this — anything important must go into `chrome.storage`.
- Content scripts run in an **isolated world**: they share the live DOM
  with the page but not its JS variable scope. This is a deliberate
  security boundary.
- The popup is destroyed the instant it's closed — same rule applies,
  use `chrome.storage` for anything that needs to persist.

## Debugging exercise findings
- Removing `"type": "module"` from the background block did **not**
  throw a visible error, because `service-worker.js` didn't use
  `import`/`export` yet — the flag only matters once module syntax is
  actually used.
- Misspelling `"service_worker"` as `"service-worker"` (hyphen) caused
  Chrome to **silently** fail to register any background context at all
  — no red error banner, just a missing "Inspect views: service worker"
  link on the extension card. Lesson: Chrome does exact string matching
  on manifest keys, not fuzzy matching — an unrecognized key is just
  silently ignored rather than throwing a validation error. When
  something "just doesn't work" with zero console errors anywhere,
  suspect a manifest key typo first.

## Verified
- ✅ Service worker installs and logs correctly (confirmed via
  `chrome://extensions` → "service worker" inspect link)
- ✅ Content script injects into live pages (confirmed via page's own
  DevTools console, source reference `content-script.js:N` — not a
  stray `VM` console eval)
- ✅ Popup renders and logs correctly (confirmed via right-click →
  Inspect on the popup)
