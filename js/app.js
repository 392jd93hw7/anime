import { api } from "./api.js";

const $ = (selector) => document.querySelector(selector);
const state = { catalog: [], shown: 12, genre: "All", route: "home", list: loadStore("kairo-list", []), history: loadStore("kairo-history", []), heroIndex: 0, toastTimer: null, searchTimer: null };
const genres = ["All","Action","Adventure","Comedy","Drama","Fantasy","Mystery","Romance","Sci-Fi","Slice of Life","Sports","Supernatural"];
const escapeHTML = (value = "") => String(value).replace(/[&<>"\']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","\'":"&#39;" }[c]));
function loadStore(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function saveStore(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { toast("Storage is unavailable in this browser."); } }
function toast(message) { const node = $("#toast"); if (!node) return; node.textContent = message; node.classList.add("visible"); clearTimeout(state.toastTimer); state.toastTimer = setTimeout(() => node.classList.remove("visible"), 2300); }
function card(anime) {
  const saved = state.list.some(item => String(item.id) === String(anime.id));
  const score = anime.score ? `<span class="card-score">✦ ${escapeHTML(anime.score)}</span>` : "";
  return `<article class="anime-card" data-open="${escapeHTML(anime.id)}" tabindex="0" role="button" aria-label="View ${escapeHTML(anime.title)}"><div class="poster-wrap"><img loading="lazy" src="${escapeHTML(anime.poster)}" alt="Poster for ${escapeHTML(anime.title)}" onerror="this.style.opacity=\'.2\';this.alt=\'Artwork unavailable\'"><div class="poster-overlay"></div>${score}<span class="card-type">${escapeHTML(anime.format || "ANIME")}</span><div class="poster-actions"><button class="mini-action ${saved ? "saved" : ""}" data-save="${escapeHTML(anime.id)}" aria-label="${saved ? "Remove from" : "Add to"} watchlist" title="${saved ? "Remove from watchlist" : "Add to watchlist"}">${saved ? "✓" : "+"}</button><button class="mini-action" data-open-button="${escapeHTML(anime.id)}" aria-label="View details">↗</button></div></div><div class="card-title">${escapeHTML(anime.title)}</div><div class="card-meta"><span>${escapeHTML(anime.year || anime.status || "Anime")}</span><span>${escapeHTML(anime.genres?.[0] || anime.format || "")}</span></div></article>`;
}
function bindCards(root = document) {
  root.querySelectorAll("[data-open],[data-open-button]").forEach(node => {
    const open = () => showDetails(node.dataset.open || node.dataset.openButton);
    node.addEventListener("click", event => { if (event.target.closest("[data-save]")) return; open(); });
    if (node.matches("[data-open]")) node.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); } });
  });
  root.querySelectorAll("[data-save]").forEach(node => node.addEventListener("click", event => { event.stopPropagation(); toggleList(node.dataset.save); }));
}
function renderList(selector, items) { const node = $(selector); if (!node) return; node.innerHTML = items.length ? items.map(card).join("") : `<div class="empty-state"><strong>Nothing here just yet</strong><p>Try another filter or explore the catalog to find your next favorite.</p><a class="button button-outline" href="#discover">Explore anime →</a></div>`; bindCards(node); }
function findAnime(id) { return state.catalog.find(item => String(item.id) === String(id)) || state.list.find(item => String(item.id) === String(id)); }
function updateCounters() { $("#list-count").textContent = state.list.length; $("#profile-list-count").textContent = state.list.length; $("#profile-history-count").textContent = state.history.length; }
function toggleList(id) {
  const anime = findAnime(id); if (!anime) { toast("Anime details are not available yet."); return; }
  const exists = state.list.some(item => String(item.id) === String(id));
  state.list = exists ? state.list.filter(item => String(item.id) !== String(id)) : [...state.list, anime];
  saveStore("kairo-list", state.list); updateCounters(); renderHomeCards(); if (state.route === "watchlist") renderRoute("watchlist"); toast(exists ? "Removed from your watchlist" : "Added to your watchlist");
  if ($("#detail-dialog").open) showDetails(id);
}
function renderHomeCards() {
  const all = state.catalog.filter(item => item.poster);
  renderList("#trending-row", all.slice(0, 10));
  renderList("#popular-row", [...all].sort((a,b) => Number(b.score || 0) - Number(a.score || 0)).slice(0, 10));
  const filtered = all.filter(item => state.genre === "All" || item.genres.some(genre => genre.toLowerCase() === state.genre.toLowerCase()));
  renderList("#discover-grid", filtered.slice(0, state.shown));
  $("#load-more").classList.toggle("hidden", filtered.length <= state.shown);
  const recent = state.history.map(findAnime).filter(Boolean).slice(0, 8);
  $("#continue-section").hidden = !recent.length; renderList("#continue-row", recent);
  $("#genre-filters").innerHTML = genres.map(genre => `<button class="filter-chip ${state.genre === genre ? "selected" : ""}" data-genre="${escapeHTML(genre)}" aria-pressed="${state.genre === genre}">${escapeHTML(genre)}</button>`).join("");
  $("#genre-filters").querySelectorAll("[data-genre]").forEach(button => button.onclick = () => { state.genre = button.dataset.genre; state.shown = 12; renderHomeCards(); });
}
function setupHero() {
  const choices = state.catalog.filter(item => item.banner || item.poster).slice(0, 3); if (!choices.length) return;
  state.heroIndex %= choices.length; const anime = choices[state.heroIndex];
  $("#hero-backdrop").style.backgroundImage = `url("${anime.banner || anime.poster}")`;
  $("#hero-title").textContent = anime.title;
  $("#hero-description").textContent = anime.synopsis || "Discover the next story that stays with you.";
  $("#hero-format").textContent = [anime.format, anime.year, anime.status].filter(Boolean).join(" • ").toUpperCase();
  $("#hero-meta").innerHTML = [anime.genres.slice(0, 2).join(" · "), anime.episodes ? anime.episodes + " episodes" : "Anime discovery", anime.score ? "★ " + anime.score : ""].filter(Boolean).map((value, index) => `<span>${escapeHTML(value)}</span>${index < 2 ? '<span class="meta-sep"></span>' : ""}`).join("");
  $("#hero-primary").onclick = () => showDetails(anime.id); $("#hero-secondary").onclick = () => showDetails(anime.id);
  $("#hero-dots").querySelectorAll(".hero-dot").forEach((dot, index) => { dot.classList.toggle("selected", index === state.heroIndex); dot.onclick = () => { state.heroIndex = index; setupHero(); }; });
}
async function showDetails(id) {
  let anime = findAnime(id); if (!anime) anime = await api.details(id);
  if (!anime) { toast("Could not load anime details. Please try again."); return; }
  if (!state.catalog.some(item => String(item.id) === String(anime.id))) state.catalog.push(anime);
  state.history = [anime.id, ...state.history.filter(value => String(value) !== String(anime.id))].slice(0, 20); saveStore("kairo-history", state.history); updateCounters();
  $("#detail-content").innerHTML = `<div class="detail-hero" style="background-image:url(\'${escapeHTML(anime.banner || anime.poster)}\')"><div class="detail-hero-copy"><p class="section-kicker">ANIME DETAILS</p><h2>${escapeHTML(anime.title)}</h2><div class="detail-tags">${[anime.format, anime.year, anime.status, anime.score ? "★ " + anime.score : "", ...(anime.genres || []).slice(0, 4)].filter(Boolean).map(value => `<span class="detail-tag">${escapeHTML(value)}</span>`).join("")}</div></div></div><div class="detail-body"><p class="detail-summary">${escapeHTML(anime.synopsis || "Synopsis not available from the connected provider.")}</p><div class="detail-actions"><button class="button button-primary" data-detail-watch>Watch / sources <span>→</span></button><button class="button button-outline" data-detail-save>${state.list.some(item => String(item.id) === String(anime.id)) ? "✓ In watchlist" : "＋ Add to watchlist"}</button></div><div class="detail-extra"><h3>About this title</h3><p>${escapeHTML(anime.title)}. ${anime.year ? "Year: " + escapeHTML(anime.year) + ". " : ""}${anime.episodes ? "Episode count: " + escapeHTML(anime.episodes) + ". " : ""}${anime.genres?.length ? "Genres: " + escapeHTML(anime.genres.join(", ")) + "." : ""}</p><p class="source-note">Metadata is supplied by the configured provider. Playback options appear only when an authorized streaming API returns available sources.</p></div><div id="detail-sources"></div></div>`;
  $("#detail-dialog").showModal();
  $("#detail-content").querySelector("[data-detail-save]").onclick = () => toggleList(anime.id);
  $("#detail-content").querySelector("[data-detail-watch]").onclick = () => renderWatchPanel(anime);
}
function renderWatchPanel(anime) {
  const area = $("#detail-sources");
  const sources = (anime.streaming || []).filter(source => { try { return source?.url && ["http:", "https:"].includes(new URL(source.url).protocol); } catch { return false; } });
  area.innerHTML = `<div class="detail-extra"><h3>Playback availability</h3>${sources.length ? sources.map(source => `<a class="button button-outline" target="_blank" rel="noopener noreferrer" href="${escapeHTML(source.url)}">${escapeHTML(source.label || "Open authorized source")} ↗</a>`).join(" ") : "<p>No authorized playback source is configured for this title. Connect a licensed source API in js/config.js and return a streaming array to enable playback.</p>"}</div>`;
}
function clearRoute() { $("#route-view")?.remove(); }
function renderRoute(route) {
  clearRoute(); state.route = ["home","discover","trending","schedule","watchlist"].includes(route) ? route : "home";
  document.querySelectorAll(".nav-link").forEach(link => link.classList.toggle("active", link.dataset.route === state.route));
  const homeSections = ["continue-section","trending-section","discover-section","popular-section","schedule-section"];
  if (state.route === "home") { $("#hero").hidden = false; $(".quick-stats").hidden = false; homeSections.forEach(id => $("#" + id).hidden = false); document.title = "Kairo — Discover your next anime"; return; }
  $("#hero").hidden = true; $(".quick-stats").hidden = true; homeSections.forEach(id => $("#" + id).hidden = true);
  const isWatchlist = state.route === "watchlist"; let markup = "";
  if (state.route === "schedule") {
    document.title = "Anime Release Schedule — Kairo";
    markup = `<section id="route-view"><div class="page-intro"><p class="section-kicker">PLAN YOUR NEXT WATCH</p><h1>Release schedule<span class="heading-dot">.</span></h1><p>Upcoming release times appear when supplied by your configured metadata API.</p></div><div class="schedule-list"><div class="schedule-day"><div class="schedule-date"><strong>—</strong><span>LIVE DATA</span></div><div class="schedule-day-copy"><strong>No release schedule connected</strong><p>Connect a provider endpoint to show confirmed release dates and local times.</p></div></div></div></section>`;
  } else {
    const isTrending = state.route === "trending"; document.title = isWatchlist ? "My Watchlist — Kairo" : isTrending ? "Trending Anime — Kairo" : "Discover Anime — Kairo";
    markup = `<section id="route-view"><div class="page-intro"><p class="section-kicker">${isWatchlist ? "YOUR PERSONAL ANIME COLLECTION" : "EXPLORE THE KAIRO CATALOG"}</p><h1>${isWatchlist ? "My watchlist" : isTrending ? "Trending anime" : "Discover anime"}<span class="heading-dot">.</span></h1><p>${isWatchlist ? "Everything you want to watch, saved on this device." : "Browse anime and open a title to see available details from the metadata provider."}</p>${isWatchlist ? "" : `<div class="filter-bar" id="route-filters">${genres.map(genre => `<button class="filter-chip ${genre === "All" ? "selected" : ""}" data-rgenre="${escapeHTML(genre)}">${escapeHTML(genre)}</button>`).join("")}</div>`}</div><div class="content-section" style="padding-top:0"><div class="anime-grid" id="route-grid"></div></div></section>`;
  }
  $("#app").insertAdjacentHTML("beforeend", markup);
  if (isWatchlist) renderList("#route-grid", state.list);
  else if (state.route === "discover" || state.route === "trending") {
    const source = state.route === "trending" ? state.catalog.slice(0, 30) : state.catalog;
    const draw = genre => renderList("#route-grid", source.filter(anime => genre === "All" || anime.genres.some(value => value.toLowerCase() === genre.toLowerCase())));
    draw("All"); $("#route-filters").querySelectorAll("[data-rgenre]").forEach(button => button.onclick = () => { $("#route-filters").querySelectorAll("button").forEach(other => other.classList.remove("selected")); button.classList.add("selected"); draw(button.dataset.rgenre); });
  }
}
function setupSearch() {
  const dialog = $("#search-dialog"), input = $("#search-input"), results = $("#search-results");
  $("#search-toggle").onclick = () => { dialog.showModal(); input.focus(); };
  input.addEventListener("input", () => {
    clearTimeout(state.searchTimer); const query = input.value.trim(); if (!query) { results.innerHTML = ""; return; }
    results.innerHTML = '<p class="source-note">Searching the catalog…</p>';
    state.searchTimer = setTimeout(async () => {
      let found = []; try { found = await api.search(query); } catch (error) { console.warn(error); }
      if (!found.length) found = state.catalog.filter(anime => (anime.title + " " + anime.alternativeTitle).toLowerCase().includes(query.toLowerCase()));
      results.innerHTML = found.length ? found.slice(0,10).map(anime => `<button class="search-result" data-search-open="${escapeHTML(anime.id)}"><img src="${escapeHTML(anime.poster)}" alt=""><div><strong>${escapeHTML(anime.title)}</strong><span>${escapeHTML([anime.year,anime.format,anime.genres?.[0]].filter(Boolean).join(" · "))}</span></div></button>`).join("") : '<div class="empty-state"><strong>No matches found</strong><p>Try another title or a shorter search.</p></div>';
      results.querySelectorAll("[data-search-open]").forEach(button => button.onclick = () => { dialog.close(); showDetails(button.dataset.searchOpen); });
    }, 250);
  });
  document.addEventListener("keydown", event => {
    if ((event.key === "/" || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k")) && !dialog.open && !/input|textarea/i.test(document.activeElement.tagName)) { event.preventDefault(); dialog.showModal(); input.focus(); }
    if (event.key === "Escape" && dialog.open) dialog.close();
  });
}
async function init() {
  $("#year").textContent = new Date().getFullYear(); $("#load-more").onclick = () => { state.shown += 12; renderHomeCards(); };
  $("#profile-button").onclick = () => { $("#profile-dialog").showModal(); updateCounters(); };
  document.querySelectorAll("[data-close-detail]").forEach(button => button.onclick = () => $("#detail-dialog").close());
  document.querySelectorAll("[data-close-profile]").forEach(button => button.onclick = () => $("#profile-dialog").close());
  $("#profile-watchlist").onclick = () => $("#profile-dialog").close();
  window.addEventListener("hashchange", () => renderRoute(location.hash.slice(1) || "home")); setupSearch(); updateCounters();
  try { state.catalog = (await api.list({ perPage: 24 })).map(normalizedAnime); }
  catch (error) { console.error(error); state.catalog = []; toast("Catalog unavailable. Check your connection and try again."); }
  if (!state.catalog.length) { $("#trending-row").innerHTML = '<div class="empty-state"><strong>Catalog unavailable</strong><p>Check your metadata API configuration or reconnect to the internet.</p></div>'; return; }
  setupHero(); renderHomeCards(); renderRoute(location.hash.slice(1) || "home");
  setInterval(() => { const slides = state.catalog.filter(anime => anime.poster || anime.banner).slice(0,3); if (slides.length > 1 && !$("#detail-dialog").open) { state.heroIndex = (state.heroIndex + 1) % slides.length; setupHero(); } }, 9000);
}
init();