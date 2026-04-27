# Manual Testing Guide (Automated Search UX)

## 1) Install unpacked extension
1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and choose `joblink-finder/`.

Expected: Extension loads with no manifest errors.

## 2) Validate simplified popup UX
1. Open popup.
2. Confirm there is no generated-query text area.

Expected: Popup only shows input fields, Search Jobs button, toggle for opening tabs, and dashboard list.

## 3) Automated background discovery
1. Enter `Data Engineer` + `Remote` + keywords.
2. Click **Search Jobs**.

Expected: Search runs via background automation; status text updates after completion.

## 4) Google tab automation behavior
1. During search, check open tabs briefly.

Expected: Google result tabs open in background and close after extraction (minimal clutter).

## 5) Deduplication verification
1. Run the same search twice.

Expected: No duplicate records by URL or equivalent title/domain combinations.

## 6) Open results in tabs mode
1. Enable **Open results in tabs**.
2. Run search again.

Expected: Extracted jobs open in new tabs up to cap (12 max).

## 7) Dashboard status workflow
1. Update one job from Saved to Applied.

Expected: Status persists.

## 8) Delete and clear all
1. Delete one job.
2. Use Clear All.

Expected: Entries are removed from local storage and UI.

## 9) CSV export
1. Save a few jobs.
2. Click Export CSV.

Expected: Downloaded CSV includes id,title,url,source,status,query,dateSaved.

## 10) Privacy/network behavior
1. Inspect extension activity in DevTools Network.

Expected: No analytics or third-party API calls from extension code. Network activity is limited to Google search pages opened by the user-triggered automation.
