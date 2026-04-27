/* global JobLinkStorage */
importScripts('storage.js');

const GOOGLE_LOAD_TIMEOUT_MS = 15000;
const GOOGLE_STABILIZE_DELAY_MS = 1200;
const BETWEEN_REQUEST_DELAY_MS = 700;
const MAX_CONCURRENT_TABS = 3;
const MAX_QUERIES = 12;
const MAX_OPEN_RESULT_TABS = 12;

const ATS_SITES = Object.freeze([
  'site:myworkdayjobs.com',
  'site:wd1.myworkdaysite.com',
  'site:boards.greenhouse.io',
  'site:greenhouse.io',
  'site:jobs.lever.co',
  'site:jobs.ashbyhq.com',
  'site:smartrecruiters.com',
  'site:icims.com',
  'site:successfactors.com',
  'site:oraclecloud.com',
  'site:bamboohr.com',
  'site:linkedin.com/jobs'
]);

const STATE_KEY = 'joblinkFinderSearchState';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function quotePhrase(value) {
  return `"${value.trim().replace(/\s+/g, ' ')}"`;
}

function toTerms(value) {
  return value
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function normalizeTitle(title) {
  return (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function generateQueries(input) {
  const title = (input.jobTitle || '').trim();
  const location = (input.location || '').trim();
  const workMode = (input.workMode || '').trim();
  const keywords = (input.keywords || '').trim();
  const company = (input.company || '').trim();
  const visa = Boolean(input.visaSponsorship);

  const keywordTerms = toTerms(keywords);

  const variations = [];
  variations.push(`${quotePhrase(title)} ${workMode ? quotePhrase(workMode) : ''}`.trim());
  if (keywordTerms.length) {
    variations.push(`${quotePhrase(title)} ${keywordTerms.map(quotePhrase).join(' ')}`);
  }
  variations.push(`${title} ${workMode || 'remote'} jobs ${location}`.trim());
  if (visa) {
    variations.push(`${quotePhrase(title)} "visa sponsorship" ${location}`.trim());
  }
  if (company) {
    variations.push(`"careers" ${quotePhrase(title)} ${quotePhrase(company)} ${location}`.trim());
  }
  variations.push(`${quotePhrase(title)} "careers" ${location}`.trim());

  const scopedQueries = [];
  for (const variation of variations) {
    for (const site of ATS_SITES) {
      scopedQueries.push(`${site} ${variation}`.trim());
    }
  }

  return [...new Set(scopedQueries)].slice(0, MAX_QUERIES);
}

async function setSearchState(partial) {
  const current = await new Promise((resolve) => {
    chrome.storage.local.get([STATE_KEY], (result) => resolve(result[STATE_KEY] || {}));
  });

  await new Promise((resolve, reject) => {
    chrome.storage.local.set(
      {
        [STATE_KEY]: {
          ...current,
          ...partial,
          updatedAt: new Date().toISOString()
        }
      },
      () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        resolve();
      }
    );
  });
}

function waitForTabComplete(tabId, timeoutMs = GOOGLE_LOAD_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    let done = false;

    const timeout = setTimeout(() => {
      if (done) return;
      done = true;
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error(`Timeout waiting for tab ${tabId}`));
    }, timeoutMs);

    function listener(updatedTabId, info) {
      if (updatedTabId === tabId && info.status === 'complete' && !done) {
        done = true;
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }

    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function extractFromGoogleTab(query) {
  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=20`;
  const tab = await chrome.tabs.create({ url, active: false });

  try {
    await waitForTabComplete(tab.id);
    await sleep(GOOGLE_STABILIZE_DELAY_MS);
    // Explicitly use chrome.scripting in the automation flow to verify page readiness.
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.readyState
    });

    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'JOBLINK_EXTRACT_RESULTS',
      payload: { query }
    });

    return Array.isArray(response?.results) ? response.results : [];
  } catch (error) {
    console.warn('JobLink Finder extraction failed for query:', query, error);
    return [];
  } finally {
    await chrome.tabs.remove(tab.id).catch(() => undefined);
  }
}

async function runQueue(queries) {
  const queue = [...queries];
  const results = [];

  const workers = Array.from({ length: Math.min(MAX_CONCURRENT_TABS, queue.length) }, async () => {
    while (queue.length) {
      const query = queue.shift();
      const extracted = await extractFromGoogleTab(query);
      results.push(...extracted);
      await sleep(BETWEEN_REQUEST_DELAY_MS);
    }
  });

  await Promise.all(workers);
  return results;
}

function dedupeJobs(records) {
  const uniqueByUrl = new Set();
  const uniqueByTitleDomain = new Set();
  const output = [];

  for (const record of records) {
    const normalizedUrl = JobLinkStorage.normalizeUrl(record.url || '');
    if (!normalizedUrl || uniqueByUrl.has(normalizedUrl)) {
      continue;
    }

    const titleDomainKey = `${normalizeTitle(record.title)}::${getDomain(normalizedUrl)}`;
    if (uniqueByTitleDomain.has(titleDomainKey)) {
      continue;
    }

    uniqueByUrl.add(normalizedUrl);
    uniqueByTitleDomain.add(titleDomainKey);

    output.push(
      JobLinkStorage.createJobRecord({
        title: record.title,
        url: normalizedUrl,
        source: record.source || JobLinkStorage.detectSource(normalizedUrl),
        status: 'Saved',
        query: record.query || '',
        dateSaved: new Date().toISOString()
      })
    );
  }

  return output;
}

async function maybeOpenResultTabs(records, shouldOpenTabs) {
  if (!shouldOpenTabs) {
    return;
  }

  const top = records.slice(0, MAX_OPEN_RESULT_TABS);
  for (const record of top) {
    await chrome.tabs.create({ url: record.url, active: false });
    await sleep(120);
  }
}

async function runAutomatedSearch(payload) {
  const queries = generateQueries(payload).slice(0, MAX_QUERIES);
  if (!queries.length) {
    throw new Error('Unable to generate search queries. Add a job title.');
  }

  await setSearchState({ running: true, lastError: '', scannedQueries: queries.length });

  const extracted = await runQueue(queries);
  const deduped = dedupeJobs(extracted);
  const allJobs = await JobLinkStorage.upsertJobs(deduped);

  await maybeOpenResultTabs(deduped, payload.openResultsInTabs);

  await setSearchState({
    running: false,
    lastError: '',
    lastRun: {
      totalExtracted: extracted.length,
      totalSavedAfterDedup: deduped.length,
      completedAt: new Date().toISOString()
    }
  });

  return {
    extracted: extracted.length,
    saved: deduped.length,
    totalStored: allJobs.length
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'JOBLINK_START_SEARCH') {
    runAutomatedSearch(message.payload)
      .then((summary) => sendResponse({ ok: true, summary }))
      .catch(async (error) => {
        await setSearchState({ running: false, lastError: error.message });
        sendResponse({ ok: false, error: error.message });
      });
    return true;
  }

  if (message?.type === 'JOBLINK_GET_STATE') {
    chrome.storage.local.get([STATE_KEY], (result) => {
      sendResponse({ ok: true, state: result[STATE_KEY] || {} });
    });
    return true;
  }

  return false;
});
