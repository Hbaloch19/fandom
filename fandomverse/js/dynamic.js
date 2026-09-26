/* ============================================================
   FandomVerse — dynamic content engine
   Reads data/site-data.json (client-side only, no backend) and
   renders catalogs for articles, characters, gallery, videos,
   events and the merch store. Supports category filtering,
   content-type filtering and sorting, per the SRS.
   ============================================================ */

const FV_CAT_META = {
  anime: { label: "Anime", icon: "⚡" },
  gaming: { label: "Gaming", icon: "🎮" },
  movies: { label: "Movies", icon: "🎬" },
  tvshows: { label: "TV Shows", icon: "📺" },
  kpop: { label: "K-Pop", icon: "🎤" },
  comics: { label: "Comics", icon: "💥" },
  manga: { label: "Manga", icon: "📖" }
};

function fvParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function fvCategoryChips(active, baseUrl) {
  let html = `<button class="chip ${!active ? 'active' : ''}" data-cat="">All Fandoms</button>`;
  Object.keys(FV_CAT_META).forEach(key => {
    html += `<button class="chip ${active === key ? 'active' : ''}" data-cat="${key}">${FV_CAT_META[key].icon} ${FV_CAT_META[key].label}</button>`;
  });
  return html;
}

function fvBindChipRow(container, onChange) {
  container.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
      container.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      onChange(chip.getAttribute("data-cat"));
    });
  });
}

function fvBookmarkBtn(id, title, category, type) {
  return `<button class="bookmark-btn" data-bookmark-id="${id}" data-bookmark-title="${title.replace(/"/g,'&quot;')}" data-bookmark-category="${category}" data-bookmark-type="${type}">🔖 Save</button>`;
}

/* -------------------- ARTICLES -------------------- */
async function fvRenderArticles(containerId, initialCat) {
  const data = await fvFetchJSON("data/site-data.json");
  if (!data) return;
  const container = document.getElementById(containerId);
  const chipRow = document.getElementById("chip-row");
  const sortSelect = document.getElementById("sort-select");
  let currentCat = initialCat || "";
  let currentSort = "newest";

  function getItems() {
    let items = [];
    Object.keys(data.categories).forEach(catKey => {
      if (currentCat && catKey !== currentCat) return;
      data.categories[catKey].articles.forEach((a, i) => {
        items.push({ ...a, category: catKey, id: `article-${catKey}-${i}` });
      });
    });
    if (currentSort === "newest") items.sort((a, b) => new Date(b.date) - new Date(a.date));
    if (currentSort === "az") items.sort((a, b) => a.title.localeCompare(b.title));
    return items;
  }

  function render() {
    const items = getItems();
    container.innerHTML = items.map(a => `
      <div class="data-card">
        ${fvBookmarkBtn(a.id, a.title, a.category, "article")}
        <span class="meta">${FV_CAT_META[a.category].icon} ${FV_CAT_META[a.category].label} · ${a.date} · ${a.readTime}</span>
        <h3 style="margin-top:10px;">${a.title}</h3>
        <p class="article-excerpt">${a.excerpt}</p>
        <a href="#" class="text-link read-more" data-id="${a.id}">Read full article →</a>
        <div class="article-full" id="full-${a.id}" style="display:none; margin-top:15px; padding-top:15px; border-top:1px solid var(--border);"></div>
      </div>
    `).join("") || `<div class="empty-state">No articles found for this fandom yet.</div>`;

    container.querySelectorAll(".read-more").forEach(link => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const id = link.getAttribute("data-id");
        const full = document.getElementById("full-" + id);
        const item = items.find(i => i.id === id);
        const related = items.filter(i => i.category === item.category && i.id !== id).slice(0, 2);
        full.innerHTML = `
          <p style="color: var(--text); line-height:1.9; font-size:13px;">${item.excerpt} This piece is part of FandomVerse's ${FV_CAT_META[item.category].label} coverage, curated for fans who want the full story behind the headlines.</p>
          ${related.length ? `<p style="margin-top:12px; font-size:11px; color:#7a72a3;">RELATED: ${related.map(r => r.title).join(" · ")}</p>` : ""}
        `;
        full.style.display = full.style.display === "none" ? "block" : "none";
        link.textContent = full.style.display === "block" ? "Hide article ↑" : "Read full article →";
      });
    });
    fvRefreshBookmarkButtons();
  }

  if (chipRow) {
    chipRow.innerHTML = fvCategoryChips(currentCat);
    fvBindChipRow(chipRow, (cat) => { currentCat = cat; render(); });
  }
  if (sortSelect) sortSelect.addEventListener("change", (e) => { currentSort = e.target.value; render(); });
  render();
}

