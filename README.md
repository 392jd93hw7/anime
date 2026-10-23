# Anime Streaming Starter

A responsive anime discovery and watch-site starter built with plain HTML, CSS, and JavaScript. Designed for deployment to Vercel as a static site.

## Features
- Responsive dark UI with featured anime and discovery shelves
- Search and genre filtering
- Anime detail modal
- Watch page with server selector and subtitle/dub toggle
- Local watchlist stored in the browser
- Uses a configurable metadata API adapter; demo catalog works without credentials

## Run locally
Open `index.html` in a browser, or run a static server:

```bash
npx serve .
```

## Configure
Edit `js/config.js` to point `METADATA_API_BASE` at an API you control and are authorized to use. The default mode uses a small demo catalog. The player page only embeds URLs explicitly supplied by your configured API; it does not scrape third-party sites.

## Deploy to Vercel
Import this repository in Vercel and use the following settings:
- Framework Preset: Other
- Build Command: leave empty
- Output Directory: `.`

## Important
Use only video sources you own, have licensed, or are otherwise authorized to embed. Never put private API keys in browser-side JavaScript.
