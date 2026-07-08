/* ============================================================
   App logic: hash router, page rendering, countdown,
   photo upload (IndexedDB), and the design customizer.
   Content lives in js/content.js — edit that file, not this one.
   ============================================================ */

"use strict";

/* ----------------------------------------------------------
   Design settings
   ---------------------------------------------------------- */

const FONT_CHOICES = {
  heading: ["Playfair Display", "Cormorant Garamond", "EB Garamond", "Libre Caslon Text", "DM Serif Display", "Marcellus", "Lora"],
  script: ["Clicker Script", "Great Vibes", "Parisienne", "Dancing Script", "Allura", "Charmonman", "None"],
  body: ["Montserrat", "Inter", "Lato", "Karla", "Bitter", "Jost", "Nunito Sans"],
};

const PALETTES = [
  { id: "magnolia",  name: "Magnolia",   bg: "#f8f1ef", accent: "#875346", alt: "#5a6857", text: "#333333" },
  { id: "forest",    name: "Forest",     bg: "#faf7f0", accent: "#2f4a3c", alt: "#b08d57", text: "#26302b" },
  { id: "porcelain", name: "Porcelain",  bg: "#f7f8fa", accent: "#2c3e5d", alt: "#8593ad", text: "#232a35" },
  { id: "champagne", name: "Champagne",  bg: "#f9f4ec", accent: "#a67c52", alt: "#7d6b5d", text: "#3a332d" },
  { id: "blush",     name: "Blush",      bg: "#fdf4f5", accent: "#b0526c", alt: "#7a8574", text: "#3b3134" },
  { id: "noir",      name: "Noir",       bg: "#ffffff", accent: "#1a1a1a", alt: "#8c8c8c", text: "#111111" },
];

const DEFAULT_SETTINGS = {
  fonts: { heading: "Playfair Display", script: "Clicker Script", body: "Montserrat" },
  colors: { preset: "magnolia", bg: "#f8f1ef", accent: "#875346", alt: "#5a6857", text: "#333333" },
  layout: { hero: "banner", header: "stacked", mode: "multi", width: "cozy" },
};

let settings = loadSettings();

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem("sd-design") || "{}");
    return {
      fonts: { ...DEFAULT_SETTINGS.fonts, ...saved.fonts },
      colors: { ...DEFAULT_SETTINGS.colors, ...saved.colors },
      layout: { ...DEFAULT_SETTINGS.layout, ...saved.layout },
    };
  } catch {
    return structuredClone(DEFAULT_SETTINGS);
  }
}

function saveSettings() {
  localStorage.setItem("sd-design", JSON.stringify(settings));
}

function applySettings() {
  const d = document.documentElement;
  const { fonts, colors, layout } = settings;

  d.style.setProperty("--f-heading", `"${fonts.heading}", Georgia, serif`);
  d.style.setProperty("--f-script", fonts.script === "None" ? `"${fonts.heading}", serif` : `"${fonts.script}", cursive`);
  d.style.setProperty("--f-body", `"${fonts.body}", "Helvetica Neue", sans-serif`);

  d.style.setProperty("--c-bg", colors.bg);
  d.style.setProperty("--c-accent", colors.accent);
  d.style.setProperty("--c-alt", colors.alt);
  d.style.setProperty("--c-text", colors.text);
  d.style.setProperty("--c-surface", mixWithWhite(colors.bg, 0.55));
  d.style.setProperty("--c-line", mixColors(colors.bg, colors.accent, 0.16));
  d.style.setProperty("--c-muted", mixColors(colors.text, colors.bg, 0.55));

  d.dataset.hero = layout.hero;
  d.dataset.header = layout.header;
  d.dataset.mode = layout.mode;
  d.dataset.width = layout.width;

  loadGoogleFonts();
  saveSettings();
}

function loadGoogleFonts() {
  const fams = new Set([settings.fonts.heading, settings.fonts.body]);
  if (settings.fonts.script !== "None") fams.add(settings.fonts.script);
  const parts = [...fams].map((f) => "family=" + encodeURIComponent(f).replace(/%20/g, "+") + ":ital,wght@0,300..800;1,300..800");
  document.getElementById("gfonts").href = "https://fonts.googleapis.com/css2?" + parts.join("&") + "&display=swap";
}