/* -------------------- CHARACTERS -------------------- */
async function fvRenderCharacters(containerId, initialCat) {
  const data = await fvFetchJSON("data/site-data.json");
  if (!data) return;
  const container = document.getElementById(containerId);
  const chipRow = document.getElementById("chip-row");
  let currentCat = initialCat || "";

  function render() {
    let items = [];
    Object.keys(data.categories).forEach(catKey => {
      if (currentCat && catKey !== currentCat) return;
      data.categories[catKey].characters.forEach((c, i) => {
        items.push({ ...c, category: catKey, id: `char-${catKey}-${i}` });
      });
    });
    container.innerHTML = items.map(c => `
      <div class="data-card">
        ${fvBookmarkBtn(c.id, c.name, c.category, "character")}
        <div class="emoji-tile">${c.icon}</div>
        <h3>${c.name}</h3>
        <span class="meta">${FV_CAT_META[c.category].icon} ${c.series}</span>
        <p style="margin-top:10px;">${c.bio}</p>
        <div class="traits">${c.traits.map(t => `<span>${t}</span>`).join("")}</div>
      </div>
    `).join("") || `<div class="empty-state">No characters found for this fandom yet.</div>`;
    fvRefreshBookmarkButtons();
  }

  if (chipRow) {
    chipRow.innerHTML = fvCategoryChips(currentCat);
    fvBindChipRow(chipRow, (cat) => { currentCat = cat; render(); });
  }
  render();
}

/* -------------------- EVENTS -------------------- */
async function fvRenderEvents(containerId, initialCat, limit) {
  const data = await fvFetchJSON("data/site-data.json");
  if (!data) return;
  const container = document.getElementById(containerId);
  const chipRow = document.getElementById("chip-row");
  let currentCat = initialCat || "";

  function render() {
    let items = [];
    Object.keys(data.categories).forEach(catKey => {
      if (currentCat && catKey !== currentCat) return;
      data.categories[catKey].events.forEach((ev, i) => {
        items.push({ ...ev, category: catKey, id: `event-${catKey}-${i}` });
      });
    });
    items.sort((a, b) => new Date(a.date) - new Date(b.date));
    if (limit) items = items.slice(0, limit);
    container.innerHTML = items.map(ev => `
      <div class="data-card">
        ${fvBookmarkBtn(ev.id, ev.title, ev.category, "event")}
        <div class="emoji-tile">📅</div>
        <h3>${ev.title}</h3>
        <span class="meta">${FV_CAT_META[ev.category].icon} ${FV_CAT_META[ev.category].label} · ${ev.date} · ${ev.location}</span>
        <p style="margin-top:10px;">${ev.description}</p>
      </div>
    `).join("") || `<div class="empty-state">No events found for this fandom yet.</div>`;
    fvRefreshBookmarkButtons();
  }

  if (chipRow) {
    chipRow.innerHTML = fvCategoryChips(currentCat);
    fvBindChipRow(chipRow, (cat) => { currentCat = cat; render(); });
  }
  render();
}

