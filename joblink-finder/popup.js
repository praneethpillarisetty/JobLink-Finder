(() => {
  const els = {
    form: document.getElementById('searchForm'),
    jobTitle: document.getElementById('jobTitle'),
    location: document.getElementById('location'),
    workMode: document.getElementById('workMode'),
    company: document.getElementById('company'),
    keywords: document.getElementById('keywords'),
    visa: document.getElementById('visaSponsorship'),
    openResultsInTabs: document.getElementById('openResultsInTabs'),
    maxResults: document.getElementById('maxResults'),
    searchBtn: document.getElementById('searchBtn'),
    clearAll: document.getElementById('clearAll'),
    jobList: document.getElementById('jobList'),
    jobCount: document.getElementById('jobCount'),
    statusMessage: document.getElementById('statusMessage')
  };

  function setStatus(message) {
    els.statusMessage.textContent = message;
  }

  function setBusy(isBusy) {
    els.searchBtn.disabled = isBusy;
    els.searchBtn.textContent = isBusy ? 'Searching…' : 'Search Jobs';
  }

  function mapPayload() {
    return {
      jobTitle: els.jobTitle.value.trim(),
      location: els.location.value.trim(),
      workMode: els.workMode.value,
      company: els.company.value.trim(),
      keywords: els.keywords.value.trim(),
      visaSponsorship: els.visa.checked,
      openResultsInTabs: els.openResultsInTabs.checked,
      maxResults: Math.min(50, Math.max(5, Number.parseInt(els.maxResults.value, 10) || 20))
    };
  }

  function renderJobs(jobs) {
    els.jobCount.textContent = `${jobs.length}`;
    els.jobList.innerHTML = '';

    if (!jobs.length) {
      els.jobList.innerHTML = '<li class="job-item">No jobs yet. Click <strong>Search Jobs</strong> to start discovery.</li>';
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
      meta.textContent = `${job.source} • ${new Date(job.dateSaved).toLocaleString()}`;

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

  async function runAutomatedSearch(event) {
    event.preventDefault();

    if (!els.jobTitle.value.trim()) {
      setStatus('Job title is required.');
      return;
    }

    setBusy(true);
    setStatus('Running background search across ATS platforms…');

    const payload = mapPayload();
    chrome.runtime.sendMessage({ type: 'JOBLINK_START_SEARCH', payload }, async (response) => {
      setBusy(false);

      if (chrome.runtime.lastError) {
        setStatus(`Search failed: ${chrome.runtime.lastError.message}`);
        return;
      }

      if (!response?.ok) {
        setStatus(`Search failed: ${response?.error || 'Unknown error'}`);
        return;
      }

      await refreshJobs();
      const { extracted, saved, limitedTo } = response.summary;
      setStatus(`Done. Extracted ${extracted} links, saved ${saved} unique jobs${limitedTo ? ` (limit ${limitedTo})` : ''}.`);
    });
  }

  function bindEvents() {
    els.form.addEventListener('submit', runAutomatedSearch);

    els.clearAll.addEventListener('click', async () => {
      await window.JobLinkStorage.clearJobs();
      await refreshJobs();
      setStatus('Dashboard cleared.');
    });
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