/* tiny color helpers (hex in, hex out) */
function hexRgb(h) {
  const x = h.replace("#", "");
  const f = x.length === 3 ? x.split("").map((c) => c + c).join("") : x;
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16));
}
function rgbHex(r, g, b) {
  return "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
}
function mixColors(a, b, t) {
  const [r1, g1, b1] = hexRgb(a), [r2, g2, b2] = hexRgb(b);
  return rgbHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}
function mixWithWhite(c, t) { return mixColors(c, "#ffffff", t); }

/* ----------------------------------------------------------
   Photo storage (IndexedDB)
   ---------------------------------------------------------- */

const DB_NAME = "sd-wedding-photos";
let dbPromise = null;

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore("photos");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

async function dbPut(key, blob) {
  const db = await openDb();
  return new Promise((res, rej) => {
    const tx = db.transaction("photos", "readwrite");
    tx.objectStore("photos").put(blob, key);
    tx.oncomplete = res;
    tx.onerror = () => rej(tx.error);
  });
}

async function dbDelete(key) {
  const db = await openDb();
  return new Promise((res, rej) => {
    const tx = db.transaction("photos", "readwrite");
    tx.objectStore("photos").delete(key);
    tx.oncomplete = res;
    tx.onerror = () => rej(tx.error);
  });
}

async function dbEntries() {
  const db = await openDb();
  return new Promise((res, rej) => {
    const tx = db.transaction("photos", "readonly");
    const store = tx.objectStore("photos");
    const keysReq = store.getAllKeys();
    const valsReq = store.getAll();
    tx.oncomplete = () => res(keysReq.result.map((k, i) => [k, valsReq.result[i]]));
    tx.onerror = () => rej(tx.error);
  });
}

/* Downscale an image file to keep storage small */
function downscale(file, maxDim = 2200, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      if (scale === 1 && file.size < 1_500_000) return resolve(file);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("not an image")); };
    img.src = url;
  });
}

/* ----------------------------------------------------------
   Photo slot component
   ---------------------------------------------------------- */

const CAMERA_SVG = `<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`;

function photoSlotHtml(slotId, extraClass = "", label = "Add a photo") {
  return `
    <div class="photo-slot empty ${extraClass}" data-slot="${slotId}" tabindex="0" role="button" aria-label="${label}">
      <div class="slot-placeholder">${CAMERA_SVG}<span>${label}</span></div>
      <div class="slot-actions">
        <button type="button" data-act="replace">Photo</button>
        <button type="button" data-act="remove" hidden>Remove</button>
      </div>
    </div>`;
}

function setSlotImage(slotEl, blob) {
  let img = slotEl.querySelector("img.slot-img");
  if (!blob) {
    if (img) { URL.revokeObjectURL(img.src); img.remove(); }
    slotEl.classList.add("empty");
    slotEl.querySelector('[data-act="remove"]').hidden = true;
    slotEl.querySelector('[data-act="replace"]').textContent = "Photo";
    return;
  }
  if (!img) {
    img = document.createElement("img");
    img.className = "slot-img";
    img.alt = "";
    slotEl.prepend(img);
  } else {
    URL.revokeObjectURL(img.src);
  }
  img.src = URL.createObjectURL(blob);
  slotEl.classList.remove("empty");
  slotEl.querySelector('[data-act="remove"]').hidden = false;
  slotEl.querySelector('[data-act="replace"]').textContent = "Replace";
}

let pendingSlot = null;
const fileInput = () => document.getElementById("fileInput");

async function handleSlotFile(slotEl, file) {
  try {
    const blob = await downscale(file);
    await dbPut(slotEl.dataset.slot, blob);
    setSlotImage(slotEl, blob);
  } catch (e) {
    console.warn("photo upload failed:", e);
  }
}

function wireSlots(root) {
  root.querySelectorAll(".photo-slot").forEach((slot) => {
    slot.addEventListener("click", (ev) => {
      const act = ev.target.closest("[data-act]");
      if (act && act.dataset.act === "remove") {
        ev.stopPropagation();
        dbDelete(slot.dataset.slot);
        setSlotImage(slot, null);
        return;
      }
      pendingSlot = slot;
      fileInput().click();
    });
    slot.addEventListener("dragover", (e) => { e.preventDefault(); slot.classList.add("dragover"); });
    slot.addEventListener("dragleave", () => slot.classList.remove("dragover"));
    slot.addEventListener("drop", (e) => {
      e.preventDefault();
      slot.classList.remove("dragover");
      const f = e.dataTransfer.files[0];
      if (f) handleSlotFile(slot, f);
    });
  });
}

