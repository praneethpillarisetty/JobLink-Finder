# JobLink Finder (Manifest V3)

JobLink Finder is a local-only Chrome extension that helps job seekers:
- build advanced ATS-focused Google queries,
- extract job links from Google results,
- track application status,
- export progress to CSV.

No backend, no account, no analytics, and no data sharing.

## Folder Structure

```text
joblink-finder/
  manifest.json
  popup.html
  popup.css
  popup.js
  content.js
  storage.js
  icons/
  README.md
  privacy.md
  TESTING.md
  store-title.txt
  short-description.txt
  long-description.txt
```

## Setup Instructions

1. Clone or download this repository.
2. Open Chrome and visit `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select `joblink-finder/`.

The extension icon/popup will now be available in Chrome.

## Local Testing Instructions

Use the full manual checklist in `TESTING.md`.

Quick start:
1. Open popup and enter job search inputs.
2. Click **Search Google**.
3. Let Google results load.
4. Reopen popup to see extracted ATS job links.
5. Update statuses, delete items, and export CSV.

## Chrome Web Store Packaging Instructions

1. Confirm extension metadata and descriptions are finalized.
2. Ensure no private credentials or non-required files are included.
3. Zip the `joblink-finder/` folder contents (not the parent directory).
4. In Chrome Web Store Developer Dashboard:
   - create a new item,
   - upload zip,
   - paste content from `store-title.txt`, `short-description.txt`, and `long-description.txt`,
   - include `privacy.md` details in your privacy section.
5. Complete screenshots and listing assets required by the store.

## Permissions Explanation

### `storage`
Used to save job records locally in `chrome.storage.local`.

### `tabs`
Used only to open a new Google search tab when the user clicks **Search Google**.

### Host permissions
- `https://www.google.com/search*`
- `https://www.google.com/*`

These are required so the content script can run on Google Search result pages and extract visible ATS job links.

## Data Model

Each saved job record:

```json
{
  "id": "string",
  "title": "string",
  "url": "string",
  "source": "Workday|Greenhouse|Lever|Ashby|SmartRecruiters|iCIMS|SuccessFactors|Oracle|Other",
  "status": "Saved|Applied|Interview|Rejected",
  "query": "string",
  "dateSaved": "ISO-8601 string"
}
```

## Privacy Summary

All data remains on the local browser profile via `chrome.storage.local`.
The extension does not collect, transmit, sell, or share user data.

## Latest UI/Product Updates

- Added Chrome Web Store-ready extension icons in `icons/`.
- Added a `Max jobs to save/open` setting so users control how many results are saved or opened in tabs.
- Improved popup width, spacing, typography, dashboard layout, and store-friendly SEO messaging.
- Query generation remains hidden in the background for a cleaner user experience.
