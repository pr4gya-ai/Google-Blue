# 🧠 AI Webpage Summarizer (Chrome Extension)

A Manifest V3 Chrome extension that scrapes any webpage — job listings,
news articles, product pages, blogs, LinkedIn posts — and summarizes the
content using an LLM API (Claude), via a Node/Express backend.

---

## 📌 Status

✅ **Core project complete** — scrapes any `https://` page, cleans the
content, sends it to a backend that calls the Claude API, and displays
the summary in the popup with style selection, copy, download, history,
and dark mode.

---

## 📖 Progress Log

| Day(s) | Topic | Doc |
|--------|-------|-----|
| 1 | MV3 skeleton, architecture, execution contexts | [docs/day-1.md](docs/day-1.md) |
| 2 | DOM scraping, noise removal, `MutationObserver` | [docs/day-2.md](docs/day-2.md) |
| 4-7 | Backend, LLM integration, full popup UI, extra features | [docs/day-4-to-7.md](docs/day-4-to-7.md) |

---

## ⚙️ Setup

**1. Backend**
```bash
cd backend
npm install
cp .env.example .env
# edit .env and add your real ANTHROPIC_API_KEY
npm start
```
Server runs at `http://localhost:3000`.

**2. Extension**
1. Open `chrome://extensions`, enable **Developer Mode**
2. Click **Load unpacked**, select this project's root folder
3. Visit any `https://` page (it scrapes automatically)
4. Open the popup, pick a summary style, click **Summarize**

---

## 🏗️ Architecture

```
Page loads/mutates
  → content-script scrapes + cleans
  → sends SCRAPED_CONTENT to background → saved in chrome.storage.local

Popup "Summarize" click
  → sends SUMMARIZE_REQUEST to background
  → background reads latestScrape, POSTs to Express backend
  → backend calls Claude API, returns summary
  → background saves to history, returns summary to popup
```

| File | Responsibility |
|------|------------------|
| `manifest.json` | MV3 config — wires up popup, background, content scripts, host permissions |
| `src/background/service-worker.js` | Handles scraped-content storage + backend calls |
| `src/content/scraper.js` | Finds the main content element on a page |
| `src/content/cleaner.js` | Strips nav/ads/scripts/styles from a cloned element |
| `src/content/content-script.js` | Orchestrates scrape + clean + `MutationObserver` |
| `src/popup/` | Toolbar popup UI — summarize, history, dark mode |
| `backend/server.js` | Express server, `/summarize` endpoint calling Claude API |

---

## 🧰 Tech Stack

`JavaScript (ES6+)` · `HTML/CSS` · `Manifest V3` · `Chrome APIs` ·
`MutationObserver` · `Node.js` · `Express` · `Claude API` · `Git`

---

## 🗺️ Roadmap

- [x] Day 1 — MV3 skeleton & architecture
- [x] Day 2 — DOM scraping, cleaning, `MutationObserver`
- [x] Day 3 — Message passing (content script ↔ background ↔ popup)
- [x] Day 4 — Node/Express backend + LLM API integration
- [x] Day 5 — Background-to-backend wiring
- [x] Day 6 — Summary styles, copy, download, history
- [x] Day 7 — Dark mode, final polish
