(() => {
  const els = {
    form: document.getElementById('searchForm'),
    jobTitle: document.getElementById('jobTitle'),
    location: document.getElementById('location'),
    workMode: document.getElementById('workMode'),
    keywords: document.getElementById('keywords'),
    company: document.getElementById('company'),
    visa: document.getElementById('visaSponsorship'),
    openTabs: document.getElementById('openResultsInTabs'),
    searchButton: document.getElementById('searchButton'),
    jobList: document.getElementById('jobList'),
    jobCount: document.getElementById('jobCount'),
    exportCsv: document.getElementById('exportCsv'),
    clearAll: document.getElementById('clearAll'),
    statusMessage: document.getElementById('statusMessage')
  };

  function setStatus(message) {
    els.statusMessage.textContent = message;
  }

  function toggleSearchLoading(isLoading) {
    els.searchButton.disabled = isLoading;
    els.searchButton.textContent = isLoading ? 'Searching…' : 'Search Jobs';
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

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `joblink-finder-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();

    URL.revokeObjectURL(url);
    setStatus('CSV export complete.');
  }

  function renderJobs(jobs) {
    els.jobCount.textContent = String(jobs.length);
    els.jobList.innerHTML = '';

    if (!jobs.length) {
      els.jobList.innerHTML = '<li class="job-item">No jobs saved yet. Click Search Jobs to start automated discovery.</li>';
      return;
    }

    const fragment = document.createDocumentFragment();

    for (const job of jobs) {
      const li = document.createElement('li');
      li.className = 'job-item';

      const link = document.createElement('a');
      link.href = job.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = job.title;

      const meta = document.createElement('div');
      meta.className = 'job-meta';
      meta.textContent = `${job.source} • ${new Date(job.dateSaved).toLocaleString()} • ${job.status}`;

      const controls = document.createElement('div');
      controls.className = 'job-controls';

      const statusSelect = document.createElement('select');
      for (const status of window.JobLinkStorage.STATUS_VALUES) {
        const option = document.createElement('option');
        option.value = status;
        option.textContent = status;
        option.selected = status === job.status;
        statusSelect.appendChild(option);
      }

      statusSelect.addEventListener('change', async () => {
        await window.JobLinkStorage.updateStatus(job.id, statusSelect.value);
        await refreshJobs();
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', async () => {
        await window.JobLinkStorage.deleteJob(job.id);
        await refreshJobs();
      });

      controls.append(statusSelect, deleteBtn);
      li.append(link, meta, controls);
      fragment.appendChild(li);
    }

    els.jobList.appendChild(fragment);
  }

  async function refreshJobs() {
    const jobs = await window.JobLinkStorage.getAllJobs();
    renderJobs(jobs);
  }

  function getFormPayload() {
    return {
      jobTitle: els.jobTitle.value.trim(),
      location: els.location.value.trim(),
      workMode: els.workMode.value,
      keywords: els.keywords.value.trim(),
      company: els.company.value.trim(),
      visaSponsorship: els.visa.checked,
      openResultsInTabs: els.openTabs.checked
    };
  }

  async function triggerAutomatedSearch() {
    const payload = getFormPayload();
    if (!payload.jobTitle) {
      setStatus('Job title is required.');
      return;
    }

    toggleSearchLoading(true);
    setStatus('Running automated search in background tabs...');

    const response = await chrome.runtime.sendMessage({
      type: 'JOBLINK_START_SEARCH',
      payload
    });

    toggleSearchLoading(false);

    if (!response?.ok) {
      setStatus(response?.error || 'Search failed. Please try again.');
      return;
    }

    await refreshJobs();
    const { extracted, saved, totalStored } = response.summary;
    setStatus(`Search complete. Extracted ${extracted}, saved ${saved}, total stored ${totalStored}.`);
  }

  function bindEvents() {
    els.form.addEventListener('submit', async (event) => {
      event.preventDefault();
      await triggerAutomatedSearch();
    });

    els.exportCsv.addEventListener('click', exportCsv);

    els.clearAll.addEventListener('click', async () => {
      await window.JobLinkStorage.clearJobs();
      await refreshJobs();
      setStatus('All jobs cleared.');
    });
  }

  async function init() {
    bindEvents();
    await refreshJobs();
  }

  init().catch((error) => {
    console.error('JobLink Finder popup failed to initialize.', error);
    setStatus('Initialization error.');
  });
})();
