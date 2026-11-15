# Score Hub

A phone-friendly sports app (web app + installable PWA). It starts with the UEFA Champions League
and is built so more sports can be added later.

## How it works

- `index.html`, `css/`, `js/` are the app. It runs in the browser and needs no build step.
- `data/<competition>/*.json` is the data the app reads (`meta`, `standings`, `matches`, `scorers`).
- `scripts/update-data.mjs` downloads live data from football-data.org and writes those files.
- `.github/workflows/pages.yml` runs that script once an hour, then publishes the site to GitHub Pages.
  Your API token stays in a GitHub secret, never in the app.
- The files already in `data/ucl/` are demo data, so the app works before live data is switched on.

## One-time setup

1. Repo **Settings > Pages**: set **Source** to **GitHub Actions**.
2. Repo **Settings > Secrets and variables > Actions > New repository secret**:
   name `FOOTBALL_DATA_TOKEN`, value = your football-data.org token.
3. Repo **Actions** tab > **Update scores and publish** > **Run workflow**.
4. Open `https://<your-username>.github.io/<repo-name>/` on your phone.
   In Chrome, tap the menu (three dots) > **Add to Home screen** (or **Install app**).

GitHub Pages is free for public repositories.
GitHub pauses scheduled runs after 60 days without any activity in the repo; press **Run workflow** to wake it up.

## Adding another sport

1. Add an entry to `SPORTS` in `js/config.js` (name, emoji, competitions, which screens to use).
2. Put its data in `data/<id>/` (same four files, or whatever its screens need).
3. If it needs different screens, add files under `js/views/<sport>/`.
4. Add a line to `SOURCES` in `scripts/update-data.mjs` (or a new adapter for a different data service).
5. Add the new screen files to the `SHELL` list in `sw.js` so they work offline.

## Helpers

- `node scripts/make_sample_data.mjs` rebuilds the demo data.
- `python3 scripts/make_icons.py` redraws the app icons.
