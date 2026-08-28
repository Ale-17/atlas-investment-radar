# DEPLOYMENT

## Recommended repository

Create a new **public** repository, for example:

`atlas-investment-radar`

Do not reuse `mister-tracker`.

## First publish

1. Upload this project to the new repository.
2. In GitHub open:
   `Settings → Pages`
3. Under **Build and deployment → Source**, select:
   `GitHub Actions`
4. Open `Actions`.
5. Run:
   - `Update investment dashboard`
   - `Backtest investment signals`
6. The generated market files will be committed automatically.
7. The `Deploy Atlas to GitHub Pages` workflow will publish the site.

## Ongoing automation

### Market radar
`.github/workflows/update-market.yml`

Runs several times per weekday and once on weekend days.

### Historical validation
`.github/workflows/backtest.yml`

Runs monthly and can also be triggered manually.

### Web deployment
`.github/workflows/pages.yml`

Deploys when anything under `docs/` changes.

### CI
`.github/workflows/validate.yml`

Checks Python syntax, JSON files and required web assets.

## Private data

Do not put salary, rent, portfolio values or goals in repository files.

Those values belong to browser `localStorage` and can be backed up with Atlas' Export button.

## PWA

After GitHub Pages is live, supported browsers can install Atlas on the home screen.

Service worker scope is relative to the GitHub Pages project path, so no custom domain is required.
