// popup.js
// IMPORTANT: this entire context is destroyed the instant the popup closes.
// Anything that must persist (theme preference, history, latest scrape)
// lives in chrome.storage, never in a plain JS variable here.

console.log("[popup] popup.js loaded");

const els = {
  darkModeToggle: document.getElementById("darkModeToggle"),
  tabSummarize: document.getElementById("tabSummarize"),
  tabHistory: document.getElementById("tabHistory"),
  summarizeView: document.getElementById("summarizeView"),
  historyView: document.getElementById("historyView"),
  refreshBtn: document.getElementById("refreshBtn"),
  sourceUrl: document.getElementById("sourceUrl"),
  scrapedAt: document.getElementById("scrapedAt"),
  summarizeBtn: document.getElementById("summarizeBtn"),
  statusMsg: document.getElementById("statusMsg"),
  summaryOutput: document.getElementById("summaryOutput"),
  summaryActions: document.getElementById("summaryActions"),
  copyBtn: document.getElementById("copyBtn"),
  downloadBtn: document.getElementById("downloadBtn"),
  historyList: document.getElementById("historyList"),
};

// ---------------------------------------------------------------------
// DARK MODE — preference persisted via chrome.storage.sync (small piece
// of data, and syncing it across the user's signed-in Chrome instances
// is a nice touch — this is exactly the local vs sync tradeoff from
// Day 3's quiz).
// ---------------------------------------------------------------------
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  els.darkModeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
}

chrome.storage.sync.get("theme", (result) => {
  applyTheme(result.theme || "light");
});

els.darkModeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  applyTheme(next);
  chrome.storage.sync.set({ theme: next });
});

// ---------------------------------------------------------------------
// TABS
// ---------------------------------------------------------------------
function showTab(tab) {
  const isSummarize = tab === "summarize";
  els.summarizeView.hidden = !isSummarize;
  els.historyView.hidden = isSummarize;
  els.tabSummarize.classList.toggle("active", isSummarize);
  els.tabHistory.classList.toggle("active", !isSummarize);
  if (!isSummarize) renderHistory();
}

els.tabSummarize.addEventListener("click", () => showTab("summarize"));
els.tabHistory.addEventListener("click", () => showTab("history"));

// ---------------------------------------------------------------------
// LOAD LATEST SCRAPE (shown at top of Summarize tab)
// ---------------------------------------------------------------------
function renderScrapeMeta(record) {
  if (!record) {
    els.sourceUrl.textContent = "No scrape data yet. Visit a page first.";
    els.scrapedAt.textContent = "";
    return;
  }
  els.sourceUrl.textContent = `Source: ${record.url}`;
  els.scrapedAt.textContent = `Scraped at: ${new Date(record.scrapedAt).toLocaleTimeString()}`;
}

function loadLatestScrape() {
  chrome.storage.local.get("latestScrape", (result) => {
    renderScrapeMeta(result.latestScrape);
  });
}

loadLatestScrape();

// ---------------------------------------------------------------------
// REFRESH BUTTON — re-trigger scrape on the active tab's content script
// ---------------------------------------------------------------------
els.refreshBtn.addEventListener("click", () => {
  els.refreshBtn.disabled = true;
  els.refreshBtn.textContent = "🔄 Refreshing...";

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];

    if (!activeTab) {
      els.refreshBtn.disabled = false;
      els.refreshBtn.textContent = "🔄 Refresh Page Content";
      return;
    }

    chrome.tabs.sendMessage(activeTab.id, { type: "REQUEST_SCRAPE" }, () => {
      els.refreshBtn.disabled = false;
      els.refreshBtn.textContent = "🔄 Refresh Page Content";

      if (chrome.runtime.lastError) {
        console.log("[popup] No content script in this tab:", chrome.runtime.lastError.message);
        els.sourceUrl.textContent = "⚠️ Can't scrape this tab (restricted page, or tab needs a refresh).";
        els.scrapedAt.textContent = "";
        return;
      }

      setTimeout(loadLatestScrape, 500);
    });
  });
});

// ---------------------------------------------------------------------
// SUMMARIZE BUTTON — ask the background service worker to call the
// backend, which calls the LLM API. The popup never talks to the
// backend or the LLM directly — background is the single source of
// truth (Day 3's architecture principle).
// ---------------------------------------------------------------------
els.summarizeBtn.addEventListener("click", () => {
  const style = document.querySelector('input[name="style"]:checked').value;

  els.summarizeBtn.disabled = true;
  els.statusMsg.textContent = "Summarizing... this can take a few seconds.";
  els.summaryOutput.hidden = true;
  els.summaryActions.hidden = true;

  chrome.runtime.sendMessage({ type: "SUMMARIZE_REQUEST", style }, (response) => {
    els.summarizeBtn.disabled = false;

    if (chrome.runtime.lastError) {
      els.statusMsg.textContent = "⚠️ Extension error: " + chrome.runtime.lastError.message;
      return;
    }

    if (!response || response.error) {
      els.statusMsg.textContent = "⚠️ " + (response ? response.error : "Unknown error.");
      return;
    }

    els.statusMsg.textContent = "";
    els.summaryOutput.textContent = response.summary;
    els.summaryOutput.hidden = false;
    els.summaryActions.hidden = false;
  });
});

// ---------------------------------------------------------------------
// COPY / DOWNLOAD
// ---------------------------------------------------------------------
els.copyBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(els.summaryOutput.textContent).then(() => {
    els.copyBtn.textContent = "✅ Copied";
    setTimeout(() => (els.copyBtn.textContent = "📋 Copy"), 1500);
  });
});

els.downloadBtn.addEventListener("click", () => {
  const blob = new Blob([els.summaryOutput.textContent], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `summary-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
});

// ---------------------------------------------------------------------
// HISTORY TAB
// ---------------------------------------------------------------------
function renderHistory() {
  chrome.storage.local.get("summaryHistory", (result) => {
    const history = result.summaryHistory || [];
    els.historyList.innerHTML = ""; // clear safely (no untrusted content involved)

    if (history.length === 0) {
      const empty = document.createElement("p");
      empty.className = "meta";
      empty.textContent = "No summaries yet.";
      els.historyList.appendChild(empty);
      return;
    }

    history.forEach((entry) => {
      const item = document.createElement("div");
      item.className = "history-item";

      const meta = document.createElement("div");
      meta.className = "h-url";
      // textContent, NOT innerHTML — entry.url/summary came from a
      // scraped webpage and an LLM response, both untrusted sources.
      // Using innerHTML here would be a self-inflicted XSS vector.
      meta.textContent = `${entry.url} — ${new Date(entry.createdAt).toLocaleString()} (${entry.style})`;

      const summary = document.createElement("div");
      summary.className = "h-summary";
      summary.textContent = entry.summary;

      item.appendChild(meta);
      item.appendChild(summary);
      els.historyList.appendChild(item);
    });
  });
}
