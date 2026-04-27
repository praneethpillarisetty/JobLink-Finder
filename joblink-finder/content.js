(() => {
  const ATS_PATTERNS = [
    'myworkdayjobs.com',
    'myworkdaysite.com',
    'boards.greenhouse.io',
    'greenhouse.io',
    'jobs.lever.co',
    'jobs.ashbyhq.com',
    'smartrecruiters.com',
    'icims.com',
    'successfactors.com',
    'oraclecloud.com',
    'bamboohr.com',
    'linkedin.com/jobs'
  ];

  function normalizeUrl(url) {
    try {
      const parsed = new URL(url);
      parsed.hash = '';
      parsed.searchParams.delete('utm_source');
      parsed.searchParams.delete('utm_medium');
      parsed.searchParams.delete('utm_campaign');
      return parsed.toString();
    } catch {
      return url;
    }
  }

  function detectSource(url) {
    const lowered = url.toLowerCase();
    if (lowered.includes('workday')) return 'Workday';
    if (lowered.includes('greenhouse')) return 'Greenhouse';
    if (lowered.includes('lever')) return 'Lever';
    if (lowered.includes('ashbyhq')) return 'Ashby';
    if (lowered.includes('smartrecruiters')) return 'SmartRecruiters';
    if (lowered.includes('icims')) return 'iCIMS';
    if (lowered.includes('successfactors')) return 'SuccessFactors';
    if (lowered.includes('oraclecloud')) return 'Oracle';
    if (lowered.includes('bamboohr')) return 'BambooHR';
    if (lowered.includes('linkedin.com/jobs')) return 'LinkedIn';
    return 'Other';
  }

  function isSupportedJobUrl(url) {
    const lowered = (url || '').toLowerCase();
    return ATS_PATTERNS.some((domain) => lowered.includes(domain));
  }

  function extractVisibleResults(query) {
    const cards = document.querySelectorAll('div.g, div[data-sokoban-container], div.MjjYud');
    const unique = new Map();

    cards.forEach((card) => {
      const anchor = card.querySelector('a[href^="http"]');
      const heading = card.querySelector('h3');
      if (!anchor || !heading) {
        return;
      }

      const url = normalizeUrl(anchor.href);
      if (!isSupportedJobUrl(url)) {
        return;
      }

      if (!unique.has(url)) {
        unique.set(url, {
          title: heading.textContent.trim() || 'Untitled Job',
          url,
          source: detectSource(url),
          query
        });
      }
    });

    return [...unique.values()];
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== 'JOBLINK_EXTRACT_RESULTS') {
      return false;
    }

    const query = message.payload?.query || '';
    const results = extractVisibleResults(query);
    sendResponse({ results });
    return true;
  });
})();
