import { CONFIG } from "./config.js";
import { demoAnime } from "./data.js";

const cache = new Map();
const join = (base, path) => base.replace(/\/$/, "") + path;

async function request(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONFIG.requestTimeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal, headers: { Accept: "application/json", ...(options.headers || {}) } });
    if (!response.ok) throw new Error(`Metadata request failed (${response.status})`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function normalize(item, index = 0) {
  if (!item || typeof item !== "object") return null;
  const title = item.title?.english || item.title?.romaji || item.title?.native || item.title || item.name || "Untitled anime";
  const image = item.coverImage?.extraLarge || item.coverImage?.large || item.poster || item.image || item.cover || "";
  return {
    id: String(item.id ?? item.slug ?? title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + index),
    title: String(title),
    alternativeTitle: item.title?.native && item.title.native !== title ? item.title.native : (item.alternativeTitle || ""),
    synopsis: item.description ? String(item.description).replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"') : (item.synopsis || "Explore this anime and discover whether it belongs on your watchlist."),
    poster: image || item.bannerImage || "",
    banner: item.bannerImage || image || "",
    score: item.averageScore ? (Number(item.averageScore) / (Number(item.averageScore) > 10 ? 10 : 1)).toFixed(1) : (item.score ? Number(item.score).toFixed(1) : ""),
    genres: Array.isArray(item.genres) ? item.genres : [],
    format: item.format || item.type || "TV",
    episodes: item.episodes ?? null,
    year: item.seasonYear || item.year || (item.startDate?.year ?? null),
    status: item.status || "Unknown",
    url: item.url || "",
    streaming: Array.isArray(item.streaming) ? item.streaming : [],
  };
}

const defaultQuery = `query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(type: ANIME, sort: POPULARITY_DESC) {
      id title { romaji english native } coverImage { extraLarge large } bannerImage
      description(asHtml: false) genres averageScore episodes format status seasonYear
    }
  }
}`;

export const api = {
  async list({ search = "", genre = "", sort = "POPULARITY_DESC", page = 1, perPage = CONFIG.catalogPageSize } = {}) {
    if (CONFIG.metadataApiBase) {
      const url = new URL(join(CONFIG.metadataApiBase, "/anime"));
      if (search) url.searchParams.set("search", search);
      if (genre) url.searchParams.set("genre", genre);
      url.searchParams.set("sort", sort);
      url.searchParams.set("page", String(page));
      url.searchParams.set("perPage", String(perPage));
      const key = url.toString();
      if (cache.has(key)) return cache.get(key);
      const payload = await request(key);
      const list = Array.isArray(payload) ? payload : (payload.data || payload.results || payload.media || []);
      const result = list.map(normalize).filter(Boolean);
      cache.set(key, result);
      return result;
    }
    // AniList's public GraphQL endpoint can be used for read-only metadata; no API secret is included.
    if (CONFIG.enableDemoCatalog) {
      try {
        const payload = await request("https://graphql.anilist.co", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: defaultQuery, variables: { page, perPage } })
        });
        const media = payload?.data?.Page?.media;
        if (Array.isArray(media) && media.length) return media.map(normalize).filter(Boolean);
      } catch (error) {
        console.info("Live metadata temporarily unavailable; using bundled demo catalog.", error.message);
      }
      return demoAnime.map((item, i) => normalize(item, i)).filter(Boolean);
    }
    return [];
  },
  async details(id) {
    const numeric = Number(id);
    if (CONFIG.metadataApiBase) {
      try { return normalize(await request(join(CONFIG.metadataApiBase, "/anime/" + encodeURIComponent(id)))); }
      catch { /* fall through to search */ }
    }
    const list = await this.list({ perPage: 50 });
    return list.find(x => x.id === String(id)) || list.find(x => Number(x.id) === numeric) || null;
  },
  async search(query) {
    const q = query.trim();
    if (!q) return [];
    if (CONFIG.metadataApiBase) return this.list({ search: q, perPage: 12 });
    // AniList search query
    try {
      const queryText = `query ($search: String) { Media(search: $search, type: ANIME) { id title { romaji english native } coverImage { extraLarge large } bannerImage description genres averageScore episodes format status seasonYear } }`;
      const payload = await request("https://graphql.anilist.co", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: queryText, variables: { search: q } }) });
      if (payload?.data?.Media) return [normalize(payload.data.Media)].filter(Boolean);
    } catch (error) { console.info("Search provider unavailable", error.message); }
    return demoAnime.map((item,i) => normalize(item,i)).filter(x => (x.title + " " + x.alternativeTitle).toLowerCase().includes(q.toLowerCase()));
  }
};