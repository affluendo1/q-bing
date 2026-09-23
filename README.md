# q-bing

A single-page cubing timer with a focused timer view, solves, statistics, sessions, scramble tools, and settings.

## Architecture

- `index.html` contains the app markup and loads the external assets.
- `assets/css/app.css` contains the app theme, layout, and component styling.
- `assets/js/app.js` contains the timer and app behavior.
- `.github/workflows/deploy-pages.yml` publishes the static app to GitHub Pages on pushes to `main`.

Open `index.html` directly in a browser for local use. No build step or package installation is needed. App data is stored in browser local storage; Settings includes data import and export controls.
