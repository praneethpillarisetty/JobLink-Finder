# Manual Testing Guide

## 1) Install unpacked extension
1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the `joblink-finder/` directory.

Expected: Extension loads without manifest errors.

## 2) Generate Workday search query
1. Open the extension popup.
2. Enter `Software Engineer` as Job title.
3. Set ATS platform to **Workday**.
4. Optionally add location and keywords.

Expected: Generated query includes `site:myworkdayjobs.com` or `site:wd1.myworkdaysite.com`.

## 3) Open Google search
1. Click **Search Google**.

Expected: A new Google tab opens with the encoded query.

## 4) Extract links
1. On the opened Google results page, wait for page load.
2. Return to popup and review Saved Jobs list.

Expected: ATS links from visible Google results appear in the dashboard.

## 5) Verify duplicate removal
1. Re-run the same query and visit the same result page.
2. Reopen popup.

Expected: Existing entries are not duplicated.

## 6) Verify status update
1. Change a job status from **Saved** to **Applied**.

Expected: Updated status persists in the list.

## 7) Verify delete
1. Click **Delete** on one saved job.

Expected: Selected job disappears from the list and storage.

## 8) Verify CSV export
1. Click **Export CSV**.
2. Open downloaded CSV file.

Expected: CSV contains headers and all job fields.

## 9) Verify persistence after browser restart
1. Close all Chrome windows.
2. Relaunch Chrome and open popup.

Expected: Saved jobs and statuses remain available.

## 10) Verify network behavior
1. Open Chrome DevTools for the extension pages if needed.
2. Use **Search Google** once.
3. Monitor requests.

Expected: Extension only opens Google search pages; no analytics or remote API calls are made by the extension.
