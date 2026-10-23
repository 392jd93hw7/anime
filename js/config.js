/* Public configuration only; never put private keys in browser JavaScript. */
window.KAIRO_CONFIG = {
  API_BASE: "https://anivault-scraper-khaki.vercel.app",
  ROUTES: {
    health: "/api/health",
    search: "/api/anime/search",
    popular: "/api/anime/popular",
    trending: "/api/anime/trending",
    info: "/api/anime/info",
    episodes: "/api/anime/episodes",
    servers: "/api/anime/servers",
    stream: "/api/anime/stream"
  },
  DEMO_FALLBACK: true
};