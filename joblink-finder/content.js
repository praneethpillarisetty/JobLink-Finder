/**
 * Extract ATS job links from Google Search results and save to local storage.
 * Runs only on https://www.google.com/search*.
 */
(async () => {
  if (!window.JobLinkStorage) {
    return;
  }

  const ATS_PATTERNS = window.JobLinkStorage.ATS_RULES.flatMap((rule) => rule.patterns);

  function isAtsLink(url) {
    const lowered = (url || '').toLowerCase();
    return ATS_PATTERNS.some((pattern) => lowered.includes(pattern));
  }

  function getCurrentQuery() {
    const params = new URLSearchParams(window.location.search);
    return params.get('q') || '';
  }

  function extractGoogleResultLinks() {
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

        return { title, url: href };
      })
      .filter(Boolean)
      .filter((item) => isAtsLink(item.url));

    const unique = new Map();
    for (const item of candidates) {
      const key = window.JobLinkStorage.normalizeUrl(item.url);
      if (!unique.has(key)) {
        unique.set(key, item);
      }
    }

    return [...unique.values()];
  }

  try {
    const query = getCurrentQuery();
    const links = extractGoogleResultLinks();

    if (!links.length) {
      return;
    }

    const records = links.map((link) => ({
      title: link.title,
      url: link.url,
      source: window.JobLinkStorage.detectSource(link.url),
      query,
      status: 'Saved',
      dateSaved: new Date().toISOString()
    }));

    await window.JobLinkStorage.upsertJobs(records);
  } catch (error) {
    console.error('JobLink Finder: unable to process search results.', error);
  }
})();