/* ----------------------------------------------------------
   Page templates
   ---------------------------------------------------------- */

function pageTitle(script, title) {
  return `<div class="page-title"><span class="script">${script}</span><h2>${title}</h2></div>`;
}

function renderWelcome() {
  const w = SITE.wedding;
  const names = `${SITE.couple.partner1} <span class="hero-amp">&amp;</span> ${SITE.couple.partner2}`;
  const heroText = `
    <div class="hero-names">${names}</div>
    <div class="hero-date">${w.dateDisplay}</div>
    <div class="hero-venue">${w.venue}</div>`;

  return `
    <section class="hero">
      <div class="hero-photo-wrap">
        ${photoSlotHtml("hero", "", "Add your hero photo")}
        <div class="hero-overlay" id="heroOverlay">${heroText}</div>
      </div>
      <div class="hero-inner" id="heroInner">${heroText}</div>
      <div class="countdown" id="countdown"></div>
    </section>
    <section class="page-body" style="max-width:var(--w-content);margin:0 auto;padding:3rem 1.5rem 0">
      <div class="page-title"><span class="script">welcome</span><h2>${SITE.welcome.heading}</h2></div>
      <p class="center">${SITE.welcome.message}</p>
    </section>`;
}

function renderStory() {
  return `
    ${pageTitle("our", "Story")}
    <p class="center muted" style="margin-bottom:0.4rem">${SITE.story.intro}</p>
    <div class="story-photo">${photoSlotHtml("story", "slot-tall", "Add a photo of us")}</div>
    <p class="story-text">${SITE.story.text}</p>`;
}

function renderSchedule() {
  const items = SITE.schedule.map((it) => `
    <div class="timeline-item">
      <h3>${it.title}</h3>
      <div class="timeline-when">${it.date} · ${it.time}</div>
      <div class="timeline-where">${it.location}</div>
      <p style="font-size:0.92rem;margin-top:0.35rem">${it.note || ""}</p>
    </div>`).join("");
  return `${pageTitle("the", "Schedule")}<div class="timeline">${items}</div>`;
}

function renderStay() {
  const cards = SITE.hotels.map((h, i) => `
    <div class="hotel-card">
      ${photoSlotHtml("hotel-" + i, "", "Add photo")}
      <div class="hotel-body">
        <h3>${h.name}</h3>
        <div class="hotel-stars">${"★".repeat(Math.floor(h.stars))}${h.stars % 1 ? "½" : ""} <span class="muted">(${h.stars})</span></div>
        <div class="hotel-addr">${h.address}</div>
        <p class="hotel-blurb">${h.blurb}</p>
      </div>
    </div>`).join("");
  return `${pageTitle("where to", "Stay")}<div class="hotel-grid">${cards}</div>`;
}

function renderTravel() {
  const blocks = SITE.travel.map((t) => `
    <div class="travel-block"><h3>${t.title}</h3><p>${t.body}</p></div>`).join("");
  return `
    ${pageTitle("getting", "There")}
    <p class="center muted" style="margin-bottom:2.4rem">${SITE.wedding.venue} · ${SITE.wedding.venueAddress}</p>
    ${blocks}`;
}

function renderQanda() {
  const items = SITE.qanda.map((q) => `
    <details class="qa-item">
      <summary>${q.q}</summary>
      <div class="qa-answer">${q.a}</div>
    </details>`).join("");
  return `${pageTitle("questions &", "Answers")}${items}`;
}

function renderRegistry() {
  const links = SITE.registry.links.map((l) => `
    <a class="registry-card" href="${l.url}" target="_blank" rel="noopener">
      <h3>${l.label} →</h3>
      <p>${l.description || ""}</p>
    </a>`).join("");
  return `${pageTitle("the", "Registry")}<p class="center">${SITE.registry.note}</p><div class="registry-links">${links}</div>`;
}

function renderMoments() {
  return `
    ${pageTitle("our", "Moments")}
    <p class="center">${SITE.moments.intro}</p>
    <div class="gallery" id="gallery"></div>`;
}

