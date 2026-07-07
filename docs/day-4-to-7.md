# Day 4-7 — Backend, LLM Integration, Full Popup UI & Extra Features

*(Compressed into one session — see below for what would normally have
been spread across 4 separate days.)*

## Day 4 — Node/Express Backend + LLM API Call

**Why a backend is required at all:** the extension can never call an LLM
API directly — that would mean shipping a secret API key inside the
extension's code, which anyone can extract by unzipping the `.crx`. The
backend holds the key; the extension only ever talks to `localhost:3000`
(or a deployed URL later).

- `backend/server.js` — Express app with:
  - `GET /health` — sanity check endpoint
  - `POST /summarize` — accepts `{ text, style }`, calls the Claude API
    via `@anthropic-ai/sdk`, returns `{ summary }`
- `cors()` middleware — required because the extension's popup/background
  make requests from a `chrome-extension://` origin, not a normal
  `https://` origin; without CORS enabled server-side, the browser blocks
  the response.
- A basic guardrail truncates incoming text to 15,000 characters before
  sending to the LLM — prevents runaway API cost from an unexpectedly
  huge scrape.

**Security consideration:** `.env` (containing the real API key) is
gitignored. Only `.env.example` (a template with no real secret) is
committed.

## Day 5 — Wire background service worker to the backend

- `service-worker.js` now handles a second message type,
  `SUMMARIZE_REQUEST`, sent by the popup.
- On receiving it: reads `latestScrape` from `chrome.storage.local`,
  `fetch()`s the backend's `/summarize` endpoint, and returns the result
  via `sendResponse`.
- **Architecture principle carried over from Day 3:** the popup never
  talks to the backend directly — it only ever messages the background
  service worker, which acts as the single source of truth and the only
  context that knows about the backend URL. This keeps the popup "dumb"
  (just UI) and centralizes all business logic in one place.
- `manifest.json` gained `"host_permissions": ["http://localhost:3000/*"]`
  so the service worker's `fetch()` calls to the backend aren't blocked.

## Day 6 — Popup UI: summary styles, copy, download, history

- Two summary styles (**Detailed** / **Bullet points**) — selected via
  radio buttons, sent as the `style` field in the `SUMMARIZE_REQUEST`
  message, and used server-side to change the prompt sent to the LLM.
- **Copy** — `navigator.clipboard.writeText()`.
- **Download** — builds a `Blob`, creates an `<a download>` link, and
  programmatically clicks it. No backend involvement needed for this.
- **History** — every successful summary is appended to
  `chrome.storage.local`'s `summaryHistory` array (capped at 20 entries
  to avoid unbounded growth), rendered in a separate "History" tab.

**Bug caught and fixed:** the first draft of history rendering used
`innerHTML` with template-string interpolation of `entry.url` and
`entry.summary`. Both values originate from untrusted sources (a scraped
webpage, and an LLM response) — using `innerHTML` there would be a
self-inflicted XSS vector if either ever contained markup. Fixed by
building the DOM with `createElement` + `textContent`, which never
executes markup, only displays it as plain text.

## Day 7 — Dark mode + final polish

- Dark mode implemented via a `data-theme` attribute on `<html>` and CSS
  custom properties (`--bg`, `--text`, `--accent`, etc.) — flipping one
  attribute swaps the whole palette instead of duplicating every rule.
- Preference persisted via `chrome.storage.sync` (not `.local`) — small
  piece of data, and syncing it across a user's signed-in Chrome
  instances is the appropriate use case for `sync` over `local`
  (revisit Day 3's quiz on this distinction).

## Full data flow (final architecture)

```
Page loads / mutates
  → content-script scrapes + cleans (scraper.js + cleaner.js)
  → sends SCRAPED_CONTENT to background
  → background saves to chrome.storage.local

User clicks "Summarize" in popup
  → popup sends SUMMARIZE_REQUEST { style } to background
  → background reads latestScrape from storage
  → background POSTs { text, style } to Express backend (localhost:3000)
  → backend calls Claude API, returns { summary }
  → background saves entry to summaryHistory, returns summary to popup
  → popup displays summary, enables Copy/Download
```

## Common mistakes hit and fixed this session
1. Chaining `import`/`export` into content scripts — not supported by
   Manifest V3's declarative `content_scripts` entry (only the background
   service worker supports `"type": "module"`).
2. Flattening DOM to text (`.innerText`) *before* cleaning, instead of
   after — cleaning needs the DOM structure to selectively remove nodes.
3. Not stripping `<style>`/`<script>`/`<noscript>`/`<template>` tags —
   caused raw CSS to leak into scraped text on sites using inline
   TemplateStyles (e.g. Wikipedia).
4. Using `chrome.runtime.sendMessage` (extension-to-extension) when
   `chrome.tabs.sendMessage` (extension-to-a-specific-tab's-content-script)
   was needed instead.
5. `innerHTML` with untrusted, LLM/scrape-derived content — fixed with
   `textContent` + `createElement`.

## Setup instructions

**Backend:**
```bash
cd backend
npm install
cp .env.example .env
# edit .env, add your real ANTHROPIC_API_KEY
npm start
```

**Extension:**
1. `chrome://extensions` → reload the unpacked extension
2. Visit any `https://` page, let it scrape
3. Open the popup → click **Summarize**
