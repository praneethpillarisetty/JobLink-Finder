# Privacy Policy — JobLink Finder

JobLink Finder follows a strict local-only privacy architecture.

## Data storage
All job records are stored only in your browser via `chrome.storage.local`.

Stored fields:
- `id`
- `title`
- `url`
- `source`
- `status`
- `query`
- `dateSaved`

## What we do not do
JobLink Finder does **not**:
- collect personal data
- require login
- run analytics or trackers
- send saved job data to external servers
- sell or share user data

## Network behavior
When you click **Search Jobs**, the extension opens Google search result pages in background tabs, extracts visible ATS links, and closes those tabs.
No external APIs are used for extraction or storage.

## User control
You can edit status, delete individual jobs, clear all jobs, and export your data as CSV at any time.
