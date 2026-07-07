// service-worker.js
// Event-driven, not persistent. In-memory variables here do NOT survive
// the worker going idle — anything that must persist goes into
// chrome.storage.local instead.

const BACKEND_URL = "http://localhost:3000";

chrome.runtime.onInstalled.addListener((details) => {
  console.log("[service-worker] Extension installed. Reason:", details.reason);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // --- Content script pushes freshly scraped page text ---
  if (message.type === "SCRAPED_CONTENT") {
    const record = {
      url: message.url,
      text: message.payload,
      scrapedAt: new Date().toISOString(),
    };

    chrome.storage.local.set({ latestScrape: record }, () => {
      console.log("[service-worker] Saved latest scrape to storage:", record.url);
      sendResponse({ status: "saved" });
    });

    return true; // async sendResponse — keep channel open
  }

  // --- Popup asks us to summarize the latest scraped text ---
  if (message.type === "SUMMARIZE_REQUEST") {
    (async () => {
      try {
        const { latestScrape } = await chrome.storage.local.get("latestScrape");

        if (!latestScrape || !latestScrape.text) {
          sendResponse({ error: "No scraped content available yet." });
          return;
        }

        const res = await fetch(`${BACKEND_URL}/summarize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: latestScrape.text,
            style: message.style || "detailed",
          }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          sendResponse({ error: errBody.error || `Backend error (${res.status})` });
          return;
        }

        const data = await res.json();

        // Save to history (Day 6 feature) alongside the summary
        const historyEntry = {
          url: latestScrape.url,
          summary: data.summary,
          style: message.style || "detailed",
          createdAt: new Date().toISOString(),
        };

        const { summaryHistory = [] } = await chrome.storage.local.get("summaryHistory");
        const updatedHistory = [historyEntry, ...summaryHistory].slice(0, 20); // cap at 20 entries
        await chrome.storage.local.set({ summaryHistory: updatedHistory });

        sendResponse({ summary: data.summary });
      } catch (err) {
        console.error("[service-worker] Summarize error:", err.message);
        sendResponse({ error: "Could not reach backend. Is it running on localhost:3000?" });
      }
    })();

    return true; // async sendResponse — keep channel open
  }
});
