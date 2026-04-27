/**
 * Local persistence and normalization helpers for JobLink Finder.
 * Uses chrome.storage.local only.
 */
(() => {
  const STORAGE_KEY = 'joblinkFinderJobs';

  const STATUS_VALUES = Object.freeze(['Saved', 'Applied', 'Interview', 'Rejected']);

  const ATS_RULES = Object.freeze([
    { key: 'Workday', patterns: ['myworkdayjobs.com', 'myworkdaysite.com'] },
    { key: 'Greenhouse', patterns: ['boards.greenhouse.io', 'greenhouse.io'] },
    { key: 'Lever', patterns: ['jobs.lever.co'] },
    { key: 'Ashby', patterns: ['jobs.ashbyhq.com', 'ashbyhq.com'] },
    { key: 'SmartRecruiters', patterns: ['smartrecruiters.com'] },
    { key: 'iCIMS', patterns: ['icims.com'] },
    { key: 'SuccessFactors', patterns: ['successfactors.com'] },
    { key: 'Oracle', patterns: ['oraclecloud.com'] },
    { key: 'BambooHR', patterns: ['bamboohr.com'] },
    { key: 'LinkedIn', patterns: ['linkedin.com/jobs'] }
  ]);

  function getAllJobs() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        resolve(Array.isArray(result[STORAGE_KEY]) ? result[STORAGE_KEY] : []);
      });
    });
  }

  function setAllJobs(jobs) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [STORAGE_KEY]: jobs }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        resolve();
      });
    });
  }

  function normalizeUrl(url) {
    try {
      const parsed = new URL(url);
      parsed.hash = '';
      const trackingKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'gclid'];
      for (const key of trackingKeys) {
        parsed.searchParams.delete(key);
      }
      if (parsed.pathname.endsWith('/')) {
        parsed.pathname = parsed.pathname.slice(0, -1);
      }
      return parsed.toString();
    } catch {
      return url;
    }
  }

  function detectSource(url) {
    const normalized = normalizeUrl(url).toLowerCase();
    const found = ATS_RULES.find((rule) =>
      rule.patterns.some((pattern) => normalized.includes(pattern))
    );
    return found ? found.key : 'Other';
  }

  function createJobRecord(partial) {
    const url = normalizeUrl(partial.url || '');
    return {
      id: partial.id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      title: (partial.title || 'Untitled Job').trim(),
      url,
      source: partial.source || detectSource(url),
      status: STATUS_VALUES.includes(partial.status) ? partial.status : 'Saved',
      query: (partial.query || '').trim(),
      dateSaved: partial.dateSaved || new Date().toISOString()
    };
  }

  async function upsertJobs(items) {
    const existing = await getAllJobs();
    const byUrl = new Map(existing.map((job) => [normalizeUrl(job.url), job]));

    for (const item of items) {
      const candidate = createJobRecord(item);
      if (!candidate.url) {
        continue;
      }
      if (!byUrl.has(candidate.url)) {
        byUrl.set(candidate.url, candidate);
      }
    }

    const jobs = [...byUrl.values()].sort(
      (a, b) => new Date(b.dateSaved).getTime() - new Date(a.dateSaved).getTime()
    );
    await setAllJobs(jobs);
    return jobs;
  }

  async function updateStatus(id, status) {
    if (!STATUS_VALUES.includes(status)) {
      throw new Error('Invalid status value');
    }
    const jobs = await getAllJobs();
    const updated = jobs.map((job) => (job.id === id ? { ...job, status } : job));
    await setAllJobs(updated);
    return updated;
  }

  async function deleteJob(id) {
    const jobs = await getAllJobs();
    const updated = jobs.filter((job) => job.id !== id);
    await setAllJobs(updated);
    return updated;
  }

  async function clearJobs() {
    await setAllJobs([]);
    return [];
  }

  const api = {
    STORAGE_KEY,
    STATUS_VALUES,
    ATS_RULES,
    getAllJobs,
    setAllJobs,
    upsertJobs,
    updateStatus,
    deleteJob,
    clearJobs,
    detectSource,
    normalizeUrl,
    createJobRecord
  };

  if (typeof window !== 'undefined') {
    window.JobLinkStorage = api;
  }

  if (typeof self !== 'undefined' && typeof window === 'undefined') {
    self.JobLinkStorage = api;
  }
})();
