# JobLink Finder (Manifest V3)

JobLink Finder is a local-only Chrome extension that automates ATS-focused Google job discovery and tracks your pipeline privately.

## What changed in this UX redesign
- No visible query output in the popup.
- One-click **Search Jobs** automation.
- Background service worker generates and runs multiple Google queries in non-focused tabs.
- Automatic extraction + deduplication + local storage.
- Optional toggle to open extracted jobs in tabs (capped).

## Folder Structure

```text
joblink-finder/
  manifest.json
  background.js
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

## Setup (Unpacked)
1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select `joblink-finder/`.

## How it works
1. Enter job inputs in popup.
2. Click **Search Jobs**.
3. Service worker generates multiple ATS and career-page Google query variations.
4. Queries run in background tabs with throttling.
5. Content script extracts visible ATS links from each SERP.
6. Results are deduplicated and stored in `chrome.storage.local`.
7. Optional: top results open in tabs (up to 12).

## Chrome Web Store packaging
1. Zip contents of `joblink-finder/`.
2. Upload in Chrome Web Store dashboard.
3. Use store metadata files in this folder.
4. Provide required screenshots and policy info.

## Permission rationale
- `storage`: save jobs and statuses locally.
- `tabs`: create/close background Google tabs and optional result tabs.
- `scripting`: execute extraction workflow in controlled tab automation.
- Host permissions only for Google domains required by search automation:
  - `https://www.google.com/search*`
  - `https://www.google.com/*`

## Privacy
- No backend server.
- No analytics/tracking.
- No login.
- No external database.
- No remote code execution.
- All data remains local in `chrome.storage.local`.