/* -------------------- GALLERY -------------------- */
async function fvRenderGallery(containerId, initialCat) {
  const data = await fvFetchJSON("data/site-data.json");
  if (!data) return;
  const container = document.getElementById(containerId);
  const chipRow = document.getElementById("chip-row");
  let currentCat = initialCat || "";
  let items = [];
  let lightboxIndex = 0;

  function render() {
    items = [];
    Object.keys(data.categories).forEach(catKey => {
      if (currentCat && catKey !== currentCat) return;
      data.categories[catKey].gallery.forEach((g, i) => {
        items.push({ ...g, category: catKey, id: `gallery-${catKey}-${i}` });
      });
    });
    container.innerHTML = items.map((g, idx) => `
      <div class="gallery-tile" data-idx="${idx}">${g.icon}</div>
    `).join("") || `<div class="empty-state">No images found for this fandom yet.</div>`;

    container.querySelectorAll(".gallery-tile").forEach(tile => {
      tile.addEventListener("click", () => openLightbox(parseInt(tile.getAttribute("data-idx"))));
    });
  }

  function openLightbox(idx) {
    lightboxIndex = idx;
    updateLightbox();
    document.getElementById("fv-lightbox").classList.add("open");
  }

  function updateLightbox() {
    const item = items[lightboxIndex];
    if (!item) return;
    document.getElementById("lightbox-emoji").textContent = item.icon;
    document.getElementById("lightbox-caption").textContent = `${item.caption} — ${FV_CAT_META[item.category].label}`;
  }

  document.getElementById("lightbox-prev").addEventListener("click", () => {
    lightboxIndex = (lightboxIndex - 1 + items.length) % items.length;
    updateLightbox();
  });
  document.getElementById("lightbox-next").addEventListener("click", () => {
    lightboxIndex = (lightboxIndex + 1) % items.length;
    updateLightbox();
  });
  document.getElementById("lightbox-close").addEventListener("click", () => {
    document.getElementById("fv-lightbox").classList.remove("open");
  });

  if (chipRow) {
    chipRow.innerHTML = fvCategoryChips(currentCat);
    fvBindChipRow(chipRow, (cat) => { currentCat = cat; render(); });
  }
  render();
}

/* -------------------- VIDEOS -------------------- */
async function fvRenderVideos(containerId, initialCat) {
  const data = await fvFetchJSON("data/site-data.json");
  if (!data) return;
  const container = document.getElementById(containerId);
  const chipRow = document.getElementById("chip-row");
  const typeSelect = document.getElementById("type-select");
  let currentCat = initialCat || "";
  let currentType = "";

  function render() {
    let items = [];
    Object.keys(data.categories).forEach(catKey => {
      if (currentCat && catKey !== currentCat) return;
      data.categories[catKey].videos.forEach((v, i) => {
        if (currentType && v.type !== currentType) return;
        items.push({ ...v, category: catKey, id: `video-${catKey}-${i}` });
      });
    });
    container.innerHTML = items.map(v => `
      <div class="data-card">
        ${fvBookmarkBtn(v.id, v.title, v.category, "video")}
        <div class="media-placeholder">▶️</div>
        <span class="meta">${FV_CAT_META[v.category].icon} ${FV_CAT_META[v.category].label} · ${v.type}</span>
        <h3 style="margin-top:8px;">${v.title}</h3>
        <p>${v.desc}</p>
      </div>
    `).join("") || `<div class="empty-state">No videos found for this fandom yet.</div>`;
    fvRefreshBookmarkButtons();
  }

  if (chipRow) {
    chipRow.innerHTML = fvCategoryChips(currentCat);
    fvBindChipRow(chipRow, (cat) => { currentCat = cat; render(); });
  }
  if (typeSelect) typeSelect.addEventListener("change", (e) => { currentType = e.target.value; render(); });
  render();
}

