# Diagnosis Report: Ransomware Feed Update Issue

## Problem
The ransomware feed at `/ransomlive` is not displaying updated data because the local cached files (`src/data/remote/`) are out of sync with both the live API and the remote repository.

## Findings
1.  **GitHub Action (Cronjob):** There is a scheduled workflow [fetch-data.yml](file:///Users/crashov3rr1d3/Crash0v3rr1d3-blog/blog/.github/workflows/fetch-data.yml) that runs every 30 minutes to fetch data and push it to the `main` branch.
2.  **Local Sync Issue:** Your local environment is "ahead" of `origin/main` by 1 commit and has many **staged but uncommitted changes**. This prevents a clean `git pull` which would bring in the latest data from the cronjob.
3.  **Local Fetch Script:** The script `scripts/fetch-ransomware-data.mjs` works correctly when run locally (`npm run sync:ransom`), but it relies on an `RANSOMWARE_API_KEY` in your `.env` file and takes several minutes to complete.

## Root Cause
The local development server uses local JSON files in `src/data/remote/`. Since the cronjob only updates the GitHub repository, those changes never reach your local machine unless you pull them. Because you have uncommitted local changes, the sync is stalled.

## Recommended Solution
1.  **Commit and Sync:** Commit your local changes and pull the latest data from the remote repository.
    ```bash
    git commit -m "Work in progress: local improvements"
    git pull origin main
    ```
2.  **Manual Local Sync:** If you want to force an update immediately without pulling, you can run:
    ```bash
    npm run sync:ransom
    ```
3.  **Automation Tip:** Consider adding the `sync:data` command to your local `dev` script in `package.json` if you always want fresh data when starting the server (though this will make startup slower).
