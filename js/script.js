/* ============================================================
   FandomVerse — shared site script
   Loaded on every page. Handles: contact form, utility bar
   (visitor counter + live clock), breadcrumb navigation,
   the AI-powered chatbot widget, and the bookmarking system.
   No backend / server-side code — everything below reads from
   local JSON files and the browser's own storage.
   ============================================================ */

function showMessage(message) {
  alert(message);
}

function sendMessage(event) {
  event.preventDefault();
  alert("Message received! Thank you for contacting FandomVerse.");
  event.target.reset();
}

/* ---------- small helper: fetch a local JSON file ---------- */
async function fvFetchJSON(path) {
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error("Failed to load " + path);
    return await res.json();
  } catch (err) {
    console.warn("FandomVerse: could not load", path, err);
    return null;
  }
}

/* ============================================================
   UTILITY BAR — visitor counter + real-time clock
   ============================================================ */
function fvInitUtilityBar() {
  const header = document.querySelector("header");
  if (!header) return;

  const bar = document.createElement("div");
  bar.className = "fv-utility-bar";
  bar.innerHTML = `
    <div class="fv-utility-inner">
      <span class="fv-visitor-counter">👥 <span id="fv-visitor-count">0</span> Visitors</span>
      <span class="fv-clock" id="fv-clock"></span>
    </div>
  `;
  header.insertAdjacentElement("afterend", bar);

  // Visitor counter simulated with localStorage
  let count = parseInt(localStorage.getItem("fv_visitor_count") || "12040", 10);
  if (!sessionStorage.getItem("fv_session_counted")) {
    count += 1;
    localStorage.setItem("fv_visitor_count", String(count));
    sessionStorage.setItem("fv_session_counted", "1");
  }
  document.getElementById("fv-visitor-count").textContent = count.toLocaleString();

  // Real-time clock
  function tick() {
    const el = document.getElementById("fv-clock");
    if (!el) return;
    const now = new Date();
    el.textContent = "🕐 " + now.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) +
      " · " + now.toLocaleTimeString();
  }
  tick();
  setInterval(tick, 1000);
}

/* ============================================================
   BREADCRUMB NAVIGATION
   ============================================================ */
const FV_CATEGORY_LABELS = {
  index: "Home", anime: "Anime", gaming: "Gaming", movies: "Movies",
  tvshows: "TV Shows", kpop: "K-Pop", comics: "Comics", manga: "Manga",
  outfits: "Outfits", about: "About", contact: "Contact",
  characters: "Characters", events: "Events", gallery: "Gallery",
  videos: "Videos", store: "Store", search: "Search", bookmarks: "Bookmarks"
};

function fvInitBreadcrumb() {
  const header = document.querySelector(".page-header");
  if (!header) return;

  const path = window.location.pathname.split("/").pop().replace(".html", "") || "index";
  const params = new URLSearchParams(window.location.search);
  const cat = params.get("cat");

  const crumbs = [`<a href="index.html">Home</a>`];
  if (cat && FV_CATEGORY_LABELS[cat]) {
    crumbs.push(`<a href="${cat}.html">${FV_CATEGORY_LABELS[cat]}</a>`);
  }
  const currentLabel = FV_CATEGORY_LABELS[path] ||
    document.title.split("|")[0].trim() || path;
  crumbs.push(`<span>${currentLabel}</span>`);

  const nav = document.createElement("div");
  nav.className = "breadcrumb";
  nav.innerHTML = crumbs.join(' <span class="sep">/</span> ');
  header.prepend(nav);
}

/* ============================================================
   BOOKMARKING SYSTEM
   Bookmarks -> localStorage (persist across sessions)
   Notes     -> sessionStorage (current session only)
   ============================================================ */
function fvGetBookmarks() {
  try {
    return JSON.parse(localStorage.getItem("fv_bookmarks") || "[]");
  } catch (e) {
    return [];
  }
}

function fvSaveBookmarks(list) {
  localStorage.setItem("fv_bookmarks", JSON.stringify(list));
}

function fvIsBookmarked(id) {
  return fvGetBookmarks().some(b => b.id === id);
}

function fvToggleBookmark(id, title, category, type) {
  let list = fvGetBookmarks();
  const idx = list.findIndex(b => b.id === id);
  if (idx > -1) {
    list.splice(idx, 1);
  } else {
    list.push({ id, title, category, type, savedAt: new Date().toISOString() });
  }
  fvSaveBookmarks(list);
  fvRefreshBookmarkButtons();
  return fvIsBookmarked(id);
}

function fvRefreshBookmarkButtons() {
  document.querySelectorAll("[data-bookmark-id]").forEach(btn => {
    const id = btn.getAttribute("data-bookmark-id");
    btn.classList.toggle("is-bookmarked", fvIsBookmarked(id));
    btn.textContent = fvIsBookmarked(id) ? "🔖 Saved" : "🔖 Save";
  });
}