/* -------------------- STORE -------------------- */
async function fvRenderStore(containerId, initialCat) {
  const data = await fvFetchJSON("data/site-data.json");
  if (!data) return;
  const container = document.getElementById(containerId);
  const chipRow = document.getElementById("chip-row");
  let currentCat = initialCat || "";

  function renderCart() {
    const cart = fvGetCart();
    const cartBox = document.getElementById("cart-items");
    if (!cartBox) return;
    cartBox.innerHTML = cart.length
      ? cart.map(i => `<div class="cart-item"><span>${i.icon} ${i.name} × ${i.qty}</span><span>$${(i.price * i.qty).toFixed(2)}</span></div>`).join("")
      : `<p style="color:var(--muted); font-size:12px;">Your cart is empty. Add some merch!</p>`;
    document.getElementById("cart-total-value").textContent = "$" + fvCartTotal(cart).toFixed(2);
  }

  function render() {
    let items = [];
    Object.keys(data.categories).forEach(catKey => {
      if (currentCat && catKey !== currentCat) return;
      data.categories[catKey].merch.forEach((m, i) => {
        items.push({ ...m, category: catKey, id: `merch-${catKey}-${i}` });
      });
    });
    container.innerHTML = items.map(m => `
      <div class="data-card">
        ${fvBookmarkBtn(m.id, m.name, m.category, "merch")}
        <div class="emoji-tile">${m.icon}</div>
        <h3>${m.name}</h3>
        <span class="meta">${FV_CAT_META[m.category].icon} ${FV_CAT_META[m.category].label}</span>
        <p style="margin-top:8px;">${m.desc}</p>
        <div class="price-tag">$${m.price.toFixed(2)}</div>
        <button type="button" class="btn small add-cart-btn" data-name="${m.name.replace(/"/g,'&quot;')}" data-price="${m.price}" data-icon="${m.icon}">ADD TO CART</button>
      </div>
    `).join("") || `<div class="empty-state">No merchandise found for this fandom yet.</div>`;

    container.querySelectorAll(".add-cart-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        fvAddToCart({ name: btn.getAttribute("data-name"), price: parseFloat(btn.getAttribute("data-price")), icon: btn.getAttribute("data-icon") });
        renderCart();
      });
    });
    fvRefreshBookmarkButtons();
  }

  if (chipRow) {
    chipRow.innerHTML = fvCategoryChips(currentCat);
    fvBindChipRow(chipRow, (cat) => { currentCat = cat; render(); });
  }
  const clearBtn = document.getElementById("clear-cart-btn");
  if (clearBtn) clearBtn.addEventListener("click", () => { fvSaveCart([]); renderCart(); });

  render();
  renderCart();
}

/* -------------------- SEARCH -------------------- */
async function fvRenderSearch() {
  const data = await fvFetchJSON("data/site-data.json");
  if (!data) return;
  const input = document.getElementById("search-input");
  const container = document.getElementById("search-results");
  const countEl = document.getElementById("result-count");

  function search(query) {
    query = query.trim().toLowerCase();
    if (!query) { container.innerHTML = ""; countEl.textContent = ""; return; }
    let results = [];
    Object.keys(data.categories).forEach(catKey => {
      const cat = data.categories[catKey];
      cat.articles.forEach(a => { if (a.title.toLowerCase().includes(query) || a.excerpt.toLowerCase().includes(query)) results.push({ type: "Article", title: a.title, desc: a.excerpt, category: catKey, link: `articles.html?cat=${catKey}` }); });
      cat.characters.forEach(c => { if (c.name.toLowerCase().includes(query) || c.series.toLowerCase().includes(query)) results.push({ type: "Character", title: c.name, desc: c.bio, category: catKey, link: `characters.html?cat=${catKey}` }); });
      cat.merch.forEach(m => { if (m.name.toLowerCase().includes(query)) results.push({ type: "Merch", title: m.name, desc: m.desc, category: catKey, link: `store.html?cat=${catKey}` }); });
      cat.events.forEach(ev => { if (ev.title.toLowerCase().includes(query)) results.push({ type: "Event", title: ev.title, desc: ev.description, category: catKey, link: `events.html?cat=${catKey}` }); });
    });
    countEl.textContent = `${results.length} result${results.length !== 1 ? "s" : ""} for "${query}"`;
    container.innerHTML = results.map(r => `
      <a href="${r.link}" class="data-card" style="display:block; text-decoration:none; color:inherit;">
        <span class="meta">${FV_CAT_META[r.category].icon} ${FV_CAT_META[r.category].label} · ${r.type}</span>
        <h3 style="margin-top:8px;">${r.title}</h3>
        <p>${r.desc}</p>
      </a>
    `).join("") || `<div class="empty-state">No results found. Try a different search term.</div>`;
  }

  input.addEventListener("input", () => search(input.value));
  const initial = fvParam("q");
  if (initial) { input.value = initial; search(initial); }
}

