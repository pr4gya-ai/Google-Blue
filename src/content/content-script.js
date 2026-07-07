// content-script.js
// Orchestrator: decides WHEN to scrape (Day 2 logic unchanged), and now
// also PUSHES results to the background service worker, and LISTENS for
// on-demand refresh requests from the popup.

console.log("[content-script] Injected into:", window.location.href);

function scrapePage() {
  const rootElement = findContentRoot();
  const cleanedText = removeNoise(rootElement);

  console.log("[content-script] Cleaned text (first 300 chars):");
  console.log(cleanedText.slice(0, 300));

  // Push the result up to the background service worker.
  chrome.runtime.sendMessage(
    {
      type: "SCRAPED_CONTENT",
      payload: cleanedText,
      url: window.location.href,
    },
    (response) => {
      // This callback only fires if the background listener called
      // sendResponse AND returned true. Good way to sanity-check the
      // message actually arrived.
      if (response) {
        console.log("[content-script] Background acknowledged:", response.status);
      }
    }
  );
}

// Initial scrape on load
scrapePage();

// --- MutationObserver (Day 2, unchanged) ---
let debounceTimer;
const observer = new MutationObserver(() => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    console.log("[content-script] DOM changed. Re-scraping...");
    scrapePage();
  }, 1000);
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: true,
});

// --- Listen for on-demand refresh requests from the popup ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "REQUEST_SCRAPE") {
    console.log("[content-script] Refresh requested by popup.");
    scrapePage();
    sendResponse({ status: "refreshed" });
  }
});
