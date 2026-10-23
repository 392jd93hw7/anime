(function () {
  "use strict";
  const cfg = window.KAIRO_CONFIG || {};
  const base = String(cfg.API_BASE || "").replace(/\/$/, "");
  const routes = cfg.ROUTES || {};
  const source = cfg.API_SOURCE || "animeheaven";
  const join = route => base + (String(route || "").startsWith("/") ? route : "/" + (route || ""));
  const first = (...values) => values.find(v => v !== undefined && v !== null && v !== "");
  function listFrom(data) {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== "object") return [];
    for (const key of ["results","media","episodes","servers","anime","items","list","data"]) {
      if (Array.isArray(data[key])) return data[key];
    }
    if (data.data && typeof data.data === "object") return listFrom(data.data);
    return [];
  }
  function normalizeAnime(item) {
    item = item || {};
    const t = first(item.titleEnglish, item.englishTitle, item.english_title, item.title?.english, item.title?.userPreferred, item.title?.romaji, item.title, item.name, item.romaji, item.animeTitle, "Untitled anime");
    const title = typeof t === "object" ? first(t.english, t.userPreferred, t.romaji, "Untitled anime") : String(t);
    const malId = first(item.malId, item.idMal, item.mal_id, item.malID, null);
    const anilistId = first(item.anilistId, item.anilist_id, (item.id && !String(item.id).startsWith("mal-") ? item.id : null), null);
    const id = String(first(item.id, anilistId, malId ? "mal-" + malId : null, item.animeId, item.anime_id, item.slug, title));
    let score = first(item.score, item.mean, item.rating, item.averageScore, item.mal_score, null);
    if (score !== null && Number(score) > 10 && Number(score) <= 100) score = Number(score) / 10;
    const genres = Array.isArray(item.genres) ? item.genres.map(g => typeof g === "string" ? g : g?.name).filter(Boolean) : [];
    return {
      id, anilistId: anilistId ? String(anilistId) : null, malId: malId ? String(malId).replace(/^mal-/, "") : (String(id).startsWith("mal-") ? String(id).slice(4) : null),
      title,
      image: first(item.image, item.poster, item.posterImage, item.cover, item.coverImage?.extraLarge, item.coverImage?.large, item.images?.jpg?.large_image_url, item.images?.webp?.large_image_url, item.thumbnail, ""),
      banner: first(item.bannerImage, item.banner, item.coverImage?.extraLarge, ""),
      description: first(item.description, item.synopsis, item.overview, "No synopsis was provided by the API."),
      score, year: first(item.year, item.startYear, item.startDate?.year, item.seasonYear, item.aired?.from ? String(item.aired.from).slice(0,4) : null),
      status: first(item.status, item.airingStatus, ""), episodes: first(item.episodes, item.episodeCount, item.totalEpisodes, null),
      genres, type: first(item.type, item.format, "TV"), raw: item
    };
  }
  async function request(route, params = {}) {
    if (!base) throw new Error("Set KAIRO_CONFIG.API_BASE first.");
    const url = new URL(join(route));
    Object.entries(params).forEach(([k,v]) => { if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v)); });
    const response = await fetch(url.toString(), { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("API request failed (" + response.status + ")");
    if (!(response.headers.get("content-type") || "").toLowerCase().includes("json")) throw new Error("API returned a non-JSON response (check that API_BASE points to the backend, not only its docs page).");
    return response.json();
  }
  async function idsFor(anime) {
    const a = typeof anime === "object" && anime ? anime : { id: anime };
    const id = String(a.id || "");
    const anilistId = a.anilistId || (id && !id.startsWith("mal-") && /^\d+$/.test(id) ? id : null);
    const malId = a.malId || (id.startsWith("mal-") ? id.slice(4) : null);
    return { anilistId, malId };
  }
  window.KairoAPI = {
    normalizeAnime,
    async health() { return request(routes.health || "/api/health"); },
    async search(query, limit = 10) {
      const data = await request(routes.search || "/api/search", { q: query });
      return listFrom(data).map(normalizeAnime).slice(0, limit);
    },
    async season() {
      const data = await request(routes.season || "/api/anilist/season");
      return listFrom(data).map(normalizeAnime);
    },
    async popular() { return this.season(); },
    async trending() { return this.season(); },
    async details(anime) {
      const a = typeof anime === "object" && anime ? anime : { id: anime };
      const ids = await idsFor(a);
      let info = {};
      try { info = await request(routes.info || "/api/info", ids); } catch (err) { console.warn("AniVault info endpoint:", err.message); }
      let metadata = {};
      const malId = info.malId || ids.malId;
      if (malId) {
        try {
          const combined = await request(routes.anime || "/api/anime", { malId });
          metadata = combined.data || combined;
        } catch (err) { console.warn("AniVault combined metadata endpoint:", err.message); }
      }
      const normalized = normalizeAnime({ ...a, ...info, ...metadata });
      return { ...a, ...normalized, id: a.id || String(info.anilistId || "mal-" + (malId || "")), anilistId: info.anilistId || ids.anilistId, malId: String(malId || "") || null, siteIds: info.siteIds || a.siteIds || {}, episodeCount: info.episodeCount || metadata.episodes || a.episodes };
    },
    async episodes(anime, language = "sub", selectedSource = source) {
      const ids = await idsFor(anime);
      if (!ids.anilistId && !ids.malId) throw new Error("Anime is missing an AniList or MAL ID.");
      const data = await request(routes.episodes || "/api/episodes", { ...ids, source: selectedSource });
      return listFrom(data);
    },
    async servers(anime, episode, language = "sub", selectedSource = source) {
      const ids = await idsFor(anime);
      const num = episode && typeof episode === "object" ? (episode.num || episode.number || episode.episode || episode.id) : episode;
      const data = await request(routes.servers || "/api/servers", { ...ids, ep: num, type: language, source: selectedSource });
      return listFrom(data);
    },
    async watch(anime, episode, serverName, language = "sub", selectedSource = source) {
      const ids = await idsFor(anime);
      const num = episode && typeof episode === "object" ? (episode.num || episode.number || episode.episode || episode.id) : episode;
      return request(routes.watch || "/api/watch", { ...ids, ep: num, type: language, source: selectedSource, server: serverName });
    }
  };
})();