function fvSetBookmarkNote(id, note) {
  const notes = JSON.parse(sessionStorage.getItem("fv_bookmark_notes") || "{}");
  notes[id] = note;
  sessionStorage.setItem("fv_bookmark_notes", JSON.stringify(notes));
}

function fvGetBookmarkNote(id) {
  const notes = JSON.parse(sessionStorage.getItem("fv_bookmark_notes") || "{}");
  return notes[id] || "";
}

// Delegate clicks so bookmark buttons work even on dynamically-rendered cards
document.addEventListener("click", function (e) {
  const btn = e.target.closest("[data-bookmark-id]");
  if (!btn) return;
  fvToggleBookmark(
    btn.getAttribute("data-bookmark-id"),
    btn.getAttribute("data-bookmark-title") || "Untitled",
    btn.getAttribute("data-bookmark-category") || "",
    btn.getAttribute("data-bookmark-type") || "content"
  );
});

/* ============================================================
   SHOPPING CART (temporary, in-memory + localStorage, no checkout)
   ============================================================ */
function fvGetCart() {
  try {
    return JSON.parse(localStorage.getItem("fv_cart") || "[]");
  } catch (e) {
    return [];
  }
}

function fvSaveCart(cart) {
  localStorage.setItem("fv_cart", JSON.stringify(cart));
}

function fvAddToCart(item) {
  const cart = fvGetCart();
  const existing = cart.find(c => c.name === item.name);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...item, qty: 1 });
  }
  fvSaveCart(cart);
  return cart;
}

function fvCartTotal(cart) {
  return cart.reduce((sum, i) => sum + i.price * i.qty, 0);
}

/* ============================================================
   AI-POWERED CHATBOT (rule-based, pre-scripted dataset)
   ============================================================ */
function fvInitChatbot() {
  const launcher = document.createElement("button");
  launcher.className = "fv-chat-launcher";
  launcher.setAttribute("aria-label", "Open FandomVerse Assistant");
  launcher.innerHTML = "🤖";
  document.body.appendChild(launcher);

  const panel = document.createElement("div");
  panel.className = "fv-chat-panel";
  panel.innerHTML = `
    <div class="fv-chat-head">
      <span>🤖 FandomVerse Assistant</span>
      <button class="fv-chat-close" aria-label="Close chat">✕</button>
    </div>
    <div class="fv-chat-body" id="fv-chat-body"></div>
    <div class="fv-chat-quick" id="fv-chat-quick"></div>
    <form class="fv-chat-input" id="fv-chat-form">
      <input type="text" id="fv-chat-text" placeholder="Ask me about any fandom..." autocomplete="off">
      <button type="submit">➤</button>
    </form>
  `;
  document.body.appendChild(panel);

  let data = null;

  function addBubble(text, who, link, linkText) {
    const body = document.getElementById("fv-chat-body");
    const bubble = document.createElement("div");
    bubble.className = "fv-bubble fv-bubble-" + who;
    bubble.textContent = text;
    body.appendChild(bubble);
    if (link) {
      const a = document.createElement("a");
      a.href = link;
      a.className = "fv-bubble-link";
      a.textContent = linkText || "Open →";
      body.appendChild(a);
    }
    body.scrollTop = body.scrollHeight;
  }

  function respond(userText) {
    if (!data) return;
    const q = userText.toLowerCase();
    const rule = data.rules.find(r => r.keywords.some(k => q.includes(k)));
    if (rule) {
      addBubble(rule.answer, "bot", rule.link, rule.linkText);
    } else {
      addBubble(data.fallback, "bot");
    }
  }

  launcher.addEventListener("click", async () => {
    panel.classList.toggle("open");
    if (panel.classList.contains("open") && !data) {
      data = await fvFetchJSON("data/chatbot.json");
      if (data) {
        addBubble(data.greeting, "bot");
        const quick = document.getElementById("fv-chat-quick");
        data.quickReplies.forEach(q => {
          const b = document.createElement("button");
          b.type = "button";
          b.textContent = q;
          b.addEventListener("click", () => {
            addBubble(q, "user");
            respond(q);
          });
          quick.appendChild(b);
        });
      } else {
        addBubble("Sorry, I couldn't load my knowledge base right now.", "bot");
      }
    }
  });

  panel.querySelector(".fv-chat-close").addEventListener("click", () => {
    panel.classList.remove("open");
  });

  document.getElementById("fv-chat-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("fv-chat-text");
    const val = input.value.trim();
    if (!val) return;
    addBubble(val, "user");
    respond(val);
    input.value = "";
  });
}

/* ============================================================
   INIT — runs on every page
   ============================================================ */
document.addEventListener("DOMContentLoaded", function () {
  fvInitUtilityBar();
  fvInitBreadcrumb();
  fvInitChatbot();
  fvRefreshBookmarkButtons();
});
