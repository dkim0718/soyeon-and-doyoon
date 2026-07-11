/* ============================================================
   Joy engine — shared by the English (en) and Korean (kr)
   wedding websites. Content lives in the per-locale content
   file (en/content.en.js, kr/content.ko.js) as `window.SITE`;
   fixed UI strings live in shared/i18n.js.

   Responsibilities: hash router, page rendering, countdown,
   display-only gallery + lightbox, the RSVP widget mount, and
   the (optional) design customizer.
   ============================================================ */

"use strict";

/* ----------------------------------------------------------
   Design settings
   ---------------------------------------------------------- */

const FONT_CHOICES = {
  heading: ["Playfair Display", "Cormorant Garamond", "EB Garamond", "Libre Caslon Text", "DM Serif Display", "Marcellus", "Lora", "Nanum Myeongjo", "Noto Serif KR", "Gowun Batang"],
  script: ["Clicker Script", "Great Vibes", "Parisienne", "Dancing Script", "Allura", "Charmonman", "Nanum Pen Script", "None"],
  body: ["Montserrat", "Inter", "Lato", "Karla", "Bitter", "Jost", "Nunito Sans", "Noto Sans KR", "Gowun Dodum"],
};

/* Korean-first font sets for the ko site's design panel. Every font here is
   loaded up front by kr/index.html's static <link>, so switching is instant. */
const FONT_CHOICES_KO = {
  heading: ["Nanum Myeongjo", "Noto Serif KR", "Gowun Batang", "Song Myung", "Hahmlet", "Black Han Sans", "Do Hyeon", "Jua"],
  script: ["Nanum Pen Script", "Gaegu", "Gamja Flower", "None"],
  body: ["Noto Sans KR", "Gowun Dodum", "Nanum Gothic", "IBM Plex Sans KR", "Sunflower"],
};

function fontChoices() {
  return (typeof SITE !== "undefined" && SITE.locale === "ko") ? FONT_CHOICES_KO : FONT_CHOICES;
}

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

/* Fallback section titles (English) if a content file omits SITE.titles */
const DEFAULT_TITLES = {
  welcome:  { script: "welcome",       title: "" },
  story:    { script: "our",           title: "Story" },
  schedule: { script: "the",           title: "Schedule" },
  stay:     { script: "where to",      title: "Stay" },
  travel:   { script: "getting",       title: "There" },
  qanda:    { script: "questions &",   title: "Answers" },
  registry: { script: "the",           title: "Registry" },
  moments:  { script: "our",           title: "Moments" },
  rsvp:     { script: "join",          title: "Us" },
};

const SETTINGS_KEY = "sd-design";

let settings = loadSettings();