/* -------------------- BOOKMARKS PAGE -------------------- */
function fvRenderBookmarksPage() {
  const container = document.getElementById("bookmarks-list");
  function render() {
    const list = fvGetBookmarks();
    container.innerHTML = list.length ? list.map(b => `
      <div class="data-card">
        <span class="meta">${FV_CAT_META[b.category] ? FV_CAT_META[b.category].icon : "⭐"} ${b.type} · saved ${new Date(b.savedAt).toLocaleDateString()}</span>
        <h3 style="margin-top:8px;">${b.title}</h3>
        <div class="note-box">
          <textarea placeholder="Add a personal note (kept for this session only)...">${fvGetBookmarkNote(b.id)}</textarea>
        </div>
        <button type="button" class="btn small" style="margin-top:12px;" data-remove="${b.id}">REMOVE</button>
      </div>
    `).join("") : `<div class="empty-state">No bookmarks yet. Tap 🔖 on any card across the site to save it here.</div>`;

    container.querySelectorAll("textarea").forEach((ta, i) => {
      ta.addEventListener("input", () => fvSetBookmarkNote(list[i].id, ta.value));
    });
    container.querySelectorAll("[data-remove]").forEach(btn => {
      btn.addEventListener("click", () => {
        fvToggleBookmark(btn.getAttribute("data-remove"));
        render();
      });
    });
  }
  render();

  const exportBtn = document.getElementById("export-bookmarks-btn");
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      const list = fvGetBookmarks();
      if (!list.length) { showMessage("You don't have any bookmarks to export yet."); return; }
      const text = list.map(b => `• [${b.type.toUpperCase()}] ${b.title} (${b.category})${fvGetBookmarkNote(b.id) ? " — Note: " + fvGetBookmarkNote(b.id) : ""}`).join("\n");
      const blob = new Blob([`FandomVerse Bookmarks\n${new Date().toLocaleString()}\n\n${text}`], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "fandomverse-bookmarks.txt";
      a.click();
      URL.revokeObjectURL(url);
    });
  }
}

/* -------------------- HOME PAGE WIDGETS -------------------- */
async function fvRenderHome() {
  const data = await fvFetchJSON("data/site-data.json");
  if (!data) return;

  const trending = document.getElementById("home-trending");
  if (trending) {
    let items = [];
    Object.keys(data.categories).forEach(catKey => {
      const a = data.categories[catKey].articles[0];
      items.push({ ...a, category: catKey });
    });
    trending.innerHTML = items.slice(0, 6).map(a => `
      <div class="feature">
        <div class="feature-number">${FV_CAT_META[a.category].icon}</div>
        <h2>${a.title}</h2>
        <p>${a.excerpt}</p>
        <a href="articles.html?cat=${a.category}" class="btn small">READ MORE</a>
      </div>
    `).join("");
  }

  const events = document.getElementById("home-events");
  if (events) {
    let items = [];
    Object.keys(data.categories).forEach(catKey => {
      data.categories[catKey].events.forEach(ev => items.push({ ...ev, category: catKey }));
    });
    items.sort((a, b) => new Date(a.date) - new Date(b.date));
    events.innerHTML = items.slice(0, 3).map(ev => `
      <div class="feature">
        <div class="feature-number">📅</div>
        <h2>${ev.title}</h2>
        <p>${ev.date} · ${ev.location}<br>${ev.description}</p>
        <a href="events.html?cat=${ev.category}" class="btn small">VIEW EVENTS</a>
      </div>
    `).join("");
  }
}