function renderRsvp() {
  return `
    ${pageTitle("join", "Us")}
    <p class="center">${SITE.rsvp.message}</p>
    <p class="center" style="margin-top:0.6rem"><strong>Kindly respond by ${SITE.rsvp.deadline}.</strong></p>
    <form class="rsvp-form" id="rsvpForm">
      <label><span>Your name</span><input type="text" name="name" required placeholder="Full name"></label>
      <label><span>Email</span><input type="email" name="email" placeholder="you@example.com"></label>
      <div class="rsvp-attend" role="radiogroup" aria-label="Will you attend?">
        <label><input type="radio" name="attending" value="Joyfully accepts" checked> Joyfully accepts</label>
        <label><input type="radio" name="attending" value="Regretfully declines"> Regretfully declines</label>
      </div>
      <label><span>Number of guests (including you)</span>
        <select name="guests"><option>1</option><option>2</option><option>3</option><option>4</option></select>
      </label>
      <label><span>Dietary notes or a message for us</span>
        <textarea name="notes" rows="4" placeholder="Allergies, song requests, anything at all…"></textarea>
      </label>
      <button class="btn" type="submit">Send RSVP</button>
      <div class="rsvp-sent" id="rsvpSent"></div>
    </form>`;
}

const PAGE_RENDERERS = {
  welcome: renderWelcome,
  story: renderStory,
  schedule: renderSchedule,
  stay: renderStay,
  travel: renderTravel,
  qanda: renderQanda,
  registry: renderRegistry,
  moments: renderMoments,
  rsvp: renderRsvp,
};

/* ----------------------------------------------------------
   Rendering + router
   ---------------------------------------------------------- */

function buildNav() {
  const nav = document.getElementById("siteNav");
  nav.innerHTML = SITE.navigation
    .map((p) => `<a href="#/${p.id}" data-page="${p.id}">${p.label}</a>`)
    .join("");
}

function renderAllPages() {
  const main = document.getElementById("main");
  main.innerHTML = SITE.navigation
    .map((p) => {
      const body = PAGE_RENDERERS[p.id] ? PAGE_RENDERERS[p.id]() : "";
      const cls = p.id === "welcome" ? "" : "page";
      return `<section class="${cls}" id="page-${p.id}" data-page="${p.id}">${body}</section>`;
    })
    .join("");

  wireSlots(main);
  hydratePhotos();
  wireGallery();
  wireRsvp();
  startCountdown();
}

