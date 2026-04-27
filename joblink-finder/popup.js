(() => {
  const ATS_QUERY_PARTS = Object.freeze({
    Workday: '(site:myworkdayjobs.com OR site:wd1.myworkdaysite.com)',
    Greenhouse: 'site:boards.greenhouse.io',
    Lever: 'site:jobs.lever.co',
    Ashby: 'site:ashbyhq.com',
    SmartRecruiters: 'site:smartrecruiters.com',
    iCIMS: 'site:icims.com',
    SuccessFactors: 'site:successfactors.com',
    Oracle: '(site:oraclecloud.com OR site:oracle.com)'
  });

  const ALL_ATS_QUERY = `(${Object.values(ATS_QUERY_PARTS).join(' OR ')})`;

  const els = {
    form: document.getElementById('queryForm'),
    jobTitle: document.getElementById('jobTitle'),
    location: document.getElementById('location'),
    workMode: document.getElementById('workMode'),
    keywords: document.getElementById('keywords'),
    visa: document.getElementById('visaSponsorship'),
    ats: document.getElementById('atsPlatform'),
    generatedQuery: document.getElementById('generatedQuery'),
    copyQuery: document.getElementById('copyQuery'),
    jobList: document.getElementById('jobList'),
    jobCount: document.getElementById('jobCount'),
    exportCsv: document.getElementById('exportCsv'),
    clearAll: document.getElementById('clearAll'),
    statusMessage: document.getElementById('statusMessage')
  };

  function setStatus(message) {
    els.statusMessage.textContent = message;
  }

  function quoteWords(text) {
    return text
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((token) => `"${token}"`)
      .join(' ');
  }

  function buildQuery() {
    const title = els.jobTitle.value.trim();
    const location = els.location.value.trim();
    const workMode = els.workMode.value;
    const keywords = els.keywords.value.trim();
    const includeVisa = els.visa.checked;
    const ats = els.ats.value;

    const atsPart = ats === 'All' ? ALL_ATS_QUERY : ATS_QUERY_PARTS[ats];
    const parts = [atsPart];

    if (title) {
      parts.push(`(${quoteWords(title)})`);
    }
    if (location) {
      parts.push(`(${quoteWords(location)})`);
    }
    if (workMode) {
      parts.push(`("${workMode}")`);
    }
    if (keywords) {
      parts.push(`(${quoteWords(keywords)})`);
    }
    if (includeVisa) {
      parts.push('(\"visa sponsorship\" OR \"sponsorship available\")');
    }

    parts.push('(-intern -seniority:internship)');

    return parts.join(' ');
  }

  function toCsv(jobs) {
    const headers = ['id', 'title', 'url', 'source', 'status', 'query', 'dateSaved'];
    const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const rows = [headers.join(',')];

    for (const job of jobs) {
      rows.push(headers.map((header) => escape(job[header])).join(','));
    }

    return rows.join('\n');
  }

  async function exportCsv() {
    const jobs = await window.JobLinkStorage.getAllJobs();
    if (!jobs.length) {
      setStatus('No saved jobs to export.');
      return;
    }

    const csv = toCsv(jobs);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `joblink-finder-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();

    URL.revokeObjectURL(url);
    setStatus('CSV export complete.');
  }

  function renderJobs(jobs) {
    els.jobCount.textContent = `${jobs.length}`;
    els.jobList.innerHTML = '';

    if (!jobs.length) {
      els.jobList.innerHTML = '<li class="job-item">No saved jobs yet. Run a Google search and reopen this popup.</li>';
      return;
    }

    const fragment = document.createDocumentFragment();

    for (const job of jobs) {
      const li = document.createElement('li');
      li.className = 'job-item';

      const titleLink = document.createElement('a');
      titleLink.href = job.url;
      titleLink.textContent = job.title;
      titleLink.target = '_blank';
      titleLink.rel = 'noopener noreferrer';

      const meta = document.createElement('div');
      meta.className = 'job-meta';
      meta.textContent = `${job.source} • ${new Date(job.dateSaved).toLocaleString()} • ${job.status}`;

      const controls = document.createElement('div');
      controls.className = 'job-controls';

      const statusSelect = document.createElement('select');
      for (const value of window.JobLinkStorage.STATUS_VALUES) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        option.selected = value === job.status;
        statusSelect.appendChild(option);
      }

      statusSelect.addEventListener('change', async () => {
        await window.JobLinkStorage.updateStatus(job.id, statusSelect.value);
        await refreshJobs();
        setStatus(`Status updated: ${statusSelect.value}.`);
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', async () => {
        await window.JobLinkStorage.deleteJob(job.id);
        await refreshJobs();
        setStatus('Job deleted.');
      });

      controls.append(statusSelect, deleteBtn);
      li.append(titleLink, meta, controls);
      fragment.appendChild(li);
    }

    els.jobList.appendChild(fragment);
  }

  async function refreshJobs() {
    const jobs = await window.JobLinkStorage.getAllJobs();
    renderJobs(jobs);
  }

  function openGoogleSearch(query) {
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    chrome.tabs.create({ url });
  }

  function bindEvents() {
    const updateQueryPreview = () => {
      els.generatedQuery.value = buildQuery();
    };

    ['input', 'change'].forEach((eventName) => {
      els.form.addEventListener(eventName, updateQueryPreview);
    });

    els.form.addEventListener('submit', (event) => {
      event.preventDefault();
      const query = buildQuery();
      els.generatedQuery.value = query;
      openGoogleSearch(query);
      setStatus('Opened Google search in a new tab.');
    });

    els.copyQuery.addEventListener('click', async () => {
      const query = buildQuery();
      els.generatedQuery.value = query;
      await navigator.clipboard.writeText(query);
      setStatus('Query copied to clipboard.');
    });

    els.exportCsv.addEventListener('click', exportCsv);

    els.clearAll.addEventListener('click', async () => {
      await window.JobLinkStorage.clearJobs();
      await refreshJobs();
      setStatus('All saved jobs cleared.');
    });

    updateQueryPreview();
  }

  async function init() {
    bindEvents();
    await refreshJobs();
  }

  init().catch((error) => {
    console.error('JobLink Finder initialization failed.', error);
    setStatus('Initialization failed. Check extension errors.');
  });
})();
