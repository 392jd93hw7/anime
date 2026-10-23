# Kairo — Anime discovery and tracking

A responsive, futuristic anime discovery interface built with plain HTML, CSS, and JavaScript. The visual direction uses deep navy, electric-blue accents, cinematic artwork, and responsive layouts.

## Included

- Responsive home page with featured anime, trending and popular shelves.
- Search backed by AniList's public GraphQL metadata endpoint when reachable.
- Anime detail modal with genres, synopsis, year, score, format, and episode metadata when available.
- Genre filters, trending/discovery grids, and load-more interaction.
- Browser-local watchlist and recently opened history.
- Configurable metadata API adapter with local fallback catalog.
- A release schedule placeholder that does not invent upcoming release times.
- SEO foundations: descriptive title, meta description, Open Graph tags, semantic sections, and accessible labels.
- Reduced-motion support and keyboard focus states.

## Run locally

Because this site uses JavaScript ES modules, run it through a local server rather than opening `index.html` with `file://`:

```bash
npx serve .
```

## Metadata API

Edit `js/config.js`. To use your own API, set `metadataApiBase` to a base URL you own or are authorized to use. The current adapter expects:

- `GET /anime?search=&genre=&sort=&page=&perPage=` returning an array or `{ "data": [...] }`.
- `GET /anime/:id` returning one anime object.

The adapter normalizes common fields such as `id`, `title`, `description` or `synopsis`, `poster`, `banner`, `genres`, `score`, `episodes`, `format`, `status`, `year`, and an optional `streaming` array.

Without a custom API configured, Kairo attempts read-only anime metadata through AniList's public GraphQL endpoint. If that provider is unavailable, it falls back to fictional demo titles so the interface remains usable. Third-party providers may rate-limit or change; confirm their current terms and availability before production.

Never place private API keys in browser JavaScript. Put APIs that require secrets behind your own backend or serverless proxy and store secrets in environment variables. The custom API must allow browser CORS requests or be called through your backend.

## Playback sources

The UI displays playback options only when a configured API explicitly returns a `streaming` array with valid HTTP(S) source URLs. This starter does not scrape third-party streaming websites and does not bundle video files or provide licensed streaming sources. To use playback in production, connect a source you own, have licensed, or are otherwise authorized to embed, validate the returned URLs, and allowlist trusted origins.

## Watchlist and accounts

The watchlist and recently opened titles are stored in the current browser's `localStorage`. It does not yet provide login, cross-device sync, or server-side persistence. Those require an authentication provider, database, and backend authorization.

## Deploy to Vercel

Import the repository and choose:

- Framework Preset: **Other**
- Build Command: leave empty
- Install Command: leave empty
- Output Directory: `.`

## SEO notes for production

The static page includes a title, description, and Open Graph metadata. Individual anime details currently open in a modal and the app uses hash-based routes; this is a useful frontend MVP but not a complete search-indexable detail-page architecture. For production SEO, add clean server-rendered or prerendered anime/category routes with unique titles and descriptions, canonical URLs, crawlable internal links, sitemap entries generated for the real domain, correct robots directives, and applicable structured data. Do not index private watchlists or low-value search/filter variations.