function currentPage() {
  const m = location.hash.match(/^#\/([\w-]+)/);
  const id = m ? m[1] : SITE.navigation[0].id;
  return SITE.navigation.some((p) => p.id === id) ? id : SITE.navigation[0].id;
}

function route() {
  const id = currentPage();
  const multi = settings.layout.mode === "multi";

  document.querySelectorAll("#main > section").forEach((sec) => {
    sec.hidden = multi && sec.dataset.page !== id;
  });

  document.querySelectorAll("#siteNav a").forEach((a) => {
    a.classList.toggle("active", a.dataset.page === id);
  });

  if (multi) {
    window.scrollTo({ top: 0 });
  } else {
    const el = document.getElementById("page-" + id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }
}

/* ----------------------------------------------------------
   Countdown
   ---------------------------------------------------------- */

let countdownTimer = null;

function startCountdown() {
  const el = document.getElementById("countdown");
  if (!el) return;
  clearInterval(countdownTimer);
  const target = new Date(SITE.wedding.dateISO).getTime();

  const tick = () => {
    let diff = Math.max(0, target - Date.now());
    const d = Math.floor(diff / 86400000); diff -= d * 86400000;
    const h = Math.floor(diff / 3600000); diff -= h * 3600000;
    const m = Math.floor(diff / 60000); diff -= m * 60000;
    const s = Math.floor(diff / 1000);
    const cells = [[d, "Days"], [h, "Hours"], [m, "Minutes"], [s, "Seconds"]];
    el.innerHTML = cells
      .map(([n, l]) => `<div class="count-cell"><div class="count-num">${n}</div><div class="count-label">${l}</div></div>`)
      .join("");
  };
  tick();
  countdownTimer = setInterval(tick, 1000);
}

/* ----------------------------------------------------------
   Hero variants — show overlay text only for banner style
   ---------------------------------------------------------- */

function syncHeroText() {
  const overlay = document.getElementById("heroOverlay");
  const inner = document.getElementById("heroInner");
  if (!overlay || !inner) return;
  const banner = settings.layout.hero === "banner";
  overlay.style.display = banner ? "" : "none";
  inner.style.display = banner ? "none" : "";
  const heroSlot = document.querySelector('[data-slot="hero"]');
  if (heroSlot) overlay.classList.toggle("on-photo", !heroSlot.classList.contains("empty"));
}

/* ----------------------------------------------------------
   Photo hydration + gallery
   ---------------------------------------------------------- */

async function hydratePhotos() {
  let entries = [];
  try { entries = await dbEntries(); } catch { return; }
  const gallery = document.getElementById("gallery");

  for (const [key, blob] of entries) {
    if (key.startsWith("gallery-")) {
      if (gallery) addGalleryItem(key, blob, false);
    } else {
      const slot = document.querySelector(`[data-slot="${CSS.escape(key)}"]`);
      if (slot) setSlotImage(slot, blob);
    }
  }
  if (gallery) ensureGalleryAddTile();
  syncHeroText();
}

function ensureGalleryAddTile() {
  const gallery = document.getElementById("gallery");
  if (!gallery || gallery.querySelector(".gallery-add")) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "gallery-add";
  btn.innerHTML = `${CAMERA_SVG}<span>Add photos</span>`;
  btn.addEventListener("click", () => document.getElementById("fileInputMulti").click());
  gallery.prepend(btn);
}

function addGalleryItem(key, blob, prepend = true) {
  const gallery = document.getElementById("gallery");
  if (!gallery) return;
  const fig = document.createElement("figure");
  fig.className = "gallery-item";
  fig.dataset.key = key;
  const img = document.createElement("img");
  img.src = URL.createObjectURL(blob);
  img.alt = "Gallery photo";
  img.loading = "lazy";
  const rm = document.createElement("button");
  rm.className = "g-remove";
  rm.type = "button";
  rm.setAttribute("aria-label", "Remove photo");
  rm.textContent = "×";
  rm.addEventListener("click", (e) => {
    e.stopPropagation();
    dbDelete(key);
    URL.revokeObjectURL(img.src);
    fig.remove();
  });
  fig.append(img, rm);
  fig.addEventListener("click", () => openLightbox(img.src));
  const addTile = gallery.querySelector(".gallery-add");
  if (prepend && addTile) addTile.after(fig);
  else gallery.append(fig);
}

function wireGallery() {
  ensureGalleryAddTile();
  const multi = document.getElementById("fileInputMulti");
  multi.onchange = async () => {
    for (const file of multi.files) {
      try {
        const blob = await downscale(file, 1800, 0.82);
        const key = "gallery-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
        await dbPut(key, blob);
        addGalleryItem(key, blob);
      } catch (e) { console.warn("skipped file:", e); }
    }
    multi.value = "";
  };
}

function openLightbox(src) {
  const lb = document.getElementById("lightbox");
  document.getElementById("lightboxImg").src = src;
  lb.hidden = false;
}

/* ----------------------------------------------------------
   RSVP (composes an email — no server needed)
   ---------------------------------------------------------- */

function wireRsvp() {
  const form = document.getElementById("rsvpForm");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const subject = `RSVP — ${data.get("name")} (${data.get("attending")})`;
    const body = [
      `Name: ${data.get("name")}`,
      `Email: ${data.get("email") || "—"}`,
      `Attending: ${data.get("attending")}`,
      `Guests: ${data.get("guests")}`,
      `Notes: ${data.get("notes") || "—"}`,
    ].join("\n");
    location.href = `mailto:${SITE.rsvp.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    document.getElementById("rsvpSent").textContent = "Your email app should open — just press send!";
  });
}

/* ----------------------------------------------------------
   Design panel
   ---------------------------------------------------------- */

function buildDesignPanel() {
  // Font selects
  for (const [role, el] of [
    ["heading", document.getElementById("fontHeading")],
    ["script", document.getElementById("fontScript")],
    ["body", document.getElementById("fontBody")],
  ]) {
    const choices = [...FONT_CHOICES[role]];
    if (!choices.includes(settings.fonts[role])) choices.unshift(settings.fonts[role]);
    el.innerHTML =
      choices.map((f) => `<option value="${f}">${f}</option>`).join("") +
      `<option value="__custom__">Custom Google Font…</option>`;
    el.value = settings.fonts[role];

    const custom = document.getElementById(el.id + "Custom");
    el.addEventListener("change", () => {
      if (el.value === "__custom__") {
        custom.hidden = false;
        custom.focus();
        return;
      }
      custom.hidden = true;
      settings.fonts[role] = el.value;
      applySettings();
    });
    custom.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const name = custom.value.trim();
      if (!name) return;
      settings.fonts[role] = name;
      applySettings();
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      el.prepend(opt);
      el.value = name;
      custom.hidden = true;
      custom.value = "";
    });
  }

  // Palette swatches
  const sw = document.getElementById("paletteSwatches");
  sw.innerHTML = PALETTES.map((p) => `
    <button class="dp-swatch" data-palette="${p.id}" title="${p.name}" aria-label="${p.name}">
      <i style="background:${p.accent}"></i><i style="background:${p.bg}"></i>
    </button>`).join("");
  sw.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-palette]");
    if (!btn) return;
    const p = PALETTES.find((x) => x.id === btn.dataset.palette);
    settings.colors = { preset: p.id, bg: p.bg, accent: p.accent, alt: p.alt, text: p.text };
    applySettings();
    refreshPanelState();
  });

  // Custom color pickers
  for (const [key, id] of [["bg", "colBg"], ["accent", "colAccent"], ["alt", "colAlt"], ["text", "colText"]]) {
    const input = document.getElementById(id);
    input.addEventListener("input", () => {
      settings.colors[key] = input.value;
      settings.colors.preset = "custom";
      applySettings();
      refreshPanelState();
    });
  }

  // Layout radio groups
  document.querySelectorAll(".dp-radios").forEach((group) => {
    group.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-value]");
      if (!btn) return;
      settings.layout[group.dataset.setting] = btn.dataset.value;
      applySettings();
      refreshPanelState();
      route();       // page mode may have changed
      syncHeroText(); // hero style may have changed
    });
  });

  // Open/close/reset
  const panel = document.getElementById("designPanel");
  document.getElementById("designToggle").addEventListener("click", () => panel.classList.toggle("open"));
  document.getElementById("designClose").addEventListener("click", () => panel.classList.remove("open"));
  document.getElementById("designReset").addEventListener("click", () => {
    localStorage.removeItem("sd-design");
    settings = structuredClone(DEFAULT_SETTINGS);
    applySettings();
    refreshPanelState();
    route();
    syncHeroText();
  });

  refreshPanelState();
}

function refreshPanelState() {
  document.getElementById("fontHeading").value = settings.fonts.heading;
  document.getElementById("fontScript").value = settings.fonts.script;
  document.getElementById("fontBody").value = settings.fonts.body;

  document.querySelectorAll(".dp-swatch").forEach((b) =>
    b.classList.toggle("selected", b.dataset.palette === settings.colors.preset));

  document.getElementById("colBg").value = settings.colors.bg;
  document.getElementById("colAccent").value = settings.colors.accent;
  document.getElementById("colAlt").value = settings.colors.alt;
  document.getElementById("colText").value = settings.colors.text;

  document.querySelectorAll(".dp-radios").forEach((group) => {
    group.querySelectorAll("button").forEach((b) =>
      b.classList.toggle("selected", b.dataset.value === settings.layout[group.dataset.setting]));
  });
}

/* ----------------------------------------------------------
   Boot
   ---------------------------------------------------------- */

function boot() {
  document.title = `${SITE.couple.displayName} — ${SITE.wedding.dateDisplay}`;
  document.getElementById("brandMonogram").textContent = SITE.couple.monogram;
  document.getElementById("brandNames").textContent = SITE.couple.displayName;
  document.getElementById("footerMonogram").textContent = SITE.couple.monogram;
  document.getElementById("footerLine").textContent =
    `${SITE.couple.displayName} · ${SITE.wedding.dateDisplay} · ${SITE.wedding.city}`;

  applySettings();
  buildNav();
  renderAllPages();
  buildDesignPanel();
  route();
  syncHeroText();

  window.addEventListener("hashchange", route);

  // single-file input used by all photo slots
  fileInput().addEventListener("change", () => {
    const f = fileInput().files[0];
    if (f && pendingSlot) {
      handleSlotFile(pendingSlot, f).then(syncHeroText);
    }
    fileInput().value = "";
  });

  document.getElementById("lightbox").addEventListener("click", (e) => {
    e.currentTarget.hidden = true;
  });
}

document.addEventListener("DOMContentLoaded", boot);
