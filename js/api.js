(function () {
  "use strict";
  const cfg = window.KAIRO_CONFIG || {};
  const base = String(cfg.API_BASE || "").replace(/\/$/, "");
  const routes = cfg.ROUTES || {};
  const join = route => base + (String(route || "").startsWith("/") ? route : "/" + (route || ""));
  const first = (...values) => values.find(v => v !== undefined && v !== null && v !== "");
  const listFrom = data => {
    if (Array.isArray(data)) return data;
    for (const key of ["results","data","anime","items","list","trending","popular","episodes","servers"]) {
      if (Array.isArray(data?.[key])) return data[key];
    }
    return [];
  };
  function normalizeAnime(item) {
    const t = first(item?.title,item?.name,item?.englishTitle,item?.english_title,item?.romaji,item?.animeTitle,"Untitled anime");
    const title = typeof t === "object" ? first(t.english,t.userPreferred,t.romaji,"Untitled anime") : String(t);
    return {
      id:String(first(item?.id,item?.animeId,item?.anime_id,item?.mal_id,item?.slug,item?.url,title)),
      title,
      image:first(item?.image,item?.poster,item?.posterImage,item?.coverImage?.large,item?.images?.jpg?.large_image_url,item?.thumbnail,""),
      description:first(item?.description,item?.synopsis,item?.overview,"No synopsis was provided by the API."),
      score:first(item?.score,item?.rating,item?.mean,item?.mal_score,null),
      year:first(item?.year,item?.startYear,item?.seasonYear,item?.aired?.from ? String(item.aired.from).slice(0,4) : null),
      status:first(item?.status,item?.airingStatus,""),
      episodes:first(item?.episodes,item?.episodeCount,item?.totalEpisodes,null),
      genres:Array.isArray(item?.genres)?item.genres.map(g=>typeof g==="string"?g:g?.name).filter(Boolean):[],
      type:first(item?.type,item?.format,"TV"), raw:item
    };
  }
  async function request(route,params={}) {
    if(!base) throw new Error("Set KAIRO_CONFIG.API_BASE first.");
    const url = new URL(join(route));
    Object.entries(params).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=="")url.searchParams.set(k,String(v))});
    const response = await fetch(url.toString(),{headers:{Accept:"application/json"}});
    if(!response.ok) throw new Error("API request failed ("+response.status+")");
    if(!(response.headers.get("content-type")||"").includes("json")) throw new Error("API returned a non-JSON response");
    return response.json();
  }
  async function tryRoutes(names,params) {
    let last;
    for(const name of names){if(!routes[name])continue;try{return await request(routes[name],params)}catch(err){last=err}}
    throw last||new Error("No API route configured.");
  }
  window.KairoAPI = {
    normalizeAnime,
    async health(){return request(routes.health||"/")},
    async search(query,page=1){return listFrom(await tryRoutes(["search"],{q:query,query,keyword:query,page})).map(normalizeAnime)},
    async trending(page=1){return listFrom(await tryRoutes(["trending","popular"],{page})).map(normalizeAnime)},
    async popular(page=1){return listFrom(await tryRoutes(["popular","trending"],{page})).map(normalizeAnime)},
    async details(id){const d=await tryRoutes(["info"],{id,animeId:id,anime_id:id});return normalizeAnime(d?.data||d?.anime||d)},
    async episodes(id,language="sub"){return listFrom(await tryRoutes(["episodes"],{id,animeId:id,anime_id:id,language,lang:language,dub:language==="dub"}))},
    async servers(id,episode,language="sub"){return listFrom(await tryRoutes(["servers"],{id,animeId:id,anime_id:id,episode,episodeId:episode,language,lang:language,dub:language==="dub"}))},
    async stream(id,episode,server,language="sub"){const d=await tryRoutes(["stream"],{id,animeId:id,episode,episodeId:episode,server,language,lang:language,dub:language==="dub"});return d?.data||d?.stream||d}
  };
})();