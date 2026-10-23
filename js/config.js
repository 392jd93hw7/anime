/* Public configuration only; never put private API keys in browser JavaScript. */
window.KAIRO_CONFIG = {
  API_BASE: "https://anivault-scraper-khaki.vercel.app",
  API_SOURCE: "animeheaven",
  ROUTES: {
    health: "/api/health",
    search: "/api/search",
    info: "/api/info",
    episodes: "/api/episodes",
    servers: "/api/servers",
    watch: "/api/watch",
    season: "/api/anilist/season",
    anime: "/api/anime",
    malSearch: "/api/mal/search"
  },
  DEMO_FALLBACK: true
};