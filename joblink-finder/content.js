/**
 * Extract job links from Google Search result pages.
 * Runs only on https://www.google.com/search* and responds on-demand.
 */
(() => {
  if (!window.JobLinkStorage) {
    return;
  }

  const ATS_PATTERNS = window.JobLinkStorage.ATS_RULES.flatMap((rule) => rule.patterns);
  const CAREER_HINTS = ['/careers', '/career', '/jobs', '/job'];

  function isPotentialJobLink(url) {
    const lowered = (url || '').toLowerCase();
    if (ATS_PATTERNS.some((pattern) => lowered.includes(pattern))) {
      return true;
    }

    // Direct company career pages (keyword-based fallback)
    return CAREER_HINTS.some((hint) => lowered.includes(hint));
  }

  function extractGoogleResultLinks(query) {
    const anchors = [...document.querySelectorAll('a[href]')];

    const candidates = anchors
      .map((anchor) => {
        const href = anchor.getAttribute('href') || '';
        if (!href.startsWith('http')) {
          return null;
        }

        const container = anchor.closest('div.g, div[data-sokoban-container], div.MjjYud');
        if (!container) {
          return null;
        }

        const heading = container.querySelector('h3');
        const title = heading ? heading.textContent.trim() : anchor.textContent.trim();
        if (!title) {
          return null;
        }

        return { title, url: href, query };
      })
      .filter(Boolean)
      .filter((item) => isPotentialJobLink(item.url));

    const unique = new Map();
    for (const item of candidates) {
      const key = window.JobLinkStorage.normalizeUrl(item.url);
      if (!unique.has(key)) {
        unique.set(key, item);
      }
    }

    return [...unique.values()];
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== 'JOBLINK_EXTRACT_RESULTS') {
      return false;
    }

    try {
      const query = message?.payload?.query || '';
      const results = extractGoogleResultLinks(query);
      sendResponse({ ok: true, results });
    } catch (error) {
      sendResponse({ ok: false, error: error.message || 'Extraction failed', results: [] });
    }

    return true;
  });
})();
