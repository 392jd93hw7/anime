# Kairo — Anime discovery and streaming UI

Responsive anime discovery/watch frontend using HTML, CSS, and JavaScript, deployable as a static Vercel site.

## Features
- Featured anime, trending shelf, search, genre filters, sorting, and responsive poster grid.
- Anime detail view and a localStorage watchlist.
- Sub/dub selector, episode list, API-driven server lookup, and iframe/video playback when the configured API returns an authorized URL.
- Demo catalog fallback while API routes are being configured.

## Run locally
```bash
npx serve .
```

## Configure the AniVault API
Edit `js/config.js`. The starter points to `https://anivault-scraper-khaki.vercel.app`. Its endpoint paths are **placeholders to verify**, not guaranteed routes. Check the API documentation dashboard and update `ROUTES` to its exact endpoint paths and query parameters.

The adapter expects JSON and normalizes common response shapes:
- Catalog/search: array or `results`, `data`, `anime`, `items`, `list`, `trending`, `popular`.
- Anime records: ID/title, poster/image, synopsis, score, year, type, genres and episode count.
- Episode and server responses: arrays; adapt `js/api.js` if the actual contract differs.
- Stream responses: `url`, `embedUrl`, `embed_url`, `iframe`, `file`, or `sources[0].url`.

Never put private tokens in browser code. Use a server-side proxy and environment variables for secrets.

## Vercel
- Framework Preset: **Other**
- Build Command: empty
- Output Directory: `.`
- Install Command: empty

This is a static site. No build step is required.

## Playback and rights
Playback depends on the actual API response, provider embed permissions, CORS, browser codecs, and source format. This interface does not scrape sites or bypass DRM. Use only streams you own, license, or are authorized to embed. HLS (`.m3u8`) support may require hls.js and a compatible source.