function loadSettings() {
  // Per-site defaults let the Korean site start with Korean-capable fonts
  // (content file may set SITE.fontDefaults). User overrides still win.
  const siteFonts = (window.SITE && window.SITE.fontDefaults) || {};
  const baseFonts = { ...DEFAULT_SETTINGS.fonts, ...siteFonts };
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    return {
      fonts: { ...baseFonts, ...saved.fonts },
      colors: { ...DEFAULT_SETTINGS.colors, ...saved.colors },
      layout: { ...DEFAULT_SETTINGS.layout, ...saved.layout },
    };
  } catch {
    return { fonts: baseFonts, colors: { ...DEFAULT_SETTINGS.colors }, layout: { ...DEFAULT_SETTINGS.layout } };
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
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
  // Request families WITHOUT a weight/italic axis: css2 rejects the whole
  // request if any one family lacks the requested axis (common with Korean and
  // single-weight display fonts), which would drop every font. Bold weights for
  // the built-in choices come from each page's static <link>; this dynamic link
  // just guarantees any custom-typed font also loads.
  const parts = [...fams].map((f) => "family=" + encodeURIComponent(f).replace(/%20/g, "+"));
  const link = document.getElementById("gfonts");
  if (link) link.href = "https://fonts.googleapis.com/css2?" + parts.join("&") + "&display=swap";
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
   Photos (display-only — the curated set from shared/photos)
   ---------------------------------------------------------- */

function photoImg(src, alt, extraClass) {
  if (!src) return "";
  return `<div class="photo ${extraClass || ""}"><img src="${src}" alt="${alt || ""}" loading="lazy"></div>`;
}

/* ----------------------------------------------------------
   Page templates
   ---------------------------------------------------------- */

function titleFor(id) {
  return (SITE.titles && SITE.titles[id]) || DEFAULT_TITLES[id] || { script: "", title: "" };
}

function pageTitle(id) {
  const s = titleFor(id);
  return `<div class="page-title"><span class="script">${s.script || ""}</span><h2>${s.title || ""}</h2></div>`;
}

function renderWelcome() {
  const w = SITE.wedding;
  const names = `${SITE.couple.partner1} <span class="hero-amp">&amp;</span> ${SITE.couple.partner2}`;
  const heroText = `
    <div class="hero-names">${names}</div>
    <div class="hero-date">${w.dateDisplay}</div>
    <div class="hero-venue">${w.venue}</div>`;
  const heroPhoto = (SITE.photos && SITE.photos.hero)
    ? `<img class="hero-img" src="${SITE.photos.hero}" alt="" fetchpriority="high">` : "";

  return `
    <section class="hero">
      <div class="hero-photo-wrap">
        ${heroPhoto}
        <div class="hero-overlay" id="heroOverlay">${heroText}</div>
      </div>
      <div class="hero-inner" id="heroInner">${heroText}</div>
      <div class="countdown" id="countdown"></div>
    </section>
    <section class="page-body" style="max-width:var(--w-content);margin:0 auto;padding:3rem 1.5rem 0">
      <div class="page-title"><span class="script">${titleFor("welcome").script}</span><h2>${SITE.welcome.heading}</h2></div>
      <p class="center">${SITE.welcome.message}</p>
    </section>`;
}

function renderStory() {
  const photo = (SITE.photos && SITE.photos.story)
    ? `<div class="story-photo">${photoImg(SITE.photos.story, "", "slot-tall")}</div>` : "";
  return `
    ${pageTitle("story")}
    <p class="center muted" style="margin-bottom:0.4rem">${SITE.story.intro}</p>
    ${photo}
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
  return `${pageTitle("schedule")}<div class="timeline">${items}</div>`;
}

function renderStay() {
  const cards = SITE.hotels.map((h) => `
    <div class="hotel-card">
      <div class="hotel-body">
        <h3>${h.name}</h3>
        <div class="hotel-stars">${"★".repeat(Math.floor(h.stars))}${h.stars % 1 ? "½" : ""} <span class="muted">(${h.stars})</span></div>
        <div class="hotel-addr">${h.address}</div>
        <p class="hotel-blurb">${h.blurb}</p>
      </div>
    </div>`).join("");
  const intro = SITE.stayIntro ? `<p class="center" style="margin-bottom:2.2rem">${SITE.stayIntro}</p>` : "";
  return `${pageTitle("stay")}${intro}<div class="hotel-grid">${cards}</div>`;
}

function renderTravel() {
  const blocks = SITE.travel.map((t) => `
    <div class="travel-block"><h3>${t.title}</h3><p>${t.body}</p></div>`).join("");
  return `
    ${pageTitle("travel")}
    <p class="center muted" style="margin-bottom:2.4rem">${SITE.wedding.venue} · ${SITE.wedding.venueAddress}</p>
    ${blocks}`;
}

function renderQanda() {
  const items = SITE.qanda.map((q) => `
    <details class="qa-item">
      <summary>${q.q}</summary>
      <div class="qa-answer">${q.a}</div>
    </details>`).join("");
  return `${pageTitle("qanda")}${items}`;
}

function renderRegistry() {
  const links = SITE.registry.links.map((l) => `
    <a class="registry-card" href="${l.url}" target="_blank" rel="noopener">
      <h3>${l.label} →</h3>
      <p>${l.description || ""}</p>
    </a>`).join("");
  return `${pageTitle("registry")}<p class="center">${SITE.registry.note}</p><div class="registry-links">${links}</div>`;
}

function renderMoments() {
  return `
    ${pageTitle("moments")}
    <p class="center">${SITE.moments.intro}</p>
    <div class="gallery" id="gallery"></div>`;
}

function renderRsvp() {
  const deadline = SITE.rsvp && SITE.rsvp.deadline
    ? `<p class="center" style="margin-top:0.6rem"><strong>${t("respondBy", { date: SITE.rsvp.deadline })}</strong></p>` : "";
  const intro = SITE.rsvp && SITE.rsvp.message ? `<p class="center">${SITE.rsvp.message}</p>` : "";
  return `
    ${pageTitle("rsvp")}
    ${intro}
    ${deadline}
    <div id="rsvpWidget" class="rsvp-widget"></div>`;
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

  renderGallery();
  mountRsvp();
  startCountdown();
  syncHeroText();
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
    const cells = [[d, t("count.days")], [h, t("count.hours")], [m, t("count.minutes")], [s, t("count.seconds")]];
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
  const hasPhoto = !!(SITE.photos && SITE.photos.hero);
  overlay.classList.toggle("on-photo", hasPhoto);
}

/* ----------------------------------------------------------
   Gallery (display-only) + lightbox
   ---------------------------------------------------------- */

function renderGallery() {
  const gallery = document.getElementById("gallery");
  if (!gallery) return;
  const urls = SITE.galleryDefaults || [];
  gallery.innerHTML = "";
  urls.forEach((url) => {
    const fig = document.createElement("figure");
    fig.className = "gallery-item";
    const img = document.createElement("img");
    img.src = url;
    img.alt = "Gallery photo";
    img.loading = "lazy";
    fig.append(img);
    fig.addEventListener("click", () => openLightbox(url));
    gallery.append(fig);
  });
}

function openLightbox(src) {
  const lb = document.getElementById("lightbox");
  if (!lb) return;
  document.getElementById("lightboxImg").src = src;
  lb.hidden = false;
}

/* ----------------------------------------------------------
   RSVP widget mount
   ---------------------------------------------------------- */

function mountRsvp() {
  const host = document.getElementById("rsvpWidget");
  if (!host || !window.Store) return;
  const kind = SITE.rsvpKind || "wedding";
  const opts = { store: window.Store, config: SITE };
  if (kind === "afterparty" && window.mountAfterpartyRsvp) {
    window.mountAfterpartyRsvp(host, opts);
  } else if (window.mountWeddingRsvp) {
    window.mountWeddingRsvp(host, opts);
  }
}

/* ----------------------------------------------------------
   Design panel (optional — gated by SITE.designPanel)
   ---------------------------------------------------------- */

function designEnabled() {
  if (SITE.designPanel === true) return true;
  try { return new URLSearchParams(location.search).get("design") === "1"; }
  catch (e) { return false; }
}

function buildDesignPanel() {
  for (const [role, el] of [
    ["heading", document.getElementById("fontHeading")],
    ["script", document.getElementById("fontScript")],
    ["body", document.getElementById("fontBody")],
  ]) {
    const choices = [...fontChoices()[role]];
    if (!choices.includes(settings.fonts[role])) choices.unshift(settings.fonts[role]);
    el.innerHTML =
      choices.map((f) => `<option value="${f}">${f}</option>`).join("") +
      `<option value="__custom__">Custom Google Font…</option>`;
    el.value = settings.fonts[role];

    const custom = document.getElementById(el.id + "Custom");
    el.addEventListener("change", () => {
      if (el.value === "__custom__") { custom.hidden = false; custom.focus(); return; }
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
      opt.value = name; opt.textContent = name;
      el.prepend(opt); el.value = name;
      custom.hidden = true; custom.value = "";
    });
  }

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

  for (const [key, id] of [["bg", "colBg"], ["accent", "colAccent"], ["alt", "colAlt"], ["text", "colText"]]) {
    const input = document.getElementById(id);
    input.addEventListener("input", () => {
      settings.colors[key] = input.value;
      settings.colors.preset = "custom";
      applySettings();
      refreshPanelState();
    });
  }

  document.querySelectorAll(".dp-radios").forEach((group) => {
    group.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-value]");
      if (!btn) return;
      settings.layout[group.dataset.setting] = btn.dataset.value;
      applySettings();
      refreshPanelState();
      route();
      syncHeroText();
    });
  });

  const panel = document.getElementById("designPanel");
  document.getElementById("designToggle").addEventListener("click", () => panel.classList.toggle("open"));
  document.getElementById("designClose").addEventListener("click", () => panel.classList.remove("open"));
  document.getElementById("designReset").addEventListener("click", () => {
    localStorage.removeItem(SETTINGS_KEY);
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
  document.documentElement.lang = SITE.locale || "en";
  document.title = `${SITE.couple.displayName} — ${SITE.wedding.dateDisplay}`;
  // An empty monogram means "no abbreviation" → show the full names as the
  // brand instead of an initials-style monogram (see .brand.no-monogram CSS).
  const monoEl = document.getElementById("brandMonogram");
  const brandEl = document.querySelector(".brand");
  if (SITE.couple.monogram) {
    monoEl.textContent = SITE.couple.monogram;
    monoEl.hidden = false;
    if (brandEl) brandEl.classList.remove("no-monogram");
  } else {
    monoEl.hidden = true;
    if (brandEl) brandEl.classList.add("no-monogram");
  }
  document.getElementById("brandNames").textContent = SITE.couple.displayName;
  const footMono = document.getElementById("footerMonogram");
  footMono.textContent = SITE.couple.monogram || "";
  footMono.hidden = !SITE.couple.monogram;
  document.getElementById("footerLine").textContent =
    `${SITE.couple.displayName} · ${SITE.wedding.dateDisplay} · ${SITE.wedding.city}`;

  applySettings();
  buildNav();
  renderAllPages();

  const toggle = document.getElementById("designToggle");
  if (designEnabled()) {
    if (toggle) toggle.hidden = false;
    buildDesignPanel();
  } else if (toggle) {
    toggle.hidden = true;
  }

  route();
  syncHeroText();

  window.addEventListener("hashchange", route);

  const lightbox = document.getElementById("lightbox");
  if (lightbox) lightbox.addEventListener("click", (e) => { e.currentTarget.hidden = true; });
}

document.addEventListener("DOMContentLoaded", boot);
