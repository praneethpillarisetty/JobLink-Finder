/**
 * Extract job links from Google Search result pages.
 * Runs only on https://www.google.com/search* and responds on-demand.
 */
(() => {
  const storageApi = window.JobLinkStorage || {
    ATS_RULES: [
      { key: 'Workday', patterns: ['myworkdayjobs.com', 'myworkdaysite.com'] },
      { key: 'Greenhouse', patterns: ['boards.greenhouse.io', 'greenhouse.io'] },
      { key: 'Lever', patterns: ['jobs.lever.co'] },
      { key: 'Ashby', patterns: ['jobs.ashbyhq.com', 'ashbyhq.com'] },
      { key: 'SmartRecruiters', patterns: ['smartrecruiters.com'] },
      { key: 'iCIMS', patterns: ['icims.com'] },
      { key: 'SuccessFactors', patterns: ['successfactors.com'] },
      { key: 'Oracle Cloud', patterns: ['oraclecloud.com'] },
      { key: 'BambooHR', patterns: ['bamboohr.com'] },
      { key: 'LinkedIn Jobs', patterns: ['linkedin.com/jobs'] }
    ],
    normalizeUrl(url) {
      try {
        const parsed = new URL(url);
        parsed.hash = '';
        if (parsed.pathname.endsWith('/')) parsed.pathname = parsed.pathname.slice(0, -1);
        return parsed.toString();
      } catch {
        return url;
      }
    }
  };

  const ATS_PATTERNS = storageApi.ATS_RULES.flatMap((rule) => rule.patterns);
  const CAREER_HINTS = ['/careers', '/career', '/jobs', '/job', 'job-boards', 'job_board'];

  function unwrapGoogleUrl(href) {
    try {
      const url = new URL(href, window.location.origin);
      if (url.hostname.includes('google.') && url.pathname === '/url') {
        return url.searchParams.get('q') || url.searchParams.get('url') || '';
      }
      return url.href;
    } catch {
      return href || '';
    }
  }

  function isPotentialJobLink(url) {
    const lowered = (url || '').toLowerCase();
    if (!lowered.startsWith('http')) return false;
    if (lowered.includes('google.com') || lowered.includes('webcache') || lowered.includes('policies.google')) {
      return false;
    }
    if (ATS_PATTERNS.some((pattern) => lowered.includes(pattern))) {
      return true;
    }
    return CAREER_HINTS.some((hint) => lowered.includes(hint));
  }

  function cleanTitle(text) {
    return (text || '')
      .replace(/\s+/g, ' ')
      .replace(/\s+-\s+Google Search$/i, '')
      .trim() || 'Untitled Job Lead';
  }

  function findTitle(anchor) {
    const container = anchor.closest('div.g, div[data-sokoban-container], div.MjjYud, div[jscontroller]');
    const heading = container?.querySelector('h3') || anchor.querySelector('h3');
    return cleanTitle(heading?.textContent || anchor.textContent);
  }

  function extractGoogleResultLinks(query) {
    const anchors = [...document.querySelectorAll('a[href]')];
    const unique = new Map();

    for (const anchor of anchors) {
      const rawHref = anchor.getAttribute('href') || '';
      const url = unwrapGoogleUrl(rawHref);
      if (!isPotentialJobLink(url)) continue;

      const normalized = storageApi.normalizeUrl(url);
      if (!normalized || unique.has(normalized)) continue;

      unique.set(normalized, {
        title: findTitle(anchor),
        url: normalized,
        query
      });
    }

    return [...unique.values()];
  }

  if (!window.__JOBLINK_EXTRACTOR_BOUND__) {
    window.__JOBLINK_EXTRACTOR_BOUND__ = true;
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
  }
})();
