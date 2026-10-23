import { api } from "./api.js";

const $ = (selector) => document.querySelector(selector);
const state = { catalog: [], shown: 12, genre: "All", route: "home", searchResults: [], list: loadStore("kairo-list", []), history: loadStore("kairo-history", []), heroIndex: 0, toastTimer: null };
const genres = ["All","Action","Adventure","Comedy","Drama","Fantasy","Mystery","Romance","Sci-Fi","Slice of Life","Sports","Supernatural"];
const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
function loadStore(key, fallback) { try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; } catch { return fallback; } }
function saveStore(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { toast("Storage is unavailable in this browser."); } }
function toast(message) { const node=$("#toast"); node.textContent=message; node.classList.add("visible"); clearTimeout(state.toastTimer); state.toastTimer=setTimeout(()=>node.classList.remove("visible"),2400); }
function normalizedAnime(item) {
  return { ...item, genres: Array.isArray(item.genres)?item.genres:[], poster: item.poster || item.banner || "", banner: item.banner || item.poster || "", score: item.score || "" };
}
function card(anime) {
  const saved = state.list.some(item => item.id === anime.id);
  const score = anime.score ? `<span class="card-score">✦ ${escapeHTML(anime.score)}</span>` : "";
  return `<article class="anime-card" data-open="${escapeHTML(anime.id)}" tabindex="0" role="button" aria-label="View ${escapeHTML(anime.title)}">
    <div class="poster-wrap"><img loading="lazy" src="${escapeHTML(anime.poster)}" alt="Poster for ${escapeHTML(anime.title)}" onerror="this.style.opacity='.2';this.alt='Artwork unavailable'"><div class="poster-overlay"></div>${score}<span class="card-type">${escapeHTML(anime.format || "ANIME")}</span><div class="poster-actions"><button class="mini-action ${saved?"saved":""}" data-save="${escapeHTML(anime.id)}" aria-label="${saved?"Remove from":"Add to"} watchlist" title="${saved?"Remove from watchlist":"Add to watchlist"}">${saved?"✓":"+"}</button><button class="mini-action" data-open-button="${escapeHTML(anime.id)}" aria-label="View details">↗</button></div></div>
    <div class="card-title">${escapeHTML(anime.title)}</div><div class="card-meta"><span>${escapeHTML(anime.year || anime.status || "Anime")}</span><span>${escapeHTML(anime.genres[0] || anime.format || "")}</span></div>
  </article>`;
}
function bindCards(root=document) {
  root.querySelectorAll("[data-open],[data-open-button]").forEach(node => {
    const open = () => detail(node.dataset.open || node.dataset.openButton);
    node.addEventListener("click", e => { if (e.target.closest("[data-save]")) return; open(); });
    if(node.matches("[data-open]")) node.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();open();}});
  });
  root.querySelectorAll("[data-save]").forEach(node => node.addEventListener("click", e => { e.stopPropagation(); toggleList(node.dataset.save); }));
}
function renderList(target, data) { const node=$(target); if(!node)return; node.innerHTML=data.length?data.map(card).join(""):`<div class="empty-state"><strong>Nothing here just yet</strong><p>Try another filter or explore the catalog to find your next favorite.</p><a class="button button-outline" href="#discover">Explore anime →</a></div>`; bindCards(node); }
function findAnime(id) { return state.catalog.find(item=>String(item.id)===String(id)) || state.list.find(item=>String(item.id)===String(id)); }
function toggleList(id) {
  const anime=findAnime(id); if(!anime){toast("Anime details are not available yet.");return;}
  const exists=state.list.some(item=>String(item.id)===String(id));
  state.list=exists?state.list.filter(item=>String(item.id)!==String(id)):[...state.list,anime];
  saveStore("kairo-list",state.list); updateCounters(); renderHomeCards();
  toast(exists?"Removed from your watchlist":"Added to your watchlist");
  const dialog=$("#detail-dialog"); if(dialog.open) showDetails(id);
}
function updateCounters() { $("#list-count").textContent=state.list.length; $("#profile-list-count").textContent=state.list.length; $("#profile-history-count").textContent=state.history.length; }
function renderHomeCards() {
  const trend=[...state.catalog].filter(x=>x.poster).slice(0,10), popular=[...state.catalog].filter(x=>x.poster).slice().sort((a,b)=>Number(b.score||0)-Number(a.score||0)).slice(0,10);
  renderList("#trending-row",trend);renderList("#popular-row",popular);
  const filtered=state.catalog.filter(x=>x.poster && (state.genre==="All"||x.genres.some(g=>g.toLowerCase()===state.genre.toLowerCase())));
  renderList("#discover-grid",filtered.slice(0,state.shown));
  $("#load-more").classList.toggle("hidden",filtered.length<=state.shown);
  const cont=state.history.map(id=>findAnime(id)).filter(Boolean).slice(0,8);
  $("#continue-section").hidden=!cont.length;renderList("#continue-row",cont);
  $("#genre-filters").innerHTML=genres.map(g=>`<button class="filter-chip ${state.genre===g?"selected":""}" data-genre="${escapeHTML(g)}" aria-pressed="${state.genre===g}">${escapeHTML(g)}</button>`).join("");
  $("#genre-filters").querySelectorAll("[data-genre]").forEach(b=>b.addEventListener("click",()=>{state.genre=b.dataset.genre;state.shown=12;renderHomeCards();}));
}
function setupHero() {
  const choices=state.catalog.filter(x=>x.banner||x.poster).slice(0,3);
  const item=choices[state.heroIndex%Math.max(choices.length,1)];
  const backdrop=$("#hero-backdrop");
  if(item) {
    backdrop.style.backgroundImage=`url("${item.banner||item.poster}")`;
    $("#hero-title").innerHTML=escapeHTML(item.title).replace(/\s+(?=[^\s]*$)/,"<br><span>")+"</span>";
    $("#hero-description").textContent=item.synopsis || "Discover the next story that stays with you.";
    $("#hero-format").textContent=[item.format,item.year,item.status].filter(Boolean).join("  •  ").toUpperCase();
    $("#hero-meta").innerHTML=[item.genres.slice(0,2).join(" · "),item.episodes?item.episodes+" episodes":"Anime discovery",item.score?"★ "+item.score:""].filter(Boolean).map((t,i)=>`<span>${escapeHTML(t)}</span>${i<2?'<span class="meta-sep"></span>':''}`).join("");
    $("#hero-primary").innerHTML="<span>View anime</span><span aria-hidden='true'>↗</span>";$("#hero-primary").onclick=()=>showDetails(item.id);
    $("#hero-secondary").onclick=()=>showDetails(item.id);
  }
  $("#hero-dots").querySelectorAll(".hero-dot").forEach((b,i)=>{b.classList.toggle("selected",i===state.heroIndex);b.onclick=()=>{state.heroIndex=i;setupHero();};});
}
async function showDetails(id) {
  const anime=findAnime(id) || await api.details(id);
  if(!anime){toast("Could not load anime details. Please try again.");return;}
  if(!state.catalog.some(x=>String(x.id)===String(anime.id)))state.catalog.push(anime);
  state.history=[anime.id,...state.history.filter(x=>String(x)!==String(anime.id))].slice(0,20);saveStore("kairo-history",state.history);updateCounters();
  $("#detail-content").innerHTML=`<div class="detail-hero" style="background-image:url('${escapeHTML(anime.banner||anime.poster)}')"><div class="detail-hero-copy"><p class="section-kicker">ANIME DETAILS</p><h2>${escapeHTML(anime.title)}</h2><div class="detail-tags">${[anime.format,anime.year,anime.status,anime.score? "★ "+anime.score:"",...anime.genres.slice(0,4)].filter(Boolean).map(x=>`<span class="detail-tag">${escapeHTML(x)}</span>`).join("")}</div></div></div><div class="detail-body"><p class="detail-summary">${escapeHTML(anime.synopsis||"Synopsis not available from the connected provider.")}</p><div class="detail-actions"><button class="button button-primary" data-detail-watch="${escapeHTML(anime.id)}">Watch / sources <span>→</span></button><button class="button button-outline" data-detail-save="${escapeHTML(anime.id)}">${state.list.some(x=>String(x.id)===String(anime.id))?"✓ In watchlist":"＋ Add to watchlist"}</button></div><div class="detail-extra"><h3>About this title</h3><p>${escapeHTML(anime.title)} ${anime.year?"was listed for "+escapeHTML(anime.year)+". ":""}${anime.episodes?"Episode count: "+escapeHTML(anime.episodes)+". ":""}${anime.genres.length?"Genres: "+escapeHTML(anime.genres.join(", "))+ ".":""}</p><p class="source-note">Metadata is supplied by the configured provider. Playback options appear only when an authorized streaming API returns available sources.</p></div><div id="detail-sources"></div></div>`;
  $("#detail-dialog").showModal();
  $("#detail-content").querySelector("[data-detail-save]").onclick=()=>toggleList(anime.id);
  $("#detail-content").querySelector("[data-detail-watch]").onclick=()=>renderWatchPanel(anime);
}
function renderWatchPanel(anime) {
  const area=$("#detail-sources");
  if(!anime.streaming?.length) {area.innerHTML=`<div class="detail-extra"><h3>Playback availability</h3><p>No authorized playback source is configured for this title. Connect your own licensed streaming API in <code>js/config.js</code> and return a <code>streaming</code> array to enable playback.</p></div>`;return;}
  const sources=anime.streaming.filter(s=>s&&s.url&&/^https?:$/.test(new URL(s.url).protocol));
  area.innerHTML=`<div class="detail-extra"><h3>Available sources</h3>${sources.length?sources.map(s=>`<a class="button button-outline" target="_blank" rel="noopener noreferrer" href="${escapeHTML(s.url)}">${escapeHTML(s.label||"Open authorized source")} ↗</a>`).join(" "):"<p>No valid authorized sources available.</p>"}</div>`;
}
function renderRoute(route) {
  state.route=route;document.querySelectorAll(".nav-link").forEach(a=>a.classList.toggle("active",a.dataset.route===route));
  const main=$("#app");
  if(route==="home"){location.hash="#home";["hero",""].forEach(()=>{});$("#hero").hidden=false;document.querySelector(".quick-stats").hidden=false;["continue-section","trending-section","discover-section","popular-section","schedule-section"].forEach(id=>$("#"+id).hidden=false);$("#hero").scrollIntoView({behavior:"smooth"});return;}
  $("#hero").hidden=true;document.querySelector(".quick-stats").hidden=true;["continue-section","trending-section","discover-section","popular-section","schedule-section"].forEach(id=>$("#"+id).hidden=true);
  if(route==="watchlist"){
    main.insertAdjacentHTML("beforeend",`<section id="route-view"><div class="page-intro"><p class="section-kicker">YOUR PERSONAL ANIME COLLECTION</p><h1>My watchlist<span class="heading-dot">.</span></h1><p>Everything you want to watch, all in one place.</p></div><div class="content-section" style="padding-top:15px"><div class="anime-grid" id="route-grid"></div></div></section>`);
    renderList("#route-grid",state.list);$("#route-grid").querySelectorAll(".mini-action").forEach(b=>b.onclick=e=>{e.stopPropagation();toggleList(b.dataset.save);});
  } else if(route==="schedule") {
    main.insertAdjacentHTML("beforeend",`<section id="route-view"><div class="page-intro"><p class="section-kicker">PLAN YOUR NEXT WATCH</p><h1>Release schedule<span class="heading-dot">.</span></h1><p>Upcoming release times are shown when supplied by your configured metadata API.</p></div><div class="schedule-list"><div class="schedule-day"><div class="schedule-date"><strong>—</strong><span>LIVE DATA</span></div><div class="schedule-day-copy"><strong>No release schedule connected</strong><p>Connect a provider endpoint that returns schedule information to show confirmed release dates and local times.</p></div></div></div></section>`);
  } else {
    const data=route==="trending"?state.catalog.slice(0,30):state.catalog;
    main.insertAdjacentHTML("beforeend",`<section id="route-view"><div class="page-intro"><p class="section-kicker">EXPLORE THE KAIRO CATALOG</p><h1>${route==="trending"?"Trending anime":"Discover anime"}<span class="heading-dot">.</span></h1><p>Browse anime and open a title to see the details available from your metadata provider.</p><div class="filter-bar" id="route-filters">${genres.map(g=>`<button class="filter-chip ${g==="All"?"selected":""}" data-rgenre="${escapeHTML(g)}">${escapeHTML(g)}</button>`).join("")}</div></div><div class="content-section" style="padding-top:0"><div class="anime-grid" id="route-grid"></div></div></section>`);
    const draw=(g="All")=>renderList("#route-grid",data.filter(x=>g==="All"||x.genres.some(v=>v.toLowerCase()===g.toLowerCase())));
    draw();$("#route-filters").querySelectorAll("[data-rgenre]").forEach(b=>b.onclick=()=>{ $("#route-filters").querySelectorAll("button").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");draw(b.dataset.rgenre);});
  }
  $("#route-view")?.scrollIntoView({behavior:"smooth"});
}
function clearRoute(){$("#route-view")?.remove();}
function navigate() {
  clearRoute();const hash=location.hash.slice(1)||"home";
  const allowed=["home","discover","trending","schedule","watchlist"];
  renderRoute(allowed.includes(hash)?hash:"home");
  document.title=({home:"Kairo — Discover your next anime",discover:"Discover Anime — Kairo",trending:"Trending Anime — Kairo",schedule:"Anime Release Schedule — Kairo",watchlist:"My Watchlist — Kairo"})[allowed.includes(hash)?hash:"home"];
}
function setupSearch() {
  const dialog=$("#search-dialog"),input=$("#search-input"),results=$("#search-results");
  $("#search-toggle").onclick=()=>{dialog.showModal();input.focus();};
  let timer;
  input.addEventListener("input",()=>{clearTimeout(timer);const q=input.value.trim();if(!q){results.innerHTML="";return;}results.innerHTML='<p class="source-note">Searching the catalog…</p>';timer=setTimeout(async()=>{let found=await api.search(q);if(!found.length) found=state.catalog.filter(x=>(x.title+" "+x.alternativeTitle).toLowerCase().includes(q.toLowerCase()));results.innerHTML=found.length?found.slice(0,10).map(a=>`<button class="search-result" data-search-open="${escapeHTML(a.id)}"><img src="${escapeHTML(a.poster)}" alt=""><div><strong>${escapeHTML(a.title)}</strong><span>${escapeHTML([a.year,a.format,a.genres[0]].filter(Boolean).join(" · "))}</span></div></button>`).join(""):'<div class="empty-state"><strong>No matches found</strong><p>Try another title or a shorter search.</p></div>';results.querySelectorAll("[data-search-open]").forEach(b=>b.onclick=()=>{dialog.close();showDetails(b.dataset.searchOpen);});},250);});
  document.addEventListener("keydown",e=>{if((e.key==="/"||((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"))&&!dialog.open&&!/input|textarea/i.test(document.activeElement.tagName)){e.preventDefault();dialog.showModal();input.focus();}if(e.key==="Escape"&&dialog.open)dialog.close();});
}
async function init() {
  $("#year").textContent=new Date().getFullYear();
  $("#load-more").onclick=()=>{state.shown+=12;renderHomeCards();};
  $("#profile-button").onclick=()=>{$("#profile-dialog").showModal();updateCounters();};
  document.querySelectorAll("[data-close-detail]").forEach(b=>b.onclick=()=>$("#detail-dialog").close());
  document.querySelectorAll("[data-close-profile]").forEach(b=>b.onclick=()=>$("#profile-dialog").close());
  $("#profile-watchlist").onclick=()=>$("#profile-dialog").close();
  window.addEventListener("hashchange",navigate);
  setupSearch();updateCounters();
  try { state.catalog=(await api.list({perPage:24})).map(normalizedAnime); }
  catch(error){console.error(error);state.catalog=[];toast("Catalog unavailable. Check your connection and try again.");}
  if(!state.catalog.length){$("#trending-row").innerHTML='<div class="empty-state"><strong>Catalog unavailable</strong><p>Check your metadata API configuration or reconnect to the internet.</p></div>';return;}
  setupHero();renderHomeCards();navigate();
  setInterval(()=>{const slides=state.catalog.filter(x=>x.poster||x.banner).slice(0,3);if(slides.length>1&&!$("#detail-dialog").open){state.heroIndex=(state.heroIndex+1)%slides.length;setupHero();}},9000);
}
init();